import { useCallback, RefObject } from 'react';
import Webcam from 'react-webcam';

interface CaptureOptions {
  quality?: number;
}

interface UseFullResCaptureResult {
  capture: (options?: CaptureOptions) => string | null;
}

export function useFullResCapture(
  webcamRef: RefObject<Webcam | null>
): UseFullResCaptureResult {
  const capture = useCallback(
    (options: CaptureOptions = {}): string | null => {
      const { quality = 0.92 } = options;

      if (!webcamRef.current) return null;

      const video = webcamRef.current.video;
      if (!video || video.readyState !== 4) return null;

      // Create canvas at full video resolution
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) return null;

      ctx.drawImage(video, 0, 0);

      return canvas.toDataURL('image/jpeg', quality);
    },
    [webcamRef]
  );

  return { capture };
}
