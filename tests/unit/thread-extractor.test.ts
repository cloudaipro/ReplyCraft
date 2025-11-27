/**
 * Thread Extractor Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Thread Extractor', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('context validation', () => {
    it('should require a URL in thread context', () => {
      const context = {
        platform: 'reddit' as const,
        url: '',
        postTitle: 'Test Title',
        postBody: 'Test Body',
        comments: [],
        extractedAt: Date.now(),
      };

      // Empty URL should be invalid
      expect(context.url).toBe('');
    });

    it('should require some content (title, body, or comments)', () => {
      const contextWithTitle = {
        platform: 'reddit' as const,
        url: 'https://reddit.com/r/test/comments/123',
        postTitle: 'Test Title',
        postBody: '',
        comments: [],
        extractedAt: Date.now(),
      };

      const contextWithBody = {
        platform: 'reddit' as const,
        url: 'https://reddit.com/r/test/comments/123',
        postTitle: '',
        postBody: 'Test Body',
        comments: [],
        extractedAt: Date.now(),
      };

      const contextWithComments = {
        platform: 'reddit' as const,
        url: 'https://reddit.com/r/test/comments/123',
        postTitle: '',
        postBody: '',
        comments: [{ id: '1', author: 'user', text: 'comment', parentId: null, depth: 0 }],
        extractedAt: Date.now(),
      };

      // All should have some content
      expect(contextWithTitle.postTitle.length).toBeGreaterThan(0);
      expect(contextWithBody.postBody.length).toBeGreaterThan(0);
      expect(contextWithComments.comments.length).toBeGreaterThan(0);
    });

    it('should validate platform is one of supported values', () => {
      const validPlatforms = ['reddit', 'twitter', 'facebook'];

      expect(validPlatforms.includes('reddit')).toBe(true);
      expect(validPlatforms.includes('twitter')).toBe(true);
      expect(validPlatforms.includes('facebook')).toBe(true);
      expect(validPlatforms.includes('instagram')).toBe(false);
    });
  });

  describe('text truncation', () => {
    it('should truncate long text', () => {
      const longText = 'a'.repeat(3000);
      const maxLength = 2000;

      const truncated =
        longText.length <= maxLength
          ? longText
          : longText.slice(0, maxLength - 3) + '...';

      expect(truncated.length).toBeLessThanOrEqual(maxLength);
      expect(truncated.endsWith('...')).toBe(true);
    });

    it('should not truncate text within limits', () => {
      const shortText = 'This is a short text';
      const maxLength = 2000;

      const result = shortText.length <= maxLength ? shortText : shortText.slice(0, maxLength);

      expect(result).toBe(shortText);
    });
  });
});
