import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSession } from '../api/sessions';
import { Header } from '../components/branding/Header';
import type { SessionResponse } from '../api/types';

export function CompletionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;

    getSession(sessionId)
      .then(setSession)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) {
    return (
      <div className="app">
        {session && (
          <Header
            logoUrl={session.config.branding.logoUrl}
            logoHeight={session.config.branding.logoHeight}
          />
        )}
        <main style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      {session && (
        <Header
          logoUrl={session.config.branding.logoUrl}
          logoHeight={session.config.branding.logoHeight}
        />
      )}
      <main style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
        <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>&#10003;</div>
        <h1 style={{ color: 'var(--success-color)', marginBottom: 'var(--space-4)' }}>
          Inspection Complete!
        </h1>
        <p style={{ fontSize: 'var(--text-lg)', color: 'var(--gray-600)', marginBottom: 'var(--space-8)' }}>
          {session?.config.texts.successMessage || 'Thank you for completing your home energy inspection.'}
        </p>

        {session?.completedSteps && session.completedSteps.length > 0 && (
          <div style={{ marginTop: 'var(--space-8)', textAlign: 'left', maxWidth: '400px', margin: 'var(--space-8) auto' }}>
            <h3 style={{ marginBottom: 'var(--space-4)' }}>Completed Steps</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {session.completedSteps.map((step, index) => (
                <li
                  key={step.stepId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) 0',
                    borderBottom: '1px solid var(--gray-200)',
                  }}
                >
                  <span style={{ color: 'var(--success-color)' }}>&#10003;</span>
                  <span>Step {index + 1}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--gray-500)', fontSize: 'var(--text-sm)' }}>
                    {Math.round(step.detectedScore * 100)}% confidence
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {session?.config.faqItems && (
          <Link
            to={`/inspect/${sessionId}/faq`}
            style={{ color: 'var(--primary-600)', textDecoration: 'underline' }}
          >
            View FAQ
          </Link>
        )}
      </main>
    </div>
  );
}
