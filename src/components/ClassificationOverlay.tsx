import { ClassificationResult } from '../types';

interface Props {
  results: ClassificationResult[];
  isInferring: boolean;
}

export function ClassificationOverlay({ results, isInferring }: Props) {
  if (results.length === 0 && !isInferring) {
    return (
      <div className="classification-overlay empty">
        <p>Analyzing...</p>
      </div>
    );
  }

  return (
    <div className="classification-overlay">
      {isInferring && <div className="inferring-indicator" />}
      <ul className="results-list">
        {results.map((result, index) => (
          <li key={result.label} className="result-item">
            <div className="result-header">
              <span className="result-rank">#{index + 1}</span>
              <span className="result-label">{result.label}</span>
              <span className="result-score">{(result.score * 100).toFixed(1)}%</span>
            </div>
            <div className="result-bar-container">
              <div
                className="result-bar"
                style={{ width: `${result.score * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
