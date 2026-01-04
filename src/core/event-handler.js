/**
 * Event Handler
 * Processes and correlates network events
 */
export class EventHandler {
  constructor(recordingManager) {
    this.recordingManager = recordingManager;
    this.pendingRequests = new Map();
  }

  /**
   * Handle requestWillBeSent event
   * @param {Object} params - CDP event parameters
   */
  async handleRequestWillBeSent(params) {
    const { requestId, request, redirectResponse, type, frameId } = params;

    // Extract query string from URL
    let queryString = null;
    try {
      const urlObj = new URL(request.url);
      queryString = urlObj.search ? urlObj.search.substring(1) : null;
    } catch (error) {
      // Invalid URL, try to extract query string manually
      const queryIndex = request.url.indexOf('?');
      if (queryIndex !== -1) {
        queryString = request.url.substring(queryIndex + 1);
      }
    }

    // Create request record
    const requestRecord = {
      requestId,
      url: request.url,
      method: request.method,
      headers: request.headers || {},
      postData: request.postData || null,
      queryString: queryString,
      referrer: request.referrer || null,
      initiator: params.initiator || null,
      resourceType: type,
      frameId,
      timestamp: Date.now(),
      redirectChain: []
    };

    // Handle redirect chain
    if (redirectResponse) {
      // This is a redirect, find the original request
      const originalRequest = this.findOriginalRequest(requestId);
      if (originalRequest) {
        originalRequest.redirectChain.push(requestId);
      }
    }

    this.pendingRequests.set(requestId, {
      request: requestRecord,
      response: null,
      timing: null,
      error: null,
      status: 'pending'
    });

    // Notify recording manager
    await this.recordingManager.handleRequest(requestRecord);
  }

  /**
   * Handle responseReceived event
   * @param {Object} params - CDP event parameters
   */
  async handleResponseReceived(params) {
    const { requestId, response } = params;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return;
    }

    const responseRecord = {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers || {},
      mimeType: response.mimeType || null,
      fromCache: response.fromCache || false,
      fromServiceWorker: response.fromServiceWorker || false,
      protocol: response.protocol || null,
      remoteIPAddress: response.remoteIPAddress || null,
      remotePort: response.remotePort || null,
      timestamp: Date.now()
    };

    pending.response = responseRecord;
    pending.status = 'response_received';

    // Notify recording manager
    await this.recordingManager.handleResponse(requestId, responseRecord);
  }

  /**
   * Handle loadingFinished event
   * @param {Object} params - CDP event parameters
   */
  async handleLoadingFinished(params) {
    const { requestId, encodedDataLength, bodyData } = params;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return;
    }

    // Use body data from network monitor (already fetched)
    if (pending.response && bodyData) {
      if (bodyData.bodyUnavailable) {
        pending.response.bodyUnavailable = true;
        pending.response.bodyError = bodyData.error;
        pending.error = { bodyUnavailable: true, error: bodyData.error };
      } else {
        pending.response.body = bodyData.body;
        pending.response.base64Encoded = bodyData.base64Encoded;
        pending.response.bodySize = bodyData.bodySize || encodedDataLength;
      }
    }

    pending.status = 'completed';

    // Notify recording manager
    await this.recordingManager.handleRequestComplete(requestId, {
      body: bodyData?.body || null,
      base64Encoded: bodyData?.base64Encoded || false,
      bodySize: bodyData?.bodySize || encodedDataLength
    });
  }

  /**
   * Handle loadingFailed event
   * @param {Object} params - CDP event parameters
   */
  async handleLoadingFailed(params) {
    const { requestId, errorText, canceled, blockedReason } = params;

    const pending = this.pendingRequests.get(requestId);
    if (!pending) {
      return;
    }

    pending.error = {
      errorText,
      canceled: canceled || false,
      blockedReason: blockedReason || null
    };
    pending.status = 'failed';

    // Notify recording manager
    await this.recordingManager.handleRequestFailed(requestId, pending.error);
  }

  /**
   * Find original request in redirect chain
   * @param {string} requestId - Current request ID
   * @returns {Object|null}
   */
  findOriginalRequest(requestId) {
    for (const [id, pending] of this.pendingRequests.entries()) {
      if (pending.request.redirectChain.includes(requestId)) {
        return pending.request;
      }
    }
    return null;
  }

  /**
   * Get pending request
   * @param {string} requestId - Request ID
   * @returns {Object|null}
   */
  getPendingRequest(requestId) {
    return this.pendingRequests.get(requestId) || null;
  }

  /**
   * Clear pending requests
   */
  clear() {
    this.pendingRequests.clear();
  }
}
