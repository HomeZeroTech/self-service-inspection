import { Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "./components/ThemeProvider";
import { InspectionPage } from "./pages/InspectionPage";
import { CompletionPage } from "./pages/CompletionPage";
import { ErrorPage } from "./pages/ErrorPage";
import { WebcamClassifier } from "./components/WebcamClassifier";
import "./App.css";

function App() {
    return (
        <ThemeProvider>
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
                        <p>WebGPU-accelerated zero-shot classification with MobileClip</p>
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
                                href="https://huggingface.co/Xenova/mobileclip_s2"
                                target="_blank"
                                rel="noopener"
                            >
                                MobileClip S2
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
        </ThemeProvider>
    );
}

export default App;
