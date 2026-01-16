import type { DeviceCapabilities, DeviceType } from '../types';

export async function checkDeviceCapabilities(): Promise<DeviceCapabilities> {
  const result: DeviceCapabilities = {
    webgpuSupported: false,
    webgpuAdapter: null,
    isFallbackAdapter: false,
    estimatedMemoryMB: 0,
    browserInfo: navigator.userAgent,
    errors: [],
    crossOriginIsolated: false,
  };

  // Check cross-origin isolation (required for SharedArrayBuffer)
  result.crossOriginIsolated = checkCrossOriginIsolation();
  if (!result.crossOriginIsolated) {
    result.errors.push('Cross-origin isolation not enabled (required for SharedArrayBuffer)');
  }

  // Check secure context (HTTPS required)
  if (!isSecureContext()) {
    result.errors.push('Not in secure context (HTTPS required for WebGPU)');
  }

  // Check navigator.gpu exists
  if (!navigator.gpu) {
    result.errors.push('WebGPU not supported: navigator.gpu is undefined');
    return result;
  }

  // Request WebGPU adapter
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      result.errors.push('WebGPU adapter not available (GPU may be blocklisted or unsupported)');
      return result;
    }

    result.webgpuAdapter = adapter;
    result.webgpuSupported = true;

    // Check if using software fallback (property may not be in all type defs)
    const adapterInfo = adapter as GPUAdapter & { isFallbackAdapter?: boolean };
    if (adapterInfo.isFallbackAdapter) {
      result.isFallbackAdapter = true;
      result.errors.push('Warning: Using software fallback adapter (slower performance)');
    }

    // Estimate available GPU memory from adapter limits
    const limits = adapter.limits;
    const maxBufferMB = limits.maxBufferSize / (1024 * 1024);
    result.estimatedMemoryMB = Math.min(maxBufferMB, 4096);

    // Check if memory seems sufficient for the model (~90MB minimum)
    if (result.estimatedMemoryMB < 128) {
      result.errors.push(`Warning: Low GPU memory detected (~${result.estimatedMemoryMB.toFixed(0)}MB)`);
    }
  } catch (error) {
    result.errors.push(`WebGPU initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

export function isSecureContext(): boolean {
  return window.isSecureContext;
}

export function checkCrossOriginIsolation(): boolean {
  return window.crossOriginIsolated === true;
}

export function getRecommendedDevice(capabilities: DeviceCapabilities): DeviceType {
  if (!capabilities.webgpuSupported) return 'wasm';
  if (capabilities.isFallbackAdapter) return 'wasm';
  if (capabilities.estimatedMemoryMB < 256) return 'wasm';
  return 'webgpu';
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

export function getBrowserInfo(): { name: string; version: string } {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  if (ua.includes('Chrome')) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Firefox')) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Safari')) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    if (match) version = match[1];
  } else if (ua.includes('Edge')) {
    name = 'Edge';
    const match = ua.match(/Edge\/(\d+)/);
    if (match) version = match[1];
  }

  return { name, version };
}
