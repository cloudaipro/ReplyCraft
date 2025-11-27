/**
 * Shared Constants and Configuration
 */

import type { Platform, TonePreset, UserPreferences } from './types';

// =============================================================================
// Cache Configuration
// =============================================================================

export const CACHE_CONFIG = {
  /** Default TTL in hours */
  DEFAULT_TTL_HOURS: 24,
  /** Minimum TTL in hours */
  MIN_TTL_HOURS: 1,
  /** Maximum TTL in hours (1 week) */
  MAX_TTL_HOURS: 168,
  /** Maximum storage size before pruning (8MB of 10MB quota) */
  MAX_STORAGE_BYTES: 8 * 1024 * 1024,
  /** Maximum single entry size (100KB) */
  MAX_ENTRY_SIZE_BYTES: 100 * 1024,
  /** Percentage of oldest entries to prune when limit reached */
  PRUNE_PERCENTAGE: 0.2,
  /** Cache pruning alarm name */
  PRUNE_ALARM_NAME: 'cache-prune',
  /** Cache pruning interval in minutes (hourly) */
  PRUNE_INTERVAL_MINUTES: 60,
} as const;

// =============================================================================
// AI Configuration
// =============================================================================

export const AI_CONFIG = {
  /** OpenAI model to use */
  MODEL: 'gpt-4-turbo-preview',
  /** Fallback model if primary unavailable */
  FALLBACK_MODEL: 'gpt-3.5-turbo',
  /** Maximum tokens in response */
  MAX_TOKENS: 1500,
  /** Temperature for response generation */
  TEMPERATURE: 0.7,
  /** Request timeout in milliseconds */
  TIMEOUT_MS: 30000,
  /** Number of suggestions to generate */
  SUGGESTION_COUNT: { MIN: 3, MAX: 5, DEFAULT: 4 },
  /** Maximum thread context characters */
  MAX_CONTEXT_CHARS: 15000,
  /** Maximum single comment characters */
  MAX_COMMENT_CHARS: 2000,
  /** Maximum suggestion text characters */
  MAX_SUGGESTION_CHARS: 2000,
} as const;

// =============================================================================
// API Key Validation
// =============================================================================

export const API_KEY_CONFIG = {
  /** OpenAI key prefix */
  PREFIX: 'sk-',
  /** Minimum key length */
  MIN_LENGTH: 40,
  /** Pattern for validating key format (supports sk-xxx and sk-proj-xxx formats) */
  PATTERN: /^sk-[a-zA-Z0-9_-]{32,}$/,
} as const;

// =============================================================================
// Tone Configuration
// =============================================================================

export const TONE_PRESETS: readonly TonePreset[] = [
  'friendly',
  'professional',
  'humorous',
  'concise',
] as const;

export const TONE_DESCRIPTIONS: Record<TonePreset, string> = {
  friendly: 'Warm and approachable, like chatting with a friend',
  professional: 'Polished and respectful, suitable for work contexts',
  humorous: 'Witty and playful, adding levity to the conversation',
  concise: 'Brief and to-the-point, no fluff',
} as const;

// =============================================================================
// Platform Configuration
// =============================================================================

export const SUPPORTED_PLATFORMS: readonly Platform[] = ['reddit', 'twitter', 'facebook'] as const;

export const PLATFORM_NAMES: Record<Platform, string> = {
  reddit: 'Reddit',
  twitter: 'Twitter/X',
  facebook: 'Facebook',
} as const;

// =============================================================================
// Default Preferences
// =============================================================================

export const DEFAULT_PREFERENCES: UserPreferences = {
  selectedTone: 'concise',
  customToneText: null,
  apiKey: '',
  cacheTTLHours: CACHE_CONFIG.DEFAULT_TTL_HOURS,
  enabledPlatforms: [...SUPPORTED_PLATFORMS],
} as const;

// =============================================================================
// Storage Keys
// =============================================================================

export const STORAGE_KEYS = {
  PREFERENCES: 'preferences',
  CACHE: 'cache',
  CACHE_INDEX: 'cacheIndex',
} as const;

// =============================================================================
// Hotkey Configuration
// =============================================================================

export const HOTKEY_CONFIG = {
  /** Debounce delay in milliseconds */
  DEBOUNCE_MS: 500,
  /** Command name as defined in manifest */
  REWRITE_COMMAND: 'rewrite-draft',
} as const;

// =============================================================================
// UI Configuration
// =============================================================================

export const UI_CONFIG = {
  /** Toast notification default duration */
  TOAST_DURATION_MS: 3000,
  /** Loading toast duration (longer) */
  LOADING_TOAST_DURATION_MS: 10000,
  /** Animation duration for UI transitions */
  ANIMATION_DURATION_MS: 200,
} as const;

// =============================================================================
// Thread Extraction Configuration
// =============================================================================

export const EXTRACTION_CONFIG = {
  /** Maximum number of comments to extract */
  MAX_COMMENTS: 50,
  /** Maximum comment depth to traverse */
  MAX_COMMENT_DEPTH: 3,
  /** Maximum post title length */
  MAX_POST_TITLE_LENGTH: 500,
  /** Maximum post body length */
  MAX_POST_BODY_LENGTH: 10000,
} as const;
