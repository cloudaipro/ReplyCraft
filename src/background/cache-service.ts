/**
 * Cache Service
 *
 * Manages caching of AI responses with TTL and storage limits
 */

import { CACHE_CONFIG } from '@shared/constants';
import {
  generateCacheKey,
  getCacheEntry,
  saveCacheEntry,
  getCacheIndex,
  pruneCache,
} from '@shared/storage';

import type { AISuggestion, CacheEntry } from '@shared/types';

// =============================================================================
// Cache Operations
// =============================================================================

/**
 * Get cached analysis for a URL and tone
 */
export async function getCachedAnalysis(
  url: string,
  tone: string
): Promise<CacheEntry | null> {
  const cacheKey = generateCacheKey(url, tone);
  return getCacheEntry(cacheKey);
}

/**
 * Cache analysis results
 */
export async function cacheAnalysis(
  url: string,
  tone: string,
  suggestions: AISuggestion[],
  threadSummary: string,
  ttlHours: number = CACHE_CONFIG.DEFAULT_TTL_HOURS
): Promise<void> {
  const cacheKey = generateCacheKey(url, tone);
  const now = Date.now();

  const entry: CacheEntry = {
    cacheKey,
    threadUrl: url,
    tone,
    suggestions,
    threadSummary,
    createdAt: now,
    expiresAt: now + ttlHours * 60 * 60 * 1000,
  };

  await saveCacheEntry(entry);
}

/**
 * Check if cache needs pruning and prune if necessary
 */
export async function checkAndPruneCache(): Promise<void> {
  const index = await getCacheIndex();

  // Check if we should prune based on size
  if (index.totalSize > CACHE_CONFIG.MAX_STORAGE_BYTES) {
    await pruneCache(index);
    return;
  }

  // Check if we should prune based on time (hourly)
  const timeSinceLastPrune = Date.now() - index.lastPruned;
  const pruneIntervalMs = CACHE_CONFIG.PRUNE_INTERVAL_MINUTES * 60 * 1000;

  if (timeSinceLastPrune > pruneIntervalMs) {
    await pruneExpiredEntries();
  }
}

/**
 * Prune only expired entries (not based on size)
 */
async function pruneExpiredEntries(): Promise<void> {
  const index = await getCacheIndex();
  const now = Date.now();

  for (const cacheKey of index.keys) {
    const entry = await getCacheEntry(cacheKey);
    // getCacheEntry already removes expired entries, so just calling it is enough
    if (entry === null) {
      // Entry was expired and removed
      continue;
    }
  }

  // Update last pruned time
  const updatedIndex = await getCacheIndex();
  updatedIndex.lastPruned = now;
  await chrome.storage.local.set({ cacheIndex: updatedIndex });
}

// =============================================================================
// Cache Alarm Setup
// =============================================================================

/**
 * Set up periodic cache pruning alarm
 */
export function setupCachePruningAlarm(): void {
  // Create alarm that fires every hour
  chrome.alarms.create(CACHE_CONFIG.PRUNE_ALARM_NAME, {
    periodInMinutes: CACHE_CONFIG.PRUNE_INTERVAL_MINUTES,
  });

  // Listen for alarm
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === CACHE_CONFIG.PRUNE_ALARM_NAME) {
      checkAndPruneCache().catch((error) => {
        console.error('Cache pruning failed:', error);
      });
    }
  });
}
