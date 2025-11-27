/**
 * Internal Message Contracts
 *
 * Defines the message types exchanged between extension components:
 * - Content Script ↔ Service Worker
 * - Popup ↔ Service Worker
 *
 * These are internal contracts, not public APIs.
 */

// =============================================================================
// Platform Types
// =============================================================================

export type Platform = 'reddit' | 'twitter' | 'facebook';

export type TonePreset = 'friendly' | 'professional' | 'humorous' | 'concise';

export type Tone = TonePreset | 'custom';

// =============================================================================
// Entity Types (from data-model.md)
// =============================================================================

export interface Comment {
  id: string;
  author: string;
  text: string;
  parentId: string | null;
  depth: number;
}

export interface ThreadContext {
  platform: Platform;
  url: string;
  postTitle: string;
  postBody: string;
  comments: Comment[];
  extractedAt: number;
}

export interface AISuggestion {
  id: string;
  text: string;
  tone: string;
  generatedAt: number;
}

export interface AnalysisResult {
  suggestions: AISuggestion[];
  threadSummary: string;
  fromCache: boolean;
}

export interface UserPreferences {
  selectedTone: Tone;
  customToneText: string | null;
  apiKey: string;
  cacheTTLHours: number;
  enabledPlatforms: Platform[];
}

// =============================================================================
// Message Types: Content Script → Service Worker
// =============================================================================

export interface AnalyzeThreadRequest {
  type: 'ANALYZE_THREAD';
  payload: {
    context: ThreadContext;
    tone: Tone;
    customToneText?: string;
  };
}

export interface RewriteDraftRequest {
  type: 'REWRITE_DRAFT';
  payload: {
    draftText: string;
    context: ThreadContext | null; // null if no thread context available
    tone: Tone;
    customToneText?: string;
  };
}

export interface GetDraftTextResponse {
  type: 'DRAFT_TEXT_RESPONSE';
  payload: {
    text: string;
    inputSelector: string; // CSS selector of the input field
  };
}

export interface ClearCacheRequest {
  type: 'CLEAR_CACHE';
  payload: {
    url?: string; // If provided, clear only this URL's cache; otherwise clear all
  };
}

// =============================================================================
// Message Types: Service Worker → Content Script
// =============================================================================

export interface GetDraftTextRequest {
  type: 'GET_DRAFT_TEXT';
}

export interface InsertTextRequest {
  type: 'INSERT_TEXT';
  payload: {
    text: string;
    targetSelector?: string; // Optional: specific input to target
  };
}

export interface ShowToastRequest {
  type: 'SHOW_TOAST';
  payload: {
    message: string;
    type: 'success' | 'error' | 'loading';
    duration?: number; // ms, default 3000
  };
}

// =============================================================================
// Message Types: Popup ↔ Service Worker
// =============================================================================

export interface GetPreferencesRequest {
  type: 'GET_PREFERENCES';
}

export interface SavePreferencesRequest {
  type: 'SAVE_PREFERENCES';
  payload: Partial<UserPreferences>;
}

export interface ValidateApiKeyRequest {
  type: 'VALIDATE_API_KEY';
  payload: {
    apiKey: string;
  };
}

export interface GetCacheStatsRequest {
  type: 'GET_CACHE_STATS';
}

// =============================================================================
// Response Types
// =============================================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type Response<T> = SuccessResponse<T> | ErrorResponse;

// =============================================================================
// Error Codes
// =============================================================================

export type ErrorCode =
  | 'API_KEY_MISSING'
  | 'API_KEY_INVALID'
  | 'API_RATE_LIMITED'
  | 'API_TIMEOUT'
  | 'API_ERROR'
  | 'NETWORK_ERROR'
  | 'PLATFORM_NOT_SUPPORTED'
  | 'DOM_EXTRACTION_FAILED'
  | 'NO_INPUT_FIELD'
  | 'CACHE_ERROR'
  | 'VALIDATION_ERROR'
  | 'UNKNOWN_ERROR';

// =============================================================================
// Response Payloads
// =============================================================================

export interface AnalyzeThreadResponseData {
  result: AnalysisResult;
}

export interface RewriteDraftResponseData {
  rewrittenText: string;
  originalText: string;
}

export interface PreferencesResponseData {
  preferences: UserPreferences;
}

export interface ApiKeyValidationResponseData {
  valid: boolean;
  model?: string; // The model accessible with this key
}

export interface CacheStatsResponseData {
  entryCount: number;
  totalSizeBytes: number;
  oldestEntryAge: number; // ms since creation
}

// =============================================================================
// Type Guards
// =============================================================================

export function isAnalyzeThreadRequest(msg: unknown): msg is AnalyzeThreadRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as AnalyzeThreadRequest).type === 'ANALYZE_THREAD'
  );
}

export function isRewriteDraftRequest(msg: unknown): msg is RewriteDraftRequest {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    (msg as RewriteDraftRequest).type === 'REWRITE_DRAFT'
  );
}

export function isSuccessResponse<T>(response: Response<T>): response is SuccessResponse<T> {
  return response.success === true;
}

export function isErrorResponse<T>(response: Response<T>): response is ErrorResponse {
  return response.success === false;
}
