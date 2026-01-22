import { useSearchParams } from 'react-router-dom';

export function ErrorPage() {
  const [searchParams] = useSearchParams();
  const message = searchParams.get('message') || 'Something went wrong';

  return (
    <div className="app">
      <main style={{ textAlign: 'center', padding: '2rem' }}>
        <h1 style={{ color: '#ef4444', marginBottom: '1rem' }}>Oops!</h1>
        <p style={{ fontSize: '1.125rem', color: '#666', marginBottom: '2rem' }}>
          {message}
        </p>
        <p style={{ color: '#999' }}>
          Please check your link and try again, or contact support if the problem persists.
        </p>
      </main>
    </div>
  );
}
