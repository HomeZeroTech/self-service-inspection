import { useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInspectionStore } from '../store/inspectionStore';
import { getSession, captureStep } from '../api/sessions';
import { InspectionCamera } from '../components/inspection/InspectionCamera';

interface InspectionPageProps {
  showFAQ?: boolean;
}

export function InspectionPage({ showFAQ = false }: InspectionPageProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

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
      navigate('/error?message=Invalid session link');
      return;
    }

    setSessionId(sessionId);

    getSession(sessionId)
      .then((data) => {
        setSession(data);
        if (data.status === 'completed') {
          navigate(`/inspect/${sessionId}/complete`);
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load session');
      });
  }, [sessionId, navigate, setSessionId, setSession, setError]);

  // Handle capture completion
  const handleCaptureComplete = useCallback(
    async (imageData: string, score: number) => {
      if (!sessionId || !currentStep) return;

      setPhase('uploading');

      try {
        const response = await captureStep(sessionId, currentStep.stepId, {
          imageData,
          detectedScore: score,
          capturedAt: new Date().toISOString(),
        });

        if (response.nextStep) {
          setCurrentStep(response.nextStep);
          setPhase('detecting');
          resetDetection();
        } else {
          navigate(`/inspect/${sessionId}/complete`);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [sessionId, currentStep, navigate, setPhase, setCurrentStep, setError, resetDetection]
  );

  // Handle model ready
  const handleModelReady = useCallback(() => {
    setPhase('detecting');
  }, [setPhase]);

  // Show FAQ modal if requested
  if (showFAQ && session?.config.faqItems) {
    return (
      <div className="app">
        <header style={{ padding: '1rem', borderBottom: '1px solid #eee' }}>
          <h1 style={{ fontSize: '1.25rem', margin: 0 }}>
            {session.config.branding.title}
          </h1>
        </header>
        <main style={{ padding: '1rem' }}>
          <h2>Frequently Asked Questions</h2>
          <div style={{ marginTop: '1rem' }}>
            {session.config.faqItems.map((item, index) => (
              <div key={index} style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {item.question}
                </h3>
                <p style={{ color: '#666', margin: 0 }}>{item.answer}</p>
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate(`/inspect/${sessionId}`)}
            style={{
              marginTop: '1rem',
              padding: '0.75rem 1.5rem',
              background: session.config.branding.primaryColor,
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
            }}
          >
            Back to Inspection
          </button>
        </main>
      </div>
    );
  }

  // Error state
  if (phase === 'error' || error) {
    return (
      <div className="app">
        <main style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ color: '#ef4444' }}>Error</h1>
          <p style={{ color: '#666' }}>{error || 'Something went wrong'}</p>
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
            Try Again
          </button>
        </main>
      </div>
    );
  }

  // Loading session
  if (phase === 'loading' || !session || !currentStep) {
    return (
      <div className="app">
        <main style={{ textAlign: 'center', padding: '2rem' }}>
          <p>{session?.config.texts.loadingMessage || 'Loading your inspection...'}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header
        style={{
          padding: '0.75rem 1rem',
          borderBottom: '1px solid #eee',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: '1rem', margin: 0 }}>
          {session.config.branding.title}
        </h1>
        <span style={{ fontSize: '0.875rem', color: '#666' }}>
          Step {currentStep.stepNumber} of {currentStep.totalSteps}
        </span>
      </header>

      {/* Progress bar */}
      <div
        style={{
          height: '4px',
          background: '#e5e7eb',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((currentStep.stepNumber - 1) / currentStep.totalSteps) * 100}%`,
            background: session.config.branding.primaryColor,
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
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
          padding: '1rem',
          borderTop: '1px solid #eee',
          background: 'white',
        }}
      >
        <h2 style={{ fontSize: '1.125rem', margin: '0 0 0.5rem 0' }}>
          Find: {currentStep.targetObject.displayName}
        </h2>
        <p style={{ margin: 0, color: '#666', fontSize: '0.875rem' }}>
          {currentStep.targetObject.description}
        </p>
        {phase === 'detecting' && currentScore > 0 && (
          <div style={{ marginTop: '0.5rem' }}>
            <div
              style={{
                height: '4px',
                background: '#e5e7eb',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${currentScore * 100}%`,
                  background: currentScore >= currentStep.detectionThreshold ? '#22c55e' : '#f59e0b',
                  transition: 'width 0.2s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '0.75rem', color: '#999' }}>
              Detection: {Math.round(currentScore * 100)}%
            </span>
          </div>
        )}
        {phase === 'countdown' && (
          <div
            style={{
              marginTop: '0.5rem',
              fontSize: '1.5rem',
              fontWeight: 'bold',
              color: session.config.branding.primaryColor,
            }}
          >
            Capturing in {countdownValue}...
          </div>
        )}
        {phase === 'uploading' && (
          <div style={{ marginTop: '0.5rem', color: '#666' }}>
            Uploading photo...
          </div>
        )}
      </div>

      {/* FAQ link */}
      {session.config.faqItems && (
        <button
          onClick={() => navigate(`/inspect/${sessionId}/faq`)}
          style={{
            position: 'absolute',
            bottom: '100px',
            right: '1rem',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.7)',
            color: 'white',
            border: 'none',
            borderRadius: '1rem',
            fontSize: '0.75rem',
            cursor: 'pointer',
          }}
        >
          Need help?
        </button>
      )}
    </div>
  );
}
