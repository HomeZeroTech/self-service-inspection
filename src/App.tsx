import { Routes, Route, Navigate } from "react-router-dom";
import { InspectionPage } from "./pages/InspectionPage";
import { CompletionPage } from "./pages/CompletionPage";
import { ErrorPage } from "./pages/ErrorPage";
import { WebcamClassifier } from "./components/WebcamClassifier";
import "./App.css";

function App() {
    return (
        <Routes>
            {/* Main inspection flow */}
            <Route path="/inspect/:sessionId" element={<InspectionPage />} />
            <Route path="/inspect/:sessionId/complete" element={<CompletionPage />} />
            <Route path="/inspect/:sessionId/faq" element={<InspectionPage showFAQ />} />

            {/* Error page */}
            <Route path="/error" element={<ErrorPage />} />

            {/* Legacy: prototype classifier for testing */}
            <Route path="/prototype" element={
                <div className="app">
                    <header>
                        <h1>Real-Time Image Classification</h1>
                        <p>WebGPU-accelerated zero-shot classification with SigLIP 2</p>
                    </header>
                    <main>
                        <WebcamClassifier />
                    </main>
                    <footer>
                        <p>
                            Powered by{" "}
                            <a
                                href="https://huggingface.co/docs/transformers.js"
                                target="_blank"
                                rel="noopener"
                            >
                                Transformers.js
                            </a>{" "}
                            &{" "}
                            <a
                                href="https://huggingface.co/onnx-community/siglip2-base-patch16-224-ONNX"
                                target="_blank"
                                rel="noopener"
                            >
                                SigLIP 2 (224-Res)
                            </a>
                        </p>
                    </footer>
                </div>
            } />

            {/* Default redirect to a demo session */}
            <Route path="/" element={<Navigate to="/inspect/demo-session-123" replace />} />

            {/* Catch all - redirect to error */}
            <Route path="*" element={<Navigate to="/error" replace />} />
        </Routes>
    );
}

export default App;
