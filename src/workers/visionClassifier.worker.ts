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

interface UpdateLabelsMessage {
  type: 'updateLabels';
  targetLabel: string;
  targetEmbedding: number[];
  negativeLabels: { label: string; embedding: number[] }[];
  threshold: number;
}

interface ClassifyMessage {
  type: 'classify';
  imageDataUrl: string;
}

type WorkerMessage = InitMessage | UpdateLabelsMessage | ClassifyMessage;

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

interface DetectionResult {
  type: 'detection';
  targetLabel: string;
  targetScore: number;
  isDetected: boolean;
  allScores: { label: string; score: number }[];
}

interface LabelsUpdated {
  type: 'labelsUpdated';
}

type WorkerResponse = ProgressUpdate | ReadyUpdate | ErrorUpdate | ClassificationResult | DetectionResult | LabelsUpdated;

// Model state
let processor: any = null;
let visionModel: any = null;
let labelEmbeddingMatrix: Float32Array | null = null;
let labelNames: string[] = [];
let embeddingDim = 512; // MobileClip uses 512
let isInitialized = false;
let isInitializing = false;

// Detection mode state (for single-target detection with negative prompts)
let detectionMode = false;
let targetLabel = '';
let detectionThreshold = 0.5;

function postMessage(message: WorkerResponse) {
  self.postMessage(message);
}

async function initialize(data: InitMessage) {
  console.log('[Worker] Initialize called:', { isInitialized, isInitializing, device: data.device });

  if (isInitialized || isInitializing) {
    if (isInitialized) {
      console.log('[Worker] Already initialized, sending ready');
      postMessage({ type: 'ready' });
    }
    return;
  }

  isInitializing = true;

  try {
    const { modelId, device, labels, labelEmbeddings } = data;
    console.log('[Worker] Loading model:', modelId, 'device:', device);

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
      CLIPVisionModelWithProjection.from_pretrained(modelId, {
        device,
        dtype: 'q8', // Using q8 (int8) for smaller model size
        progress_callback: progressCallback,
      }),
    ]);

    processor = loadedProcessor;
    visionModel = loadedVisionModel;
    isInitialized = true;
    isInitializing = false;

    console.log('[Worker] Model loaded successfully');
    postMessage({ type: 'ready' });
  } catch (error) {
    isInitializing = false;
    const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
    console.error('[Worker] Model loading failed:', error);
    postMessage({ type: 'error', error: errorMessage });
  }
}

function updateLabels(data: UpdateLabelsMessage) {
  // Update labels without reinitializing the model
  detectionMode = true;
  targetLabel = data.targetLabel;
  detectionThreshold = data.threshold;

  // Build new embedding matrix: target first, then negatives
  const allLabels = [
    { label: data.targetLabel, embedding: data.targetEmbedding },
    ...data.negativeLabels,
  ];

  labelNames = allLabels.map((l) => l.label);
  embeddingDim = data.targetEmbedding.length;
  labelEmbeddingMatrix = new Float32Array(allLabels.length * embeddingDim);

  allLabels.forEach((item, i) => {
    labelEmbeddingMatrix!.set(item.embedding, i * embeddingDim);
  });

  postMessage({ type: 'labelsUpdated' });
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

    // CLIPVisionModelWithProjection outputs image_embeds (projected embedding)
    // Fall back to pooler_output for compatibility
    const imageEmbedData = output.image_embeds || output.pooler_output;

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

    // Sort by score
    const sorted = [...scores].sort((a, b) => b.score - a.score);

    if (detectionMode) {
      // In detection mode, report if target is detected
      const targetScore = scores[0]?.score || 0; // Target is always first
      const topMatch = sorted[0];
      const isTargetTopMatch = topMatch?.label === targetLabel;
      const isAboveThreshold = targetScore >= detectionThreshold;
      const isDetected = isTargetTopMatch && isAboveThreshold;

      postMessage({
        type: 'detection',
        targetLabel,
        targetScore,
        isDetected,
        allScores: sorted.slice(0, 5), // Top 5 for debugging
      });
    } else {
      // Original behavior: return top 3 results
      postMessage({ type: 'result', results: sorted.slice(0, 3) });
    }
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
    case 'updateLabels':
      updateLabels(data);
      break;
    case 'classify':
      await classify(data.imageDataUrl);
      break;
  }
};
