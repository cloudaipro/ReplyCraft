/**
 * Twitter Adapter Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { TwitterAdapter } from '@adapters/twitter-adapter';

describe('Twitter Adapter', () => {
  let adapter: TwitterAdapter;

  beforeEach(() => {
    adapter = new TwitterAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('canHandle', () => {
    it('should handle twitter.com status URLs', () => {
      expect(adapter.canHandle('https://twitter.com/user/status/123456789')).toBe(true);
      expect(adapter.canHandle('https://www.twitter.com/user/status/123456789')).toBe(true);
    });

    it('should handle x.com status URLs', () => {
      expect(adapter.canHandle('https://x.com/user/status/123456789')).toBe(true);
      expect(adapter.canHandle('https://www.x.com/user/status/123456789')).toBe(true);
    });

    it('should not handle non-status twitter URLs', () => {
      expect(adapter.canHandle('https://twitter.com/user')).toBe(false);
      expect(adapter.canHandle('https://twitter.com/explore')).toBe(false);
      expect(adapter.canHandle('https://twitter.com/home')).toBe(false);
    });

    it('should not handle non-twitter URLs', () => {
      expect(adapter.canHandle('https://reddit.com/r/test/comments/123')).toBe(false);
      expect(adapter.canHandle('https://facebook.com/post')).toBe(false);
    });
  });

  describe('getSelectors', () => {
    it('should return selectors for all required elements', () => {
      const selectors = adapter.getSelectors();

      expect(selectors.postContainer).toBeDefined();
      expect(selectors.postContainer.length).toBeGreaterThan(0);

      expect(selectors.postBody).toBeDefined();
      expect(selectors.postBody.length).toBeGreaterThan(0);

      expect(selectors.commentContainer).toBeDefined();
      expect(selectors.commentContainer.length).toBeGreaterThan(0);

      expect(selectors.replyInput).toBeDefined();
      expect(selectors.replyInput.length).toBeGreaterThan(0);
    });

    it('should have empty postTitle selectors (Twitter has no titles)', () => {
      const selectors = adapter.getSelectors();
      expect(selectors.postTitle).toBeDefined();
      // Twitter doesn't have post titles, so this can be empty
    });
  });

  describe('getInputText', () => {
    it('should get text from contenteditable', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.innerText = 'Tweet draft';

      const text = adapter.getInputText(div);
      expect(text).toBe('Tweet draft');
    });
  });
});
