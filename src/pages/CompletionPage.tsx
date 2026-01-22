import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getSession } from '../api/sessions';
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
        <main style={{ textAlign: 'center', padding: '2rem' }}>
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>&#10003;</div>
        <h1 style={{ color: '#22c55e', marginBottom: '1rem' }}>
          Inspection Complete!
        </h1>
        <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '2rem' }}>
          {session?.config.texts.successMessage || 'Thank you for completing your home energy inspection.'}
        </p>

        {session?.completedSteps && session.completedSteps.length > 0 && (
          <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: '400px', margin: '2rem auto' }}>
            <h3 style={{ marginBottom: '1rem' }}>Completed Steps</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {session.completedSteps.map((step, index) => (
                <li
                  key={step.stepId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <span style={{ color: '#22c55e' }}>&#10003;</span>
                  <span>Step {index + 1}</span>
                  <span style={{ marginLeft: 'auto', color: '#999', fontSize: '0.875rem' }}>
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
            style={{ color: '#2563eb', textDecoration: 'underline' }}
          >
            View FAQ
          </Link>
        )}
      </main>
    </div>
  );
}
