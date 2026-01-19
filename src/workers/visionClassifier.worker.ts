import {
  AutoProcessor,
  SiglipVisionModel,
  RawImage,
  env,
} from '@huggingface/transformers';

// Configure transformers.js
env.allowLocalModels = false;

type DeviceType = 'webgpu' | 'wasm' | 'cpu';

interface LabelEmbeddings {
  [label: string]: number[];
}

interface InitMessage {
  type: 'init';
  modelId: string;
  device: DeviceType;
  labels: string[];
  labelEmbeddings: LabelEmbeddings;
}

interface ClassifyMessage {
  type: 'classify';
  imageDataUrl: string;
}

type WorkerMessage = InitMessage | ClassifyMessage;

interface ProgressUpdate {
  type: 'progress';
  status: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

interface ReadyUpdate {
  type: 'ready';
}

interface ErrorUpdate {
  type: 'error';
  error: string;
}

interface ClassificationResult {
  type: 'result';
  results: { label: string; score: number }[];
}

type WorkerResponse = ProgressUpdate | ReadyUpdate | ErrorUpdate | ClassificationResult;

// Model state
let processor: any = null;
let visionModel: any = null;
let labelEmbeddingMatrix: Float32Array | null = null;
let labelNames: string[] = [];
let embeddingDim = 768; // SigLIP2 base uses 768
let isInitialized = false;
let isInitializing = false;

function postMessage(message: WorkerResponse) {
  self.postMessage(message);
}

async function initialize(data: InitMessage) {
  if (isInitialized || isInitializing) {
    if (isInitialized) {
      postMessage({ type: 'ready' });
    }
    return;
  }

  isInitializing = true;

  try {
    const { modelId, device, labels, labelEmbeddings } = data;

    // Build label embedding matrix
    const validLabels = labels.filter((label) => labelEmbeddings[label]);
    labelNames = validLabels;
    embeddingDim = Object.values(labelEmbeddings)[0]?.length || 512;
    labelEmbeddingMatrix = new Float32Array(validLabels.length * embeddingDim);

    validLabels.forEach((label, i) => {
      const embedding = labelEmbeddings[label];
      labelEmbeddingMatrix!.set(embedding, i * embeddingDim);
    });

    // Progress callback
    const progressCallback = (info: {
      status: string;
      file?: string;
      progress?: number;
      loaded?: number;
      total?: number;
    }) => {
      postMessage({
        type: 'progress',
        status: info.status,
        file: info.file,
        progress: info.progress,
        loaded: info.loaded,
        total: info.total,
      });
    };

    // Load processor and vision-only model
    // Using the 224-fixed resolution model which has better compatibility
    // with current Transformers.js version (uses standard SiglipImageProcessor)
    const [loadedProcessor, loadedVisionModel] = await Promise.all([
      AutoProcessor.from_pretrained(modelId),
      SiglipVisionModel.from_pretrained(modelId, {
        device,
        dtype: 'q8', // Using q8 (int8) for 224 model
        progress_callback: progressCallback,
      }),
    ]);

    processor = loadedProcessor;
    visionModel = loadedVisionModel;
    isInitialized = true;
    isInitializing = false;

    postMessage({ type: 'ready' });
  } catch (error) {
    isInitializing = false;
    const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
    postMessage({ type: 'error', error: errorMessage });
  }
}

async function classify(imageDataUrl: string) {
  if (!processor || !visionModel || !labelEmbeddingMatrix) {
    return;
  }

  try {
    // Load and process image
    const image = await RawImage.fromURL(imageDataUrl);
    const imageInputs = await processor(image);

    // Get image embedding from SiglipVisionModel
    const output = await visionModel(imageInputs);

    // List available output keys for debugging
    console.log('Model output keys:', Object.keys(output));

    // SiglipVisionModel usually outputs pooler_output (projected embedding)
    // Some models might use image_embeds
    const imageEmbedData = output.pooler_output || output.image_embeds;

    if (!imageEmbedData) {
      console.error('No embedding found in model output. Available keys:', Object.keys(output));
      return;
    }

    console.log('imageEmbedData:', imageEmbedData);
    console.log('imageEmbedData dims:', imageEmbedData?.dims);

    // The output is a Tensor - convert to array
    // Use tolist() to get a proper JS array, then flatten if needed
    let rawData: number[];
    if (typeof imageEmbedData.tolist === 'function') {
      const listed = imageEmbedData.tolist();
      // If it's nested (e.g., [[...512 values...]]), flatten it
      rawData = Array.isArray(listed[0]) ? listed[0] : listed;
    } else {
      rawData = Array.from(imageEmbedData.data as Float32Array);
    }

    // If the embedding dimension doesn't match, we might have the wrong shape
    // Take only the first embeddingDim values (in case of batch dimension)
    const imageEmbedding: number[] =
      rawData.length === embeddingDim ? rawData : rawData.slice(0, embeddingDim);

    console.log('rawData length:', rawData.length);
    console.log('embeddingDim:', embeddingDim);
    console.log('imageEmbedding length:', imageEmbedding.length);
    console.log('first 5 values:', imageEmbedding.slice(0, 5));

    // Normalize image embedding
    let imageNorm = 0;
    for (let i = 0; i < embeddingDim; i++) {
      imageNorm += imageEmbedding[i] * imageEmbedding[i];
    }
    imageNorm = Math.sqrt(imageNorm);

    console.log('imageNorm:', imageNorm);

    if (imageNorm === 0) {
      console.error('Image embedding norm is zero');
      return;
    }

    // Compute cosine similarities (dot product since normalized)
    const rawScores: number[] = [];

    for (let i = 0; i < labelNames.length; i++) {
      let dotProduct = 0;
      for (let j = 0; j < embeddingDim; j++) {
        const normalizedImageVal = imageEmbedding[j] / imageNorm;
        const labelVal = labelEmbeddingMatrix![i * embeddingDim + j];
        dotProduct += normalizedImageVal * labelVal;
      }
      rawScores.push(dotProduct);
    }

    // For SigLIP 2, we can use softmax over the labels for zero-shot classification 
    // to get better relative confidence scores.
    // The scale in SigLIP models is usually quite high (~40-100+).
    // Using 100.0 to provide higher confidence for clear matches.
    const logitScale = visionModel.config?.logit_scale ?? 100.0;
    
    // Some models store log(scale), some store scale directly
    const actualScale = logitScale < 5 ? Math.exp(logitScale) : logitScale;

    // Softmax calculation
    const expScores = rawScores.map(score => Math.exp(score * actualScale));
    const totalScore = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map(s => s / totalScore);

    const scores = labelNames.map((label, i) => ({
      label,
      score: probabilities[i],
    }));

    // Sort by score and take top 3
    const sorted = scores.sort((a, b) => b.score - a.score).slice(0, 3);
    postMessage({ type: 'result', results: sorted });
  } catch (error) {
    console.error('Classification error:', error);
  }
}

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { data } = event;

  switch (data.type) {
    case 'init':
      await initialize(data);
      break;
    case 'classify':
      await classify(data.imageDataUrl);
      break;
  }
};
