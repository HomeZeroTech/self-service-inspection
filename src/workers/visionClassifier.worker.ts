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
    const { image_embeds } = await visionModel(imageInputs);
    const imageEmbedding = image_embeds.data as Float32Array;

    // Normalize image embedding
    let imageNorm = 0;
    for (let i = 0; i < imageEmbedding.length; i++) {
      imageNorm += imageEmbedding[i] * imageEmbedding[i];
    }
    imageNorm = Math.sqrt(imageNorm);

    // Compute cosine similarities with all label embeddings
    const scores: { label: string; score: number }[] = [];

    for (let i = 0; i < labelNames.length; i++) {
      let dotProduct = 0;
      for (let j = 0; j < embeddingDim; j++) {
        dotProduct +=
          (imageEmbedding[j] / imageNorm) * labelEmbeddingMatrix![i * embeddingDim + j];
      }
      scores.push({
        label: labelNames[i],
        score: dotProduct,
      });
    }

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
