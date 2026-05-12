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
 * Starts audio generation with validated input and authentication
 * @param {string} text - Text to convert to speech
 * @returns {Promise<string>} - Task ID for tracking progress
 * @throws {Error} - If validation or API call fails
 */
export const startAudioGeneration = async (text) => {
  try {
    // Validate input
    const validatedText = validateText(text);

    // Make API request with authentication
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ text: validatedText }),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusText = response.statusText;
      
      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid or missing API key");
      }
      if (response.status === 403) {
        throw new Error("Authentication failed: Access denied");
      }
      
      throw new Error(errorData.message || `Failed to queue task (${response.status} ${statusText})`);
    }

    const data = await response.json();

    if (!data.task_id) {
      throw new Error("No task ID received from server");
    }

    console.log("✅ Audio generation started. Task ID:", data.task_id);
    return data.task_id;
  } catch (error) {
    console.error("❌ Audio generation error:", error.message);
    throw error;
  }
};

/**
 * Checks audio generation status with validated task ID and authentication
 * @param {string} taskId - Task ID to check
 * @returns {Promise<object>} - Status information
 * @throws {Error} - If validation or API call fails
 */
export const checkAudioStatus = async (taskId) => {
  try {
    // Validate input
    const validatedTaskId = validateTaskId(taskId);

    const response = await fetch(`${API_BASE_URL}/status/${encodeURIComponent(validatedTaskId)}`, {
      method: "GET",
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const statusText = response.statusText;
      
      if (response.status === 401) {
        throw new Error("Authentication failed: Invalid or missing API key");
      }
      if (response.status === 403) {
        throw new Error("Authentication failed: Access denied");
      }
      
      throw new Error(errorData.message || `Failed to check status (${response.status} ${statusText})`);
    }

    const statusData = await response.json();
    console.log("✅ Status check successful:", statusData);
    return statusData;
  } catch (error) {
    console.error("❌ Status check error:", error.message);
    throw error;
  }
};
