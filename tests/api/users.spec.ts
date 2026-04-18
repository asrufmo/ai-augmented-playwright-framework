import { test, expect } from '../../fixtures';
import { UsersApiClient } from '../../api-clients/users.client';
import { HTTP_STATUS, PERF } from '../../constants';
import { unique } from '../../utils/helpers';
import type { User, PerformanceMetrics } from '../../types';

/**
 * Users API tests — CRUD + auth + performance + security scenarios.
 *
 * Uses the `usersClient` fixture which carries a pre-authenticated token.
 * Raw APIResponse assertions give full control over status codes.
 */
test.describe('Users API', () => {
  // ─── GET /users ──────────────────────────────────────────────────────────

  test.describe('GET /users', () => {
    test('should return paginated list of users', async ({ usersClient }) => {
      const start = Date.now();
      const response = await usersClient.listUsers({ page: 1, perPage: 10 });
      const duration = Date.now() - start;

      expect(response.status()).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('total');
      expect(body.data).toBeInstanceOf(Array);

      // Performance check
      const metric: PerformanceMetrics = {
        endpoint: '/users',
        method: 'GET',
        statusCode: response.status(),
        durationMs: duration,
        threshold: PERF.API_MAX_RESPONSE_MS,
        passed: duration < PERF.API_MAX_RESPONSE_MS,
      };
      expect(metric.passed, `Response time ${duration}ms exceeded threshold ${PERF.API_MAX_RESPONSE_MS}ms`).toBe(true);
    });

    test('should support filtering by role', async ({ usersClient }) => {
      const response = await usersClient.listUsers({ role: 'admin' });
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      const users: User[] = body.data;
      users.forEach(u => expect(u.role).toBe('admin'));
    });

    test('should return 401 without auth token', async ({ request }) => {
      // Deliberately unauthenticated client
      const unauthClient = new UsersApiClient(request);
      const response = await unauthClient.listUsers();
      expect(response.status()).toBe(HTTP_STATUS.UNAUTHORIZED);
    });
  });

  // ─── POST /users ─────────────────────────────────────────────────────────

  test.describe('POST /users', () => {
    test('should create a new user', async ({ usersClient }) => {
      const payload = {
        email: `${unique('user')}@example.com`,
        name: 'Test User',
        password: 'SecurePass1!',
        role: 'user' as const,
      };

      const response = await usersClient.createUser(payload);
      expect(response.status()).toBe(HTTP_STATUS.CREATED);

      const body = await response.json();
      expect(body.data).toMatchObject({
        email: payload.email,
        name: payload.name,
        role: payload.role,
      });
      // Password must never be returned
      expect(body.data).not.toHaveProperty('password');
      expect(body.data).toHaveProperty('id');
    });

    test('should return 409 for duplicate email', async ({ usersClient }) => {
      const email = `${unique('dup')}@example.com`;
      const payload = { email, name: 'Dup User', password: 'Pass1!', role: 'user' as const };

      await usersClient.createUserAndParse(payload);

      const response = await usersClient.createUser(payload);
      expect(response.status()).toBe(HTTP_STATUS.CONFLICT);
    });

    test('should return 422 for invalid payload', async ({ usersClient }) => {
      const response = await usersClient.createUser({
        email: 'not-valid-email',
        name: '',
        password: '123', // too short
      });
      expect(response.status()).toBe(HTTP_STATUS.UNPROCESSABLE);

      const body = await response.json();
      expect(body).toHaveProperty('errors');
    });

    test('should return 403 when viewer tries to create user', async ({ request, userToken }) => {
      // Re-use user token (viewer-level) to attempt admin action
      const viewerClient = new UsersApiClient(request, userToken);
      const response = await viewerClient.createUser({
        email: `${unique('v')}@example.com`,
        name: 'V',
        password: 'Pass1!',
        role: 'admin',
      });
      // Depending on API design: 403 Forbidden or 422
      expect([HTTP_STATUS.FORBIDDEN, HTTP_STATUS.UNPROCESSABLE]).toContain(response.status());
    });
  });

  // ─── PATCH /users/:id ────────────────────────────────────────────────────

  test.describe('PATCH /users/:id', () => {
    test('should update a user name', async ({ usersClient }) => {
      const user = await usersClient.createUserAndParse({
        email: `${unique('upd')}@example.com`,
        name: 'Original Name',
        password: 'Pass1!',
        role: 'user',
      });

      const response = await usersClient.updateUser(user.id, { name: 'Updated Name' });
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body.data.name).toBe('Updated Name');
    });
  });

  // ─── DELETE /users/:id ───────────────────────────────────────────────────

  test.describe('DELETE /users/:id', () => {
    test('should delete a user', async ({ usersClient }) => {
      const user = await usersClient.createUserAndParse({
        email: `${unique('del')}@example.com`,
        name: 'To Delete',
        password: 'Pass1!',
        role: 'user',
      });

      const deleteResponse = await usersClient.deleteUser(user.id);
      expect(deleteResponse.status()).toBe(HTTP_STATUS.NO_CONTENT);

      const getResponse = await usersClient.getUser(user.id);
      expect(getResponse.status()).toBe(HTTP_STATUS.NOT_FOUND);
    });

    test('should return 404 for non-existent user', async ({ usersClient }) => {
      const response = await usersClient.deleteUser(999_999_999);
      expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });
});
