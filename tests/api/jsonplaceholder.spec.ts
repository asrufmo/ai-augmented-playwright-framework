import { test, expect } from '@playwright/test';
import { JsonPlaceholderClient } from '../../api-clients/jsonplaceholder.client';
import { HTTP_STATUS, PERF } from '../../constants';
import type { JsonPost, JsonUser, JsonComment } from '../../api-clients/jsonplaceholder.client';

test.describe('JSONPlaceholder API', () => {
  let client: JsonPlaceholderClient;

  test.beforeEach(async ({ request }) => {
    client = new JsonPlaceholderClient(request);
  });

  // ─── GET /posts ────────────────────────────────────────────────────────────

  test.describe('GET /posts', () => {
    test('returns 100 posts with correct shape', async () => {
      const start = Date.now();
      const response = await client.listPosts();
      const duration = Date.now() - start;

      expect(response.status()).toBe(HTTP_STATUS.OK);

      const posts: JsonPost[] = await response.json();
      expect(posts).toHaveLength(100);
      expect(posts[0]).toMatchObject({
        userId: expect.any(Number),
        id: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      });
      expect(duration).toBeLessThan(PERF.API_MAX_RESPONSE_MS);
    });

    test('filters posts by userId', async () => {
      const response = await client.listPosts(1);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const posts: JsonPost[] = await response.json();
      expect(posts.length).toBeGreaterThan(0);
      posts.forEach(p => expect(p.userId).toBe(1));
    });
  });

  // ─── GET /posts/:id ────────────────────────────────────────────────────────

  test.describe('GET /posts/:id', () => {
    test('returns the correct post by id', async () => {
      const response = await client.getPost(1);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const post: JsonPost = await response.json();
      expect(post).toMatchObject({
        id: 1,
        userId: expect.any(Number),
        title: expect.any(String),
        body: expect.any(String),
      });
      expect(post.title.length).toBeGreaterThan(0);
    });

    test('returns 404 for a non-existent post id', async () => {
      const response = await client.getPost(9999);
      expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ─── POST /posts ───────────────────────────────────────────────────────────

  test.describe('POST /posts', () => {
    test('creates a post and returns 201 with the new resource', async () => {
      const payload = { userId: 1, title: 'Test Post Title', body: 'Test post body content.' };

      const response = await client.createPost(payload);
      expect(response.status()).toBe(HTTP_STATUS.CREATED);

      const post: JsonPost = await response.json();
      expect(post).toMatchObject({ ...payload, id: expect.any(Number) });
    });
  });

  // ─── PUT /posts/:id ────────────────────────────────────────────────────────

  test.describe('PUT /posts/:id', () => {
    test('replaces a post and returns 200 with updated data', async () => {
      const payload = { id: 1, userId: 1, title: 'Updated Title', body: 'Updated body.' };

      const response = await client.updatePost(1, payload);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const post: JsonPost = await response.json();
      expect(post).toMatchObject({ id: 1, title: 'Updated Title', body: 'Updated body.' });
    });
  });

  // ─── PATCH /posts/:id ─────────────────────────────────────────────────────

  test.describe('PATCH /posts/:id', () => {
    test('partially updates a post title', async () => {
      const response = await client.patchPost(1, { title: 'Patched Title Only' });
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const post: JsonPost = await response.json();
      expect(post.title).toBe('Patched Title Only');
      expect(post.id).toBe(1);
    });
  });

  // ─── DELETE /posts/:id ────────────────────────────────────────────────────

  test.describe('DELETE /posts/:id', () => {
    test('deletes a post and returns 200 with empty body', async () => {
      const response = await client.deletePost(1);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const body = await response.json();
      expect(body).toEqual({});
    });
  });

  // ─── GET /users ────────────────────────────────────────────────────────────

  test.describe('GET /users', () => {
    test('returns exactly 10 users with expected shape', async () => {
      const response = await client.listUsers();
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const users: JsonUser[] = await response.json();
      expect(users).toHaveLength(10);
      users.forEach(u => {
        expect(u).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          username: expect.any(String),
          email: expect.stringMatching(/@/),
          website: expect.any(String),
        });
      });
    });
  });

  // ─── GET /users/:id ────────────────────────────────────────────────────────

  test.describe('GET /users/:id', () => {
    test('returns the correct user by id', async () => {
      const response = await client.getUser(1);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const user: JsonUser = await response.json();
      expect(user.id).toBe(1);
      expect(user.name).toBeTruthy();
      expect(user.email).toMatch(/@/);
    });

    test('returns 404 for a non-existent user id', async () => {
      const response = await client.getUser(9999);
      expect(response.status()).toBe(HTTP_STATUS.NOT_FOUND);
    });
  });

  // ─── GET /comments ─────────────────────────────────────────────────────────

  test.describe('GET /comments', () => {
    test('returns 500 total comments', async () => {
      const response = await client.listComments();
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const comments: JsonComment[] = await response.json();
      expect(comments).toHaveLength(500);
    });

    test('filters comments by postId and validates shape', async () => {
      const response = await client.listComments(1);
      expect(response.status()).toBe(HTTP_STATUS.OK);

      const comments: JsonComment[] = await response.json();
      expect(comments.length).toBeGreaterThan(0);
      comments.forEach(c => {
        expect(c).toMatchObject({
          postId: 1,
          id: expect.any(Number),
          name: expect.any(String),
          email: expect.stringMatching(/@/),
          body: expect.any(String),
        });
      });
    });
  });
});
