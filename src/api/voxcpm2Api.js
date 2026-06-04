import { rateLimiter, executeWithRetry } from "./rateLimiter.js";

/**
 * voxcpm2Api.js
 *
 * Client for the NEW VoxCPM2 backend. This is a SEPARATE server from the legacy
 * proxy used by ttsApi.js / voiceProfileApi.js, so it gets its own base URL and
 * its own (optional) key. Nothing here touches the existing call-outs.
 *
 * Unlike the legacy task_id + polling APIs, this server is synchronous: you POST
 * the text + voice and it returns the finished audio in the same response.
 *
 *   POST {VITE_VOXCPM2_BASE_URL}/synthesize
 *        body: { text, voice, format }
 *        -> audio bytes (audio/wav | audio/ogg)
 *
 * Env:
 *   VITE_VOXCPM2_BASE_URL   required, e.g. http://localhost:8005  (no /api suffix)
 *   VITE_VOXCPM2_API_KEY    optional; sent as x-api-key only if set
 */

const BASE_URL = (import.meta.env.VITE_VOXCPM2_BASE_URL || "").replace(/\/+$/, "");
const API_KEY = import.meta.env.VITE_VOXCPM2_API_KEY; // optional

if (!BASE_URL) {
  throw new Error(
    "VITE_VOXCPM2_BASE_URL is not set. Add it to .env.local (and deployment secrets)."
  );
}

const MAX_TEXT_LENGTH = 5000;
const GEN_TIMEOUT_MS = 120000; // synchronous generation can take a while on long text

const getHeaders = () => ({
  "Content-Type": "application/json",
  ...(API_KEY ? { "x-api-key": API_KEY } : {}),
});

const validateText = (text) => {
  if (!text || typeof text !== "string") throw new Error("Text must be a non-empty string");
  const t = text.trim();
  if (!t) throw new Error("Text cannot be empty");
  if (t.length > MAX_TEXT_LENGTH)
    throw new Error(`Text cannot exceed ${MAX_TEXT_LENGTH} characters. Current: ${t.length}`);
  return t;
};

/**
 * Synthesize speech on the VoxCPM2 server and return a playable object URL.
 * The caller owns the URL and may URL.revokeObjectURL() it when finished.
 *
 * @param {string} text  text to speak
 * @param {string} voice backend voice id ("speaker_a" | "speaker_b")
 * @param {object} [opts]
 * @param {"wav"|"opus"} [opts.format="wav"]
 * @returns {Promise<string>} object URL for the generated audio
 */
export const generateVoxCPM2Audio = async (text, voice, { format = "wav" } = {}) => {
  try {
    rateLimiter.enforceLimit();
    const validatedText = validateText(text);
    if (!voice) throw new Error("voice is required");

    const blob = await executeWithRetry(async () => {
      const response = await fetch(`${BASE_URL}/synthesize`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ text: validatedText, voice, format }),
        signal: AbortSignal.timeout(GEN_TIMEOUT_MS),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const errJson = await response.json();
          // FastAPI validation errors come back under `detail`
          detail = typeof errJson.detail === "string" ? errJson.detail : errJson.message || "";
        } catch {
          /* body was not JSON */
        }

        const error = new Error(
          detail || `VoxCPM2 generation failed (${response.status} ${response.statusText})`
        );
        error.status = response.status;

        if (response.status === 401) error.message = "Authentication failed: Invalid or missing API key";
        else if (response.status === 403) error.message = "Authentication failed: Access denied";
        else if (response.status === 404) error.message = "Unknown voice on the VoxCPM2 server";
        else if (response.status === 503) error.message = "VoxCPM2 model is not available";

        throw error;
      }

      return await response.blob();
    }, "VoxCPM2 generation");

    rateLimiter.recordRequest();
    const url = URL.createObjectURL(blob);
    console.log("✅ VoxCPM2 audio ready:", url);
    return url;
  } catch (error) {
    console.error("❌ VoxCPM2 generation error:", error.message);
    throw error;
  }
};