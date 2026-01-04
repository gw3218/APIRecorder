/**
 * Example Usage of API Recorder
 * 
 * This file demonstrates how to use the API Recorder programmatically
 */

import { SessionManager } from '../src/managers/session-manager.js';
import { getStorageManager } from '../src/storage/database.js';
import { initializeDatabase } from '../src/storage/database.js';

async function example() {
  // Initialize database
  await initializeDatabase();
  const storageManager = getStorageManager();

  // Create session manager
  const sessionManager = new SessionManager(storageManager);

  // Create a new session
  const session = await sessionManager.createSession({
    name: 'Example Recording Session',
    targetUrl: 'https://example.com'
  });

  console.log('Created session:', session.sessionId);

  // Start recording
  const activeSession = await sessionManager.startSession(
    session.sessionId,
    'https://example.com'
  );

  console.log('Recording started. Browser is now capturing network traffic...');

  // Wait for some time to capture requests
  await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds

  // Stop recording
  const stoppedSession = await sessionManager.stopSession(session.sessionId);
  console.log('Recording stopped. Total requests:', stoppedSession.totalRequests);

  // Get all captured requests
  const requests = await storageManager.getRequestResponses(session.sessionId);
  console.log(`Captured ${requests.length} requests`);

  // Display some requests
  requests.slice(0, 5).forEach((req, index) => {
    console.log(`\nRequest ${index + 1}:`);
    console.log(`  Method: ${req.method}`);
    console.log(`  URL: ${req.url}`);
    console.log(`  Status: ${req.status}`);
    console.log(`  Resource Type: ${req.resourceType}`);
  });
}

// Run example
// example().catch(console.error);
