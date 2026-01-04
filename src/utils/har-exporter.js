/**
 * HAR Exporter
 * Exports recordings in HAR (HTTP Archive) format
 */
export class HARExporter {
  /**
   * Convert request-response pairs to HAR format
   * @param {Array} requestResponses - Array of request-response pairs
   * @returns {Object} HAR object
   */
  static toHAR(requestResponses) {
    const log = {
      version: '1.2',
      creator: {
        name: 'API Recorder',
        version: '0.1.0'
      },
      entries: []
    };

    requestResponses.forEach(pair => {
      const entry = {
        startedDateTime: pair.createdAt,
        time: 0, // Can be calculated from timing data
        request: {
          method: pair.method,
          url: pair.url,
          httpVersion: 'HTTP/1.1',
          headers: this.headersToArray(pair.requestHeaders),
          queryString: this.queryStringToArray(pair.queryString),
          postData: pair.postData ? {
            mimeType: this.getMimeType(pair.requestHeaders),
            text: pair.postData
          } : undefined,
          headersSize: -1,
          bodySize: pair.postData ? pair.postData.length : -1
        },
        response: {
          status: pair.status,
          statusText: pair.statusText,
          httpVersion: 'HTTP/1.1',
          headers: this.headersToArray(pair.responseHeaders),
          content: {
            size: pair.bodySize || 0,
            mimeType: pair.mimeType || '',
            text: pair.body || ''
          },
          headersSize: -1,
          bodySize: pair.bodySize || 0
        },
        cache: {},
        timings: {
          blocked: -1,
          dns: -1,
          connect: -1,
          send: 0,
          wait: 0,
          receive: 0
        }
      };

      log.entries.push(entry);
    });

    return { log };
  }

  /**
   * Convert headers object to HAR format array
   * @param {Object} headers - Headers object
   * @returns {Array}
   */
  static headersToArray(headers) {
    return Object.entries(headers || {}).map(([name, value]) => ({
      name,
      value: String(value)
    }));
  }

  /**
   * Convert query string to HAR format array
   * @param {string} queryString - Query string
   * @returns {Array}
   */
  static queryStringToArray(queryString) {
    if (!queryString) {
      return [];
    }
    const params = new URLSearchParams(queryString);
    const result = [];
    for (const [name, value] of params.entries()) {
      result.push({ name, value });
    }
    return result;
  }

  /**
   * Get MIME type from headers
   * @param {Object} headers - Headers object
   * @returns {string}
   */
  static getMimeType(headers) {
    return headers['Content-Type'] || headers['content-type'] || 'application/octet-stream';
  }
}
