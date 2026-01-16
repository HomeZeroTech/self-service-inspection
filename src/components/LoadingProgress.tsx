import { LoadingState } from '../types';
import { formatBytes } from '../utils/deviceChecks';

interface Props {
  loadingState: LoadingState;
}

export function LoadingProgress({ loadingState }: Props) {
  const { progress, status, loadedBytes, totalBytes, error, currentFile } = loadingState;

  if (error) {
    return (
      <div className="loading-error">
        <div className="error-icon">!</div>
        <h3>Error Loading Model</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div className="loading-progress">
      <div className="loading-spinner"></div>
      <h2>Loading AI Model</h2>
      <p className="loading-hint">This may take a moment on first load (~90MB)</p>

      <div className="progress-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="progress-percent">{progress.toFixed(0)}%</span>
      </div>

      <p className="progress-status">{status}</p>

      {currentFile && <p className="progress-file">{currentFile}</p>}

      {totalBytes > 0 && (
        <p className="progress-bytes">
          {formatBytes(loadedBytes)} / {formatBytes(totalBytes)}
        </p>
      )}
    </div>
  );
}
