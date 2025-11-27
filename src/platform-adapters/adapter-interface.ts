/**
 * Platform Adapter Interface
 *
 * Defines the contract that all platform-specific adapters must implement.
 */

import type { Comment, Platform, ThreadContext } from '@shared/types';

// =============================================================================
// Selector Configuration
// =============================================================================

export interface PlatformSelectors {
  postContainer: string[];
  postTitle: string[];
  postBody: string[];
  commentContainer: string[];
  commentText: string[];
  commentAuthor: string[];
  replyInput: string[];
}

// =============================================================================
// Platform Adapter Interface
// =============================================================================

export interface PlatformAdapter {
  readonly platform: Platform;
  readonly urlPatterns: RegExp[];

  canHandle(url: string): boolean;
  extractThreadContext(): Promise<ThreadContext | null>;
  findReplyInput(): HTMLElement | null;
  getInputText(input: HTMLElement): string;
  setInputText(input: HTMLElement, text: string, append?: boolean): void;
  getSelectors(): PlatformSelectors;
}

// =============================================================================
// Platform Adapter Factory Interface
// =============================================================================

export interface PlatformAdapterFactory {
  getAdapter(url: string): PlatformAdapter | null;
  registerAdapter(adapter: PlatformAdapter): void;
  getAllAdapters(): PlatformAdapter[];
}

// =============================================================================
// Extraction Result Types
// =============================================================================

export interface ExtractionResult {
  success: boolean;
  context: ThreadContext | null;
  errors: ExtractionError[];
  warnings: string[];
}

export interface ExtractionError {
  selector: string;
  element: 'postTitle' | 'postBody' | 'comments' | 'replyInput';
  message: string;
}

// =============================================================================
// Base Adapter Implementation
// =============================================================================

export abstract class BasePlatformAdapter implements PlatformAdapter {
  abstract readonly platform: Platform;
  abstract readonly urlPatterns: RegExp[];

  canHandle(url: string): boolean {
    return this.urlPatterns.some((pattern) => pattern.test(url));
  }

  abstract extractThreadContext(): Promise<ThreadContext | null>;
  abstract findReplyInput(): HTMLElement | null;
  abstract getSelectors(): PlatformSelectors;

  getInputText(input: HTMLElement): string {
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      return input.value;
    }
    // For contenteditable elements
    return input.innerText || input.textContent || '';
  }

  setInputText(input: HTMLElement, text: string, append = false): void {
    if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
      input.value = append ? input.value + text : text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      // For contenteditable elements
      if (append) {
        input.innerText += text;
      } else {
        input.innerText = text;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    input.focus();
  }

  protected queryFirst(selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }

  protected queryAll(selectors: string[]): Element[] {
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return Array.from(elements);
      }
    }
    return [];
  }

  protected getTextContent(element: Element | null): string {
    if (!element) return '';
    return (element.textContent || '').trim();
  }

  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
  }

  protected generateCommentId(): string {
    return `comment_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  protected extractCommentsFromElements(
    elements: Element[],
    textSelector: string[],
    authorSelector: string[],
    maxComments: number,
    _maxDepth: number
  ): Comment[] {
    const comments: Comment[] = [];

    for (let i = 0; i < Math.min(elements.length, maxComments); i++) {
      const element = elements[i];
      if (!element) continue;

      const textEl = this.queryFirstWithin(element, textSelector);
      const authorEl = this.queryFirstWithin(element, authorSelector);

      const text = this.getTextContent(textEl);
      const author = this.getTextContent(authorEl) || 'Anonymous';

      if (text) {
        comments.push({
          id: this.generateCommentId(),
          author,
          text: this.truncateText(text, 2000),
          parentId: null,
          depth: 0,
        });
      }
    }

    return comments;
  }

  protected queryFirstWithin(container: Element, selectors: string[]): Element | null {
    for (const selector of selectors) {
      const element = container.querySelector(selector);
      if (element) {
        return element;
      }
    }
    return null;
  }
}
