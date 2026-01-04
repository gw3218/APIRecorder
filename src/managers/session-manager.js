import { v4 as uuidv4 } from 'uuid';
import { BrowserLauncher } from '../core/browser-launcher.js';
import { CDPClient } from '../core/cdp-client.js';
import { NetworkMonitor } from '../core/network-monitor.js';
import { EventHandler } from '../core/event-handler.js';
import { RecordingManager } from './recording-manager.js';

/**
 * Session Manager
 * Manages recording sessions and browser instances
 */
export class SessionManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.sessions = new Map(); // Active sessions
    this.recordingManager = new RecordingManager(storageManager);
  }

  /**
   * Create a new recording session
   * @param {Object} options - Session options
   * @param {Object} options.filters - Filter configuration (headers, payload, preview, response)
   * @returns {Promise<Object>}
   */
  async createSession(options = {}) {
    const sessionId = uuidv4();
    const session = {
      sessionId,
      name: options.name || `Session ${new Date().toISOString()}`,
      targetUrl: options.targetUrl || null,
      startTime: new Date().toISOString(),
      endTime: null,
      status: 'idle',
      totalRequests: 0,
      metadata: {
        userAgent: options.userAgent || null,
        viewport: options.viewport || null,
        filters: options.filters || null, // Store filter configuration in metadata
        ...options.metadata
      },
      browserLauncher: null,
      cdpClient: null,
      networkMonitor: null,
      eventHandler: null,
      filters: options.filters || null // Store filter configuration in session
    };

    this.sessions.set(sessionId, session);
    
    // Store session in database
    await this.storageManager.createSession(session);

    return session;
  }

  /**
   * Start recording session
   * @param {string} sessionId - Session ID
   * @param {string} targetUrl - Target URL to navigate to
   * @returns {Promise<Object>}
   */
  async startSession(sessionId, targetUrl) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status === 'active') {
      throw new Error(`Session ${sessionId} is already active`);
    }

    // Launch browser
    let browserLauncher;
    let page, cdpSession;
    try {
      browserLauncher = new BrowserLauncher();
      const result = await browserLauncher.launch({
        headless: false // Can be configured
      });
      page = result.page;
      cdpSession = result.cdpSession;
    } catch (error) {
      // Check if this is a Playwright browser installation error
      const errorMessage = error.message || String(error);
      if (errorMessage.includes('playwright') || 
          errorMessage.includes('chromium') || 
          errorMessage.includes("doesn't exist") ||
          errorMessage.includes('npx playwright install')) {
        throw new Error('Playwright browsers are not installed. Please run: npx playwright install chromium');
      }
      // Re-throw other errors as-is
      throw error;
    }

    // Create CDP client
    const cdpClient = new CDPClient(cdpSession);

    // Enable Page domain for navigation
    await cdpClient.enableDomain('Page');

    // Set recording manager session BEFORE enabling network monitoring
    // This ensures the session is ready when network events start arriving
    // Pass filter configuration if available
    const filterOptions = session.filters || null;
    this.recordingManager.setSession(sessionId, filterOptions);

    // Create network monitor
    const networkMonitor = new NetworkMonitor(cdpClient);
    
    // Create event handler
    const eventHandler = new EventHandler(this.recordingManager);

    // Set up event handlers BEFORE enabling network monitoring
    networkMonitor.on('requestWillBeSent', (params) => {
      eventHandler.handleRequestWillBeSent(params);
    });

    networkMonitor.on('responseReceived', (params) => {
      eventHandler.handleResponseReceived(params);
    });

    networkMonitor.on('loadingFinished', (params) => {
      eventHandler.handleLoadingFinished(params);
    });

    networkMonitor.on('loadingFailed', (params) => {
      eventHandler.handleLoadingFailed(params);
    });

    // Now enable network monitoring (events will start arriving)
    await networkMonitor.enable();

    // Update session
    session.status = 'active';
    session.targetUrl = targetUrl;
    session.browserLauncher = browserLauncher;
    session.cdpClient = cdpClient;
    session.networkMonitor = networkMonitor;
    session.eventHandler = eventHandler;

    // Navigate to target URL
    if (targetUrl) {
      await cdpClient.navigate(targetUrl);
    }

    // Update session in database
    await this.storageManager.updateSession(sessionId, {
      status: 'active',
      targetUrl
    });

    return session;
  }

  /**
   * Stop recording session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async stopSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      // Try to get from database - might be a stale session
      const dbSession = await this.storageManager.getSession(sessionId);
      if (dbSession && dbSession.status === 'active') {
        // Session exists in DB but not in memory - update DB and return
        await this.storageManager.updateSession(sessionId, {
          status: 'stopped',
          endTime: new Date().toISOString()
        });
        return { ...dbSession, status: 'stopped' };
      }
      throw new Error(`Session ${sessionId} not found`);
    }

    if (session.status !== 'active') {
      // Session is already stopped or in another state
      return session;
    }

    const errors = [];

    // Disable network monitoring
    if (session.networkMonitor) {
      try {
        await session.networkMonitor.disable();
      } catch (error) {
        errors.push(`Failed to disable network monitor: ${error.message}`);
        console.error('Error disabling network monitor:', error);
      }
    }

    // Close browser
    if (session.browserLauncher) {
      try {
        await session.browserLauncher.close();
      } catch (error) {
        errors.push(`Failed to close browser: ${error.message}`);
        console.error('Error closing browser:', error);
      }
    }

    // Update session status regardless of errors
    session.status = 'stopped';
    session.endTime = new Date().toISOString();
    
    try {
      session.totalRequests = await this.storageManager.getSessionRequestCount(sessionId);
    } catch (error) {
      console.error('Error getting request count:', error);
      session.totalRequests = 0;
    }

    // Update in database
    try {
      await this.storageManager.updateSession(sessionId, {
        status: 'stopped',
        endTime: session.endTime,
        totalRequests: session.totalRequests
      });
    } catch (error) {
      errors.push(`Failed to update database: ${error.message}`);
      console.error('Error updating session in database:', error);
    }

    // If there were errors, throw but still return the session
    if (errors.length > 0) {
      throw new Error(errors.join('; '));
    }

    return session;
  }

  /**
   * Get session by ID
   * @param {string} sessionId - Session ID
   * @returns {Object|null}
   */
  getSession(sessionId) {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get all sessions
   * @returns {Array}
   */
  getAllSessions() {
    return Array.from(this.sessions.values());
  }

  /**
   * Delete session
   * @param {string} sessionId - Session ID
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (session && session.status === 'active') {
      await this.stopSession(sessionId);
    }

    this.sessions.delete(sessionId);
    await this.storageManager.deleteSession(sessionId);
  }

  /**
   * Get filter configuration for a session
   * @param {string} sessionId - Session ID
   * @returns {Object|null}
   */
  getFilters(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    // If session is active, get filters from recording manager
    if (session.status === 'active') {
      return this.recordingManager.getFilters().toJSON();
    }

    // Otherwise return from session metadata
    return session.filters || {
      headers: true,
      payload: true,
      preview: true,
      response: true
    };
  }

  /**
   * Update filter configuration for a session
   * @param {string} sessionId - Session ID
   * @param {Object} filters - Filter configuration
   * @returns {Promise<void>}
   */
  async updateFilters(sessionId, filters) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update filters in recording manager if session is active
    if (session.status === 'active') {
      this.recordingManager.setFilters(filters);
    }

    // Update filters in session
    session.filters = filters;

    // Get current metadata from database to ensure we have the latest
    const dbSession = await this.storageManager.getSession(sessionId);
    const currentMetadata = dbSession ? dbSession.metadata : (session.metadata || {});

    // Update filters in session metadata
    await this.storageManager.updateSession(sessionId, {
      metadata: {
        ...currentMetadata,
        filters
      }
    });
  }
}
