import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { BaseApiClient } from './base.client';
import { API } from '../constants';
import type { LoginPayload, AuthTokens } from '../types';

export class AuthApiClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  async login(payload: LoginPayload): Promise<APIResponse> {
    return this.post(API.AUTH.LOGIN, payload);
  }

  async loginAndGetTokens(payload: LoginPayload): Promise<AuthTokens> {
    const response = await this.login(payload);
    await this.assertOk(response);
    const body = await this.parseJson<{ data: AuthTokens }>(response);
    this.setToken(body.data.accessToken);
    return body.data;
  }

  async logout(): Promise<APIResponse> {
    return this.post(API.AUTH.LOGOUT, {});
  }

  async getMe(): Promise<APIResponse> {
    return this.get(API.AUTH.ME);
  }

  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    const response = await this.post(API.AUTH.REFRESH, { refreshToken });
    await this.assertOk(response);
    const body = await this.parseJson<{ data: AuthTokens }>(response);
    this.setToken(body.data.accessToken);
    return body.data;
  }
}
