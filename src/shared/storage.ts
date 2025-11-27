/**
 * Chrome Storage Wrapper
 *
 * Provides typed access to chrome.storage.local and chrome.storage.sync
 */

import { STORAGE_KEYS, DEFAULT_PREFERENCES, CACHE_CONFIG } from './constants';

import type { UserPreferences, CacheEntry, CacheIndex } from './types';

// =============================================================================
// Preferences Storage (chrome.storage.sync)
// =============================================================================

export async function getPreferences(): Promise<UserPreferences> {
  const result = await chrome.storage.sync.get(STORAGE_KEYS.PREFERENCES);
  const stored = result[STORAGE_KEYS.PREFERENCES] as Partial<UserPreferences> | undefined;

  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
  };
}

export async function savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
  const current = await getPreferences();
  const updated = { ...current, ...preferences };
  await chrome.storage.sync.set({ [STORAGE_KEYS.PREFERENCES]: updated });
}

export async function getApiKey(): Promise<string> {
  const prefs = await getPreferences();
  return prefs.apiKey;
}

export async function saveApiKey(apiKey: string): Promise<void> {
  await savePreferences({ apiKey });
}

// =============================================================================
// Cache Storage (chrome.storage.local)
// =============================================================================

export async function getCacheIndex(): Promise<CacheIndex> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CACHE_INDEX);
  const stored = result[STORAGE_KEYS.CACHE_INDEX] as CacheIndex | undefined;

  return (
    stored ?? {
      keys: [],
      totalSize: 0,
      lastPruned: Date.now(),
    }
  );
}

export async function saveCacheIndex(index: CacheIndex): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.CACHE_INDEX]: index });
}

export async function getCacheEntry(cacheKey: string): Promise<CacheEntry | null> {
  const storageKey = `${STORAGE_KEYS.CACHE}_${cacheKey}`;
  const result = await chrome.storage.local.get(storageKey);
  const entry = result[storageKey] as CacheEntry | undefined;

  if (!entry) {
    return null;
  }

  // Check if expired
  if (Date.now() > entry.expiresAt) {
    await removeCacheEntry(cacheKey);
    return null;
  }

  return entry;
}

export async function saveCacheEntry(entry: CacheEntry): Promise<void> {
  const storageKey = `${STORAGE_KEYS.CACHE}_${entry.cacheKey}`;

  // Estimate entry size
  const entrySize = estimateSize(entry);

  // Check entry size limit
  if (entrySize > CACHE_CONFIG.MAX_ENTRY_SIZE_BYTES) {
    throw new Error(`Cache entry exceeds maximum size of ${CACHE_CONFIG.MAX_ENTRY_SIZE_BYTES} bytes`);
  }

  // Update index
  const index = await getCacheIndex();
  if (!index.keys.includes(entry.cacheKey)) {
    index.keys.push(entry.cacheKey);
  }
  index.totalSize += entrySize;

  // Check if pruning is needed
  if (index.totalSize > CACHE_CONFIG.MAX_STORAGE_BYTES) {
    await pruneCache(index);
  }

  await chrome.storage.local.set({ [storageKey]: entry });
  await saveCacheIndex(index);
}

export async function removeCacheEntry(cacheKey: string): Promise<void> {
  const storageKey = `${STORAGE_KEYS.CACHE}_${cacheKey}`;

  // Get entry to estimate removed size
  const entry = await getCacheEntry(cacheKey);
  const entrySize = entry ? estimateSize(entry) : 0;

  // Remove from storage
  await chrome.storage.local.remove(storageKey);

  // Update index
  const index = await getCacheIndex();
  index.keys = index.keys.filter((k) => k !== cacheKey);
  index.totalSize = Math.max(0, index.totalSize - entrySize);
  await saveCacheIndex(index);
}

export async function clearCache(): Promise<void> {
  const index = await getCacheIndex();

  // Remove all cache entries
  const keysToRemove = index.keys.map((k) => `${STORAGE_KEYS.CACHE}_${k}`);
  keysToRemove.push(STORAGE_KEYS.CACHE_INDEX);

  await chrome.storage.local.remove(keysToRemove);
}

export async function clearCacheForUrl(url: string): Promise<void> {
  const index = await getCacheIndex();

  // Find all cache entries for this URL
  const keysToRemove: string[] = [];

  for (const cacheKey of index.keys) {
    const entry = await getCacheEntry(cacheKey);
    if (entry?.threadUrl === url) {
      keysToRemove.push(cacheKey);
    }
  }

  // Remove matching entries
  for (const key of keysToRemove) {
    await removeCacheEntry(key);
  }
}

export async function pruneCache(index?: CacheIndex): Promise<void> {
  const currentIndex = index ?? (await getCacheIndex());

  // Get all entries with their creation timestamps
  const entries: Array<{ key: string; createdAt: number; size: number }> = [];

  for (const cacheKey of currentIndex.keys) {
    const storageKey = `${STORAGE_KEYS.CACHE}_${cacheKey}`;
    const result = await chrome.storage.local.get(storageKey);
    const entry = result[storageKey] as CacheEntry | undefined;

    if (entry) {
      entries.push({
        key: cacheKey,
        createdAt: entry.createdAt,
        size: estimateSize(entry),
      });
    }
  }

  // Sort by creation time (oldest first)
  entries.sort((a, b) => a.createdAt - b.createdAt);

  // Calculate how many to remove
  const removeCount = Math.ceil(entries.length * CACHE_CONFIG.PRUNE_PERCENTAGE);
  const toRemove = entries.slice(0, removeCount);

  // Remove oldest entries
  for (const entry of toRemove) {
    await removeCacheEntry(entry.key);
  }

  // Update last pruned time
  const newIndex = await getCacheIndex();
  newIndex.lastPruned = Date.now();
  await saveCacheIndex(newIndex);
}

// =============================================================================
// Cache Statistics
// =============================================================================

export async function getCacheStats(): Promise<{
  entryCount: number;
  totalSizeBytes: number;
  oldestEntryAge: number;
}> {
  const index = await getCacheIndex();

  let oldestCreatedAt = Date.now();

  for (const cacheKey of index.keys) {
    const entry = await getCacheEntry(cacheKey);
    if (entry && entry.createdAt < oldestCreatedAt) {
      oldestCreatedAt = entry.createdAt;
    }
  }

  return {
    entryCount: index.keys.length,
    totalSizeBytes: index.totalSize,
    oldestEntryAge: index.keys.length > 0 ? Date.now() - oldestCreatedAt : 0,
  };
}

// =============================================================================
// Utility Functions
// =============================================================================

function estimateSize(obj: unknown): number {
  return new Blob([JSON.stringify(obj)]).size;
}

/**
 * Generate cache key from URL and tone
 */
export function generateCacheKey(url: string, tone: string): string {
  const normalizedUrl = normalizeUrl(url);
  return hashString(`${normalizedUrl}:${tone}`);
}

/**
 * Normalize URL for consistent cache keys
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    parsed.searchParams.delete('utm_source');
    parsed.searchParams.delete('utm_medium');
    parsed.searchParams.delete('utm_campaign');
    parsed.searchParams.delete('ref');
    parsed.searchParams.delete('context');
    // Remove hash
    parsed.hash = '';
    return parsed.toString().toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Simple string hash (not cryptographic, just for cache keys)
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}
