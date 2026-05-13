/**
 * Rate Limiter for Frontend API Requests
 * Prevents abuse and implements retry logic with exponential backoff
 */

const RATE_LIMIT_CONFIG = {
  MAX_REQUESTS: 10,           // 10 requests per minute
  WINDOW_MS: 60 * 1000,       // 1 minute window
  MAX_RETRIES: 3,             // Maximum retry attempts
  INITIAL_RETRY_DELAY: 1000,  // 1 second initial delay
  MAX_RETRY_DELAY: 10000,     // 10 second max delay
};

class RateLimiter {
  constructor() {
    this.requestTimestamps = [];
    this.requestQueue = [];
    this.isProcessing = false;
  }

  /**
   * Cleans up old request timestamps outside the window
   */
  cleanupOldRequests() {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_CONFIG.WINDOW_MS
    );
  }

  /**
   * Checks if a request can be made based on rate limit
   * @returns {object} - { allowed: boolean, remainingRequests: number, resetTime: number }
   */
  checkLimit() {
    this.cleanupOldRequests();

    const now = Date.now();
    const remaining = RATE_LIMIT_CONFIG.MAX_REQUESTS - this.requestTimestamps.length;
    const oldestRequest = this.requestTimestamps[0];
    const resetTime = oldestRequest ? oldestRequest + RATE_LIMIT_CONFIG.WINDOW_MS - now : 0;

    const allowed = this.requestTimestamps.length < RATE_LIMIT_CONFIG.MAX_REQUESTS;

    return {
      allowed,
      remainingRequests: Math.max(0, remaining),
      resetTime: Math.max(0, resetTime),
    };
  }

  /**
   * Records a successful request
   */
  recordRequest() {
    this.requestTimestamps.push(Date.now());
  }

  /**
   * Checks rate limit and throws error if exceeded
   * @throws {Error} - If rate limit exceeded
   */
  enforceLimit() {
    const { allowed, remainingRequests, resetTime } = this.checkLimit();

    if (!allowed) {
      const resetSeconds = Math.ceil(resetTime / 1000);
      throw new Error(
        `Rate limit exceeded. Maximum ${RATE_LIMIT_CONFIG.MAX_REQUESTS} requests per minute. ` +
        `Try again in ${resetSeconds} second${resetSeconds !== 1 ? 's' : ''}.`
      );
    }
  }

  /**
   * Gets current rate limit status
   * @returns {object} - Current rate limit information
   */
  getStatus() {
    const { allowed, remainingRequests, resetTime } = this.checkLimit();
    return {
      allowed,
      remainingRequests,
      resetTime: Math.ceil(resetTime / 1000),
      totalRequests: this.requestTimestamps.length,
      maxRequests: RATE_LIMIT_CONFIG.MAX_REQUESTS,
    };
  }

  /**
   * Resets the rate limiter (for testing only)
   */
  reset() {
    this.requestTimestamps = [];
    console.warn("⚠️ Rate limiter reset");
  }
}

/**
 * Implements exponential backoff for retries
 * @param {number} attempt - Current attempt number (0-indexed)
 * @returns {number} - Delay in milliseconds
 */
const getRetryDelay = (attempt) => {
  const delay = RATE_LIMIT_CONFIG.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
  return Math.min(delay, RATE_LIMIT_CONFIG.MAX_RETRY_DELAY);
};

/**
 * Checks if an error is retryable
 * @param {Error} error - Error to check
 * @param {number} status - HTTP status code
 * @returns {boolean} - True if error is retryable
 */
const isRetryable = (error, status) => {
  // Retry on network errors
  if (!status) return true;

  // Retry on server errors (5xx)
  if (status >= 500 && status < 600) return true;

  // Retry on timeout (408)
  if (status === 408) return true;

  // Retry on too many requests (429)
  if (status === 429) return true;

  // Don't retry on client errors (4xx) except 408 and 429
  if (status >= 400 && status < 500) return false;

  return false;
};

/**
 * Executes a request with automatic retry logic
 * @param {Function} requestFn - Async function that makes the API request
 * @param {string} requestName - Name of the request for logging
 * @returns {Promise} - Result of the request
 * @throws {Error} - If request fails after all retries
 */
const executeWithRetry = async (requestFn, requestName) => {
  let lastError;
  let lastStatus;

  for (let attempt = 0; attempt <= RATE_LIMIT_CONFIG.MAX_RETRIES; attempt++) {
    try {
      return await requestFn();
    } catch (error) {
      lastError = error;
      lastStatus = error.status;

      // Check if error is retryable
      if (!isRetryable(lastError, lastStatus)) {
        throw error;
      }

      // Don't retry if it's the last attempt
      if (attempt === RATE_LIMIT_CONFIG.MAX_RETRIES) {
        throw error;
      }

      // Calculate delay for next retry
      const delay = getRetryDelay(attempt);
      console.warn(
        `⚠️ ${requestName} failed (attempt ${attempt + 1}/${RATE_LIMIT_CONFIG.MAX_RETRIES + 1}). ` +
        `Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here
  throw lastError;
};

// Create singleton instance
const rateLimiter = new RateLimiter();

export { rateLimiter, executeWithRetry, getRetryDelay };
