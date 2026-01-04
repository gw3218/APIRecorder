/**
 * Session Model
 * Represents a recording session
 */
export class Session {
  constructor(data) {
    this.sessionId = data.sessionId;
    this.name = data.name;
    this.targetUrl = data.targetUrl;
    this.startTime = data.startTime;
    this.endTime = data.endTime;
    this.status = data.status; // idle, active, paused, stopped, completed
    this.totalRequests = data.totalRequests || 0;
    this.metadata = data.metadata || {};
  }

  /**
   * Calculate session duration
   * @returns {number|null} Duration in milliseconds
   */
  getDuration() {
    if (!this.startTime) {
      return null;
    }
    const end = this.endTime ? new Date(this.endTime) : new Date();
    const start = new Date(this.startTime);
    return end - start;
  }

  /**
   * Check if session is active
   * @returns {boolean}
   */
  isActive() {
    return this.status === 'active';
  }
}
