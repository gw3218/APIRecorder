/**
 * Response Model
 * Represents a network response
 */
export class Response {
  constructor(data) {
    this.status = data.status;
    this.statusText = data.statusText;
    this.headers = data.headers || {};
    this.body = data.body || null;
    this.base64Encoded = data.base64Encoded || false;
    this.bodySize = data.bodySize || 0;
    this.mimeType = data.mimeType || null;
    this.fromCache = data.fromCache || false;
    this.fromServiceWorker = data.fromServiceWorker || false;
    this.protocol = data.protocol || null;
    this.timestamp = data.timestamp || new Date().toISOString();
  }

  /**
   * Check if response is successful
   * @returns {boolean}
   */
  isSuccess() {
    return this.status >= 200 && this.status < 300;
  }

  /**
   * Get response body as text
   * @returns {string|null}
   */
  getBodyAsText() {
    if (!this.body) {
      return null;
    }
    if (this.base64Encoded) {
      return Buffer.from(this.body, 'base64').toString('utf-8');
    }
    return this.body;
  }

  /**
   * Get response body as JSON if possible
   * @returns {Object|null}
   */
  getBodyAsJSON() {
    const text = this.getBodyAsText();
    if (!text) {
      return null;
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }
}
