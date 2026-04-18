import { type APIRequestContext, type APIResponse } from '@playwright/test';
import { BaseApiClient } from './base.client';

const BASE = 'https://jsonplaceholder.typicode.com';

// ─── Resource types ────────────────────────────────────────────────────────────

export interface JsonPost {
  userId: number;
  id: number;
  title: string;
  body: string;
}

export interface JsonUser {
  id: number;
  name: string;
  username: string;
  email: string;
  website: string;
}

export interface JsonComment {
  postId: number;
  id: number;
  name: string;
  email: string;
  body: string;
}

export interface CreatePostPayload {
  userId: number;
  title: string;
  body: string;
}

// ─── Client ────────────────────────────────────────────────────────────────────

export class JsonPlaceholderClient extends BaseApiClient {
  constructor(request: APIRequestContext) {
    super(request);
  }

  // ─── Posts ─────────────────────────────────────────────────────────────────

  listPosts(userId?: number): Promise<APIResponse> {
    return this.get(`${BASE}/posts`, userId !== undefined ? { params: { userId } } : {});
  }

  getPost(id: number): Promise<APIResponse> {
    return this.get(`${BASE}/posts/${id}`);
  }

  createPost(payload: CreatePostPayload): Promise<APIResponse> {
    return this.post(`${BASE}/posts`, payload);
  }

  updatePost(id: number, payload: Partial<CreatePostPayload> & { id?: number }): Promise<APIResponse> {
    return this.put(`${BASE}/posts/${id}`, payload);
  }

  patchPost(id: number, payload: Partial<CreatePostPayload>): Promise<APIResponse> {
    return this.patch(`${BASE}/posts/${id}`, payload);
  }

  deletePost(id: number): Promise<APIResponse> {
    return this.delete(`${BASE}/posts/${id}`);
  }

  // ─── Users ─────────────────────────────────────────────────────────────────

  listUsers(): Promise<APIResponse> {
    return this.get(`${BASE}/users`);
  }

  getUser(id: number): Promise<APIResponse> {
    return this.get(`${BASE}/users/${id}`);
  }

  // ─── Comments ──────────────────────────────────────────────────────────────

  listComments(postId?: number): Promise<APIResponse> {
    return this.get(`${BASE}/comments`, postId !== undefined ? { params: { postId } } : {});
  }
}
