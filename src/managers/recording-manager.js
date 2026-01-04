import { v4 as uuidv4 } from 'uuid';
import { DataFilters } from '../core/data-filters.js';

/**
 * Recording Manager
 * Organizes and structures captured network data
 */
export class RecordingManager {
  constructor(storageManager) {
    this.storageManager = storageManager;
    this.currentSessionId = null;
    this.requestMap = new Map(); // Track requests by CDP requestId
    this.filters = new DataFilters(); // Default: all filters enabled
  }

  /**
   * Set current session
   * @param {string} sessionId - Session ID
   * @param {Object} filterOptions - Optional filter configuration
   */
  setSession(sessionId, filterOptions = null) {
    this.currentSessionId = sessionId;
    this.requestMap.clear();
    
    // Update filters if provided
    if (filterOptions) {
      this.filters = new DataFilters(filterOptions);
    }
  }

  /**
   * Set data filters
   * @param {DataFilters|Object} filters - Filter configuration or DataFilters instance
   */
  setFilters(filters) {
    if (filters instanceof DataFilters) {
      this.filters = filters;
    } else {
      this.filters = new DataFilters(filters);
    }
  }

  /**
   * Get current filters
   * @returns {DataFilters}
   */
  getFilters() {
    return this.filters;
  }

  /**
   * Handle request event
   * @param {Object} request - Request data
   * @returns {Promise<void>}
   */
  async handleRequest(request) {
    if (!this.currentSessionId) {
      // Silently ignore if no session is set (may happen during initialization)
      console.warn('Received network event but no active session set. Ignoring request.');
      return;
    }

    // Apply filters to request
    const filteredRequest = this.filters.applyToRequest(request);

    // Store request in map
    this.requestMap.set(request.requestId, {
      id: uuidv4(),
      sessionId: this.currentSessionId,
      requestId: request.requestId,
      request: filteredRequest,
      response: null,
      timing: null,
      error: null,
      status: 'pending',
      createdAt: new Date().toISOString()
    });
  }

  /**
   * Handle response event
   * @param {string} requestId - CDP request ID
   * @param {Object} response - Response data
   * @returns {Promise<void>}
   */
  async handleResponse(requestId, response) {
    const record = this.requestMap.get(requestId);
    if (!record) {
      return;
    }

    // Apply filters to response
    const filteredResponse = this.filters.applyToResponse(response);
    record.response = filteredResponse;
    record.status = 'response_received';
  }

  /**
   * Handle request completion
   * @param {string} requestId - CDP request ID
   * @param {Object} bodyData - Response body data
   * @returns {Promise<void>}
   */
  async handleRequestComplete(requestId, bodyData) {
    const record = this.requestMap.get(requestId);
    if (!record) {
      return;
    }

    if (record.response) {
      // Update response with body data
      record.response.body = bodyData.body;
      record.response.base64Encoded = bodyData.base64Encoded;
      record.response.bodySize = bodyData.bodySize;
      
      // Re-apply filters to ensure body and preview are filtered correctly
      record.response = this.filters.applyToResponse(record.response);
    }

    record.status = 'completed';

    // Store complete request-response pair
    await this.storageManager.saveRequestResponse(record);
  }

  /**
   * Handle request failure
   * @param {string} requestId - CDP request ID
   * @param {Object} error - Error data
   * @returns {Promise<void>}
   */
  async handleRequestFailed(requestId, error) {
    const record = this.requestMap.get(requestId);
    if (!record) {
      return;
    }

    record.error = error;
    record.status = 'failed';

    // Store failed request
    await this.storageManager.saveRequestResponse(record);
  }

  /**
   * Get response body from CDP
   * @param {string} requestId - CDP request ID
   * @returns {Promise<Object|null>}
   */
  async getResponseBody(requestId) {
    // This will be called by event handler
    // The actual CDP call is made through the network monitor
    return null;
  }

  /**
   * Get request by CDP requestId
   * @param {string} requestId - CDP request ID
   * @returns {Object|null}
   */
  getRequest(requestId) {
    return this.requestMap.get(requestId) || null;
  }

  /**
   * Get all requests for current session
   * @returns {Array}
   */
  getAllRequests() {
    return Array.from(this.requestMap.values());
  }

  /**
   * Clear requests
   */
  clear() {
    this.requestMap.clear();
  }
}
