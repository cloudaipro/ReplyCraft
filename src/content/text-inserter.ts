/**
 * Text Inserter
 *
 * Handles text insertion into reply boxes with focus tracking
 */

import type { PlatformAdapter } from '@adapters/adapter-interface';

// =============================================================================
// Focus Tracking
// =============================================================================

let lastFocusedInput: HTMLElement | null = null;

/**
 * Track focus on potential reply inputs
 */
export function trackInputFocus(): void {
  document.addEventListener(
    'focusin',
    (event) => {
      const target = event.target as HTMLElement;

      if (isReplyInput(target)) {
        lastFocusedInput = target;
      }
    },
    true
  );

  // Also track clicks for contenteditable that might not fire focusin
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as HTMLElement;

      // Check if clicked inside a contenteditable
      const editable = target.closest('[contenteditable="true"]') as HTMLElement | null;
      if (editable) {
        lastFocusedInput = editable;
      }
    },
    true
  );
}

/**
 * Get the last focused input element
 */
export function getLastFocusedInput(): HTMLElement | null {
  // Verify it's still in the DOM and valid
  if (lastFocusedInput && document.contains(lastFocusedInput)) {
    return lastFocusedInput;
  }
  return null;
}

/**
 * Clear the tracked input
 */
export function clearLastFocusedInput(): void {
  lastFocusedInput = null;
}

// =============================================================================
// Text Insertion
// =============================================================================

/**
 * Insert text into an input element using the adapter
 */
export function insertText(
  input: HTMLElement,
  text: string,
  adapter: PlatformAdapter
): void {
  // Store original text in case of rollback
  const originalText = adapter.getInputText(input);

  try {
    // Use adapter's setInputText for platform-specific handling
    adapter.setInputText(input, text, false);

    // Verify insertion worked by checking if text is now present
    const newText = adapter.getInputText(input);
    const normalizedNew = newText.trim().replace(/\s+/g, ' ');
    const normalizedExpected = text.trim().replace(/\s+/g, ' ');

    // Only use fallback if the text is completely missing (not just different formatting)
    if (!normalizedNew.includes(normalizedExpected) && normalizedNew.length === 0) {
      console.log('[ReplyCraft] Primary insertion failed, trying fallback');
      fallbackInsert(input, text);
    }
  } catch (error) {
    console.error('[ReplyCraft] Text insertion failed:', error);

    // Try to restore original text
    try {
      adapter.setInputText(input, originalText, false);
    } catch {
      // Ignore restore errors
    }

    throw error;
  }
}

/**
 * Append text to an input element
 */
export function appendText(
  input: HTMLElement,
  text: string,
  adapter: PlatformAdapter
): void {
  adapter.setInputText(input, text, true);
}

// =============================================================================
// Fallback Methods
// =============================================================================

function fallbackInsert(element: HTMLElement, text: string): void {
  element.focus();

  // Try execCommand for contenteditable
  if (element.getAttribute('contenteditable') === 'true') {
    document.execCommand('selectAll', false);
    document.execCommand('insertText', false, text);
    return;
  }

  // For textarea/input
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLInputElement) {
    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return;
  }

  // Last resort: set innerText
  element.innerText = text;
  element.dispatchEvent(new Event('input', { bubbles: true }));
}

// =============================================================================
// Utility Functions
// =============================================================================

function isReplyInput(element: HTMLElement): boolean {
  // Check if it's an editable element
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }

  if (element instanceof HTMLInputElement && element.type === 'text') {
    return true;
  }

  if (element.getAttribute('contenteditable') === 'true') {
    return true;
  }

  // Check role
  if (element.getAttribute('role') === 'textbox') {
    return true;
  }

  return false;
}

/**
 * Find all reply inputs on the page
 */
export function findAllReplyInputs(): HTMLElement[] {
  const inputs: HTMLElement[] = [];

  // Textareas
  const textareas = document.querySelectorAll('textarea');
  inputs.push(...(Array.from(textareas) as HTMLElement[]));

  // Contenteditable elements with textbox role
  const contenteditables = document.querySelectorAll(
    '[contenteditable="true"][role="textbox"], [contenteditable="true"]'
  );
  inputs.push(...(Array.from(contenteditables) as HTMLElement[]));

  // Filter to visible elements
  return inputs.filter((input) => {
    const rect = input.getBoundingClientRect();
    const style = window.getComputedStyle(input);

    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden'
    );
  });
}
