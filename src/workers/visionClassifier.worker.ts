import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
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
let processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> | null = null;
let visionModel: Awaited<ReturnType<typeof CLIPVisionModelWithProjection.from_pretrained>> | null =
  null;
let labelEmbeddingMatrix: Float32Array | null = null;
let labelNames: string[] = [];
let embeddingDim = 512;
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

    postMessage({ type: 'progress', status: 'initiate', file: 'Loading processor...' });

    // Load processor and vision model
    const [loadedProcessor, loadedVisionModel] = await Promise.all([
      AutoProcessor.from_pretrained(modelId),
      CLIPVisionModelWithProjection.from_pretrained(modelId, {
        device,
        dtype: 'q8',
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

    // Get image embedding
    const output = await visionModel(imageInputs);
    const imageEmbedData = output.image_embeds;

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

    // Normalize image embedding
    let imageNorm = 0;
    for (let i = 0; i < embeddingDim; i++) {
      imageNorm += imageEmbedding[i] * imageEmbedding[i];
    }
    imageNorm = Math.sqrt(imageNorm);

    if (imageNorm === 0) {
      console.error('Image embedding norm is zero');
      return;
    }

    // Compute cosine similarities with all label embeddings
    // Text embeddings are pre-normalized (norm=1), so we just need to normalize the image embedding
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

    // Apply CLIP's temperature scaling (logit_scale) and softmax
    // CLIP uses exp(logit_scale) ≈ 100 as temperature
    const temperature = 100;
    const scaledScores = rawScores.map((s) => s * temperature);

    // Softmax to convert to probabilities
    const maxScore = Math.max(...scaledScores);
    const expScores = scaledScores.map((s) => Math.exp(s - maxScore)); // subtract max for numerical stability
    const sumExp = expScores.reduce((a, b) => a + b, 0);
    const probabilities = expScores.map((e) => e / sumExp);

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
