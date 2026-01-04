/**
 * Integration Tests for API Endpoints
 * Note: These tests require the server to be running
 * Start server with: npm start
 * Then run: npm test
 */

import { test } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';

const BASE_URL = 'http://localhost:3000';
let sessionId = null;

async function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {}
    };

    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, body: parsed });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

test('API - GET /api/health should return ok', async () => {
  const response = await makeRequest('GET', '/api/health');
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.status, 'ok');
  assert.ok(response.body.timestamp);
});

test('API - POST /api/sessions should create a session', async () => {
  const response = await makeRequest('POST', '/api/sessions', { name: 'API Test Session' });
  assert.strictEqual(response.status, 200);
  assert.ok(response.body.sessionId);
  assert.strictEqual(response.body.name, 'API Test Session');
  assert.strictEqual(response.body.status, 'idle');
  sessionId = response.body.sessionId;
});

test('API - GET /api/sessions should return all sessions', async () => {
  const response = await makeRequest('GET', '/api/sessions');
  assert.strictEqual(response.status, 200);
  assert.ok(Array.isArray(response.body));
  assert.ok(response.body.length > 0);
});

test('API - GET /api/sessions/:sessionId should return session', async () => {
  if (!sessionId) {
    const createResponse = await makeRequest('POST', '/api/sessions', { name: 'Get Test Session' });
    sessionId = createResponse.body.sessionId;
  }

  const response = await makeRequest('GET', `/api/sessions/${sessionId}`);
  assert.strictEqual(response.status, 200);
  assert.strictEqual(response.body.sessionId, sessionId);
});

test('API - GET /api/sessions/:sessionId should return 404 for non-existent session', async () => {
  const fakeId = '00000000-0000-0000-0000-000000000000';
  const response = await makeRequest('GET', `/api/sessions/${fakeId}`);
  assert.strictEqual(response.status, 404);
});
