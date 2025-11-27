/**
 * Platform Adapter Contract
 *
 * Defines the interface that all platform-specific adapters must implement.
 * This ensures consistent behavior across Reddit, Twitter, and Facebook.
 */

import { Comment, Platform, ThreadContext } from './messages';

// =============================================================================
// Platform Adapter Interface
// =============================================================================

export interface PlatformAdapter {
  /**
   * Unique identifier for this platform
   */
  readonly platform: Platform;

  /**
   * URL patterns that this adapter handles
   * Used to determine which adapter to use for a given page
   */
  readonly urlPatterns: RegExp[];

  /**
   * Check if this adapter should handle the current page
   * @param url - Current page URL
   * @returns true if this adapter handles the page
   */
  canHandle(url: string): boolean;

  /**
   * Extract thread context from the current page
   * @returns ThreadContext or null if extraction fails
   */
  extractThreadContext(): Promise<ThreadContext | null>;

  /**
   * Find the active reply input field
   * @returns HTMLElement of the input field or null if not found
   */
  findReplyInput(): HTMLElement | null;

  /**
   * Get text from the reply input field
   * @param input - The input element (from findReplyInput)
   * @returns Current text content
   */
  getInputText(input: HTMLElement): string;

  /**
   * Set text in the reply input field
   * @param input - The input element (from findReplyInput)
   * @param text - Text to insert
   * @param append - If true, append to existing text; if false, replace
   */
  setInputText(input: HTMLElement, text: string, append?: boolean): void;

  /**
   * Get CSS selectors used by this adapter (for documentation/debugging)
   */
  getSelectors(): PlatformSelectors;
}

// =============================================================================
// Selector Configuration
// =============================================================================

export interface PlatformSelectors {
  /**
   * Selector for the main post/tweet container
   */
  postContainer: string[];

  /**
   * Selector for post title (may be empty for platforms without titles)
   */
  postTitle: string[];

  /**
   * Selector for post body content
   */
  postBody: string[];

  /**
   * Selector for comment/reply containers
   */
  commentContainer: string[];

  /**
   * Selector for comment text within a comment container
   */
  commentText: string[];

  /**
   * Selector for comment author within a comment container
   */
  commentAuthor: string[];

  /**
   * Selector for reply input fields
   */
  replyInput: string[];
}

// =============================================================================
// Adapter Factory
// =============================================================================

export interface PlatformAdapterFactory {
  /**
   * Get the appropriate adapter for a URL
   * @param url - Page URL to match
   * @returns PlatformAdapter or null if no adapter matches
   */
  getAdapter(url: string): PlatformAdapter | null;

  /**
   * Register a new adapter
   * @param adapter - Adapter instance to register
   */
  registerAdapter(adapter: PlatformAdapter): void;

  /**
   * Get all registered adapters
   */
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
// Platform-Specific Configuration
// =============================================================================

export interface RedditConfig {
  /**
   * Whether to use old.reddit.com selectors
   */
  useOldReddit: boolean;

  /**
   * Maximum comment depth to extract
   */
  maxCommentDepth: number;

  /**
   * Maximum number of comments to extract
   */
  maxComments: number;
}

export interface TwitterConfig {
  /**
   * Whether to extract quote tweets
   */
  includeQuoteTweets: boolean;

  /**
   * Maximum thread depth to extract
   */
  maxThreadDepth: number;
}

export interface FacebookConfig {
  /**
   * Whether to expand "See more" links before extraction
   */
  expandContent: boolean;

  /**
   * Maximum comment depth (Facebook has limited nesting)
   */
  maxCommentDepth: number;
}

// =============================================================================
// Default Configurations
// =============================================================================

export const DEFAULT_REDDIT_CONFIG: RedditConfig = {
  useOldReddit: false,
  maxCommentDepth: 3,
  maxComments: 50,
};

export const DEFAULT_TWITTER_CONFIG: TwitterConfig = {
  includeQuoteTweets: true,
  maxThreadDepth: 10,
};

export const DEFAULT_FACEBOOK_CONFIG: FacebookConfig = {
  expandContent: false,
  maxCommentDepth: 2,
  maxComments: 30,
};

// =============================================================================
// URL Pattern Constants
// =============================================================================

export const REDDIT_URL_PATTERNS = [
  /^https?:\/\/(www\.)?reddit\.com\/r\/[^/]+\/comments\//,
  /^https?:\/\/old\.reddit\.com\/r\/[^/]+\/comments\//,
  /^https?:\/\/(www\.)?reddit\.com\/user\/[^/]+\/comments\//,
];

export const TWITTER_URL_PATTERNS = [
  /^https?:\/\/(www\.)?(twitter|x)\.com\/[^/]+\/status\//,
];

export const FACEBOOK_URL_PATTERNS = [
  /^https?:\/\/(www\.)?facebook\.com\/[^/]+\/posts\//,
  /^https?:\/\/(www\.)?facebook\.com\/groups\/[^/]+\/posts\//,
  /^https?:\/\/(www\.)?facebook\.com\/permalink\.php/,
];
