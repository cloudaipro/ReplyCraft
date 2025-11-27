/**
 * Thread Extractor
 *
 * Orchestrates thread extraction using platform adapters
 */

import { getCurrentAdapter } from '@adapters/adapter-factory';

import type { ThreadContext } from '@shared/types';
import type { PlatformAdapter } from '@adapters/adapter-interface';

// =============================================================================
// Thread Extraction
// =============================================================================

/**
 * Extract thread context from the current page
 */
export async function extractThreadContext(): Promise<ThreadContext | null> {
  const adapter = getCurrentAdapter();

  if (!adapter) {
    console.warn('[ReplyCraft] No adapter available for current page');
    return null;
  }

  return extractWithAdapter(adapter);
}

/**
 * Extract thread context using a specific adapter
 */
export async function extractWithAdapter(
  adapter: PlatformAdapter
): Promise<ThreadContext | null> {
  try {
    const context = await adapter.extractThreadContext();

    if (!context) {
      return null;
    }

    // Validate the extracted context
    if (!isValidContext(context)) {
      console.warn('[ReplyCraft] Extracted context failed validation');
      return null;
    }

    return context;
  } catch (error) {
    console.error('[ReplyCraft] Thread extraction failed:', error);
    return null;
  }
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validate that a thread context has minimum required content
 */
function isValidContext(context: ThreadContext): boolean {
  // Must have URL
  if (!context.url) {
    return false;
  }

  // Must have some content (title, body, or comments)
  const hasContent =
    context.postTitle.trim().length > 0 ||
    context.postBody.trim().length > 0 ||
    context.comments.length > 0;

  if (!hasContent) {
    return false;
  }

  // Validate platform
  const validPlatforms = ['reddit', 'twitter', 'facebook'];
  if (!validPlatforms.includes(context.platform)) {
    return false;
  }

  return true;
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get a summary of the extracted content for display
 */
export function getContextSummary(context: ThreadContext): string {
  const parts: string[] = [];

  if (context.postTitle) {
    parts.push(`Title: "${truncate(context.postTitle, 50)}"`);
  }

  if (context.postBody) {
    parts.push(`Content: ${context.postBody.length} chars`);
  }

  if (context.comments.length > 0) {
    parts.push(`${context.comments.length} comments`);
  }

  return parts.join(', ') || 'No content extracted';
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength - 3) + '...';
}
