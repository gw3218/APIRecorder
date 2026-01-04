/**
 * Data Filters
 * Manages filtering of captured network data
 */
export class DataFilters {
  constructor(options = {}) {
    // Default: all filters enabled
    this.filters = {
      headers: options.headers !== undefined ? options.headers : true,
      payload: options.payload !== undefined ? options.payload : true,
      preview: options.preview !== undefined ? options.preview : true,
      response: options.response !== undefined ? options.response : true
    };
  }

  /**
   * Enable a specific filter
   * @param {string} filterName - Filter name (headers, payload, preview, response)
   */
  enable(filterName) {
    if (this.isValidFilter(filterName)) {
      this.filters[filterName] = true;
    } else {
      throw new Error(`Invalid filter name: ${filterName}`);
    }
  }

  /**
   * Disable a specific filter
   * @param {string} filterName - Filter name (headers, payload, preview, response)
   */
  disable(filterName) {
    if (this.isValidFilter(filterName)) {
      this.filters[filterName] = false;
    } else {
      throw new Error(`Invalid filter name: ${filterName}`);
    }
  }

  /**
   * Toggle a specific filter
   * @param {string} filterName - Filter name (headers, payload, preview, response)
   */
  toggle(filterName) {
    if (this.isValidFilter(filterName)) {
      this.filters[filterName] = !this.filters[filterName];
    } else {
      throw new Error(`Invalid filter name: ${filterName}`);
    }
  }

  /**
   * Check if a filter is enabled
   * @param {string} filterName - Filter name
   * @returns {boolean}
   */
  isEnabled(filterName) {
    if (this.isValidFilter(filterName)) {
      return this.filters[filterName];
    }
    return false;
  }

  /**
   * Get all filter states
   * @returns {Object}
   */
  getFilters() {
    return { ...this.filters };
  }

  /**
   * Set all filters at once
   * @param {Object} filters - Filter configuration
   */
  setFilters(filters) {
    Object.keys(filters).forEach(key => {
      if (this.isValidFilter(key)) {
        this.filters[key] = filters[key];
      }
    });
  }

  /**
   * Apply filters to request data
   * @param {Object} request - Request data
   * @returns {Object} - Filtered request data
   */
  applyToRequest(request) {
    if (!request) return null;

    const filtered = {
      requestId: request.requestId,
      url: request.url,
      method: request.method,
      resourceType: request.resourceType,
      referrer: request.referrer,
      queryString: request.queryString,
      initiator: request.initiator,
      frameId: request.frameId,
      timestamp: request.timestamp
    };

    // Apply headers filter
    if (this.filters.headers) {
      filtered.headers = request.headers || {};
    } else {
      filtered.headers = {};
    }

    // Apply payload filter
    if (this.filters.payload) {
      filtered.postData = request.postData || null;
    } else {
      filtered.postData = null;
    }

    return filtered;
  }

  /**
   * Apply filters to response data
   * @param {Object} response - Response data
   * @returns {Object} - Filtered response data
   */
  applyToResponse(response) {
    if (!response) return null;

    const filtered = {
      status: response.status,
      statusText: response.statusText,
      mimeType: response.mimeType,
      fromCache: response.fromCache,
      fromServiceWorker: response.fromServiceWorker,
      protocol: response.protocol,
      remoteIPAddress: response.remoteIPAddress,
      remotePort: response.remotePort,
      timestamp: response.timestamp
    };

    // Apply headers filter
    if (this.filters.headers) {
      filtered.headers = response.headers || {};
    } else {
      filtered.headers = {};
    }

    // Apply response filter (raw body)
    if (this.filters.response) {
      filtered.body = response.body || null;
      filtered.base64Encoded = response.base64Encoded || false;
      filtered.bodySize = response.bodySize || 0;
    } else {
      filtered.body = null;
      filtered.base64Encoded = false;
      filtered.bodySize = 0;
    }

    // Apply preview filter (formatted/parsed body)
    if (this.filters.preview) {
      filtered.preview = this.generatePreview(response);
    } else {
      filtered.preview = null;
    }

    return filtered;
  }

  /**
   * Generate preview (formatted/parsed version) of response body
   * @param {Object} response - Response data
   * @returns {Object|null} - Preview data
   */
  generatePreview(response) {
    if (!response || !response.body) {
      return null;
    }

    const preview = {
      formatted: null,
      parsed: null,
      type: 'text'
    };

    try {
      const mimeType = response.mimeType || '';
      const body = response.body;

      // Handle base64 encoded content
      let decodedBody = body;
      if (response.base64Encoded) {
        try {
          decodedBody = Buffer.from(body, 'base64').toString('utf-8');
        } catch (e) {
          // If decoding fails, return null preview
          return null;
        }
      }

      // Try to parse JSON
      if (mimeType.includes('json') || mimeType.includes('application/json')) {
        try {
          preview.parsed = JSON.parse(decodedBody);
          preview.formatted = JSON.stringify(preview.parsed, null, 2);
          preview.type = 'json';
        } catch (e) {
          preview.formatted = decodedBody;
          preview.type = 'text';
        }
      }
      // Try to parse XML
      else if (mimeType.includes('xml')) {
        preview.formatted = decodedBody;
        preview.type = 'xml';
      }
      // HTML
      else if (mimeType.includes('html')) {
        preview.formatted = decodedBody;
        preview.type = 'html';
      }
      // CSS
      else if (mimeType.includes('css')) {
        preview.formatted = decodedBody;
        preview.type = 'css';
      }
      // JavaScript
      else if (mimeType.includes('javascript') || mimeType.includes('ecmascript')) {
        preview.formatted = decodedBody;
        preview.type = 'javascript';
      }
      // Plain text or other
      else {
        preview.formatted = decodedBody;
        preview.type = 'text';
      }
    } catch (error) {
      // If preview generation fails, return null
      return null;
    }

    return preview;
  }

  /**
   * Validate filter name
   * @param {string} filterName - Filter name to validate
   * @returns {boolean}
   */
  isValidFilter(filterName) {
    return ['headers', 'payload', 'preview', 'response'].includes(filterName);
  }

  /**
   * Get filter configuration as JSON
   * @returns {Object}
   */
  toJSON() {
    return { ...this.filters };
  }

  /**
   * Create DataFilters from JSON
   * @param {Object} json - Filter configuration
   * @returns {DataFilters}
   */
  static fromJSON(json) {
    return new DataFilters(json);
  }
}
