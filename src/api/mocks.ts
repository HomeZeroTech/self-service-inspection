/**
 * Mock API responses for development without a real backend.
 * This simulates the server-driven inspection flow.
 */

import { LABEL_EMBEDDINGS } from '../data/labelEmbeddings';
import type {
  SessionResponse,
  InspectionStep,
  CaptureResponse,
  SessionConfig,
  NegativeLabel,
  CompletedStep,
} from './types';

// Helper to get embedding for a label
function getEmbedding(label: string): number[] {
  const embedding = LABEL_EMBEDDINGS.labels[label as keyof typeof LABEL_EMBEDDINGS.labels];
  if (!embedding) {
    console.warn(`No embedding found for label: ${label}`);
    return [];
  }
  return [...embedding];
}

// Helper to create negative labels array
function createNegativeLabels(labels: string[]): NegativeLabel[] {
  return labels
    .map((label) => ({
      label,
      embedding: getEmbedding(label),
    }))
    .filter((nl) => nl.embedding.length > 0);
}

// Mock session configuration
const MOCK_CONFIG: SessionConfig = {
  branding: {
    title: 'Home Energy Inspection',
    primaryColor: '#2563eb',
  },
  texts: {
    loadingMessage: 'Preparing your inspection...',
    successMessage: 'Great! Photo captured successfully.',
    errorMessage: 'Something went wrong. Please try again.',
  },
  faqItems: [
    {
      question: 'Why do I need to take photos of my radiator?',
      answer: 'Photos help us assess your heating system and recommend energy-saving improvements.',
    },
    {
      question: 'What if I cannot find the item?',
      answer: 'You can skip items you cannot locate. Contact support if you need assistance.',
    },
    {
      question: 'Is my data secure?',
      answer: 'Yes, all photos are encrypted and stored securely. They are only used for your energy assessment.',
    },
  ],
};

// Define the 3 inspection steps
const INSPECTION_STEPS: Omit<InspectionStep, 'stepNumber' | 'totalSteps'>[] = [
  {
    stepId: 'step-radiator',
    targetObject: {
      label: 'a white metal radiator',
      embedding: getEmbedding('a white metal radiator'),
      displayName: 'Radiator',
      description: 'Point your camera at any radiator in your home. Make sure the full radiator is visible.',
    },
    negativeLabels: createNegativeLabels([
      'a door',
      'a thermostat',
      'a wall',
      'a floor',
      'a waterfall',
      'a beach',
      'a jungle',
      'a window',
      'a curtain',
      'an air conditioning unit',
    ]),
    detectionThreshold: 0.5,
    countdownSeconds: 3,
  },
  {
    stepId: 'step-energy-meter',
    targetObject: {
      label: 'a smart energy meter with digital display',
      embedding: getEmbedding('a smart energy meter with digital display'),
      displayName: 'Smart Energy Meter',
      description: 'Find your smart energy meter (usually near your fuse box) and point your camera at it.',
    },
    negativeLabels: createNegativeLabels([
      'a wall',
      'a floor',
      'a door',
      'pipes',
      'wires',
      'a waterfall',
      'a beach',
      'a jungle',
      'folding stairs',
      'a water meter',
      'a gas meter',
      'a fuse box',
      'an electrical panel',
    ]),
    detectionThreshold: 0.5,
    countdownSeconds: 3,
  },
  {
    stepId: 'step-boiler',
    targetObject: {
      label: 'a central heating boiler unit',
      embedding: getEmbedding('a central heating boiler unit'),
      displayName: 'Central Heating Boiler',
      description: 'Locate your boiler (often in a utility cupboard or kitchen) and point your camera at it.',
    },
    negativeLabels: createNegativeLabels([
      'a floor',
      'a door',
      'a wall',
      'an electric boiler',
      'a waterfall',
      'a beach',
      'a jungle',
      'a water heater',
      'an air conditioning unit',
      'a washing machine',
    ]),
    detectionThreshold: 0.5,
    countdownSeconds: 3,
  },
];

// In-memory session state (simulates server state)
interface MockSessionState {
  currentStepIndex: number;
  completedSteps: CompletedStep[];
  status: 'active' | 'completed' | 'expired';
}

const sessionStates = new Map<string, MockSessionState>();

// Get or create session state
function getSessionState(sessionId: string): MockSessionState {
  if (!sessionStates.has(sessionId)) {
    sessionStates.set(sessionId, {
      currentStepIndex: 0,
      completedSteps: [],
      status: 'active',
    });
  }
  return sessionStates.get(sessionId)!;
}

// Build full step with step number info
function buildFullStep(stepIndex: number): InspectionStep {
  const step = INSPECTION_STEPS[stepIndex];
  return {
    ...step,
    stepNumber: stepIndex + 1,
    totalSteps: INSPECTION_STEPS.length,
  };
}

/**
 * Mock implementation of getSession
 */
export function mockGetSession(sessionId: string): SessionResponse {
  // Validate session ID format (any non-empty string for mock)
  if (!sessionId || sessionId.length < 3) {
    throw {
      error: 'Invalid session',
      code: 'SESSION_NOT_FOUND',
      message: 'Session not found. Please check your link.',
    };
  }

  const state = getSessionState(sessionId);

  return {
    sessionId,
    status: state.status,
    currentStep: state.status === 'active' ? buildFullStep(state.currentStepIndex) : null,
    completedSteps: state.completedSteps,
    config: MOCK_CONFIG,
  };
}

/**
 * Mock implementation of captureStep
 */
export function mockCaptureStep(
  sessionId: string,
  stepId: string,
  imageData: string,
  detectedScore: number
): CaptureResponse {
  const state = getSessionState(sessionId);

  if (state.status !== 'active') {
    throw {
      error: 'Session not active',
      code: 'SESSION_EXPIRED',
      message: 'This inspection session is no longer active.',
    };
  }

  const currentStep = INSPECTION_STEPS[state.currentStepIndex];
  if (currentStep.stepId !== stepId) {
    throw {
      error: 'Invalid step',
      code: 'STEP_ALREADY_COMPLETED',
      message: 'This step has already been completed or is not the current step.',
    };
  }

  // Record the completed step
  state.completedSteps.push({
    stepId,
    imageUrl: imageData.substring(0, 50) + '...', // In real API, this would be a server URL
    capturedAt: new Date().toISOString(),
    detectedScore,
  });

  // Move to next step or complete
  state.currentStepIndex++;

  if (state.currentStepIndex >= INSPECTION_STEPS.length) {
    state.status = 'completed';
    return {
      success: true,
      imageId: `img-${Date.now()}`,
      nextStep: null,
      message: 'Inspection complete! Thank you for submitting all photos.',
    };
  }

  return {
    success: true,
    imageId: `img-${Date.now()}`,
    nextStep: buildFullStep(state.currentStepIndex),
  };
}

/**
 * Reset a mock session (for testing)
 */
export function resetMockSession(sessionId: string): void {
  sessionStates.delete(sessionId);
}

/**
 * Check if we should use mock API (development mode)
 */
export function shouldUseMockAPI(): boolean {
  return import.meta.env.DEV && !import.meta.env.VITE_API_BASE;
}
