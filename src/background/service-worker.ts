/**
 * Service Worker
 *
 * Main entry point for the extension's background service worker
 */

import { HOTKEY_CONFIG } from '@shared/constants';
import { getPreferences } from '@shared/storage';

import { setupMessageHandler } from './message-handler';
import { setupCachePruningAlarm } from './cache-service';
import { rewriteDraft, analyzeThread } from './ai-service';

import type { Tone, ThreadContext } from '@shared/types';

// =============================================================================
// Initialization
// =============================================================================

// Set up message handling
setupMessageHandler();

// Set up cache pruning alarm
setupCachePruningAlarm();

// =============================================================================
// Hotkey Command Handler
// =============================================================================

let lastHotkeyTime = 0;

chrome.commands.onCommand.addListener((command: string) => {
  if (command === HOTKEY_CONFIG.REWRITE_COMMAND) {
    // Debounce
    const now = Date.now();
    if (now - lastHotkeyTime < HOTKEY_CONFIG.DEBOUNCE_MS) {
      return;
    }
    lastHotkeyTime = now;

    handleRewriteHotkey().catch((error) => {
      console.error('Hotkey handler error:', error);
    });
  }
});

async function handleRewriteHotkey(): Promise<void> {
  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.id || !tab.url) {
    console.warn('No active tab found');
    return;
  }

  // Check if the current page is supported
  if (!isPageSupported(tab.url)) {
    console.log('Hotkey pressed on unsupported page:', tab.url);
    return;
  }

  const tabId = tab.id;

  // Helper to safely send messages to content script
  const sendToContentScript = async <T>(message: unknown): Promise<T | null> => {
    try {
      return await chrome.tabs.sendMessage(tabId, message);
    } catch {
      // Content script not loaded - this is expected on pages opened before extension load
      return null;
    }
  };

  // Send message to content script to get draft text
  const response = await sendToContentScript<{ text?: string; inputSelector?: string }>({ type: 'GET_DRAFT_TEXT' });

  // If no response, content script isn't loaded (page was open before extension load)
  if (response === null) {
    console.log('Content script not loaded. Please refresh the page.');
    return;
  }

  // Check for placeholder texts
  const placeholderPatterns = [
    /^write\s*(a\s*)?(comment|reply|message)/i,
    /^add\s*(a\s*)?(comment|reply)/i,
    /^what('s|s)?\s*(on\s*)?your\s*mind/i,
    /^share\s*(your\s*)?(thoughts|opinion)/i,
    /^type\s*(a\s*)?(message|comment|reply)/i,
    /^post\s*(a\s*)?(comment|reply)/i,
  ];

  // Validate draft text - check if it's actual user content
  const draftText = response.text?.trim() ?? '';
  const hasUserText = draftText.length >= 2 && !placeholderPatterns.some(pattern => pattern.test(draftText));

  // Get preferences for tone
  const prefs = await getPreferences();

  if (!prefs.apiKey) {
    await sendToContentScript({
      type: 'SHOW_TOAST',
      payload: {
        message: 'Please configure API key in extension settings',
        type: 'error',
        duration: 5000,
      },
    });
    return;
  }

  if (hasUserText) {
    // User has typed text - REWRITE it
    await handleRewrite(sendToContentScript, draftText, response.inputSelector, prefs);
  } else {
    // No user text - GENERATE a new comment based on thread context
    await handleGenerate(sendToContentScript, response.inputSelector, prefs);
  }
}

// =============================================================================
// Rewrite Handler (when user has typed text)
// =============================================================================

async function handleRewrite(
  sendToContentScript: <T>(message: unknown) => Promise<T | null>,
  draftText: string,
  inputSelector: string | undefined,
  prefs: { apiKey: string; selectedTone: string; customToneText?: string | null }
): Promise<void> {
  // Show loading toast
  await sendToContentScript({
    type: 'SHOW_TOAST',
    payload: {
      message: 'Rewriting...',
      type: 'loading',
    },
  });

  try {
    const rewriteResult = await rewriteDraft(
      draftText,
      null,
      prefs.selectedTone as Tone,
      prefs.customToneText ?? undefined,
      prefs.apiKey
    );

    if (rewriteResult.success) {
      const rewrittenText = rewriteResult.data.rewrittenText.trim();

      // Check if the AI returned an error-like response
      const errorPatterns = [
        /^please\s+provide/i,
        /^i('d|\s+would)\s+(need|like)/i,
        /^(sorry|apologies)/i,
        /^i\s+(can't|cannot|couldn't)/i,
        /^there('s|\s+is)\s+no\s+text/i,
        /^no\s+text\s+(was\s+)?provided/i,
      ];

      if (errorPatterns.some(pattern => pattern.test(rewrittenText))) {
        await sendToContentScript({
          type: 'SHOW_TOAST',
          payload: {
            message: 'Could not rewrite text. Please try again.',
            type: 'error',
            duration: 3000,
          },
        });
        return;
      }

      // Insert rewritten text
      await sendToContentScript({
        type: 'INSERT_TEXT',
        payload: {
          text: rewrittenText,
          targetSelector: inputSelector,
        },
      });

      await sendToContentScript({
        type: 'SHOW_TOAST',
        payload: {
          message: 'Text rewritten!',
          type: 'success',
          duration: 2000,
        },
      });
    } else {
      await sendToContentScript({
        type: 'SHOW_TOAST',
        payload: {
          message: rewriteResult.error?.message || 'Failed to rewrite',
          type: 'error',
          duration: 4000,
        },
      });
    }
  } catch (error) {
    console.error('Rewrite request failed:', error);
    await sendToContentScript({
      type: 'SHOW_TOAST',
      payload: {
        message: 'Failed to rewrite text',
        type: 'error',
        duration: 3000,
      },
    });
  }
}

// =============================================================================
// Generate Handler (when reply box is empty)
// =============================================================================

async function handleGenerate(
  sendToContentScript: <T>(message: unknown) => Promise<T | null>,
  inputSelector: string | undefined,
  prefs: { apiKey: string; selectedTone: string; customToneText?: string | null }
): Promise<void> {
  // Show loading toast
  await sendToContentScript({
    type: 'SHOW_TOAST',
    payload: {
      message: 'Generating reply...',
      type: 'loading',
    },
  });

  try {
    // Extract thread context from the page
    const contextResponse = await sendToContentScript<{ context: ThreadContext | null }>({
      type: 'EXTRACT_THREAD',
    });

    if (!contextResponse?.context) {
      await sendToContentScript({
        type: 'SHOW_TOAST',
        payload: {
          message: 'Could not extract thread content',
          type: 'error',
          duration: 3000,
        },
      });
      return;
    }

    // Generate suggestions using analyzeThread
    const result = await analyzeThread(
      contextResponse.context,
      prefs.selectedTone as Tone,
      prefs.customToneText ?? undefined,
      prefs.apiKey
    );

    if (result.success) {
      const suggestions = result.data.suggestions;
      if (suggestions.length > 0 && suggestions[0]) {
        // Insert the first suggestion
        await sendToContentScript({
          type: 'INSERT_TEXT',
          payload: {
            text: suggestions[0].text,
            targetSelector: inputSelector,
          },
        });

        await sendToContentScript({
          type: 'SHOW_TOAST',
          payload: {
            message: 'Reply generated!',
            type: 'success',
            duration: 2000,
          },
        });
      } else {
        await sendToContentScript({
          type: 'SHOW_TOAST',
          payload: {
            message: 'No suggestions generated',
            type: 'error',
            duration: 3000,
          },
        });
      }
    } else {
      await sendToContentScript({
        type: 'SHOW_TOAST',
        payload: {
          message: result.error.message || 'Failed to generate reply',
          type: 'error',
          duration: 4000,
        },
      });
    }
  } catch (error) {
    console.error('Generate request failed:', error);
    await sendToContentScript({
      type: 'SHOW_TOAST',
      payload: {
        message: 'Failed to generate reply',
        type: 'error',
        duration: 3000,
      },
    });
  }
}

// =============================================================================
// Extension Lifecycle
// =============================================================================

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('ReplyCraft extension installed');
    // Could open onboarding page here
  } else if (details.reason === 'update') {
    console.log('ReplyCraft extension updated to version', chrome.runtime.getManifest().version);
  }
});

// =============================================================================
// Utility Functions
// =============================================================================

function isPageSupported(url: string): boolean {
  const patterns = [
    /^https?:\/\/(www\.)?reddit\.com\//,
    /^https?:\/\/old\.reddit\.com\//,
    /^https?:\/\/(www\.)?(twitter|x)\.com\//,
    /^https?:\/\/(www\.)?facebook\.com\//,
  ];

  return patterns.some((pattern) => pattern.test(url));
}
