/**
 * Test Setup
 * Basic test utilities and setup
 */

import { initializeDatabase, getStorageManager } from '../src/storage/database.js';
import { SessionManager } from '../src/managers/session-manager.js';

let testStorageManager = null;
let testSessionManager = null;

/**
 * Setup test environment
 */
export async function setupTests() {
  testStorageManager = await initializeDatabase();
  testSessionManager = new SessionManager(testStorageManager);
  return { testStorageManager, testSessionManager };
}

/**
 * Cleanup test environment
 */
export async function cleanupTests() {
  if (testStorageManager) {
    await testStorageManager.close();
  }
}

/**
 * Create a test session
 */
export async function createTestSession(name = 'Test Session') {
  if (!testSessionManager) {
    await setupTests();
  }
  return await testSessionManager.createSession({ name });
}
