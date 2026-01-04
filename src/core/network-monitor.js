import { CDPClient } from './cdp-client.js';

/**
 * Network Monitor
 * Captures and processes network events from CDP
 */
export class NetworkMonitor {
  constructor(cdpClient) {
    this.cdpClient = cdpClient;
    this.isEnabled = false;
    this.requestMap = new Map(); // Track requests by requestId
    this.eventHandlers = {
      requestWillBeSent: null,
      responseReceived: null,
      loadingFinished: null,
      loadingFailed: null,
      requestServedFromCache: null
    };
  }

  /**
   * Enable network monitoring
   * @returns {Promise<void>}
   */
  async enable() {
    if (this.isEnabled) {
      return;
    }

    // Enable Network domain with options to capture cookies
    await this.cdpClient.enableDomain('Network');
    
    // Also enable Cookie domain to capture cookies
    try {
      await this.cdpClient.enableDomain('Network');
      // Try to enable Cookie domain for better cookie tracking
      await this.cdpClient.send('Network.setCookies', {}).catch(() => {
        // Cookie domain might not be available, that's okay
      });
    } catch (e) {
      // Continue even if cookie domain fails
    }
    
    // Set up event listeners
    this.setupEventListeners();
    
    this.isEnabled = true;
  }

  /**
   * Disable network monitoring
   * @returns {Promise<void>}
   */
  async disable() {
    if (!this.isEnabled) {
      return;
    }

    await this.cdpClient.disableDomain('Network');
    this.cdpClient.removeAllListeners();
    
    this.isEnabled = false;
    this.requestMap.clear();
  }

  /**
   * Set up CDP event listeners
   */
  setupEventListeners() {
    // Network.requestWillBeSent
    this.cdpClient.on('Network.requestWillBeSent', (params) => {
      const { requestId, request, redirectResponse, type, frameId } = params;
      
      // CDP may not include cookies in request.headers by default
      // Store request immediately, then try to enrich with cookies
      let headers = request.headers || {};
      
      // Store request metadata immediately
      const requestData = {
        requestId,
        url: request.url,
        method: request.method,
        headers: headers,
        postData: request.postData,
        referrer: request.referrer,
        type,
        frameId,
        redirectResponse: redirectResponse ? {
          status: redirectResponse.status,
          statusText: redirectResponse.statusText,
          headers: redirectResponse.headers
        } : null,
        timestamp: Date.now()
      };
      
      this.requestMap.set(requestId, requestData);

      // Try to enrich with cookies asynchronously (don't block event)
      // Check if Cookie header is missing - CDP sometimes doesn't include cookies in headers
      if (!headers['Cookie'] && !headers['cookie'] && !headers['COOKIE']) {
        // Fetch cookies asynchronously and update both stored data and pass to handler
        // Use a small delay to ensure cookies are available
        setTimeout(async () => {
          try {
            const cookies = await this.cdpClient.getCookies(request.url);
            
            if (cookies && cookies.length > 0) {
              // Build cookie string from CDP cookie objects
              const cookieString = cookies
                .map(cookie => `${cookie.name}=${cookie.value}`)
                .join('; ');
              
              // Update stored request with cookies
              const storedRequest = this.requestMap.get(requestId);
              if (storedRequest) {
                storedRequest.headers = { ...storedRequest.headers, 'Cookie': cookieString };
              }
              
              // Also update the request in the event handler params
              headers['Cookie'] = cookieString;
            }
          } catch (e) {
            // Failed to get cookies, continue with original headers
            console.warn('Failed to fetch cookies for request:', request.url, e.message);
          }
        }, 10); // Small delay to allow cookies to be set
      }

      // Call event handler with current headers (may be updated later with cookies)
      if (this.eventHandlers.requestWillBeSent) {
        this.eventHandlers.requestWillBeSent({
          ...params,
          request: {
            ...request,
            headers: headers
          }
        });
      }
    });

    // Network.responseReceived
    this.cdpClient.on('Network.responseReceived', async (params) => {
      const { requestId, response, type } = params;
      
      const requestData = this.requestMap.get(requestId);
      if (requestData) {
        let responseHeaders = response.headers || {};
        
        // Check for Set-Cookie headers in response
        // CDP should include these, but ensure we capture them
        const setCookieHeaders = responseHeaders['Set-Cookie'] || 
                                 responseHeaders['set-cookie'] || 
                                 responseHeaders['SET-COOKIE'];
        
        requestData.response = {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
          mimeType: response.mimeType,
          fromCache: response.fromCache,
          fromServiceWorker: response.fromServiceWorker,
          protocol: response.protocol,
          remoteIPAddress: response.remoteIPAddress,
          remotePort: response.remotePort
        };
        requestData.responseTimestamp = Date.now();
      }

      if (this.eventHandlers.responseReceived) {
        this.eventHandlers.responseReceived(params);
      }
    });

    // Network.loadingFinished
    this.cdpClient.on('Network.loadingFinished', async (params) => {
      const { requestId, encodedDataLength } = params;
      
      const requestData = this.requestMap.get(requestId);
      if (requestData) {
        requestData.encodedDataLength = encodedDataLength;
        requestData.loadingFinishedTimestamp = Date.now();
        
        // Fetch response body if available
        let bodyData = null;
        try {
          const bodyResult = await this.cdpClient.getResponseBody(requestId);
          if (requestData.response) {
            requestData.response.body = bodyResult.body;
            requestData.response.base64Encoded = bodyResult.base64Encoded;
            bodyData = {
              body: bodyResult.body,
              base64Encoded: bodyResult.base64Encoded,
              bodySize: encodedDataLength
            };
          }
        } catch (error) {
          // Response body may not be available (cached, blocked, etc.)
          if (requestData.response) {
            requestData.response.bodyUnavailable = true;
            requestData.response.bodyError = error.message;
          }
          bodyData = {
            bodyUnavailable: true,
            error: error.message,
            bodySize: encodedDataLength
          };
        }
        
        // Pass body data to event handler
        if (this.eventHandlers.loadingFinished) {
          this.eventHandlers.loadingFinished({
            ...params,
            bodyData
          });
        }
      } else {
        if (this.eventHandlers.loadingFinished) {
          this.eventHandlers.loadingFinished(params);
        }
      }
    });

    // Network.loadingFailed
    this.cdpClient.on('Network.loadingFailed', (params) => {
      const { requestId, errorText, canceled, blockedReason } = params;
      
      const requestData = this.requestMap.get(requestId);
      if (requestData) {
        requestData.error = {
          errorText,
          canceled,
          blockedReason
        };
        requestData.loadingFailedTimestamp = Date.now();
      }

      if (this.eventHandlers.loadingFailed) {
        this.eventHandlers.loadingFailed(params);
      }
    });

    // Network.requestServedFromCache
    this.cdpClient.on('Network.requestServedFromCache', (params) => {
      const { requestId } = params;
      
      const requestData = this.requestMap.get(requestId);
      if (requestData && requestData.response) {
        requestData.response.fromCache = true;
      }

      if (this.eventHandlers.requestServedFromCache) {
        this.eventHandlers.requestServedFromCache(params);
      }
    });
  }

  /**
   * Register event handler
   * @param {string} event - Event name
   * @param {Function} handler - Event handler function
   */
  on(event, handler) {
    if (this.eventHandlers.hasOwnProperty(event)) {
      this.eventHandlers[event] = handler;
    } else {
      throw new Error(`Unknown event: ${event}`);
    }
  }

  /**
   * Get request data by requestId
   * @param {string} requestId - CDP request ID
   * @returns {Object|null}
   */
  getRequest(requestId) {
    return this.requestMap.get(requestId) || null;
  }

  /**
   * Get all captured requests
   * @returns {Array}
   */
  getAllRequests() {
    return Array.from(this.requestMap.values());
  }

  /**
   * Clear captured requests
   */
  clear() {
    this.requestMap.clear();
  }
}
