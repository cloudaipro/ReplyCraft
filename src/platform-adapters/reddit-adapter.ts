/**
 * Reddit Platform Adapter
 *
 * Handles content extraction and text insertion for Reddit (new and old)
 */

import { EXTRACTION_CONFIG } from '@shared/constants';

import { BasePlatformAdapter } from './adapter-interface';

import type { PlatformSelectors } from './adapter-interface';
import type { ThreadContext, Comment } from '@shared/types';

// =============================================================================
// Reddit Configuration
// =============================================================================

const REDDIT_SELECTORS: PlatformSelectors = {
  // New Reddit (shreddit-based) selectors
  postContainer: [
    'shreddit-post',
    '[data-testid="post-container"]',
    '.Post',
    // Old Reddit
    '#siteTable .thing.link',
    '.link.self',
  ],
  postTitle: [
    'h1[slot="title"]',
    '[data-testid="post-title"]',
    '.Post h1',
    // Old Reddit
    '.title a.title',
    'a.title',
  ],
  postBody: [
    'div[slot="text-body"]',
    '[data-testid="post-rtjson-content"]',
    '.Post .RichTextJSON-root',
    // Old Reddit
    '.usertext-body .md',
    '.expando .usertext-body',
  ],
  commentContainer: [
    'shreddit-comment',
    '[data-testid="comment"]',
    '.Comment',
    // Old Reddit
    '.comment .entry',
    '.thing.comment',
  ],
  commentText: [
    'div[slot="comment"]',
    '[data-testid="comment-rtjson-content"]',
    '.Comment .RichTextJSON-root',
    // Old Reddit
    '.usertext-body .md',
    '.md',
  ],
  commentAuthor: [
    'a[slot="authorName"]',
    '[data-testid="comment_author_link"]',
    '.Comment__author',
    // Old Reddit
    '.author',
    'a.author',
  ],
  replyInput: [
    'div[contenteditable="true"][data-lexical-editor]',
    'div[contenteditable="true"]',
    'textarea[name="text"]',
    // Old Reddit
    'textarea.usertext',
    '.usertext-edit textarea',
  ],
};

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\//,
  /^https?:\/\/old\.reddit\.com\/r\/[^/]+\/comments\//,
  /^https?:\/\/(www\.)?reddit\.com\/user\/[^/]+\/comments\//,
];

// =============================================================================
// Reddit Adapter Implementation
// =============================================================================

export class RedditAdapter extends BasePlatformAdapter {
  readonly platform = 'reddit' as const;
  readonly urlPatterns = URL_PATTERNS;

  getSelectors(): PlatformSelectors {
    return REDDIT_SELECTORS;
  }

  async extractThreadContext(): Promise<ThreadContext | null> {
    try {
      console.log('[ReplyCraft] Reddit adapter: Starting extraction...');
      console.log('[ReplyCraft] Current URL:', window.location.href);

      // Debug: Log what elements exist on page
      this.debugLogPageStructure();

      // Try new shreddit-based extraction first, fall back to DOM selectors
      const postTitle = this.extractPostTitle();
      const postBody = this.extractPostBody();
      const comments = this.extractComments();

      console.log('[ReplyCraft] Extracted:', {
        titleLength: postTitle.length,
        bodyLength: postBody.length,
        commentCount: comments.length,
      });

      // Require at least a title to proceed
      if (!postTitle) {
        console.warn('[ReplyCraft] Reddit adapter: No post title found');
        return null;
      }

      return {
        platform: 'reddit',
        url: window.location.href,
        postTitle: this.truncateText(postTitle, EXTRACTION_CONFIG.MAX_POST_TITLE_LENGTH),
        postBody: this.truncateText(postBody, EXTRACTION_CONFIG.MAX_POST_BODY_LENGTH),
        comments,
        extractedAt: Date.now(),
      };
    } catch (error) {
      console.error('[ReplyCraft] Reddit adapter: Extraction failed', error);
      return null;
    }
  }

  private debugLogPageStructure(): void {
    // Log shreddit-post element and its attributes
    const shredditPost = document.querySelector('shreddit-post');
    if (shredditPost) {
      const attrs: Record<string, string | null> = {};
      for (const attr of shredditPost.getAttributeNames()) {
        attrs[attr] = shredditPost.getAttribute(attr);
      }
      console.log('[ReplyCraft] shreddit-post found with attributes:', attrs);
    } else {
      console.log('[ReplyCraft] No shreddit-post element found');
    }

    // Log h1 elements
    const h1Elements = document.querySelectorAll('h1');
    console.log('[ReplyCraft] h1 elements found:', h1Elements.length);
    h1Elements.forEach((h1, i) => {
      console.log(`[ReplyCraft] h1[${i}]:`, h1.textContent?.substring(0, 100));
    });

    // Log title-related elements
    const titleElements = document.querySelectorAll('[data-testid*="title"], [class*="title"], [slot="title"]');
    console.log('[ReplyCraft] Title-related elements:', titleElements.length);
  }

  private extractPostTitle(): string {
    // Method 1: New Reddit - Get title from shreddit-post attribute
    const shredditPost = document.querySelector('shreddit-post');
    if (shredditPost) {
      // Try various attribute names
      const title = shredditPost.getAttribute('post-title') ||
                   shredditPost.getAttribute('title') ||
                   shredditPost.getAttribute('data-post-title');
      if (title) {
        console.log('[ReplyCraft] Found title from shreddit-post attribute');
        return title;
      }

      // Try to find title within shreddit-post using various selectors
      const titleSelectors = [
        'h1',
        '[slot="title"]',
        'a[slot="title"]',
        '[data-testid="post-title"]',
        '.title',
      ];
      for (const selector of titleSelectors) {
        const titleEl = shredditPost.querySelector(selector);
        if (titleEl && titleEl.textContent) {
          console.log('[ReplyCraft] Found title from selector:', selector);
          return titleEl.textContent.trim();
        }
      }
    }

    // Method 2: Try standard DOM selectors across the page
    const titleElement = this.queryFirst(REDDIT_SELECTORS.postTitle);
    if (titleElement) {
      console.log('[ReplyCraft] Found title from REDDIT_SELECTORS.postTitle');
      return this.getTextContent(titleElement);
    }

    // Method 3: Try any h1 on the page
    const h1 = document.querySelector('h1');
    if (h1 && h1.textContent) {
      console.log('[ReplyCraft] Found title from h1');
      return h1.textContent.trim();
    }

    // Method 4: Try to get from page title (fallback)
    const pageTitle = document.title;
    if (pageTitle) {
      // Format variations: "Post Title : subreddit" or "Post Title - Reddit"
      if (pageTitle.includes(' : ')) {
        const titlePart = pageTitle.split(' : ')[0];
        if (titlePart) {
          console.log('[ReplyCraft] Found title from page title (: separator)');
          return titlePart.trim();
        }
      }
      if (pageTitle.includes(' - ')) {
        const titlePart = pageTitle.split(' - ')[0];
        if (titlePart) {
          console.log('[ReplyCraft] Found title from page title (- separator)');
          return titlePart.trim();
        }
      }
      // If page title doesn't have separators but has content
      if (pageTitle.length > 0 && !pageTitle.toLowerCase().includes('reddit')) {
        console.log('[ReplyCraft] Using full page title as fallback');
        return pageTitle.trim();
      }
    }

    // Method 5: Try to extract from URL slug
    const urlMatch = window.location.pathname.match(/\/comments\/[^/]+\/([^/]+)/);
    if (urlMatch && urlMatch[1]) {
      // Convert URL slug to title (replace underscores with spaces)
      const titleFromUrl = urlMatch[1].replace(/_/g, ' ');
      console.log('[ReplyCraft] Found title from URL slug');
      return titleFromUrl;
    }

    console.log('[ReplyCraft] No title found with any method');
    return '';
  }

  private extractPostBody(): string {
    // Method 1: New Reddit - Check shreddit-post for body content
    const shredditPost = document.querySelector('shreddit-post');
    if (shredditPost) {
      // Try to get body from various possible locations
      const bodyContent = shredditPost.getAttribute('post-body') ||
                         shredditPost.getAttribute('selftext') ||
                         shredditPost.getAttribute('body');
      if (bodyContent) {
        return bodyContent;
      }

      // Try to find text-body slot content
      const bodySelectors = [
        '[slot="text-body"]',
        '[slot="post-body"]',
        'div[slot="text-body"]',
        '.md',
        '[data-testid*="body"]',
      ];
      for (const selector of bodySelectors) {
        const bodyEl = shredditPost.querySelector(selector);
        if (bodyEl && bodyEl.textContent) {
          return bodyEl.textContent.trim();
        }
      }
    }

    // Method 2: Standard DOM selectors
    const bodyElement = this.queryFirst(REDDIT_SELECTORS.postBody);
    return this.getTextContent(bodyElement);
  }

  private extractComments(): Comment[] {
    const comments: Comment[] = [];

    // Method 1: New Reddit - Extract from shreddit-comment elements
    const shredditComments = document.querySelectorAll('shreddit-comment');
    if (shredditComments.length > 0) {
      for (let i = 0; i < Math.min(shredditComments.length, EXTRACTION_CONFIG.MAX_COMMENTS); i++) {
        const element = shredditComments[i];
        if (!element) continue;
        const comment = this.extractShredditComment(element);
        if (comment) {
          comments.push(comment);
        }
      }
      return comments;
    }

    // Method 2: Standard DOM selectors
    const commentElements = this.queryAll(REDDIT_SELECTORS.commentContainer);

    for (let i = 0; i < Math.min(commentElements.length, EXTRACTION_CONFIG.MAX_COMMENTS); i++) {
      const element = commentElements[i];
      if (!element) continue;

      const comment = this.extractSingleComment(element, 0);
      if (comment) {
        comments.push(comment);
      }
    }

    return comments;
  }

  private extractShredditComment(element: Element): Comment | null {
    // Get author from attribute
    const author = element.getAttribute('author') || '[deleted]';

    // Get depth from attribute
    const depthStr = element.getAttribute('depth');
    const depth = depthStr ? parseInt(depthStr, 10) : 0;

    if (depth > EXTRACTION_CONFIG.MAX_COMMENT_DEPTH) {
      return null;
    }

    // Try to get comment text from various sources
    let text = '';

    // Try slot content
    const commentSlot = element.querySelector('[slot="comment"]');
    if (commentSlot) {
      text = this.getTextContent(commentSlot);
    }

    // Try data attribute
    if (!text) {
      const contentAttr = element.getAttribute('comment-body') ||
                         element.getAttribute('content');
      if (contentAttr) {
        text = contentAttr;
      }
    }

    // Try to find any paragraph or text content
    if (!text) {
      const paragraphs = element.querySelectorAll('p');
      if (paragraphs.length > 0) {
        text = Array.from(paragraphs).map(p => this.getTextContent(p)).join('\n');
      }
    }

    if (!text) {
      return null;
    }

    return {
      id: element.getAttribute('thingid') || this.generateCommentId(),
      author,
      text: this.truncateText(text, 2000),
      parentId: element.getAttribute('parentid') || null,
      depth,
    };
  }

  private extractSingleComment(element: Element, depth: number): Comment | null {
    if (depth > EXTRACTION_CONFIG.MAX_COMMENT_DEPTH) {
      return null;
    }

    const textEl = this.queryFirstWithin(element, REDDIT_SELECTORS.commentText);
    const authorEl = this.queryFirstWithin(element, REDDIT_SELECTORS.commentAuthor);

    const text = this.getTextContent(textEl);
    const author = this.getTextContent(authorEl) || '[deleted]';

    if (!text) {
      return null;
    }

    return {
      id: this.generateCommentId(),
      author,
      text: this.truncateText(text, 2000),
      parentId: null,
      depth,
    };
  }

  findReplyInput(): HTMLElement | null {
    // Try to find the active/focused reply box first
    const activeInput = document.querySelector(
      'div[contenteditable="true"]:focus, textarea:focus'
    ) as HTMLElement | null;
    if (activeInput && this.isValidReplyInput(activeInput)) {
      return activeInput;
    }

    // Find any visible reply input
    for (const selector of REDDIT_SELECTORS.replyInput) {
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
    // Check if visible
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return false;
    }

    // Check if not hidden
    const style = window.getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }

    return true;
  }

  setInputText(input: HTMLElement, text: string, append = false): void {
    // Handle Lexical editor (new Reddit)
    if (input.hasAttribute('data-lexical-editor')) {
      this.setLexicalText(input, text, append);
      return;
    }

    // Default handling for textarea and contenteditable
    super.setInputText(input, text, append);
  }

  private setLexicalText(editor: HTMLElement, text: string, append: boolean): void {
    // For Lexical editors, we need to simulate typing
    editor.focus();

    if (!append) {
      // Select all and delete
      document.execCommand('selectAll', false);
      document.execCommand('delete', false);
    }

    // Insert text
    document.execCommand('insertText', false, text);

    // Dispatch input event
    editor.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

// Export singleton instance
export const redditAdapter = new RedditAdapter();
