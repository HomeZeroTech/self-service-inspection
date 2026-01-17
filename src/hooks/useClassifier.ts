import { useState, useRef, useCallback, useEffect } from 'react';
import { pipeline, env } from '@huggingface/transformers';
import type { ClassificationResult, LoadingState, ProgressInfo, DeviceType } from '../types';

// Configure transformers.js
env.allowLocalModels = false;

interface UseClassifierOptions {
  modelId: string;
  device: DeviceType;
  labels: string[];
}

interface UseClassifierResult {
  loadingState: LoadingState;
  results: ClassificationResult[];
  classify: (imageDataUrl: string) => Promise<void>;
  isInferring: boolean;
  isReady: boolean;
}

type ZeroShotImageClassificationOutput = {
  label: string;
  score: number;
}[];

export function useClassifier(options: UseClassifierOptions): UseClassifierResult {
  const { modelId, device, labels } = options;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const classifierRef = useRef<any>(null);
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
  const [isReady, setIsReady] = useState(false);

  const progressCallback = useCallback((info: ProgressInfo) => {
    switch (info.status) {
      case 'initiate':
        setLoadingState((prev) => ({
          ...prev,
          status: `Starting download: ${info.file || 'model'}`,
          currentFile: info.file || '',
        }));
        break;
      case 'download':
        setLoadingState((prev) => ({
          ...prev,
          status: `Downloading ${info.file || 'model'}...`,
          currentFile: info.file || prev.currentFile,
        }));
        break;
      case 'progress':
        setLoadingState((prev) => ({
          ...prev,
          progress: info.progress || 0,
          loadedBytes: info.loaded || 0,
          totalBytes: info.total || 0,
          currentFile: info.file || prev.currentFile,
          status: `Downloading ${info.file || 'model'}...`,
        }));
        break;
      case 'done':
        setLoadingState((prev) => ({
          ...prev,
          status: `Downloaded: ${info.file}`,
        }));
        break;
      case 'ready':
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: 'Model ready!',
        }));
        break;
    }
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function loadModel() {
      try {
        setLoadingState((prev) => ({
          ...prev,
          status: `Loading model with ${device.toUpperCase()}...`,
        }));

        // Use the pipeline API for zero-shot image classification
        // Use int8 quantization - vision (88MB) + text (64MB) = ~153MB total
        const classifier = await pipeline(
          'zero-shot-image-classification',
          modelId,
          {
            device,
            dtype: 'int8',
            progress_callback: progressCallback,
          }
        );

        if (isCancelled) return;

        classifierRef.current = classifier;
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: 'Model ready!',
        }));
        setIsReady(true);
      } catch (error) {
        if (isCancelled) return;

        const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
        console.error('Model loading error:', error);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          error: errorMessage,
          status: 'Error loading model',
        }));
      }
    }

    loadModel();

    return () => {
      isCancelled = true;
    };
  }, [modelId, device, progressCallback]);

  const classify = useCallback(
    async (imageDataUrl: string) => {
      if (!classifierRef.current || isInferring) return;

      setIsInferring(true);
      try {
        const output = (await classifierRef.current(imageDataUrl, labels, {
          hypothesis_template: 'a photo of {}',
        })) as ZeroShotImageClassificationOutput;

        // Sort by score and take top 3
        const sorted = [...output].sort((a, b) => b.score - a.score).slice(0, 3);
        setResults(sorted);
      } catch (error) {
        console.error('Classification error:', error);
      } finally {
        setIsInferring(false);
      }
    },
    [labels, isInferring]
  );

  return { loadingState, results, classify, isInferring, isReady };
}
