import { rateLimiter, executeWithRetry } from "./rateLimiter.js";

/**
 * voiceProfileApi.js
 *
 * Backend client for reference-clip cloned voices. Mirrors the conventions of
 * ttsApi.js (same env vars, same x-api-key header, same retry + rate-limit
 * behaviour). Endpoints assumed:
 *
 *   GET    {API_BASE_URL}/voice-profiles                       -> list profiles
 *   POST   {API_BASE_URL}/voice-profiles/:id/generate          -> queue a task
 *   GET    {API_BASE_URL}/voice-profiles/tasks/:taskId         -> task status
 *
 * If your real backend uses different paths, adjust the URLs below.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_BASE_URL) {
  throw new Error(
    "VITE_API_BASE_URL environment variable is not set. " +
      "Add it to .env.local (local development) or to your deployment secrets."
  );
}

if (!API_KEY) {
  throw new Error(
    "VITE_API_KEY environment variable is not set. " +
      "Add it to .env.local (local development) or to your deployment secrets."
  );
}

const MAX_TEXT_LENGTH = 5000;
const MIN_TEXT_LENGTH = 1;
const MAX_ID_LENGTH = 100;

const getAuthHeaders = () => ({
  "Content-Type": "application/json",
  "x-api-key": API_KEY,
});

const validateText = (text) => {
  if (!text || typeof text !== "string") throw new Error("Text must be a non-empty string");
  const t = text.trim();
  if (t.length < MIN_TEXT_LENGTH) throw new Error("Text cannot be empty");
  if (t.length > MAX_TEXT_LENGTH)
    throw new Error(`Text cannot exceed ${MAX_TEXT_LENGTH} characters. Current: ${t.length}`);
  return t;
};

const validateId = (id, label) => {
  if (!id || typeof id !== "string") throw new Error(`${label} must be a non-empty string`);
  if (id.length > MAX_ID_LENGTH) throw new Error(`Invalid ${label.toLowerCase()} format`);
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new Error(`${label} contains invalid characters`);
  return id;
};

const mapAuthError = (err, response) => {
  if (response.status === 401) err.message = "Authentication failed: Invalid or missing API key";
  else if (response.status === 403) err.message = "Authentication failed: Access denied";
  else if (response.status === 503) err.message = "Voice profile service is not available";
  return err;
};

/**
 * Fetch the list of available voice profiles. Returns an array of objects;
 * each is expected to have at least an `id`, a `name`, and a `builtin` flag.
 * Tolerates backends that return either `[...]` or `{ profiles: [...] }`.
 */
export const getVoiceProfiles = async () => {
  try {
    rateLimiter.enforceLimit();

    const data = await executeWithRetry(async () => {
      const response = await fetch(`${API_BASE_URL}/voice-profiles`, {
        method: "GET",
        headers: getAuthHeaders(),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message ||
            `Failed to load voice profiles (${response.status} ${response.statusText})`
        );
        error.status = response.status;
        throw mapAuthError(error, response);
      }

      return await response.json();
    }, "Voice profile list");

    rateLimiter.recordRequest();

    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.profiles)) return data.profiles;
    if (Array.isArray(data?.data)) return data.data;
    return [];
  } catch (error) {
    console.error("❌ Voice profile list error:", error.message);
    throw error;
  }
};

/**
 * Queue a generation against a specific voice profile id.
 * Returns the raw response (expected to contain `task_id`).
 */
export const generateWithVoiceProfile = async (profileId, text) => {
  try {
    rateLimiter.enforceLimit();
    const validatedId = validateId(profileId, "Profile ID");
    const validatedText = validateText(text);

    const data = await executeWithRetry(async () => {
      const response = await fetch(
        `${API_BASE_URL}/voice-profiles/${encodeURIComponent(validatedId)}/generate`,
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ text: validatedText }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message ||
            `Failed to queue voice profile task (${response.status} ${response.statusText})`
        );
        error.status = response.status;
        throw mapAuthError(error, response);
      }

      return await response.json();
    }, "Voice profile generation");

    if (!data.task_id) throw new Error("No task ID received from server");

    rateLimiter.recordRequest();
    console.log("✅ Voice profile generation started. Task ID:", data.task_id);

    return data;
  } catch (error) {
    console.error("❌ Voice profile generation error:", error.message);
    throw error;
  }
};

/**
 * Poll status for a voice-profile task.
 */
export const getTaskStatus = async (taskId) => {
  try {
    rateLimiter.enforceLimit();
    const validatedTaskId = validateId(taskId, "Task ID");

    const statusData = await executeWithRetry(async () => {
      const response = await fetch(
        `${API_BASE_URL}/voice-profiles/tasks/${encodeURIComponent(validatedTaskId)}`,
        {
          method: "GET",
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(
          errorData.message ||
            `Failed to check task status (${response.status} ${response.statusText})`
        );
        error.status = response.status;
        throw mapAuthError(error, response);
      }

      return await response.json();
    }, "Voice profile task status");

    rateLimiter.recordRequest();
    return statusData;
  } catch (error) {
    console.error("❌ Voice profile status check error:", error.message);
    throw error;
  }
};