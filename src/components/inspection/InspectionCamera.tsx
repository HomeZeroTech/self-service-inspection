import { useRef, useEffect, useCallback, useState } from 'react';
import Webcam from 'react-webcam';
import { useObjectDetection } from '../../hooks/useObjectDetection';
import { useFrameCapture } from '../../hooks/useFrameCapture';
import { useCountdown } from '../../hooks/useCountdown';
import { useFullResCapture } from '../../hooks/useFullResCapture';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';
import { useInspectionStore } from '../../store/inspectionStore';
import { LoadingProgress } from '../LoadingProgress';
import type { TargetObject, NegativeLabel } from '../../api/types';

const MODEL_ID = 'onnx-community/siglip2-base-patch16-224-ONNX';
const SUSTAINED_DETECTION_MS = 1000;

interface InspectionCameraProps {
  targetObject: TargetObject;
  negativeLabels: NegativeLabel[];
  threshold: number;
  countdownSeconds: number;
  onModelReady: () => void;
  onCaptureComplete: (imageData: string, score: number) => void;
}

export function InspectionCamera({
  targetObject,
  negativeLabels,
  threshold,
  countdownSeconds,
  onModelReady,
  onCaptureComplete,
}: InspectionCameraProps) {
  const webcamRef = useRef<Webcam>(null);
  const sustainedStartRef = useRef<number | null>(null);

  const [webcamReady, setWebcamReady] = useState(false);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [showCountdown, setShowCountdown] = useState(false);
  const [capturedScore, setCapturedScore] = useState(0);

  const { phase, setPhase, updateDetection } = useInspectionStore();
  const { recommendedDevice } = useDeviceCapabilities();
  const { capture: captureFullRes } = useFullResCapture(webcamRef);

  // Detection hook
  const { loadingState, detection, classify, isReady } = useObjectDetection({
    modelId: MODEL_ID,
    device: recommendedDevice,
    targetObject,
    negativeLabels,
    threshold,
    enabled: true,
  });

  // Countdown hook
  const { value: countdownValue, isActive: countdownActive, start: startCountdown, cancel: cancelCountdown } =
    useCountdown({
      initialValue: countdownSeconds,
      onComplete: handleCountdownComplete,
      onCancel: handleCountdownCancel,
    });

  // Frame capture for detection
  useFrameCapture(webcamRef, {
    intervalMs: 500,
    onFrame: classify,
    enabled: isReady && webcamReady && phase === 'detecting',
    maxWidth: 320,
  });

  // Handle model ready
  useEffect(() => {
    if (isReady && !loadingState.isLoading) {
      onModelReady();
    }
  }, [isReady, loadingState.isLoading, onModelReady]);

  // Handle detection results
  useEffect(() => {
    if (!detection || phase !== 'detecting') return;

    const now = Date.now();

    if (detection.isDetected) {
      // Object detected
      if (sustainedStartRef.current === null) {
        sustainedStartRef.current = now;
      }

      const elapsed = now - sustainedStartRef.current;
      updateDetection(detection.targetScore, threshold);

      if (elapsed >= SUSTAINED_DETECTION_MS) {
        // Sustained detection achieved - start countdown
        setCapturedScore(detection.targetScore);
        setShowCountdown(true);
        setPhase('countdown');
        startCountdown();
      }
    } else {
      // Object not detected - reset
      sustainedStartRef.current = null;
      updateDetection(detection.targetScore, threshold);
    }
  }, [detection, phase, threshold, updateDetection, setPhase, startCountdown]);

  // Cancel countdown if detection lost
  useEffect(() => {
    if (countdownActive && detection && !detection.isDetected) {
      cancelCountdown();
      setShowCountdown(false);
      setPhase('detecting');
      sustainedStartRef.current = null;
    }
  }, [countdownActive, detection, cancelCountdown, setPhase]);

  function handleCountdownComplete() {
    setShowCountdown(false);
    setPhase('capturing');

    // Capture full resolution image
    const imageData = captureFullRes({ quality: 0.92 });
    if (imageData) {
      onCaptureComplete(imageData, capturedScore);
    } else {
      // Fallback: try again
      setPhase('detecting');
    }
  }

  function handleCountdownCancel() {
    setShowCountdown(false);
    sustainedStartRef.current = null;
  }

  const handleWebcamReady = useCallback(() => {
    console.log('[InspectionCamera] Webcam ready!');
    setWebcamReady(true);
  }, []);

  const handleWebcamError = useCallback((error: string | DOMException) => {
    const errorMessage = error instanceof DOMException ? error.message : error;
    console.error('[InspectionCamera] Webcam error:', errorMessage);
    setWebcamError(errorMessage);
  }, []);

  // Debug logging
  console.log('[InspectionCamera] State:', {
    isLoading: loadingState.isLoading,
    isReady,
    webcamReady,
    webcamError,
    phase,
    detection,
    modelError: loadingState.error,
  });

  // Show error if webcam failed (this is blocking)
  if (webcamError) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Camera Error</h2>
        <p style={{ color: '#666' }}>{webcamError}</p>
        <p style={{ color: '#999', fontSize: '0.875rem', marginTop: '1rem' }}>
          Please ensure no other app is using the camera and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  // Show error if model failed (this is blocking)
  if (loadingState.error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444' }}>Error Loading Model</h2>
        <p style={{ color: '#666' }}>{loadingState.error}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: '1rem',
            padding: '0.75rem 1.5rem',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Camera feed - always rendered so permission popup appears immediately */}
      <Webcam
        ref={webcamRef}
        audio={false}
        screenshotFormat="image/jpeg"
        videoConstraints={true}
        onUserMedia={handleWebcamReady}
        onUserMediaError={handleWebcamError}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {/* Loading overlay - shown while model is loading */}
      {loadingState.isLoading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
          }}
        >
          <div style={{ width: '100%', maxWidth: '400px', padding: '2rem' }}>
            <LoadingProgress loadingState={loadingState} />
          </div>
        </div>
      )}

      {/* Detection indicator */}
      {phase === 'detecting' && detection && (
        <div
          style={{
            position: 'absolute',
            top: '1rem',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '0.5rem 1rem',
            borderRadius: '2rem',
            background: detection.isDetected
              ? 'rgba(34, 197, 94, 0.9)'
              : 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          {detection.isDetected ? (
            <>
              <span style={{ fontSize: '1.25rem' }}>&#10003;</span>
              <span>Hold steady...</span>
            </>
          ) : (
            <>
              <span>Looking for {targetObject.displayName}...</span>
            </>
          )}
        </div>
      )}

      {/* Countdown overlay */}
      {showCountdown && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.5)',
          }}
        >
          <div
            style={{
              fontSize: '8rem',
              fontWeight: 'bold',
              color: 'white',
              textShadow: '0 4px 20px rgba(0,0,0,0.5)',
              animation: 'pulse 1s ease-in-out infinite',
            }}
          >
            {countdownValue}
          </div>
        </div>
      )}

      {/* Capturing indicator */}
      {phase === 'capturing' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255, 255, 255, 0.9)',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>&#128247;</div>
            <div style={{ fontSize: '1.25rem', color: '#22c55e' }}>Captured!</div>
          </div>
        </div>
      )}

      {/* Uploading indicator */}
      {phase === 'uploading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.7)',
          }}
        >
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid #ffffff33',
                borderTopColor: 'white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 1rem',
              }}
            />
            <div>Uploading...</div>
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
