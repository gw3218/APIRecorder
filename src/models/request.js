/**
 * Request Model
 * Represents a network request
 */
export class Request {
  constructor(data) {
    this.requestId = data.requestId;
    this.url = data.url;
    this.method = data.method;
    this.headers = data.headers || {};
    this.postData = data.postData || null;
    this.queryString = data.queryString || null;
    this.referrer = data.referrer || null;
    this.initiator = data.initiator || null;
    this.resourceType = data.resourceType || 'other';
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  /**
   * Get query parameters as object
   * @returns {Object}
   */
  getQueryParams() {
    if (!this.queryString) {
      return {};
    }
    const params = new URLSearchParams(this.queryString);
    const result = {};
    for (const [key, value] of params.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Parse post data as JSON if possible
   * @returns {Object|null}
   */
  getPostDataJSON() {
    if (!this.postData) {
      return null;
    }
    try {
      return JSON.parse(this.postData);
    } catch {
      return null;
    }
  }
}
