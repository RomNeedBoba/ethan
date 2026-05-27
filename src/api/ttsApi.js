import { rateLimiter, executeWithRetry } from "./rateLimiter.js";

// Pointing to your Node.js Proxy
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL environment variable is not set. " +
    "Add it to .env.local (local development) or GitHub Secrets (production)"
  );
}

if (!API_KEY) {
  throw new Error(
    "VITE_API_KEY environment variable is not set. " +
    "Add it to .env.local (local development) or GitHub Secrets (production)"
  );
}

// Validation constants
const MAX_TEXT_LENGTH = 5000;
const MIN_TEXT_LENGTH = 1;
const MAX_TASK_ID_LENGTH = 100;

/**
 * Validates input text before sending to API
 * @param {string} text - Text to validate
 * @returns {string} - Trimmed and validated text
 * @throws {Error} - If validation fails
 */
const validateText = (text) => {
  // Check if text exists and is a string
  if (!text || typeof text !== "string") {
    throw new Error("Text must be a non-empty string");
  }

  // Trim whitespace
  const trimmedText = text.trim();

  // Check length
  if (trimmedText.length < MIN_TEXT_LENGTH) {
    throw new Error("Text cannot be empty");
  }

  if (trimmedText.length > MAX_TEXT_LENGTH) {
    throw new Error(`Text cannot exceed ${MAX_TEXT_LENGTH} characters. Current: ${trimmedText.length}`);
  }

  return trimmedText;
};

/**
 * Validates task ID format
 * @param {string} taskId - Task ID to validate
 * @returns {string} - Validated task ID
 * @throws {Error} - If validation fails
 */
const validateTaskId = (taskId) => {
  if (!taskId || typeof taskId !== "string") {
    throw new Error("Task ID must be a non-empty string");
  }

  if (taskId.length > MAX_TASK_ID_LENGTH) {
    throw new Error("Invalid task ID format");
  }

  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(taskId)) {
    throw new Error("Task ID contains invalid characters");
  }

  return taskId;
};

/**
 * Creates request headers with authentication
 * @returns {object} - Headers object with API key
 */
const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
});

/**
 * Starts Soriya (VITS2) audio generation
 * @param {string} text - Text to convert to speech
 * @returns {Promise<string>} - Task ID for tracking progress
 * @throws {Error} - If validation, rate limiting, or API call fails
 */
export const startAudioGeneration = async (text) => {
  try {
    // Check rate limit first
    rateLimiter.enforceLimit();

    // Validate input
    const validatedText = validateText(text);

    // Execute request with automatic retry logic
    const data = await executeWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: validatedText }),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusText = response.statusText;

        // Create error object with status for retry logic
        const error = new Error(
          errorData.message || `Failed to queue Soriya task (${response.status} ${statusText})`
        );
        error.status = response.status;

        if (response.status === 401) {
          error.message = "Authentication failed: Invalid or missing API key";
        } else if (response.status === 403) {
          error.message = "Authentication failed: Access denied";
        }

        throw error;
      }

      return await response.json();
    }, "Soriya audio generation");

    if (!data.task_id) {
      throw new Error("No task ID received from server");
    }

    // Record successful request for rate limiting
    rateLimiter.recordRequest();

    const status = rateLimiter.getStatus();
    console.log("✅ Soriya generation started. Task ID:", data.task_id);
    console.log(`📊 Rate limit: ${status.remainingRequests}/${status.maxRequests} requests remaining`);

    return data.task_id;
  } catch (error) {
    console.error("❌ Soriya generation error:", error.message);
    throw error;
  }
};

/**
 * Starts Reporter (VoxCPM) audio generation
 * @param {string} text - Text to convert to speech
 * @returns {Promise<string>} - Task ID for tracking progress
 * @throws {Error} - If validation, rate limiting, or API call fails
 */
export const startVoxCPMGeneration = async (text) => {
  try {
    rateLimiter.enforceLimit();
    const validatedText = validateText(text);

    const data = await executeWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/voxcpm/generate`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: validatedText }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message || `Failed to queue Reporter task (${response.status} ${response.statusText})`
        );
        error.status = response.status;

        if (response.status === 401) {
          error.message = "Authentication failed: Invalid or missing API key";
        } else if (response.status === 403) {
          error.message = "Authentication failed: Access denied";
        } else if (response.status === 503) {
          error.message = "Reporter model is not available";
        }

        throw error;
      }

      return await response.json();
    }, "Reporter generation");

    if (!data.task_id) {
      throw new Error("No task ID received from server");
    }

    rateLimiter.recordRequest();

    const status = rateLimiter.getStatus();
    console.log("✅ Reporter generation started. Task ID:", data.task_id);
    console.log(`📊 Rate limit: ${status.remainingRequests}/${status.maxRequests} requests remaining`);

    return data.task_id;
  } catch (error) {
    console.error("❌ Reporter generation error:", error.message);
    throw error;
  }
};

/**
 * Checks audio generation status with validated task ID, authentication, and rate limiting
 * @param {string} taskId - Task ID to check
 * @returns {Promise<object>} - Status information
 * @throws {Error} - If validation, rate limiting, or API call fails
 */
export const checkAudioStatus = async (taskId) => {
  try {
    // Check rate limit first
    rateLimiter.enforceLimit();

    // Validate input
    const validatedTaskId = validateTaskId(taskId);

    // Execute request with automatic retry logic
    const statusData = await executeWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/status/${encodeURIComponent(validatedTaskId)}`, {
        method: "GET",
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const statusText = response.statusText;

        // Create error object with status for retry logic
        const error = new Error(
          errorData.message || `Failed to check status (${response.status} ${statusText})`
        );
        error.status = response.status;

        if (response.status === 401) {
          error.message = "Authentication failed: Invalid or missing API key";
        } else if (response.status === 403) {
          error.message = "Authentication failed: Access denied";
        }

        throw error;
      }

      return await response.json();
    }, "Status check");

    // Record successful request for rate limiting
    rateLimiter.recordRequest();

    const status = rateLimiter.getStatus();
    console.log("✅ Status check successful:", statusData);
    console.log(`📊 Rate limit: ${status.remainingRequests}/${status.maxRequests} requests remaining`);

    return statusData;
  } catch (error) {
    console.error("❌ Status check error:", error.message);
    throw error;
  }
};

/**
 * Get current rate limit status (useful for UI display)
 * @returns {object} - Current rate limit information
 */
export const getRateLimitStatus = () => {
  return rateLimiter.getStatus();
};
