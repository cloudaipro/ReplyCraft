/**
 * Cache Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { generateCacheKey } from '@shared/storage';

describe('Cache Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateCacheKey', () => {
    it('should generate consistent keys for the same URL and tone', () => {
      const key1 = generateCacheKey('https://reddit.com/r/test/comments/123', 'friendly');
      const key2 = generateCacheKey('https://reddit.com/r/test/comments/123', 'friendly');
      expect(key1).toBe(key2);
    });

    it('should generate different keys for different tones', () => {
      const key1 = generateCacheKey('https://reddit.com/r/test/comments/123', 'friendly');
      const key2 = generateCacheKey('https://reddit.com/r/test/comments/123', 'professional');
      expect(key1).not.toBe(key2);
    });

    it('should generate different keys for different URLs', () => {
      const key1 = generateCacheKey('https://reddit.com/r/test/comments/123', 'friendly');
      const key2 = generateCacheKey('https://reddit.com/r/test/comments/456', 'friendly');
      expect(key1).not.toBe(key2);
    });

    it('should normalize URLs by removing tracking parameters', () => {
      const key1 = generateCacheKey(
        'https://reddit.com/r/test/comments/123',
        'friendly'
      );
      const key2 = generateCacheKey(
        'https://reddit.com/r/test/comments/123?utm_source=share',
        'friendly'
      );
      expect(key1).toBe(key2);
    });

    it('should normalize URL case', () => {
      const key1 = generateCacheKey('https://REDDIT.com/r/test/comments/123', 'friendly');
      const key2 = generateCacheKey('https://reddit.com/r/test/comments/123', 'friendly');
      expect(key1).toBe(key2);
    });

    it('should generate non-empty keys', () => {
      const key = generateCacheKey('https://reddit.com/r/test', 'friendly');
      expect(key).toBeTruthy();
      expect(key.length).toBeGreaterThan(0);
    });
  });
});
