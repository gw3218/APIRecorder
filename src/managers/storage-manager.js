import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const config = JSON.parse(readFileSync(join(__dirname, '../../config/default.json'), 'utf-8'));

/**
 * Storage Manager
 * Handles database operations for storing recordings
 */
export class StorageManager {
  constructor() {
    this.db = null;
    this.dbPath = join(__dirname, '../../data', config.storage.database);
  }

  /**
   * Initialize database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Run SQL query
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<any>}
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ lastID: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get single row
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Object|null>}
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  /**
   * Get multiple rows
   * @param {string} sql - SQL query
   * @param {Array} params - Query parameters
   * @returns {Promise<Array>}
   */
  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  /**
   * Create session
   * @param {Object} session - Session data
   * @returns {Promise<void>}
   */
  async createSession(session) {
    const sql = `
      INSERT INTO sessions (sessionId, name, targetUrl, startTime, endTime, status, totalRequests, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await this.run(sql, [
      session.sessionId,
      session.name,
      session.targetUrl,
      session.startTime,
      session.endTime,
      session.status,
      session.totalRequests,
      JSON.stringify(session.metadata)
    ]);
  }

  /**
   * Update session
   * @param {string} sessionId - Session ID
   * @param {Object} updates - Update data
   * @returns {Promise<void>}
   */
  async updateSession(sessionId, updates) {
    const fields = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (key === 'metadata' && typeof updates[key] === 'object') {
        fields.push(`${key} = ?`);
        values.push(JSON.stringify(updates[key]));
      } else {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    });

    values.push(sessionId);

    const sql = `UPDATE sessions SET ${fields.join(', ')} WHERE sessionId = ?`;
    await this.run(sql, values);
  }

  /**
   * Get session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object|null>}
   */
  async getSession(sessionId) {
    const sql = `SELECT * FROM sessions WHERE sessionId = ?`;
    const row = await this.get(sql, [sessionId]);
    if (row) {
      row.metadata = JSON.parse(row.metadata || '{}');
    }
    return row;
  }

  /**
   * Get all sessions
   * @returns {Promise<Array>}
   */
  async getAllSessions() {
    const sql = `SELECT * FROM sessions ORDER BY startTime DESC`;
    const rows = await this.all(sql);
    return rows.map(row => {
      row.metadata = JSON.parse(row.metadata || '{}');
      return row;
    });
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    // Delete associated request-response pairs first
    await this.run('DELETE FROM request_responses WHERE sessionId = ?', [sessionId]);
    // Then delete session
    await this.run('DELETE FROM sessions WHERE sessionId = ?', [sessionId]);
  }

  /**
   * Save request-response pair
   * @param {Object} record - Request-response record
   * @returns {Promise<void>}
   */
  async saveRequestResponse(record) {
    // Save request-response pair first (to establish the record)
    const pairSql = `
      INSERT OR IGNORE INTO request_responses (id, sessionId, requestId, createdAt)
      VALUES (?, ?, ?, ?)
    `;
    await this.run(pairSql, [
      record.id,
      record.sessionId,
      record.requestId,
      record.createdAt
    ]);

    // Save request
    const requestSql = `
      INSERT INTO requests (id, requestResponseId, url, method, headers, postData, queryString, referrer, initiator, resourceType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const requestDbId = uuidv4();
    await this.run(requestSql, [
      requestDbId,
      record.id,
      record.request.url,
      record.request.method,
      JSON.stringify(record.request.headers || {}),
      record.request.postData || null,
      record.request.queryString || null,
      record.request.referrer || null,
      JSON.stringify(record.request.initiator || {}),
      record.request.resourceType || 'other'
    ]);

    // Save response if available
    if (record.response) {
      const responseSql = `
        INSERT INTO responses (id, requestResponseId, status, statusText, headers, body, bodySize, mimeType, fromCache, preview)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await this.run(responseSql, [
        uuidv4(),
        record.id,
        record.response.status || null,
        record.response.statusText || null,
        JSON.stringify(record.response.headers || {}),
        record.response.body || null,
        record.response.bodySize || 0,
        record.response.mimeType || null,
        record.response.fromCache ? 1 : 0,
        record.response.preview ? JSON.stringify(record.response.preview) : null
      ]);
    }
  }

  /**
   * Get request-response pairs for session
   * @param {string} sessionId - Session ID
   * @returns {Promise<Array>}
   */
  async getRequestResponses(sessionId) {
    const sql = `
      SELECT 
        rr.id,
        rr.sessionId,
        rr.requestId,
        rr.createdAt,
        r.url,
        r.method,
        r.headers as requestHeaders,
        r.postData,
        r.resourceType,
        res.status,
        res.statusText,
        res.headers as responseHeaders,
        res.body,
        res.bodySize,
        res.mimeType,
        res.preview
      FROM request_responses rr
      LEFT JOIN requests r ON r.requestResponseId = rr.id
      LEFT JOIN responses res ON res.requestResponseId = rr.id
      WHERE rr.sessionId = ?
      ORDER BY rr.createdAt ASC
    `;
    const rows = await this.all(sql, [sessionId]);
    return rows.map(row => ({
      ...row,
      requestHeaders: JSON.parse(row.requestHeaders || '{}'),
      responseHeaders: JSON.parse(row.responseHeaders || '{}'),
      preview: row.preview ? JSON.parse(row.preview) : null
    }));
  }

  /**
   * Get session request count
   * @param {string} sessionId - Session ID
   * @returns {Promise<number>}
   */
  async getSessionRequestCount(sessionId) {
    const sql = `SELECT COUNT(*) as count FROM request_responses WHERE sessionId = ?`;
    const row = await this.get(sql, [sessionId]);
    return row ? row.count : 0;
  }

  /**
   * Close database connection
   * @returns {Promise<void>}
   */
  async close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
