import { request } from './client';
import {
  shouldUseMockAPI,
  mockGetSession,
  mockCaptureStep,
} from './mocks';
import type {
  SessionResponse,
  CaptureRequest,
  CaptureResponse,
} from './types';

export async function getSession(sessionId: string): Promise<SessionResponse> {
  if (shouldUseMockAPI()) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockGetSession(sessionId);
  }
  return request<SessionResponse>(`/sessions/${sessionId}`);
}

export async function captureStep(
  sessionId: string,
  stepId: string,
  data: CaptureRequest
): Promise<CaptureResponse> {
  if (shouldUseMockAPI()) {
    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 800));
    return mockCaptureStep(sessionId, stepId, data.imageData, data.detectedScore);
  }
  return request<CaptureResponse>(`/sessions/${sessionId}/steps/${stepId}/capture`, {
    method: 'POST',
    body: data,
  });
}
