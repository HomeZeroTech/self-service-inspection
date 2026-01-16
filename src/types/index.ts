export interface ClassificationResult {
  label: string;
  score: number;
}

export interface ProgressInfo {
  status: 'initiate' | 'download' | 'progress' | 'done' | 'ready';
  name?: string;
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface DeviceCapabilities {
  webgpuSupported: boolean;
  webgpuAdapter: GPUAdapter | null;
  isFallbackAdapter: boolean;
  estimatedMemoryMB: number;
  browserInfo: string;
  errors: string[];
  crossOriginIsolated: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  progress: number;
  currentFile: string;
  loadedBytes: number;
  totalBytes: number;
  status: string;
  error: string | null;
}

export type DeviceType = 'webgpu' | 'wasm';
