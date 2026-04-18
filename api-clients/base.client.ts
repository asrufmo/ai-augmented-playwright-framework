import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { logger, logApiCall } from '../utils/logger';
import { TIMEOUT } from '../constants';
import type { ApiError } from '../types';

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean>;
  timeout?: number;
}

/**
 * BaseApiClient wraps Playwright's APIRequestContext with:
 * - Automatic Authorization header injection
 * - Response time measurement + logging
 * - Typed response unwrapping
 * - Consistent error handling
 *
 * Concrete clients extend this and declare their base path prefix.
 */
export abstract class BaseApiClient {
  protected readonly request: APIRequestContext;
  protected token?: string;

  constructor(request: APIRequestContext, token?: string) {
    this.request = request;
    this.token = token;
  }

  setToken(token: string): void {
    this.token = token;
  }

  clearToken(): void {
    this.token = undefined;
  }

  // ─── Core request methods ─────────────────────────────────────────────────

  protected async get(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.send('GET', url, options);
  }

  protected async post(url: string, body: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.send('POST', url, options, body);
  }

  protected async put(url: string, body: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.send('PUT', url, options, body);
  }

  protected async patch(url: string, body: unknown, options: RequestOptions = {}): Promise<APIResponse> {
    return this.send('PATCH', url, options, body);
  }

  protected async delete(url: string, options: RequestOptions = {}): Promise<APIResponse> {
    return this.send('DELETE', url, options);
  }

  // ─── Response helpers ──────────────────────────────────────────────────────

  protected async parseJson<T>(response: APIResponse): Promise<T> {
    try {
      return await response.json() as T;
    } catch {
      const text = await response.text();
      throw new Error(`Failed to parse JSON. Status: ${response.status()}, Body: ${text.slice(0, 200)}`);
    }
  }

  protected async assertOk(response: APIResponse): Promise<void> {
    if (!response.ok()) {
      let errorBody: ApiError | undefined;
      try {
        errorBody = await response.json() as ApiError;
      } catch { /* ignore parse failure */ }
      const msg = errorBody?.message ?? (await response.text().catch(() => 'unknown'));
      throw new Error(`HTTP ${response.status()} ${response.statusText()} — ${msg}`);
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  private async send(
    method: string,
    url: string,
    options: RequestOptions,
    body?: unknown,
  ): Promise<APIResponse> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const start = Date.now();
    logger.debug(`→ ${method} ${url}`);

    const response = await this.request.fetch(url, {
      method,
      headers,
      params: options.params as Record<string, string>,
      data: body !== undefined ? JSON.stringify(body) : undefined,
      timeout: options.timeout ?? TIMEOUT.API,
    });

    const duration = Date.now() - start;
    logApiCall(method, url, response.status(), duration);

    return response;
  }
}
