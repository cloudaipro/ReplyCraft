/**
 * Twitter/X Platform Adapter
 *
 * Handles content extraction and text insertion for Twitter/X
 */

import { EXTRACTION_CONFIG } from '@shared/constants';

import { BasePlatformAdapter } from './adapter-interface';

import type { PlatformSelectors } from './adapter-interface';
import type { ThreadContext, Comment } from '@shared/types';

// =============================================================================
// Twitter Configuration
// =============================================================================

const TWITTER_SELECTORS: PlatformSelectors = {
  postContainer: [
    'article[data-testid="tweet"]',
    '[data-testid="tweetDetail"]',
    'article[role="article"]',
  ],
  postTitle: [
    // Twitter doesn't have post titles, these are fallbacks
  ],
  postBody: [
    '[data-testid="tweetText"]',
    'article[data-testid="tweet"] [lang]',
    '[data-testid="tweet"] div[lang]',
  ],
  commentContainer: [
    'article[data-testid="tweet"]',
    '[data-testid="cellInnerDiv"] article',
  ],
  commentText: [
    '[data-testid="tweetText"]',
    'div[lang]',
  ],
  commentAuthor: [
    '[data-testid="User-Name"] a',
    'a[role="link"][href^="/"]',
    '[data-testid="User-Names"] span',
  ],
  replyInput: [
    '[data-testid="tweetTextarea_0"]',
    '[data-testid="tweetTextarea_0RichTextInputContainer"]',
    'div[contenteditable="true"][role="textbox"]',
    'div[data-testid="tweetTextarea_0"] div[contenteditable="true"]',
  ],
};

const URL_PATTERNS = [/^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/status\//];

// =============================================================================
// Twitter Adapter Implementation
// =============================================================================

export class TwitterAdapter extends BasePlatformAdapter {
  readonly platform = 'twitter' as const;
  readonly urlPatterns = URL_PATTERNS;

  getSelectors(): PlatformSelectors {
    return TWITTER_SELECTORS;
  }

  async extractThreadContext(): Promise<ThreadContext | null> {
    try {
      // Wait a bit for dynamic content to load
      await this.waitForContent();

      const { text: mainTweet, author: postAuthor } = this.extractMainTweet();
      const replies = this.extractReplies();

      if (!mainTweet) {
        console.warn('Twitter adapter: No main tweet found');
        return null;
      }

      return {
        platform: 'twitter',
        url: window.location.href,
        postTitle: '', // Twitter doesn't have titles
        postBody: this.truncateText(mainTweet, EXTRACTION_CONFIG.MAX_POST_BODY_LENGTH),
        postAuthor,
        comments: replies,
        extractedAt: Date.now(),
      };
    } catch (error) {
      console.error('Twitter adapter: Extraction failed', error);
      return null;
    }
  }

  private async waitForContent(): Promise<void> {
    // Wait for tweets to load (max 2 seconds)
    return new Promise((resolve) => {
      const maxAttempts = 20;
      let attempts = 0;

      const check = (): void => {
        const tweet = document.querySelector('[data-testid="tweetText"]');
        if (tweet || attempts >= maxAttempts) {
          resolve();
          return;
        }
        attempts++;
        setTimeout(check, 100);
      };

      check();
    });
  }

  private extractMainTweet(): { text: string | null; author: string } {
    // The main tweet in a thread view is typically the first one
    // or the one that matches the URL's tweet ID
    const tweetId = this.getTweetIdFromUrl();
    const allTweets = document.querySelectorAll('article[data-testid="tweet"]');

    // Try to find the specific tweet by checking if it contains a link to itself
    for (const tweet of allTweets) {
      const timeLink = tweet.querySelector('a[href*="/status/"]');
      if (timeLink && timeLink.getAttribute('href')?.includes(tweetId)) {
        const textEl = tweet.querySelector('[data-testid="tweetText"]');
        const authorEl = tweet.querySelector('[data-testid="User-Name"] a');
        return {
          text: this.getTextContent(textEl),
          author: this.extractTwitterUsername(authorEl),
        };
      }
    }

    // Fallback: just get the first tweet text and author
    const firstTweet = allTweets[0];
    if (firstTweet) {
      const textEl = firstTweet.querySelector('[data-testid="tweetText"]');
      const authorEl = firstTweet.querySelector('[data-testid="User-Name"] a');
      return {
        text: this.getTextContent(textEl),
        author: this.extractTwitterUsername(authorEl),
      };
    }

    const firstTweetText = this.queryFirst(TWITTER_SELECTORS.postBody);
    return {
      text: this.getTextContent(firstTweetText),
      author: '@unknown',
    };
  }

  private getTweetIdFromUrl(): string {
    const match = window.location.pathname.match(/\/status\/(\d+)/);
    return match?.[1] ?? '';
  }

  private extractReplies(): Comment[] {
    const comments: Comment[] = [];
    const allTweets = document.querySelectorAll('article[data-testid="tweet"]');
    const mainTweetId = this.getTweetIdFromUrl();

    let foundMainTweet = false;
    let replyCount = 0;

    for (const tweet of allTweets) {
      // Skip until we find the main tweet
      const timeLink = tweet.querySelector('a[href*="/status/"]');
      if (timeLink && timeLink.getAttribute('href')?.includes(mainTweetId)) {
        foundMainTweet = true;
        continue;
      }

      // Only extract tweets after the main tweet (these are replies)
      if (!foundMainTweet) continue;

      if (replyCount >= EXTRACTION_CONFIG.MAX_COMMENTS) break;

      const textEl = tweet.querySelector('[data-testid="tweetText"]');
      const authorEl = tweet.querySelector('[data-testid="User-Name"] a');

      const text = this.getTextContent(textEl);
      const author = this.extractTwitterUsername(authorEl);

      if (text) {
        comments.push({
          id: this.generateCommentId(),
          author,
          text: this.truncateText(text, 2000),
          parentId: null,
          depth: 0,
        });
        replyCount++;
      }
    }

    return comments;
  }

  private extractTwitterUsername(element: Element | null): string {
    if (!element) return 'Unknown';

    // Try to get from href
    const href = element.getAttribute('href');
    if (href && href.startsWith('/')) {
      return '@' + href.slice(1);
    }

    // Fallback to text content
    const text = this.getTextContent(element);
    return text.startsWith('@') ? text : '@' + text;
  }

  findReplyInput(): HTMLElement | null {
    // Look for the compose tweet box in the reply area
    for (const selector of TWITTER_SELECTORS.replyInput) {
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
    // Twitter uses a complex editor, we need to handle it specially
    input.focus();

    if (!append) {
      // Clear existing content
      document.execCommand('selectAll', false);
      document.execCommand('delete', false);
    }

    // Insert text using execCommand for contenteditable
    document.execCommand('insertText', false, text);

    // Dispatch events to ensure Twitter's JS picks up the change
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

// Export singleton instance
export const twitterAdapter = new TwitterAdapter();
