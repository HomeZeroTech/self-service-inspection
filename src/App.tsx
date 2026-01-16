import { WebcamClassifier } from './components/WebcamClassifier';
import './App.css';

function App() {
  return (
    <div className="app">
      <header>
        <h1>Real-Time Image Classification</h1>
        <p>WebGPU-accelerated zero-shot classification with SigLIP2 NaFlex</p>
      </header>
      <main>
        <WebcamClassifier />
      </main>
      <footer>
        <p>
          Powered by{' '}
          <a href="https://huggingface.co/docs/transformers.js" target="_blank" rel="noopener">
            Transformers.js
          </a>{' '}
          &{' '}
          <a href="https://huggingface.co/onnx-community/siglip2-base-patch16-naflex-256" target="_blank" rel="noopener">
            SigLIP2 NaFlex
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
