/**
 * Content Script
 *
 * Main entry point for the content script injected into supported pages
 */

import {
  isGetDraftTextRequest,
  isInsertTextRequest,
  isShowToastRequest,
  isSetFABVisibilityRequest,
  isGetFABVisibilityRequest,
} from '@shared/types';
import { getCurrentAdapter, isPageSupported } from '@adapters/adapter-factory';

import { showToast, hideToast } from './toast';
import { insertText, getLastFocusedInput, trackInputFocus } from './text-inserter';
import { extractThreadContext } from './thread-extractor';
import { initFloatingButton, showFAB, hideFAB } from './floating-button';

import type {
  GetDraftTextResponse,
  InsertTextRequest,
  ShowToastRequest,
  SetFABVisibilityRequest,
} from '@shared/types';

// =============================================================================
// Initialization
// =============================================================================

// Only run on supported pages
if (isPageSupported()) {
  initialize();
}

function initialize(): void {
  // Set up input focus tracking
  trackInputFocus();

  // Set up message listener
  chrome.runtime.onMessage.addListener(handleMessage);

  // Initialize floating action button for mobile/touch devices
  initFloatingButton().catch((error) => {
    console.warn('[ReplyCraft] Failed to initialize FAB:', error);
  });

  console.log('[ReplyCraft] Content script initialized');
}

// =============================================================================
// Message Handler
// =============================================================================

function handleMessage(
  message: unknown,
  _sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void
): boolean {
  // EXTRACT_THREAD - Extract thread context from the page
  if (isExtractThreadRequest(message)) {
    handleExtractThread().then(sendResponse).catch(() => sendResponse({ context: null }));
    return true; // Async response
  }

  // GET_DRAFT_TEXT - Extract text from active reply input
  if (isGetDraftTextRequest(message)) {
    const response = handleGetDraftText();
    sendResponse(response);
    return false; // Synchronous response
  }

  // INSERT_TEXT - Insert text into reply input
  if (isInsertTextRequest(message)) {
    handleInsertText(message as InsertTextRequest);
    sendResponse({ success: true });
    return false;
  }

  // SHOW_TOAST - Display toast notification
  if (isShowToastRequest(message)) {
    handleShowToast(message as ShowToastRequest);
    sendResponse({ success: true });
    return false;
  }

  // SET_FAB_VISIBILITY - Show or hide the floating action button
  if (isSetFABVisibilityRequest(message)) {
    handleSetFABVisibility(message as SetFABVisibilityRequest)
      .then(() => sendResponse({ success: true }))
      .catch(() => sendResponse({ success: false }));
    return true; // Async response
  }

  // GET_FAB_VISIBILITY - Get current FAB visibility state
  if (isGetFABVisibilityRequest(message)) {
    handleGetFABVisibility()
      .then((visible) => sendResponse({ visible }))
      .catch(() => sendResponse({ visible: true }));
    return true; // Async response
  }

  return false;
}

function isExtractThreadRequest(message: unknown): boolean {
  return typeof message === 'object' && message !== null && (message as { type?: string }).type === 'EXTRACT_THREAD';
}

async function handleExtractThread(): Promise<{ context: Awaited<ReturnType<typeof extractThreadContext>> }> {
  const context = await extractThreadContext();
  return { context };
}

// =============================================================================
// Message Handlers
// =============================================================================

function handleGetDraftText(): GetDraftTextResponse['payload'] | { text: null } {
  const adapter = getCurrentAdapter();

  if (!adapter) {
    return { text: null };
  }

  // Try to find reply input
  const input = adapter.findReplyInput() ?? getLastFocusedInput();

  if (!input) {
    return { text: null };
  }

  const text = adapter.getInputText(input);

  // Generate a selector for this input for later targeting
  const inputSelector = generateSelector(input);

  return {
    text: text || '',
    inputSelector,
  };
}

function handleInsertText(request: InsertTextRequest): void {
  const { text, targetSelector } = request.payload;
  const adapter = getCurrentAdapter();

  if (!adapter) {
    console.warn('[ReplyCraft] No adapter available for text insertion');
    showToast('Could not insert text', 'error', 3000);
    return;
  }

  // Try to find the target input
  let input: HTMLElement | null = null;

  // First try the specific target selector
  if (targetSelector) {
    input = document.querySelector(targetSelector) as HTMLElement | null;
  }

  // Fall back to adapter's findReplyInput
  if (!input) {
    input = adapter.findReplyInput();
  }

  // Fall back to last focused input
  if (!input) {
    input = getLastFocusedInput();
  }

  if (!input) {
    showToast('No reply box found', 'error', 3000);
    return;
  }

  // Insert the text
  insertText(input, text, adapter);
}

function handleShowToast(request: ShowToastRequest): void {
  const { message, type, duration } = request.payload;

  if (type === 'loading') {
    showToast(message, type);
  } else {
    // Hide any loading toast first
    hideToast();
    showToast(message, type, duration);
  }
}

async function handleSetFABVisibility(request: SetFABVisibilityRequest): Promise<void> {
  const { visible } = request.payload;
  if (visible) {
    await showFAB();
  } else {
    await hideFAB();
  }
}

async function handleGetFABVisibility(): Promise<boolean> {
  const FAB_STORAGE_KEY = 'replycraft-fab-state';
  try {
    const result = await chrome.storage.local.get(FAB_STORAGE_KEY);
    const state = result[FAB_STORAGE_KEY] as { visible?: boolean } | undefined;
    return state?.visible ?? true;
  } catch {
    return true;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Generate a CSS selector for an element
 */
function generateSelector(element: HTMLElement): string {
  // Try ID first
  if (element.id) {
    return `#${CSS.escape(element.id)}`;
  }

  // Try data attributes
  const dataTestId = element.getAttribute('data-testid');
  if (dataTestId) {
    return `[data-testid="${CSS.escape(dataTestId)}"]`;
  }

  // Build a path-based selector
  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();

    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      path.unshift(selector);
      break;
    }

    // Add classes that look stable (not generated)
    const stableClasses = Array.from(current.classList).filter(
      (cls) => !cls.match(/^[a-z]+-[a-z0-9]+$/i) && !cls.match(/^\d/)
    );
    if (stableClasses.length > 0) {
      selector += '.' + stableClasses.map(CSS.escape).join('.');
    }

    // Add nth-child for specificity
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current) + 1;
      selector += `:nth-child(${index})`;
    }

    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
}
