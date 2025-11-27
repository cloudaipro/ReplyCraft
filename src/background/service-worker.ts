/**
 * Service Worker
 *
 * Main entry point for the extension's background service worker
 */

import { HOTKEY_CONFIG } from '@shared/constants';
import { getPreferences } from '@shared/storage';

import { setupMessageHandler } from './message-handler';
import { setupCachePruningAlarm } from './cache-service';
import { rewriteDraft } from './ai-service';

import type { Tone } from '@shared/types';

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

  if (!response.text) {
    // Show toast notification that no text was found
    await sendToContentScript({
      type: 'SHOW_TOAST',
      payload: {
        message: 'No text found in reply box',
        type: 'error',
        duration: 3000,
      },
    });
    return;
  }

  // Show loading toast
  await sendToContentScript({
    type: 'SHOW_TOAST',
    payload: {
      message: 'Rewriting...',
      type: 'loading',
    },
  });

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

  try {
    // Call AI service directly (don't use chrome.runtime.sendMessage - service worker can't message itself)
    const rewriteResult = await rewriteDraft(
      response.text,
      null, // No thread context in hotkey flow
      prefs.selectedTone as Tone,
      prefs.customToneText ?? undefined,
      prefs.apiKey
    );

    if (rewriteResult.success) {
      // Insert rewritten text
      await sendToContentScript({
        type: 'INSERT_TEXT',
        payload: {
          text: rewriteResult.data.rewrittenText,
          targetSelector: response.inputSelector,
        },
      });

      // Show success toast
      await sendToContentScript({
        type: 'SHOW_TOAST',
        payload: {
          message: 'Text rewritten!',
          type: 'success',
          duration: 2000,
        },
      });
    } else {
      // Show error toast
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
