import { useRef, useCallback, useEffect, useState } from 'react';
import Webcam from 'react-webcam';

interface UseFrameCaptureOptions {
  intervalMs: number;
  onFrame: (imageDataUrl: string) => void;
  enabled: boolean;
  maxWidth?: number;
}

interface UseFrameCaptureResult {
  captureFrame: () => void;
  canvasSize: { width: number; height: number } | null;
}

export function useFrameCapture(
  webcamRef: React.RefObject<Webcam | null>,
  options: UseFrameCaptureOptions
): UseFrameCaptureResult {
  const { intervalMs, onFrame, enabled, maxWidth = 320 } = options;
  const intervalRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  // Create hidden canvas once
  useEffect(() => {
    canvasRef.current = document.createElement('canvas');
    return () => {
      canvasRef.current = null;
    };
  }, []);

  const captureFrame = useCallback(() => {
    if (!webcamRef.current || !canvasRef.current) return;

    const video = webcamRef.current.video;
    if (!video || video.readyState !== 4) return; // HAVE_ENOUGH_DATA

    // Get native video dimensions
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    if (videoWidth === 0 || videoHeight === 0) return;

    // Calculate scaled dimensions preserving aspect ratio (NaFlex feature)
    const aspectRatio = videoWidth / videoHeight;
    let targetWidth = Math.min(videoWidth, maxWidth);
    let targetHeight = Math.round(targetWidth / aspectRatio);

    // Ensure minimum dimensions
    if (targetWidth < 64) targetWidth = 64;
    if (targetHeight < 64) targetHeight = 64;

    // Update canvas size if changed
    if (canvasRef.current.width !== targetWidth || canvasRef.current.height !== targetHeight) {
      canvasRef.current.width = targetWidth;
      canvasRef.current.height = targetHeight;
      setCanvasSize({ width: targetWidth, height: targetHeight });
    }

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Draw video frame to hidden canvas, scaling to target size
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);

    // Get base64 data URL
    const imageDataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    onFrame(imageDataUrl);
  }, [webcamRef, onFrame, maxWidth]);

  useEffect(() => {
    if (enabled) {
      // Capture first frame immediately
      captureFrame();
      // Then set up interval
      intervalRef.current = window.setInterval(captureFrame, intervalMs);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, captureFrame]);

  return { captureFrame, canvasSize };
}
