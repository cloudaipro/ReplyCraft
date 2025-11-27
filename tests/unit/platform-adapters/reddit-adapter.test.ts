/**
 * Reddit Adapter Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { RedditAdapter } from '@adapters/reddit-adapter';

describe('Reddit Adapter', () => {
  let adapter: RedditAdapter;

  beforeEach(() => {
    adapter = new RedditAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('canHandle', () => {
    it('should handle new reddit post URLs', () => {
      expect(adapter.canHandle('https://www.reddit.com/r/test/comments/abc123/post_title')).toBe(
        true
      );
      expect(adapter.canHandle('https://reddit.com/r/test/comments/abc123')).toBe(true);
    });

    it('should handle old reddit post URLs', () => {
      expect(adapter.canHandle('https://old.reddit.com/r/test/comments/abc123/post_title')).toBe(
        true
      );
    });

    it('should not handle non-post reddit URLs', () => {
      expect(adapter.canHandle('https://www.reddit.com/r/test')).toBe(false);
      expect(adapter.canHandle('https://www.reddit.com')).toBe(false);
    });

    it('should not handle non-reddit URLs', () => {
      expect(adapter.canHandle('https://twitter.com/user/status/123')).toBe(false);
      expect(adapter.canHandle('https://facebook.com/post')).toBe(false);
    });
  });

  describe('getSelectors', () => {
    it('should return selectors for all required elements', () => {
      const selectors = adapter.getSelectors();

      expect(selectors.postContainer).toBeDefined();
      expect(selectors.postContainer.length).toBeGreaterThan(0);

      expect(selectors.postTitle).toBeDefined();
      expect(selectors.postTitle.length).toBeGreaterThan(0);

      expect(selectors.postBody).toBeDefined();
      expect(selectors.postBody.length).toBeGreaterThan(0);

      expect(selectors.commentContainer).toBeDefined();
      expect(selectors.commentContainer.length).toBeGreaterThan(0);

      expect(selectors.replyInput).toBeDefined();
      expect(selectors.replyInput.length).toBeGreaterThan(0);
    });
  });

  describe('findReplyInput', () => {
    it('should find textarea reply input', () => {
      document.body.innerHTML = `
        <div>
          <textarea name="text" style="width: 100px; height: 50px;">Draft text</textarea>
        </div>
      `;

      const input = adapter.findReplyInput();
      expect(input).toBeTruthy();
      expect(input?.tagName.toLowerCase()).toBe('textarea');
    });

    it('should find contenteditable reply input', () => {
      document.body.innerHTML = `
        <div>
          <div contenteditable="true" style="width: 100px; height: 50px;">Draft text</div>
        </div>
      `;

      const input = adapter.findReplyInput();
      expect(input).toBeTruthy();
      expect(input?.getAttribute('contenteditable')).toBe('true');
    });

    it('should return null when no input is found', () => {
      document.body.innerHTML = '<div>No input here</div>';

      const input = adapter.findReplyInput();
      expect(input).toBeNull();
    });
  });

  describe('getInputText', () => {
    it('should get text from textarea', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Test content';

      const text = adapter.getInputText(textarea);
      expect(text).toBe('Test content');
    });

    it('should get text from contenteditable', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.innerText = 'Test content';

      const text = adapter.getInputText(div);
      expect(text).toBe('Test content');
    });
  });

  describe('setInputText', () => {
    it('should set text in textarea', () => {
      const textarea = document.createElement('textarea');
      document.body.appendChild(textarea);

      adapter.setInputText(textarea, 'New text');
      expect(textarea.value).toBe('New text');
    });

    it('should append text when append flag is true', () => {
      const textarea = document.createElement('textarea');
      textarea.value = 'Existing ';
      document.body.appendChild(textarea);

      adapter.setInputText(textarea, 'new text', true);
      expect(textarea.value).toBe('Existing new text');
    });
  });
});
