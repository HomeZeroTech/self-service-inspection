// API Types for Digital Inspection

export interface TargetObject {
  label: string;
  embedding: number[];
  displayName: string;
  description: string;
}

export interface NegativeLabel {
  label: string;
  embedding: number[];
}

export interface InspectionStep {
  stepId: string;
  stepNumber: number;
  totalSteps: number;
  targetObject: TargetObject;
  negativeLabels: NegativeLabel[];
  detectionThreshold: number;
  countdownSeconds: number;
}

export interface CompletedStep {
  stepId: string;
  imageUrl: string;
  capturedAt: string;
  detectedScore: number;
}

export interface SessionConfig {
  branding: {
    title: string;
    logoUrl?: string;
    primaryColor: string;
  };
  texts: {
    loadingMessage: string;
    successMessage: string;
    errorMessage: string;
  };
  faqItems?: Array<{
    question: string;
    answer: string;
  }>;
}

export type SessionStatus = 'active' | 'completed' | 'expired';

export interface SessionResponse {
  sessionId: string;
  status: SessionStatus;
  currentStep: InspectionStep | null;
  completedSteps: CompletedStep[];
  config: SessionConfig;
}

export interface CaptureRequest {
  imageData: string;
  detectedScore: number;
  capturedAt: string;
  deviceInfo?: {
    userAgent: string;
    screenWidth: number;
    screenHeight: number;
  };
}

export interface CaptureResponse {
  success: boolean;
  imageId: string;
  nextStep: InspectionStep | null;
  message?: string;
}

export type APIErrorCode =
  | 'SESSION_NOT_FOUND'
  | 'SESSION_EXPIRED'
  | 'STEP_ALREADY_COMPLETED'
  | 'INVALID_IMAGE'
  | 'SERVER_ERROR';

export interface APIError {
  error: string;
  code: APIErrorCode;
  message: string;
}
