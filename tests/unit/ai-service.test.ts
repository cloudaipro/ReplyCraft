/**
 * AI Service Unit Tests
 */

import { describe, it, expect } from 'vitest';

import { isValidApiKeyFormat } from '@background/ai-service';

describe('AI Service', () => {
  describe('isValidApiKeyFormat', () => {
    it('should accept valid OpenAI API key format', () => {
      expect(isValidApiKeyFormat('sk-1234567890abcdefghijklmnopqrstuvwxyz1234')).toBe(true);
    });

    it('should accept keys with longer random parts', () => {
      expect(
        isValidApiKeyFormat('sk-proj-abcdefghijklmnopqrstuvwxyz1234567890abcdefghij')
      ).toBe(true);
    });

    it('should reject keys without sk- prefix', () => {
      expect(isValidApiKeyFormat('pk-1234567890abcdefghijklmnopqrstuvwxyz1234')).toBe(false);
      expect(isValidApiKeyFormat('1234567890abcdefghijklmnopqrstuvwxyz1234')).toBe(false);
    });

    it('should reject keys that are too short', () => {
      expect(isValidApiKeyFormat('sk-short')).toBe(false);
      expect(isValidApiKeyFormat('sk-')).toBe(false);
    });

    it('should reject empty strings', () => {
      expect(isValidApiKeyFormat('')).toBe(false);
    });

    it('should reject keys with invalid characters', () => {
      expect(isValidApiKeyFormat('sk-1234567890abcdef!@#$%^&*()_+-=[]')).toBe(false);
    });
  });
});
