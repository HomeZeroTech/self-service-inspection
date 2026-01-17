import { useState, useRef, useCallback, useEffect } from 'react';
import type { ClassificationResult, LoadingState, DeviceType } from '../types';

interface LabelEmbeddings {
  [label: string]: number[];
}

interface UseVisionClassifierOptions {
  modelId: string;
  device: DeviceType;
  labels: string[];
  labelEmbeddings: LabelEmbeddings;
}

interface UseVisionClassifierResult {
  loadingState: LoadingState;
  results: ClassificationResult[];
  classify: (imageDataUrl: string) => void;
  isInferring: boolean;
  isReady: boolean;
}

// Singleton worker instance to prevent multiple loads
let workerInstance: Worker | null = null;
let workerInitialized = false;
let workerInitializing = false;
let initPromise: Promise<void> | null = null;

function getWorker(): Worker {
  if (!workerInstance) {
    workerInstance = new Worker(
      new URL('../workers/visionClassifier.worker.ts', import.meta.url),
      { type: 'module' }
    );
  }
  return workerInstance;
}

/**
 * Vision-only classifier that uses pre-computed text embeddings.
 * Runs inference in a Web Worker to keep the main thread responsive.
 * Only loads the vision model (~88MB) instead of both vision + text (~153MB).
 */
export function useVisionClassifier(
  options: UseVisionClassifierOptions
): UseVisionClassifierResult {
  const { modelId, device, labels, labelEmbeddings } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    currentFile: '',
    loadedBytes: 0,
    totalBytes: 0,
    status: 'Initializing...',
    error: null,
  });
  const [results, setResults] = useState<ClassificationResult[]>([]);
  const [isInferring, setIsInferring] = useState(false);
  const [isReady, setIsReady] = useState(workerInitialized);

  const inferringRef = useRef(false);

  useEffect(() => {
    // Skip if already initialized or initializing
    if (workerInitialized) {
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 100,
        status: 'Model ready!',
      }));
      setIsReady(true);
      return;
    }

    if (workerInitializing && initPromise) {
      // Wait for existing initialization
      initPromise.then(() => {
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: 'Model ready!',
        }));
        setIsReady(true);
      });
      return;
    }

    workerInitializing = true;
    const worker = getWorker();

    // Create a promise that resolves when worker is ready
    initPromise = new Promise<void>((resolve, reject) => {
      const handleMessage = (event: MessageEvent) => {
        const { data } = event;

        switch (data.type) {
          case 'progress':
            setLoadingState((prev) => ({
              ...prev,
              status:
                data.status === 'progress'
                  ? `Downloading ${data.file || 'model'}...`
                  : data.status === 'initiate'
                    ? `Starting: ${data.file || 'model'}`
                    : data.status === 'done'
                      ? `Downloaded: ${data.file}`
                      : prev.status,
              progress: data.progress || prev.progress,
              loadedBytes: data.loaded || prev.loadedBytes,
              totalBytes: data.total || prev.totalBytes,
              currentFile: data.file || prev.currentFile,
            }));
            break;

          case 'ready':
            workerInitialized = true;
            workerInitializing = false;
            setLoadingState((prev) => ({
              ...prev,
              isLoading: false,
              progress: 100,
              status: 'Model ready!',
            }));
            setIsReady(true);
            resolve();
            break;

          case 'error':
            workerInitializing = false;
            setLoadingState((prev) => ({
              ...prev,
              isLoading: false,
              error: data.error,
              status: 'Error loading model',
            }));
            reject(new Error(data.error));
            break;

          case 'result':
            setResults(data.results);
            inferringRef.current = false;
            setIsInferring(false);
            break;
        }
      };

      worker.addEventListener('message', handleMessage);

      // Send init message
      worker.postMessage({
        type: 'init',
        modelId,
        device,
        labels,
        labelEmbeddings,
      });
    });

    initPromise.catch(() => {
      // Error already handled in message handler
    });
  }, [modelId, device, labels, labelEmbeddings]);

  const classify = useCallback((imageDataUrl: string) => {
    if (!workerInitialized || inferringRef.current) {
      return;
    }

    inferringRef.current = true;
    setIsInferring(true);

    const worker = getWorker();
    worker.postMessage({
      type: 'classify',
      imageDataUrl,
    });
  }, []);

  return { loadingState, results, classify, isInferring, isReady };
}
