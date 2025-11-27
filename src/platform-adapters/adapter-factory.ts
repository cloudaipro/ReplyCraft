/**
 * Platform Adapter Factory
 *
 * Manages platform adapter registration and retrieval based on URL
 */

import { redditAdapter } from './reddit-adapter';
import { twitterAdapter } from './twitter-adapter';
import { facebookAdapter } from './facebook-adapter';

import type { PlatformAdapter, PlatformAdapterFactory } from './adapter-interface';

// =============================================================================
// Adapter Factory Implementation
// =============================================================================

class AdapterFactoryImpl implements PlatformAdapterFactory {
  private adapters: PlatformAdapter[] = [];

  constructor() {
    // Register default adapters
    this.registerAdapter(redditAdapter);
    this.registerAdapter(twitterAdapter);
    this.registerAdapter(facebookAdapter);
  }

  getAdapter(url: string): PlatformAdapter | null {
    for (const adapter of this.adapters) {
      if (adapter.canHandle(url)) {
        return adapter;
      }
    }
    return null;
  }

  registerAdapter(adapter: PlatformAdapter): void {
    // Avoid duplicates
    const existing = this.adapters.find((a) => a.platform === adapter.platform);
    if (!existing) {
      this.adapters.push(adapter);
    }
  }

  getAllAdapters(): PlatformAdapter[] {
    return [...this.adapters];
  }
}

// Export singleton instance
export const adapterFactory = new AdapterFactoryImpl();

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Get the platform adapter for the current page
 */
export function getCurrentAdapter(): PlatformAdapter | null {
  return adapterFactory.getAdapter(window.location.href);
}

/**
 * Check if the current page is supported by any adapter
 */
export function isPageSupported(): boolean {
  return getCurrentAdapter() !== null;
}

/**
 * Get the platform name for the current page
 */
export function getCurrentPlatform(): string | null {
  const adapter = getCurrentAdapter();
  return adapter?.platform ?? null;
}
