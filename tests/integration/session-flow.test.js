/**
 * Integration Tests for Session Flow
 * Uses Node.js built-in test runner
 */

import { test, before, after } from 'node:test';
import assert from 'node:assert';
import { initializeDatabase } from '../../src/storage/database.js';
import { SessionManager } from '../../src/managers/session-manager.js';
import { getStorageManager } from '../../src/storage/database.js';

let storageManager;
let sessionManager;

before(async () => {
  storageManager = await initializeDatabase();
  sessionManager = new SessionManager(storageManager);
});

after(async () => {
  if (storageManager) {
    await storageManager.close();
  }
});

test('Session Flow - should create a session', async () => {
  const session = await sessionManager.createSession({
    name: 'Test Session',
    targetUrl: 'https://example.com'
  });

  assert.ok(session);
  assert.ok(session.sessionId);
  assert.strictEqual(session.name, 'Test Session');
  assert.strictEqual(session.status, 'idle');
  assert.ok(session.startTime);
});

test('Session Flow - should get session from database', async () => {
  const session = await sessionManager.createSession({ name: 'Test Session 2' });
  const retrieved = await storageManager.getSession(session.sessionId);

  assert.ok(retrieved);
  assert.strictEqual(retrieved.sessionId, session.sessionId);
  assert.strictEqual(retrieved.name, 'Test Session 2');
});

test('Session Flow - should get all sessions', async () => {
  await sessionManager.createSession({ name: 'Test Session 3' });
  const sessions = await storageManager.getAllSessions();

  assert.ok(Array.isArray(sessions));
  assert.ok(sessions.length > 0);
});

test('Session Flow - should start and stop a session', { timeout: 30000 }, async () => {
  const session = await sessionManager.createSession({ name: 'Integration Test Session' });
  
  // Start session
  const started = await sessionManager.startSession(
    session.sessionId,
    'https://example.com'
  );

  assert.strictEqual(started.status, 'active');
  assert.ok(started.browserLauncher);
  assert.ok(started.cdpClient);
  assert.ok(started.networkMonitor);

  // Wait a bit for some requests
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Stop session
  const stopped = await sessionManager.stopSession(session.sessionId);

  assert.strictEqual(stopped.status, 'stopped');
  assert.ok(stopped.endTime);
});

test('Session Flow - should delete a session', async () => {
  const session = await sessionManager.createSession({ name: 'Delete Test Session' });
  const sessionId = session.sessionId;

  await sessionManager.deleteSession(sessionId);

  const retrieved = await storageManager.getSession(sessionId);
  assert.strictEqual(retrieved, null);
});
