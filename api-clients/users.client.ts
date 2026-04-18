import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { BaseApiClient } from './base.client';
import { API } from '../constants';
import type { CreateUserPayload, UpdateUserPayload, User, PaginatedResponse, ApiResponse } from '../types';

export interface ListUsersParams {
  page?: number;
  perPage?: number;
  role?: string;
  search?: string;
}

export class UsersApiClient extends BaseApiClient {
  constructor(request: APIRequestContext, token?: string) {
    super(request, token);
  }

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async listUsers(params?: ListUsersParams): Promise<APIResponse> {
    return this.get(API.USERS.BASE, {
      params: params as Record<string, string | number | boolean>,
    });
  }

  async getUser(id: number): Promise<APIResponse> {
    return this.get(API.USERS.BY_ID(id));
  }

  async createUser(payload: CreateUserPayload): Promise<APIResponse> {
    return this.post(API.USERS.BASE, payload);
  }

  async updateUser(id: number, payload: UpdateUserPayload): Promise<APIResponse> {
    return this.patch(API.USERS.BY_ID(id), payload);
  }

  async deleteUser(id: number): Promise<APIResponse> {
    return this.delete(API.USERS.BY_ID(id));
  }

  // ─── Typed helpers (parse + assert internally) ────────────────────────────

  async createUserAndParse(payload: CreateUserPayload): Promise<User> {
    const response = await this.createUser(payload);
    await this.assertOk(response);
    const body = await this.parseJson<ApiResponse<User>>(response);
    return body.data;
  }

  async listUsersAndParse(params?: ListUsersParams): Promise<PaginatedResponse<User>> {
    const response = await this.listUsers(params);
    await this.assertOk(response);
    return this.parseJson<PaginatedResponse<User>>(response);
  }
}
