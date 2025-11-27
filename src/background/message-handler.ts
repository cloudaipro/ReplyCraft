/**
 * Message Handler
 *
 * Routes messages from content scripts and popup to appropriate handlers
 */

import {
  isAnalyzeThreadRequest,
  isRewriteDraftRequest,
  isGetPreferencesRequest,
  isSavePreferencesRequest,
  isValidateApiKeyRequest,
  isGetCacheStatsRequest,
  isClearCacheRequest,
} from '@shared/types';
import {
  getPreferences,
  savePreferences,
  getCacheStats,
  clearCache,
  clearCacheForUrl,
} from '@shared/storage';

import { analyzeThread, rewriteDraft, validateApiKey } from './ai-service';
import { getCachedAnalysis, cacheAnalysis } from './cache-service';

import type {
  AllMessages,
  Response,
  AnalyzeThreadResponseData,
  RewriteDraftResponseData,
  PreferencesResponseData,
  ApiKeyValidationResponseData,
  CacheStatsResponseData,
  ErrorCode,
} from '@shared/types';

// =============================================================================
// Message Handler
// =============================================================================

export function setupMessageHandler(): void {
  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response: Response<unknown>) => void
    ): boolean => {
      // Handle message asynchronously
      handleMessage(message as AllMessages)
        .then(sendResponse)
        .catch((error) => {
          console.error('Message handler error:', error);
          sendResponse(createErrorResponse('UNKNOWN_ERROR', 'An unexpected error occurred'));
        });

      // Return true to indicate we'll respond asynchronously
      return true;
    }
  );
}

async function handleMessage(message: AllMessages): Promise<Response<unknown>> {
  // Analyze Thread
  if (isAnalyzeThreadRequest(message)) {
    return handleAnalyzeThread(message.payload);
  }

  // Rewrite Draft
  if (isRewriteDraftRequest(message)) {
    return handleRewriteDraft(message.payload);
  }

  // Get Preferences
  if (isGetPreferencesRequest(message)) {
    return handleGetPreferences();
  }

  // Save Preferences
  if (isSavePreferencesRequest(message)) {
    return handleSavePreferences(message.payload);
  }

  // Validate API Key
  if (isValidateApiKeyRequest(message)) {
    return handleValidateApiKey(message.payload.apiKey);
  }

  // Get Cache Stats
  if (isGetCacheStatsRequest(message)) {
    return handleGetCacheStats();
  }

  // Clear Cache
  if (isClearCacheRequest(message)) {
    return handleClearCache(message.payload.url);
  }

  return createErrorResponse('UNKNOWN_ERROR', 'Unknown message type');
}

// =============================================================================
// Message Handlers
// =============================================================================

async function handleAnalyzeThread(payload: {
  context: import('@shared/types').ThreadContext;
  tone: import('@shared/types').Tone;
  customToneText?: string;
}): Promise<Response<AnalyzeThreadResponseData>> {
  const { context, tone, customToneText } = payload;

  // Check for cached result
  const cached = await getCachedAnalysis(context.url, tone === 'custom' ? customToneText ?? '' : tone);
  if (cached) {
    return {
      success: true,
      data: {
        result: {
          suggestions: cached.suggestions,
          threadSummary: cached.threadSummary,
          fromCache: true,
        },
      },
    };
  }

  // Get API key
  const prefs = await getPreferences();
  if (!prefs.apiKey) {
    return createErrorResponse('API_KEY_MISSING', 'Please configure your OpenAI API key in settings');
  }

  // Call AI service
  const result = await analyzeThread(context, tone, customToneText, prefs.apiKey);

  if (!result.success) {
    return result as Response<AnalyzeThreadResponseData>;
  }

  // Cache the result
  await cacheAnalysis(
    context.url,
    tone === 'custom' ? customToneText ?? '' : tone,
    result.data.suggestions,
    result.data.threadSummary,
    prefs.cacheTTLHours
  );

  return {
    success: true,
    data: {
      result: {
        suggestions: result.data.suggestions,
        threadSummary: result.data.threadSummary,
        fromCache: false,
      },
    },
  };
}

async function handleRewriteDraft(payload: {
  draftText: string;
  context: import('@shared/types').ThreadContext | null;
  tone: import('@shared/types').Tone;
  customToneText?: string;
}): Promise<Response<RewriteDraftResponseData>> {
  const { draftText, context, tone, customToneText } = payload;

  if (!draftText.trim()) {
    return createErrorResponse('VALIDATION_ERROR', 'Cannot rewrite empty text');
  }

  // Get API key
  const prefs = await getPreferences();
  if (!prefs.apiKey) {
    return createErrorResponse('API_KEY_MISSING', 'Please configure your OpenAI API key in settings');
  }

  // Call AI service
  const result = await rewriteDraft(draftText, context, tone, customToneText, prefs.apiKey);

  if (!result.success) {
    return result as Response<RewriteDraftResponseData>;
  }

  return {
    success: true,
    data: {
      rewrittenText: result.data.rewrittenText,
      originalText: draftText,
    },
  };
}

async function handleGetPreferences(): Promise<Response<PreferencesResponseData>> {
  const preferences = await getPreferences();
  return {
    success: true,
    data: { preferences },
  };
}

async function handleSavePreferences(
  payload: Partial<import('@shared/types').UserPreferences>
): Promise<Response<PreferencesResponseData>> {
  await savePreferences(payload);
  const preferences = await getPreferences();
  return {
    success: true,
    data: { preferences },
  };
}

async function handleValidateApiKey(
  apiKey: string
): Promise<Response<ApiKeyValidationResponseData>> {
  const result = await validateApiKey(apiKey);
  return result;
}

async function handleGetCacheStats(): Promise<Response<CacheStatsResponseData>> {
  const stats = await getCacheStats();
  return {
    success: true,
    data: stats,
  };
}

async function handleClearCache(url?: string): Promise<Response<{ cleared: boolean }>> {
  if (url) {
    await clearCacheForUrl(url);
  } else {
    await clearCache();
  }
  return {
    success: true,
    data: { cleared: true },
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

function createErrorResponse<T>(code: ErrorCode, message: string): Response<T> {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
