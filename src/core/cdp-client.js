/**
 * CDP Client
 * Wrapper around Playwright's CDP session for direct CDP protocol access
 */
export class CDPClient {
  constructor(cdpSession) {
    this.cdpSession = cdpSession;
    this.eventListeners = new Map();
  }

  /**
   * Send CDP command
   * @param {string} method - CDP method name
   * @param {Object} params - Command parameters
   * @returns {Promise<Object>}
   */
  async send(method, params = {}) {
    if (!this.cdpSession) {
      throw new Error('CDP session not initialized');
    }
    return await this.cdpSession.send(method, params);
  }

  /**
   * Enable CDP domain
   * @param {string} domain - Domain name (e.g., 'Network', 'Page')
   * @returns {Promise<void>}
   */
  async enableDomain(domain) {
    const method = `${domain}.enable`;
    return await this.send(method);
  }

  /**
   * Disable CDP domain
   * @param {string} domain - Domain name
   * @returns {Promise<void>}
   */
  async disableDomain(domain) {
    const method = `${domain}.disable`;
    return await this.send(method);
  }

  /**
   * Listen to CDP events
   * @param {string} event - Event name (e.g., 'Network.requestWillBeSent')
   * @param {Function} callback - Event handler
   */
  on(event, callback) {
    if (!this.cdpSession) {
      throw new Error('CDP session not initialized');
    }

    // Playwright CDP session uses different event handling
    // We'll use the session's on method
    this.cdpSession.on(event, callback);
    
    // Track listeners for cleanup
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  /**
   * Remove event listener
   * @param {string} event - Event name
   * @param {Function} callback - Event handler
   */
  off(event, callback) {
    if (this.cdpSession) {
      this.cdpSession.off(event, callback);
    }
  }

  /**
   * Remove all listeners
   */
  removeAllListeners() {
    if (this.cdpSession) {
      this.eventListeners.forEach((callbacks, event) => {
        callbacks.forEach(callback => {
          this.cdpSession.off(event, callback);
        });
      });
      this.eventListeners.clear();
    }
  }

  /**
   * Get response body
   * @param {string} requestId - CDP request ID
   * @returns {Promise<Object>}
   */
  async getResponseBody(requestId) {
    return await this.send('Network.getResponseBody', { requestId });
  }

  /**
   * Get request post data
   * @param {string} requestId - CDP request ID
   * @returns {Promise<Object>}
   */
  async getRequestPostData(requestId) {
    return await this.send('Network.getRequestPostData', { requestId });
  }

  /**
   * Navigate to URL
   * @param {string} url - Target URL
   * @returns {Promise<Object>}
   */
  async navigate(url) {
    return await this.send('Page.navigate', { url });
  }

  /**
   * Get cookies for a URL
   * @param {string} url - Target URL
   * @returns {Promise<Array>}
   */
  async getCookies(url) {
    try {
      const result = await this.send('Network.getCookies', { urls: [url] });
      return result.cookies || [];
    } catch (e) {
      // Fallback: try Runtime domain if Network doesn't work
      try {
        const result = await this.send('Runtime.getCookies', {});
        return result.cookies || [];
      } catch (e2) {
        return [];
      }
    }
  }
}
