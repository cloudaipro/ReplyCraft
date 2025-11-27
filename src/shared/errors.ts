/**
 * Error Messages
 *
 * User-friendly error messages for all error codes
 */

import type { ErrorCode } from './types';

export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  API_KEY_MISSING:
    'Please configure your OpenAI API key in the extension settings to use ReplyCraft.',
  API_KEY_INVALID:
    'Your API key appears to be invalid. Please check that you\'ve entered it correctly.',
  API_RATE_LIMITED:
    'You\'ve exceeded the API rate limit. Please wait a moment and try again.',
  API_TIMEOUT:
    'The request timed out. Please check your internet connection and try again.',
  API_ERROR:
    'An error occurred while communicating with the AI service. Please try again.',
  NETWORK_ERROR:
    'Unable to connect to the server. Please check your internet connection.',
  PLATFORM_NOT_SUPPORTED:
    'This website is not currently supported. ReplyCraft works on Reddit, Twitter/X, and Facebook.',
  DOM_EXTRACTION_FAILED:
    'Could not extract content from this page. Please make sure you\'re on a post page.',
  NO_INPUT_FIELD:
    'No reply box found. Please click on a reply box before inserting text.',
  CACHE_ERROR:
    'An error occurred while accessing cached data. Try clearing the cache in settings.',
  VALIDATION_ERROR:
    'Invalid input. Please check your data and try again.',
  UNKNOWN_ERROR:
    'An unexpected error occurred. Please try again or restart the extension.',
};

/**
 * Get user-friendly error message for an error code
 */
export function getErrorMessage(code: ErrorCode): string {
  return ERROR_MESSAGES[code] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Create a formatted error for display
 */
export function formatError(code: ErrorCode, details?: string): string {
  const baseMessage = getErrorMessage(code);
  if (details) {
    return `${baseMessage}\n\nDetails: ${details}`;
  }
  return baseMessage;
}

/**
 * Check if an error is recoverable (user can retry)
 */
export function isRecoverableError(code: ErrorCode): boolean {
  const recoverable: ErrorCode[] = [
    'API_RATE_LIMITED',
    'API_TIMEOUT',
    'NETWORK_ERROR',
    'DOM_EXTRACTION_FAILED',
    'NO_INPUT_FIELD',
    'CACHE_ERROR',
  ];
  return recoverable.includes(code);
}

/**
 * Check if an error requires user action in settings
 */
export function requiresSettingsAction(code: ErrorCode): boolean {
  const settingsRequired: ErrorCode[] = ['API_KEY_MISSING', 'API_KEY_INVALID'];
  return settingsRequired.includes(code);
}
