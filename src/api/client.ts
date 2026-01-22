import type { APIError } from './types';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export class APIException extends Error {
  code: string;

  constructor(error: APIError) {
    super(error.message);
    this.name = 'APIException';
    this.code = error.code;
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  timeout?: number;
  body?: unknown;
}

export async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { timeout = 10000, body, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let error: APIError;
      try {
        error = await response.json();
      } catch {
        error = {
          error: 'Unknown error',
          code: 'SERVER_ERROR',
          message: `HTTP ${response.status}: ${response.statusText}`,
        };
      }
      throw new APIException(error);
    }

    return response.json();
  } catch (error) {
    if (error instanceof APIException) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new APIException({
        error: 'Request timeout',
        code: 'SERVER_ERROR',
        message: 'The request timed out. Please try again.',
      });
    }
    throw new APIException({
      error: 'Network error',
      code: 'SERVER_ERROR',
      message: 'Unable to connect to the server. Please check your connection.',
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
