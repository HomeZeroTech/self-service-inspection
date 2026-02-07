import { QRCodeSVG } from "qrcode.react";
import Lottie from "lottie-react";
import { Header } from "../components/branding/Header";
import { useQRCodeUrl } from "../hooks/useQRCodeUrl";
import type { SessionResponse } from "../api/types";
import phoneAnimationData from "../assets/animations/phone-scan.json";
import "./DesktopRedirectPage.css";

interface DesktopRedirectPageProps {
    session: SessionResponse;
}

// Get all steps from the session (including completed + current)
function getAllSteps(session: SessionResponse) {
    const steps: Array<{
        stepNumber: number;
        displayName: string;
        subtitle?: string;
    }> = [];

    // Add completed steps
    session.completedSteps.forEach((_, index) => {
        steps.push({
            stepNumber: index + 1,
            displayName: `Step ${index + 1}`,
            subtitle: undefined,
        });
    });

    // Add current step
    if (session.currentStep) {
        steps.push({
            stepNumber: session.currentStep.stepNumber,
            displayName: session.currentStep.targetObject.displayName,
            subtitle: session.currentStep.targetObject.subtitle,
        });

        // Add remaining steps (we don't have full info, but we know total)
        for (
            let i = session.currentStep.stepNumber + 1;
            i <= session.currentStep.totalSteps;
            i++
        ) {
            steps.push({
                stepNumber: i,
                displayName: `Stap ${i}`,
                subtitle: undefined,
            });
        }
    }

    return steps;
}

/**
 * Desktop Redirect Page
 *
 * Shows a QR code for mobile users to scan and access the inspection.
 * Only shown on desktop devices.
 */
export function DesktopRedirectPage({ session }: DesktopRedirectPageProps) {
    const qrCodeUrl = useQRCodeUrl();

    // Use allSteps from API if available, otherwise compute from current step
    const steps = session.allSteps || getAllSteps(session);

    // Step icons using emoji for now - could be replaced with actual icons
    const stepIcons = ["📊", "🔥", "❄️", "🌡️", "🏠"];

    return (
        <div className="desktop-redirect-page">
            <Header
                logoUrl={session.config.branding.logoUrl}
                logoHeight={session.config.branding.logoHeight}
            />

            <div className="desktop-redirect-content">
                {/* Left Panel - QR Code */}
                <div className="desktop-redirect-left">
                    <div className="qr-card">
                        <div className="qr-code-wrapper">
                            <QRCodeSVG
                                value={qrCodeUrl}
                                size={180}
                                level="H"
                                includeMargin={false}
                            />
                        </div>
                        <h2 className="qr-card-title">
                            Scan de QR code met jouw telefoon
                        </h2>
                        <p className="qr-card-subtitle">
                            Open de standaard camera-app op je telefoon en scan
                            de code om de inspectie te starten
                        </p>
                    </div>

                    {/* Speech bubbles section */}
                    <div className="speech-section">
                        <div className="avatar">👤</div>
                        <div className="speech-bubbles">
                            <div className="speech-bubble">
                                Hallo! Ik ben Stijn van HeatTransformers. Deze
                                tool zit in de test fase, mocht er iets niet
                                lukken dan is dit geen probleem. Neem contact op
                                met je adviseur.
                            </div>
                            <div className="speech-bubble speech-bubble-cta">
                                Scan de QR code hierboven om te starten!
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Animation and Steps */}
                <div className="desktop-redirect-right">
                    <div className="animation-card">
                        <div className="lottie-container">
                            <Lottie
                                animationData={phoneAnimationData}
                                loop={true}
                                autoplay={true}
                            />
                        </div>
                    </div>

                    <div className="steps-section">
                        <h3 className="steps-title">Stappen door het huis</h3>
                        <div className="steps-list">
                            {steps.map((step, index) => (
                                <div
                                    key={step.stepNumber}
                                    className="step-item"
                                >
                                    <div className="step-icon">
                                        {stepIcons[index] || "📷"}
                                    </div>
                                    <div className="step-content">
                                        <span className="step-label">
                                            STAP {step.stepNumber}
                                        </span>
                                        <h4 className="step-name">
                                            {step.displayName}
                                        </h4>
                                        {step.subtitle && (
                                            <p className="step-subtitle">
                                                {step.subtitle}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
