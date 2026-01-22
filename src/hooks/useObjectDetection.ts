import { useState, useRef, useCallback, useEffect } from 'react';
import type { LoadingState, DeviceType } from '../types';
import type { TargetObject, NegativeLabel } from '../api/types';

interface DetectionResult {
  targetLabel: string;
  targetScore: number;
  isDetected: boolean;
}

interface UseObjectDetectionOptions {
  modelId: string;
  device: DeviceType;
  targetObject: TargetObject;
  negativeLabels: NegativeLabel[];
  threshold: number;
  enabled: boolean;
}

interface UseObjectDetectionResult {
  loadingState: LoadingState;
  detection: DetectionResult | null;
  classify: (imageDataUrl: string) => void;
  isReady: boolean;
  updateTarget: (target: TargetObject, negatives: NegativeLabel[], threshold: number) => void;
}

// Singleton worker instance (shared with useVisionClassifier)
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

export function useObjectDetection(
  options: UseObjectDetectionOptions
): UseObjectDetectionResult {
  const { modelId, device, targetObject, negativeLabels, threshold, enabled } = options;

  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: true,
    progress: 0,
    currentFile: '',
    loadedBytes: 0,
    totalBytes: 0,
    status: 'Initializing...',
    error: null,
  });
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [modelReady, setModelReady] = useState(workerInitialized);

  const inferringRef = useRef(false);
  const labelsSetRef = useRef(false);

  // Initialize worker and model
  useEffect(() => {
    if (!enabled) return;

    // If already initialized, just set ready
    if (workerInitialized) {
      setModelReady(true);
      setLoadingState((prev) => ({
        ...prev,
        isLoading: false,
        progress: 100,
        status: 'Model ready!',
      }));
      return;
    }

    // If currently initializing, wait for it
    if (workerInitializing && initPromise) {
      initPromise.then(() => {
        setModelReady(true);
        setLoadingState((prev) => ({
          ...prev,
          isLoading: false,
          progress: 100,
          status: 'Model ready!',
        }));
      });
      return;
    }

    workerInitializing = true;
    const worker = getWorker();

    // Handler for init messages
    const handleInitMessage = (event: MessageEvent) => {
      const { data } = event;
      console.log('[useObjectDetection] Worker message:', data.type, data);

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
          setModelReady(true);
          setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            progress: 100,
            status: 'Model ready!',
          }));
          break;

        case 'error':
          workerInitializing = false;
          setLoadingState((prev) => ({
            ...prev,
            isLoading: false,
            error: data.error,
            status: 'Error loading model',
          }));
          break;
      }
    };

    worker.addEventListener('message', handleInitMessage);

    // Create init promise
    initPromise = new Promise<void>((resolve, reject) => {
      const checkReady = (event: MessageEvent) => {
        if (event.data.type === 'ready') {
          resolve();
          worker.removeEventListener('message', checkReady);
        } else if (event.data.type === 'error') {
          reject(new Error(event.data.error));
          worker.removeEventListener('message', checkReady);
        }
      };
      worker.addEventListener('message', checkReady);
    });

    // Send init message with placeholder labels (will update after)
    worker.postMessage({
      type: 'init',
      modelId,
      device,
      labels: [targetObject.label],
      labelEmbeddings: { [targetObject.label]: targetObject.embedding },
    });

    return () => {
      worker.removeEventListener('message', handleInitMessage);
    };
  }, [enabled, modelId, device, targetObject.label, targetObject.embedding]);

  // Update labels when target changes or after model is ready
  useEffect(() => {
    if (!modelReady || !enabled) return;

    const worker = getWorker();

    // Set up detection labels
    worker.postMessage({
      type: 'updateLabels',
      targetLabel: targetObject.label,
      targetEmbedding: targetObject.embedding,
      negativeLabels: negativeLabels,
      threshold: threshold,
    });

    // Listen for labelsUpdated
    const handleLabelsUpdated = (event: MessageEvent) => {
      if (event.data.type === 'labelsUpdated') {
        labelsSetRef.current = true;
        setIsReady(true);
      }
    };

    worker.addEventListener('message', handleLabelsUpdated);

    return () => {
      worker.removeEventListener('message', handleLabelsUpdated);
    };
  }, [modelReady, enabled, targetObject, negativeLabels, threshold]);

  // Handle detection results
  useEffect(() => {
    if (!enabled) return;

    const worker = getWorker();

    const handleDetection = (event: MessageEvent) => {
      if (event.data.type === 'detection') {
        setDetection({
          targetLabel: event.data.targetLabel,
          targetScore: event.data.targetScore,
          isDetected: event.data.isDetected,
        });
        inferringRef.current = false;
      }
    };

    worker.addEventListener('message', handleDetection);

    return () => {
      worker.removeEventListener('message', handleDetection);
    };
  }, [enabled]);

  const classify = useCallback((imageDataUrl: string) => {
    if (!isReady || inferringRef.current) {
      return;
    }

    inferringRef.current = true;

    const worker = getWorker();
    worker.postMessage({
      type: 'classify',
      imageDataUrl,
    });
  }, [isReady]);

  const updateTarget = useCallback(
    (target: TargetObject, negatives: NegativeLabel[], newThreshold: number) => {
      if (!workerInitialized) return;

      labelsSetRef.current = false;
      setIsReady(false);
      setDetection(null);

      const worker = getWorker();
      worker.postMessage({
        type: 'updateLabels',
        targetLabel: target.label,
        targetEmbedding: target.embedding,
        negativeLabels: negatives,
        threshold: newThreshold,
      });
    },
    []
  );

  return { loadingState, detection, classify, isReady, updateTarget };
}
