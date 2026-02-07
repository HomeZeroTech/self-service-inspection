import { useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInspectionStore } from "../store/inspectionStore";
import { getSession, captureStep } from "../api/sessions";
import { InspectionCamera } from "../components/inspection/InspectionCamera";
import { Header } from "../components/branding/Header";
import { DesktopRedirectPage } from "./DesktopRedirectPage";
import { useDeviceType } from "../hooks/useDeviceType";

interface InspectionPageProps {
    showFAQ?: boolean;
}

export function InspectionPage({ showFAQ = false }: InspectionPageProps) {
    const { sessionId } = useParams<{ sessionId: string }>();
    const navigate = useNavigate();
    const deviceType = useDeviceType();

    const {
        session,
        currentStep,
        phase,
        error,
        currentScore,
        countdownValue,
        setSessionId,
        setSession,
        setPhase,
        setError,
        setCurrentStep,
        resetDetection,
    } = useInspectionStore();

    // Fetch session on mount
    useEffect(() => {
        if (!sessionId) {
            navigate("/error?message=Invalid session link");
            return;
        }

        setSessionId(sessionId);

        getSession(sessionId)
            .then((data) => {
                setSession(data);
                if (data.status === "completed") {
                    navigate(`/inspect/${sessionId}/complete`);
                }
            })
            .catch((err) => {
                setError(err.message || "Failed to load session");
            });
    }, [sessionId, navigate, setSessionId, setSession, setError]);

    // Handle capture completion
    const handleCaptureComplete = useCallback(
        async (imageData: string, score: number) => {
            if (!sessionId || !currentStep) return;

            setPhase("uploading");

            try {
                const response = await captureStep(
                    sessionId,
                    currentStep.stepId,
                    {
                        imageData,
                        detectedScore: score,
                        capturedAt: new Date().toISOString(),
                    },
                );

                if (response.nextStep) {
                    setCurrentStep(response.nextStep);
                    setPhase("detecting");
                    resetDetection();
                } else {
                    navigate(`/inspect/${sessionId}/complete`);
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Upload failed");
            }
        },
        [
            sessionId,
            currentStep,
            navigate,
            setPhase,
            setCurrentStep,
            setError,
            resetDetection,
        ],
    );

    // Handle model ready
    const handleModelReady = useCallback(() => {
        setPhase("detecting");
    }, [setPhase]);

    // Show FAQ modal if requested
    if (showFAQ && session?.config.faqItems) {
        return (
            <div className="app">
                <Header
                    logoUrl={session.config.branding.logoUrl}
                    logoHeight={session.config.branding.logoHeight}
                />
                <div
                    style={{
                        padding: "var(--space-3) var(--space-4)",
                        borderBottom: "1px solid var(--gray-200)",
                    }}
                >
                    <h1 style={{ fontSize: "var(--text-base)", margin: 0 }}>
                        {session.config.branding.title}
                    </h1>
                </div>
                <main style={{ padding: "var(--space-4)" }}>
                    <h2>Frequently Asked Questions</h2>
                    <div style={{ marginTop: "var(--space-4)" }}>
                        {session.config.faqItems.map((item, index) => (
                            <div
                                key={index}
                                style={{ marginBottom: "var(--space-6)" }}
                            >
                                <h3
                                    style={{
                                        fontSize: "var(--text-base)",
                                        marginBottom: "var(--space-2)",
                                    }}
                                >
                                    {item.question}
                                </h3>
                                <p
                                    style={{
                                        color: "var(--gray-600)",
                                        margin: 0,
                                    }}
                                >
                                    {item.answer}
                                </p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => navigate(`/inspect/${sessionId}`)}
                        style={{
                            marginTop: "var(--space-4)",
                            padding: "var(--space-3) var(--space-6)",
                            background: "var(--primary-500)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-lg)",
                            cursor: "pointer",
                        }}
                    >
                        Back to Inspection
                    </button>
                </main>
            </div>
        );
    }

    // Error state
    if (phase === "error" || error) {
        return (
            <div className="app">
                {session && (
                    <Header
                        logoUrl={session.config.branding.logoUrl}
                        logoHeight={session.config.branding.logoHeight}
                    />
                )}
                <main
                    style={{ textAlign: "center", padding: "var(--space-8)" }}
                >
                    <h1 style={{ color: "var(--error-color)" }}>Error</h1>
                    <p style={{ color: "var(--gray-600)" }}>
                        {error || "Something went wrong"}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: "var(--space-4)",
                            padding: "var(--space-3) var(--space-6)",
                            background: "var(--primary-600)",
                            color: "white",
                            border: "none",
                            borderRadius: "var(--radius-lg)",
                            cursor: "pointer",
                        }}
                    >
                        Try Again
                    </button>
                </main>
            </div>
        );
    }

    // Loading session
    if (phase === "loading" || !session || !currentStep) {
        return (
            <div className="app">
                {session && (
                    <Header
                        logoUrl={session.config.branding.logoUrl}
                        logoHeight={session.config.branding.logoHeight}
                    />
                )}
                <main
                    style={{ textAlign: "center", padding: "var(--space-8)" }}
                >
                    <p>
                        {session?.config.texts.loadingMessage ||
                            "Loading your inspection..."}
                    </p>
                </main>
            </div>
        );
    }

    // Show desktop redirect page on desktop devices
    if (deviceType === "desktop" && session) {
        return <DesktopRedirectPage session={session} />;
    }

    return (
        <div
            className="app"
            style={{
                height: "100vh",
                display: "flex",
                flexDirection: "column",
            }}
        >
            {/* Logo Header */}
            <Header
                logoUrl={session.config.branding.logoUrl}
                logoHeight={session.config.branding.logoHeight}
            />

            {/* Secondary Header - Title and Step Counter */}
            <div
                style={{
                    padding: "var(--space-3) var(--space-4)",
                    borderBottom: "1px solid var(--gray-200)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <h1 style={{ fontSize: "var(--text-base)", margin: 0 }}>
                    {session.config.branding.title}
                </h1>
                <span
                    style={{
                        fontSize: "var(--text-sm)",
                        color: "var(--gray-600)",
                    }}
                >
                    Step {currentStep.stepNumber} of {currentStep.totalSteps}
                </span>
            </div>

            {/* Progress bar */}
            <div
                style={{
                    height: "4px",
                    background: "var(--gray-200)",
                }}
            >
                <div
                    style={{
                        height: "100%",
                        width: `${((currentStep.stepNumber - 1) / currentStep.totalSteps) * 100}%`,
                        background: "var(--primary-500)",
                        transition: "width 0.3s ease",
                    }}
                />
            </div>

            {/* Main content */}
            <main style={{ flex: 1, position: "relative", overflow: "hidden" }}>
                <InspectionCamera
                    targetObject={currentStep.targetObject}
                    negativeLabels={currentStep.negativeLabels}
                    threshold={currentStep.detectionThreshold}
                    countdownSeconds={currentStep.countdownSeconds}
                    onModelReady={handleModelReady}
                    onCaptureComplete={handleCaptureComplete}
                />
            </main>

            {/* Bottom info panel */}
            <div
                style={{
                    padding: "var(--space-4)",
                    borderTop: "1px solid var(--gray-200)",
                    background: "white",
                }}
            >
                <h2
                    style={{
                        fontSize: "var(--text-lg)",
                        margin: "0 0 var(--space-2) 0",
                    }}
                >
                    Find: {currentStep.targetObject.displayName}
                </h2>
                <p
                    style={{
                        margin: 0,
                        color: "var(--gray-600)",
                        fontSize: "var(--text-sm)",
                    }}
                >
                    {currentStep.targetObject.description}
                </p>
                {phase === "detecting" && currentScore > 0 && (
                    <div style={{ marginTop: "var(--space-2)" }}>
                        <div
                            style={{
                                height: "4px",
                                background: "var(--gray-200)",
                                borderRadius: "var(--radius-sm)",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    height: "100%",
                                    width: `${currentScore * 100}%`,
                                    background:
                                        currentScore >=
                                        currentStep.detectionThreshold
                                            ? "var(--success-color)"
                                            : "var(--warning-color)",
                                    transition: "width 0.2s ease",
                                }}
                            />
                        </div>
                        <span
                            style={{
                                fontSize: "var(--text-xs)",
                                color: "var(--gray-500)",
                            }}
                        >
                            Detection: {Math.round(currentScore * 100)}%
                        </span>
                    </div>
                )}
                {phase === "countdown" && (
                    <div
                        style={{
                            marginTop: "var(--space-2)",
                            fontSize: "var(--text-2xl)",
                            fontWeight: "bold",
                            color: "var(--primary-500)",
                        }}
                    >
                        Capturing in {countdownValue}...
                    </div>
                )}
                {phase === "uploading" && (
                    <div
                        style={{
                            marginTop: "var(--space-2)",
                            color: "var(--gray-600)",
                        }}
                    >
                        Uploading photo...
                    </div>
                )}
            </div>

            {/* FAQ link */}
            {session.config.faqItems && (
                <button
                    onClick={() => navigate(`/inspect/${sessionId}/faq`)}
                    style={{
                        position: "absolute",
                        bottom: "100px",
                        right: "var(--space-4)",
                        padding: "var(--space-2) var(--space-4)",
                        background: "rgba(0,0,0,0.7)",
                        color: "white",
                        border: "none",
                        borderRadius: "var(--radius-xl)",
                        fontSize: "var(--text-xs)",
                        cursor: "pointer",
                    }}
                >
                    Need help?
                </button>
            )}
        </div>
    );
}
