import { StorageManager } from '../managers/storage-manager.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { mkdir } from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let storageManager = null;

/**
 * Initialize database schema
 * @returns {Promise<void>}
 */
export async function initializeDatabase() {
  // Ensure data directory exists
  const dataDir = join(__dirname, '../../data');
  await mkdir(dataDir, { recursive: true });

  // Create storage manager
  storageManager = new StorageManager();
  await storageManager.initialize();

  // Create tables
  await createTables();

  return storageManager;
}

/**
 * Create database tables
 * @returns {Promise<void>}
 */
async function createTables() {
  // Sessions table
  await storageManager.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sessionId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      targetUrl TEXT,
      startTime TEXT NOT NULL,
      endTime TEXT,
      status TEXT NOT NULL,
      totalRequests INTEGER DEFAULT 0,
      metadata TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Request-Response pairs table
  await storageManager.run(`
    CREATE TABLE IF NOT EXISTS request_responses (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      requestId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (sessionId) REFERENCES sessions(sessionId) ON DELETE CASCADE
    )
  `);

  // Requests table
  await storageManager.run(`
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      requestResponseId TEXT NOT NULL,
      url TEXT NOT NULL,
      method TEXT NOT NULL,
      headers TEXT,
      postData TEXT,
      queryString TEXT,
      referrer TEXT,
      initiator TEXT,
      resourceType TEXT,
      FOREIGN KEY (requestResponseId) REFERENCES request_responses(id) ON DELETE CASCADE
    )
  `);

  // Responses table
  await storageManager.run(`
    CREATE TABLE IF NOT EXISTS responses (
      id TEXT PRIMARY KEY,
      requestResponseId TEXT NOT NULL,
      status INTEGER,
      statusText TEXT,
      headers TEXT,
      body TEXT,
      bodySize INTEGER,
      mimeType TEXT,
      fromCache INTEGER DEFAULT 0,
      preview TEXT,
      FOREIGN KEY (requestResponseId) REFERENCES request_responses(id) ON DELETE CASCADE
    )
  `);
  
  // Add preview column if it doesn't exist (for existing databases)
  await storageManager.run(`
    ALTER TABLE responses ADD COLUMN preview TEXT
  `).catch(() => {
    // Column already exists, ignore error
  });

  // Timing table
  await storageManager.run(`
    CREATE TABLE IF NOT EXISTS timings (
      id TEXT PRIMARY KEY,
      requestResponseId TEXT NOT NULL,
      startTime REAL,
      requestTime REAL,
      responseTime REAL,
      endTime REAL,
      duration REAL,
      dns REAL,
      connect REAL,
      ssl REAL,
      send REAL,
      wait REAL,
      receive REAL,
      FOREIGN KEY (requestResponseId) REFERENCES request_responses(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  await storageManager.run(`
    CREATE INDEX IF NOT EXISTS idx_sessions_sessionId ON sessions(sessionId)
  `);
  await storageManager.run(`
    CREATE INDEX IF NOT EXISTS idx_request_responses_sessionId ON request_responses(sessionId)
  `);
  await storageManager.run(`
    CREATE INDEX IF NOT EXISTS idx_requests_url ON requests(url)
  `);
  await storageManager.run(`
    CREATE INDEX IF NOT EXISTS idx_requests_method ON requests(method)
  `);
}

/**
 * Get storage manager instance
 * @returns {StorageManager}
 */
export function getStorageManager() {
  if (!storageManager) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return storageManager;
}
