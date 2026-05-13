/**
 * Error Logger Service
 * Handles error logging for production environments
 * Converts technical errors to user-friendly messages
 * 
 * Usage:
 * import { logError, getUserFriendlyMessage } from '../api/errorLogger';
 * 
 * try {
 *   // Some operation
 * } catch (err) {
 *   logError('API_CALL_FAILED', err);
 *   setError(getUserFriendlyMessage('API_CALL_FAILED'));
 * }
 */

// Error types mapped to user-friendly messages
const ERROR_MESSAGES = {
  // Network errors
  NETWORK_ERROR: {
    user: "🌐 Connection lost. Please check your internet and try again.",
    dev: "Network connectivity issue",
  },
  SERVER_DOWN: {
    user: "🔧 Our servers are currently down for maintenance. Please try again in a few minutes.",
    dev: "Backend server is not responding (5xx)",
  },
  API_TIMEOUT: {
    user: "⏱️ Request took too long. Please try again.",
    dev: "Request timed out (>30s)",
  },
  API_ERROR: {
    user: "❌ Something went wrong. Please try again later.",
    dev: "API request failed",
  },
  
  // Validation errors
  INVALID_INPUT: {
    user: "📝 Please check your input and try again.",
    dev: "Invalid user input",
  },
  TEXT_TOO_LONG: {
    user: "📝 Text is too long. Maximum 5000 characters allowed.",
    dev: "Text exceeds max length",
  },
  TEXT_EMPTY: {
    user: "📝 Please enter some text first.",
    dev: "Empty text input",
  },
  
  // Audio errors
  AUDIO_ERROR: {
    user: "🎵 Error loading audio. Please try generating again.",
    dev: "Audio playback error",
  },
  INVALID_AUDIO_URL: {
    user: "🎵 Invalid audio file. Please try generating again.",
    dev: "Audio URL validation failed (XSS prevention)",
  },
  
  // Generation errors
  GENERATION_TIMEOUT: {
    user: "⏱️ Audio generation took too long. Please try again.",
    dev: "Audio generation timeout (>5 minutes)",
  },
  GENERATION_FAILED: {
    user: "❌ Failed to generate audio. Please try again.",
    dev: "Backend audio generation failed",
  },
  
  // Unknown error
  UNKNOWN_ERROR: {
    user: "❌ An unexpected error occurred. Please try again.",
    dev: "Unknown error",
  },
};

/**
 * Gets user-friendly error message
 * @param {string} errorType - Error type key from ERROR_MESSAGES
 * @returns {string} User-friendly error message
 */
export function getUserFriendlyMessage(errorType) {
  const errorConfig = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  return errorConfig.user;
}

/**
 * Comprehensive error logger for production
 * Logs errors to console and can be extended for error tracking services
 * 
 * @param {string} errorType - Error type key
 * @param {Error|string} error - The error object or message
 * @param {object} context - Additional context (optional)
 */
export function logError(errorType, error, context = {}) {
  const timestamp = new Date().toISOString();
  const errorConfig = ERROR_MESSAGES[errorType] || ERROR_MESSAGES.UNKNOWN_ERROR;
  const errorMessage = error?.message || String(error);

  // Build structured log
  const logEntry = {
    timestamp,
    errorType,
    devMessage: errorConfig.dev,
    errorMessage,
    context,
    url: window.location.href,
    userAgent: navigator.userAgent,
    // Add stack trace if available
    stack: error?.stack,
  };

  // ==========================================
  // Development: Console logging with colors
  // ==========================================
  if (process.env.NODE_ENV === 'development') {
    console.group(
      `%c❌ ERROR: ${errorType}`,
      'color: #ff6b6b; font-weight: bold; font-size: 14px;'
    );
    console.log('%c📋 Details:', 'color: #4ecdc4; font-weight: bold;');
    console.table(logEntry);
    console.log('%c🔍 Stack:', 'color: #95a5a6;');
    console.error(error);
    console.groupEnd();
  }

  // ==========================================
  // Production: Send to error tracking service
  // ==========================================
  if (process.env.NODE_ENV === 'production') {
    // Option 1: Send to your own backend
    sendErrorToBackend(logEntry);

    // Option 2: Send to error tracking service (e.g., Sentry, LogRocket)
    // reportToErrorTrackingService(logEntry);
  }

  // ==========================================
  // Always: Log to localStorage for debugging
  // ==========================================
  logToLocalStorage(logEntry);
}

/**
 * Send error to backend for logging
 * @param {object} logEntry - Error log entry
 */
function sendErrorToBackend(logEntry) {
  // Only send if not already sending (prevent loops)
  if (logEntry.errorType === 'BACKEND_LOG_FAILED') return;

  try {
    fetch(import.meta.env.VITE_API_BASE_URL + '/api/logs/error', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_API_KEY,
      },
      body: JSON.stringify(logEntry),
    }).catch(err => {
      console.warn('Failed to send error to backend:', err);
    });
  } catch (err) {
    logError('BACKEND_LOG_FAILED', err);
  }
}

/**
 * Store error in localStorage for debugging
 * Keeps last 20 errors
 * @param {object} logEntry - Error log entry
 */
function logToLocalStorage(logEntry) {
  try {
    const key = 'app_error_logs';
    let logs = [];

    // Get existing logs
    const stored = localStorage.getItem(key);
    if (stored) {
      logs = JSON.parse(stored);
    }

    // Add new error
    logs.push(logEntry);

    // Keep only last 20 errors
    if (logs.length > 20) {
      logs = logs.slice(-20);
    }

    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(logs));
  } catch (err) {
    console.warn('Failed to log error to localStorage:', err);
  }
}

/**
 * Classifies HTTP error into error type
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @returns {string} Error type key
 */
export function classifyHttpError(status, message = '') {
  if (status >= 500) return 'SERVER_DOWN';
  if (status === 408 || status === 504) return 'API_TIMEOUT';
  if (status === 400) return 'INVALID_INPUT';
  if (status === 401 || status === 403) return 'API_ERROR';
  if (status === 0 || !status) return 'NETWORK_ERROR';
  return 'API_ERROR';
}

/**
 * Get all stored error logs from localStorage
 * Useful for debugging
 * @returns {array} Array of error logs
 */
export function getStoredErrorLogs() {
  try {
    const logs = localStorage.getItem('app_error_logs');
    return logs ? JSON.parse(logs) : [];
  } catch (err) {
    console.warn('Failed to retrieve error logs:', err);
    return [];
  }
}

/**
 * Clear all stored error logs
 */
export function clearErrorLogs() {
  try {
    localStorage.removeItem('app_error_logs');
    console.log('✅ Error logs cleared');
  } catch (err) {
    console.warn('Failed to clear error logs:', err);
  }
}

/**
 * Export error logs as JSON for support/debugging
 */
export function exportErrorLogs() {
  const logs = getStoredErrorLogs();
  const dataStr = JSON.stringify(logs, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `error-logs-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default {
  logError,
  getUserFriendlyMessage,
  classifyHttpError,
  getStoredErrorLogs,
  clearErrorLogs,
  exportErrorLogs,
};
