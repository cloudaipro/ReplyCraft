/**
 * Facebook Platform Adapter
 *
 * Handles content extraction and text insertion for Facebook
 */

import { EXTRACTION_CONFIG } from '@shared/constants';

import { BasePlatformAdapter } from './adapter-interface';

import type { PlatformSelectors } from './adapter-interface';
import type { ThreadContext, Comment } from '@shared/types';

// =============================================================================
// Facebook Configuration
// =============================================================================

const FACEBOOK_SELECTORS: PlatformSelectors = {
  postContainer: [
    '[data-ad-preview="message"]',
    '[data-ad-comet-preview="message"]',
    '[data-pagelet="FeedUnit"]',
    'div[role="article"]',
    '.userContentWrapper',
  ],
  postTitle: [
    // Facebook posts typically don't have separate titles
  ],
  postBody: [
    '[data-ad-preview="message"]',
    '[data-ad-comet-preview="message"]',
    'div[data-ad-preview="message"] span',
    'div[dir="auto"][style*="text-align"]',
    '.userContent',
  ],
  commentContainer: [
    'div[aria-label*="Comment"]',
    'ul.comments li',
    '[data-testid="UFI2Comment/body"]',
    '.UFICommentContent',
  ],
  commentText: [
    'div[dir="auto"] span',
    '.UFICommentBody',
    '[data-testid="UFI2Comment/body"] span',
  ],
  commentAuthor: [
    'a[role="link"][tabindex="0"]',
    '.UFICommentActorName',
    'span.fwb a',
  ],
  replyInput: [
    'div[contenteditable="true"][role="textbox"]',
    'div[aria-label*="Write a comment"]',
    'div[aria-label*="Write a reply"]',
    '.UFIAddCommentInput textarea',
    'form[method="POST"] div[contenteditable="true"]',
  ],
};

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?facebook\.com\/[^/]+\/posts\//,
  /^https?:\/\/(www\.)?facebook\.com\/groups\/[^/]+\/posts\//,
  /^https?:\/\/(www\.)?facebook\.com\/permalink\.php/,
  /^https?:\/\/(www\.)?facebook\.com\/[^/]+\/photos\//,
  /^https?:\/\/(www\.)?facebook\.com\/photo/,
];

// =============================================================================
// Facebook Adapter Implementation
// =============================================================================

export class FacebookAdapter extends BasePlatformAdapter {
  readonly platform = 'facebook' as const;
  readonly urlPatterns = URL_PATTERNS;

  getSelectors(): PlatformSelectors {
    return FACEBOOK_SELECTORS;
  }

  async extractThreadContext(): Promise<ThreadContext | null> {
    try {
      // Wait for content to load
      await this.waitForContent();

      const postBody = this.extractPostBody();
      const comments = this.extractComments();

      if (!postBody) {
        console.warn('Facebook adapter: No post content found');
        return null;
      }

      return {
        platform: 'facebook',
        url: window.location.href,
        postTitle: '', // Facebook doesn't have separate titles
        postBody: this.truncateText(postBody, EXTRACTION_CONFIG.MAX_POST_BODY_LENGTH),
        comments,
        extractedAt: Date.now(),
      };
    } catch (error) {
      console.error('Facebook adapter: Extraction failed', error);
      return null;
    }
  }

  private async waitForContent(): Promise<void> {
    return new Promise((resolve) => {
      const maxAttempts = 20;
      let attempts = 0;

      const check = (): void => {
        const content = document.querySelector('[data-ad-preview="message"], [role="article"]');
        if (content || attempts >= maxAttempts) {
          resolve();
          return;
        }
        attempts++;
        setTimeout(check, 100);
      };

      check();
    });
  }

  private extractPostBody(): string {
    // Try multiple strategies to find post content

    // Strategy 1: data-ad-preview attribute
    const adPreview = document.querySelector('[data-ad-preview="message"]');
    if (adPreview) {
      const text = this.extractTextFromFacebookElement(adPreview);
      if (text) return text;
    }

    // Strategy 2: Look for the main article content
    const articles = document.querySelectorAll('div[role="article"]');
    for (const article of articles) {
      // Find text content within the article, avoiding navigation and metadata
      const textContainers = article.querySelectorAll('div[dir="auto"]');
      for (const container of textContainers) {
        const text = this.extractTextFromFacebookElement(container);
        // Skip if it looks like metadata (very short, or contains specific patterns)
        if (text && text.length > 20 && !this.isMetadataText(text)) {
          return text;
        }
      }
    }

    // Strategy 3: Fallback to any substantial text content
    const bodyEl = this.queryFirst(FACEBOOK_SELECTORS.postBody);
    return this.extractTextFromFacebookElement(bodyEl);
  }

  private extractTextFromFacebookElement(element: Element | null): string {
    if (!element) return '';

    // Facebook often uses nested spans with text, collect all text
    const texts: string[] = [];
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);

    let node: Node | null;
    while ((node = walker.nextNode())) {
      const text = (node.textContent ?? '').trim();
      if (text && !this.isEmoji(text)) {
        texts.push(text);
      }
    }

    return texts.join(' ').trim();
  }

  private isMetadataText(text: string): boolean {
    // Common patterns in metadata
    const metadataPatterns = [
      /^\d+[KMB]?\s*(likes?|comments?|shares?)/i,
      /^\d+\s*(hr|min|sec|h|m|s|d|w)/i,
      /^(Like|Comment|Share|Send)$/i,
      /^(Public|Friends|Only me)$/i,
    ];
    return metadataPatterns.some((pattern) => pattern.test(text));
  }

  private isEmoji(text: string): boolean {
    // Simple emoji detection
    const emojiRegex = /^[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u;
    return emojiRegex.test(text);
  }

  private extractComments(): Comment[] {
    const comments: Comment[] = [];

    // Find comment containers
    const commentContainers = this.findCommentContainers();

    for (let i = 0; i < Math.min(commentContainers.length, EXTRACTION_CONFIG.MAX_COMMENTS); i++) {
      const container = commentContainers[i];
      if (!container) continue;

      const comment = this.extractSingleComment(container);
      if (comment) {
        comments.push(comment);
      }
    }

    return comments;
  }

  private findCommentContainers(): Element[] {
    // Facebook's comment structure varies, try multiple approaches
    const containers: Element[] = [];

    // Look for elements with comment-related aria labels
    const ariaComments = document.querySelectorAll('[aria-label*="Comment"]');
    containers.push(...Array.from(ariaComments));

    // Look for UFI (Universal Feedback Interface) comments
    const ufiComments = document.querySelectorAll('.UFICommentContent');
    containers.push(...Array.from(ufiComments));

    return containers;
  }

  private extractSingleComment(container: Element): Comment | null {
    // Try to find comment text
    let text = '';
    const textElements = container.querySelectorAll('div[dir="auto"] span, .UFICommentBody');
    for (const el of textElements) {
      const t = this.extractTextFromFacebookElement(el);
      if (t && t.length > text.length) {
        text = t;
      }
    }

    if (!text) return null;

    // Try to find author
    const authorEl = this.queryFirstWithin(container, FACEBOOK_SELECTORS.commentAuthor);
    const author = this.getTextContent(authorEl) || 'Facebook User';

    return {
      id: this.generateCommentId(),
      author,
      text: this.truncateText(text, 2000),
      parentId: null,
      depth: 0,
    };
  }

  findReplyInput(): HTMLElement | null {
    // Look for active/focused input first
    const focused = document.activeElement;
    if (
      focused &&
      (focused.getAttribute('contenteditable') === 'true' ||
        focused instanceof HTMLTextAreaElement)
    ) {
      return focused as HTMLElement;
    }

    // Find comment input boxes
    for (const selector of FACEBOOK_SELECTORS.replyInput) {
      const inputs = document.querySelectorAll(selector);
      for (const input of inputs) {
        if (this.isValidReplyInput(input as HTMLElement)) {
          return input as HTMLElement;
        }
      }
    }

    return null;
  }

  private isValidReplyInput(element: HTMLElement): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return true;
  }

  setInputText(input: HTMLElement, text: string, append = false): void {
    input.focus();

    // Facebook uses contenteditable divs
    if (!append) {
      document.execCommand('selectAll', false);
      document.execCommand('delete', false);
    }

    document.execCommand('insertText', false, text);

    // Dispatch events
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Facebook may need additional events for proper state update
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
  }
}

// Export singleton instance
export const facebookAdapter = new FacebookAdapter();
