import { useRef, useCallback, useState } from "react";
import Webcam from "react-webcam";
import { useDeviceCapabilities } from "../hooks/useDeviceCapabilities";
import { useVisionClassifier } from "../hooks/useVisionClassifier";
import { useFrameCapture } from "../hooks/useFrameCapture";
import { LoadingProgress } from "./LoadingProgress";
import { ClassificationOverlay } from "./ClassificationOverlay";
import { DeviceCompatibility } from "./DeviceCompatibility";
import { getEmbeddingsForLabels } from "../data/labelEmbeddings";

// Labels for classification - must have pre-computed embeddings
// Run `npx tsx scripts/generate-embeddings.ts` to add new labels
const LABELS = [
    "a person",
    "a white metal radiator",
    "an electricity meter on a wall",
    "a gas boiler unit",
];

// Using SigLIP2 vision model only (~95MB) - 224 fixed resolution for better compatibility
const MODEL_ID = "onnx-community/siglip2-base-patch16-224-ONNX";
const CAPTURE_INTERVAL_MS = 500;

// Get pre-computed embeddings for our labels
const LABEL_EMBEDDINGS = getEmbeddingsForLabels(LABELS);

export function WebcamClassifier() {
    const webcamRef = useRef<Webcam>(null);
    const { capabilities, isChecking, recommendedDevice } =
        useDeviceCapabilities();
    const [webcamReady, setWebcamReady] = useState(false);
    const [webcamError, setWebcamError] = useState<string | null>(null);

    // Use vision-only classifier with pre-computed text embeddings
    const { loadingState, results, classify, isInferring, isReady } =
        useVisionClassifier({
            modelId: MODEL_ID,
            device: recommendedDevice,
            labels: LABELS,
            labelEmbeddings: LABEL_EMBEDDINGS,
        });

    const handleFrame = useCallback(
        (imageDataUrl: string) => {
            classify(imageDataUrl);
        },
        [classify],
    );

    // Auto-start classification when model is ready and webcam is ready
    const shouldCapture = isReady && webcamReady && !loadingState.error;

    useFrameCapture(webcamRef, {
        intervalMs: CAPTURE_INTERVAL_MS,
        onFrame: handleFrame,
        enabled: shouldCapture,
        maxWidth: 320, // Scale down while preserving aspect ratio
    });

    const videoConstraints: MediaTrackConstraints = {
        facingMode: "environment",
        width: { ideal: 640 },
        height: { ideal: 480 },
    };

    const handleWebcamReady = useCallback(() => {
        setWebcamReady(true);
    }, []);

    const handleWebcamError = useCallback((error: string | DOMException) => {
        const message = typeof error === "string" ? error : error.message;
        setWebcamError(message);
    }, []);

    // Show loading state while model is loading
    if (loadingState.isLoading) {
        return (
            <div className="webcam-classifier loading">
                <DeviceCompatibility
                    capabilities={capabilities}
                    isChecking={isChecking}
                    selectedDevice={recommendedDevice}
                />
                <LoadingProgress loadingState={loadingState} />
            </div>
        );
    }

    // Show error state if model failed to load
    if (loadingState.error) {
        return (
            <div className="webcam-classifier error">
                <h2>Failed to Load Model</h2>
                <p className="error-message">{loadingState.error}</p>
                <button onClick={() => window.location.reload()}>Retry</button>
                <DeviceCompatibility
                    capabilities={capabilities}
                    isChecking={isChecking}
                    selectedDevice={recommendedDevice}
                />
            </div>
        );
    }

    // Show webcam error if camera access failed
    if (webcamError) {
        return (
            <div className="webcam-classifier error">
                <h2>Camera Access Error</h2>
                <p className="error-message">{webcamError}</p>
                <p className="error-hint">
                    Please ensure camera permissions are granted and try again.
                </p>
                <button onClick={() => window.location.reload()}>Retry</button>
            </div>
        );
    }

    return (
        <div className="webcam-classifier">
            <div className="video-container">
                <Webcam
                    ref={webcamRef}
                    audio={false}
                    videoConstraints={videoConstraints}
                    screenshotFormat="image/jpeg"
                    className="webcam-video"
                    onUserMedia={handleWebcamReady}
                    onUserMediaError={handleWebcamError}
                />
                <ClassificationOverlay
                    results={results}
                    isInferring={isInferring}
                />
            </div>

            <div className="info-panel">
                <div className="labels-info">
                    <h4>Detecting:</h4>
                    <div className="labels-list">
                        {LABELS.map((label) => (
                            <span key={label} className="label-tag">
                                {label}
                            </span>
                        ))}
                    </div>
                </div>

                <DeviceCompatibility
                    capabilities={capabilities}
                    isChecking={isChecking}
                    selectedDevice={recommendedDevice}
                />
            </div>
        </div>
    );
}
