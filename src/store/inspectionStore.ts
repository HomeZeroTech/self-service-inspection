import { create } from 'zustand';
import type { SessionResponse, InspectionStep } from '../api/types';

type InspectionPhase =
  | 'loading'        // Fetching session
  | 'model-loading'  // Loading ML model
  | 'detecting'      // Looking for object
  | 'countdown'      // Object detected, counting down
  | 'capturing'      // Taking photo
  | 'uploading'      // Uploading to server
  | 'complete'       // All steps done
  | 'error';         // Error state

interface InspectionState {
  // Session data
  sessionId: string | null;
  session: SessionResponse | null;
  currentStep: InspectionStep | null;

  // Phase management
  phase: InspectionPhase;
  error: string | null;

  // Detection state
  currentScore: number;
  isDetected: boolean;
  sustainedDetectionStart: number | null;

  // Countdown state
  countdownValue: number;

  // Actions
  setSessionId: (sessionId: string) => void;
  setSession: (session: SessionResponse) => void;
  setPhase: (phase: InspectionPhase) => void;
  setError: (error: string | null) => void;
  setCurrentStep: (step: InspectionStep | null) => void;

  // Detection actions
  updateDetection: (score: number, threshold: number) => void;
  resetDetection: () => void;

  // Countdown actions
  setCountdownValue: (value: number) => void;

  // Reset
  reset: () => void;
}

const SUSTAINED_DETECTION_MS = 1000; // 1 second sustained detection

export const useInspectionStore = create<InspectionState>((set, get) => ({
  // Initial state
  sessionId: null,
  session: null,
  currentStep: null,
  phase: 'loading',
  error: null,
  currentScore: 0,
  isDetected: false,
  sustainedDetectionStart: null,
  countdownValue: 3,

  // Session actions
  setSessionId: (sessionId) => set({ sessionId }),

  setSession: (session) =>
    set({
      session,
      currentStep: session.currentStep,
      phase: session.status === 'completed' ? 'complete' : 'model-loading',
    }),

  setPhase: (phase) => set({ phase }),

  setError: (error) => set({ error, phase: error ? 'error' : get().phase }),

  setCurrentStep: (step) => set({ currentStep: step }),

  // Detection actions
  updateDetection: (score, threshold) => {
    const now = Date.now();
    const state = get();
    const detected = score >= threshold;

    if (detected) {
      // Object is detected
      if (!state.isDetected) {
        // Just started detecting - record start time
        set({
          currentScore: score,
          isDetected: true,
          sustainedDetectionStart: now,
        });
      } else {
        // Already detecting - check if sustained long enough
        const startTime = state.sustainedDetectionStart || now;
        const elapsed = now - startTime;

        set({ currentScore: score });

        if (elapsed >= SUSTAINED_DETECTION_MS && state.phase === 'detecting') {
          // Sustained detection achieved - start countdown
          set({
            phase: 'countdown',
            countdownValue: state.currentStep?.countdownSeconds || 3,
          });
        }
      }
    } else {
      // Object not detected - reset sustained detection
      set({
        currentScore: score,
        isDetected: false,
        sustainedDetectionStart: null,
      });

      // If we were in countdown, go back to detecting
      if (state.phase === 'countdown') {
        set({ phase: 'detecting' });
      }
    }
  },

  resetDetection: () =>
    set({
      currentScore: 0,
      isDetected: false,
      sustainedDetectionStart: null,
    }),

  // Countdown actions
  setCountdownValue: (value) => set({ countdownValue: value }),

  // Reset all state
  reset: () =>
    set({
      sessionId: null,
      session: null,
      currentStep: null,
      phase: 'loading',
      error: null,
      currentScore: 0,
      isDetected: false,
      sustainedDetectionStart: null,
      countdownValue: 3,
    }),
}));
