/**
 * JSON Exporter
 * Exports recordings in JSON format
 */
export class JSONExporter {
  /**
   * Export request-response pairs as JSON
   * @param {Array} requestResponses - Array of request-response pairs
   * @returns {string} JSON string
   */
  static export(requestResponses) {
    return JSON.stringify(requestResponses, null, 2);
  }

  /**
   * Export session with all requests
   * @param {Object} session - Session object
   * @param {Array} requestResponses - Array of request-response pairs
   * @returns {string} JSON string
   */
  static exportSession(session, requestResponses) {
    const data = {
      session: {
        sessionId: session.sessionId,
        name: session.name,
        targetUrl: session.targetUrl,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        totalRequests: session.totalRequests,
        metadata: session.metadata
      },
      requests: requestResponses
    };
    return JSON.stringify(data, null, 2);
  }
}
