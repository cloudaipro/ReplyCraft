/**
 * Facebook Adapter Unit Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { FacebookAdapter } from '@adapters/facebook-adapter';

describe('Facebook Adapter', () => {
  let adapter: FacebookAdapter;

  beforeEach(() => {
    adapter = new FacebookAdapter();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('canHandle', () => {
    it('should handle facebook post URLs', () => {
      expect(adapter.canHandle('https://www.facebook.com/user/posts/123456789')).toBe(true);
      expect(adapter.canHandle('https://facebook.com/user/posts/123456789')).toBe(true);
    });

    it('should handle facebook group post URLs', () => {
      expect(adapter.canHandle('https://www.facebook.com/groups/testgroup/posts/123456789')).toBe(
        true
      );
    });

    it('should handle facebook permalink URLs', () => {
      expect(adapter.canHandle('https://www.facebook.com/permalink.php?story_fbid=123')).toBe(true);
    });

    it('should not handle non-post facebook URLs', () => {
      expect(adapter.canHandle('https://www.facebook.com/user')).toBe(false);
      expect(adapter.canHandle('https://www.facebook.com')).toBe(false);
    });

    it('should not handle non-facebook URLs', () => {
      expect(adapter.canHandle('https://twitter.com/user/status/123')).toBe(false);
      expect(adapter.canHandle('https://reddit.com/r/test')).toBe(false);
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
  });

  describe('findReplyInput', () => {
    it('should find contenteditable with textbox role', () => {
      document.body.innerHTML = `
        <div>
          <div contenteditable="true" role="textbox" style="width: 100px; height: 50px;">
            Write a comment...
          </div>
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
    it('should get text from contenteditable', () => {
      const div = document.createElement('div');
      div.contentEditable = 'true';
      div.innerText = 'Comment text';

      const text = adapter.getInputText(div);
      expect(text).toBe('Comment text');
    });
  });
});
