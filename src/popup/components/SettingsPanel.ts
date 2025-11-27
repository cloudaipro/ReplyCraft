/**
 * Settings Panel Component
 *
 * Manages API key configuration and cache settings
 */

import { API_KEY_CONFIG } from '@shared/constants';
import { isSuccessResponse } from '@shared/types';

import type {
  UserPreferences,
  Response,
  ApiKeyValidationResponseData,
  CacheStatsResponseData,
} from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface SettingsPanelOptions {
  preferences: UserPreferences;
  onSave: (prefs: Partial<UserPreferences>) => Promise<void>;
  onClearCache: () => Promise<void>;
}

// =============================================================================
// Component
// =============================================================================

export class SettingsPanel {
  private container: HTMLElement;
  private options: SettingsPanelOptions;
  private preferences: UserPreferences;

  // DOM references
  private apiKeyInput: HTMLInputElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private statusEl: HTMLElement | null = null;
  private cacheStatsEl: HTMLElement | null = null;

  constructor(container: HTMLElement, options: SettingsPanelOptions) {
    this.container = container;
    this.options = options;
    this.preferences = options.preferences;

    this.render();
  }

  refresh(): void {
    this.loadCacheStats().catch(console.error);
  }

  private render(): void {
    this.container.innerHTML = '';

    // API Key Section
    this.container.appendChild(this.createApiKeySection());

    // Cache Section
    this.container.appendChild(this.createCacheSection());
  }

  private createApiKeySection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'form-group';

    // Label
    const label = document.createElement('label');
    label.className = 'form-label';
    label.htmlFor = 'api-key-input';
    label.textContent = 'OpenAI API Key';
    section.appendChild(label);

    // Input wrapper
    const inputWrapper = document.createElement('div');
    inputWrapper.style.position = 'relative';

    // Input
    this.apiKeyInput = document.createElement('input');
    this.apiKeyInput.type = 'password';
    this.apiKeyInput.id = 'api-key-input';
    this.apiKeyInput.className = 'form-input';
    this.apiKeyInput.placeholder = 'sk-...';
    this.apiKeyInput.value = this.preferences.apiKey ? this.maskApiKey(this.preferences.apiKey) : '';
    this.apiKeyInput.autocomplete = 'off';

    // Clear mask on focus
    this.apiKeyInput.addEventListener('focus', () => {
      if (this.apiKeyInput?.value.includes('*')) {
        this.apiKeyInput.value = '';
      }
    });

    // Restore mask on blur if empty
    this.apiKeyInput.addEventListener('blur', () => {
      if (this.apiKeyInput && !this.apiKeyInput.value && this.preferences.apiKey) {
        this.apiKeyInput.value = this.maskApiKey(this.preferences.apiKey);
      }
    });

    inputWrapper.appendChild(this.apiKeyInput);

    // Toggle visibility button
    const toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'icon-btn';
    toggleBtn.style.position = 'absolute';
    toggleBtn.style.right = '4px';
    toggleBtn.style.top = '50%';
    toggleBtn.style.transform = 'translateY(-50%)';
    toggleBtn.setAttribute('aria-label', 'Toggle API key visibility');
    toggleBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;

    let isVisible = false;
    toggleBtn.addEventListener('click', () => {
      isVisible = !isVisible;
      if (this.apiKeyInput) {
        this.apiKeyInput.type = isVisible ? 'text' : 'password';
      }
    });

    inputWrapper.appendChild(toggleBtn);
    section.appendChild(inputWrapper);

    // Hint
    const hint = document.createElement('div');
    hint.className = 'form-hint';
    hint.innerHTML = 'Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">OpenAI</a>';
    section.appendChild(hint);

    // Status
    this.statusEl = document.createElement('div');
    this.statusEl.className = 'form-hint';
    this.statusEl.style.marginTop = '8px';
    section.appendChild(this.statusEl);

    // Save button
    this.saveBtn = document.createElement('button');
    this.saveBtn.className = 'btn btn-primary';
    this.saveBtn.textContent = 'Save API Key';
    this.saveBtn.style.marginTop = '8px';
    this.saveBtn.addEventListener('click', () => this.handleSaveApiKey());
    section.appendChild(this.saveBtn);

    return section;
  }

  private createCacheSection(): HTMLElement {
    const section = document.createElement('div');
    section.className = 'form-group';

    // Label
    const label = document.createElement('label');
    label.className = 'form-label';
    label.textContent = 'Cache';
    section.appendChild(label);

    // Stats
    this.cacheStatsEl = document.createElement('div');
    this.cacheStatsEl.className = 'cache-stats';
    this.cacheStatsEl.innerHTML = '<div>Loading cache stats...</div>';
    section.appendChild(this.cacheStatsEl);

    // Clear button
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary';
    clearBtn.textContent = 'Clear Cache';
    clearBtn.style.marginTop = '8px';
    clearBtn.addEventListener('click', () => this.handleClearCache(clearBtn));
    section.appendChild(clearBtn);

    // Load stats
    this.loadCacheStats().catch(console.error);

    return section;
  }

  private async handleSaveApiKey(): Promise<void> {
    const apiKey = this.apiKeyInput?.value.trim() ?? '';

    // Skip if it's the masked value
    if (apiKey.includes('*')) {
      return;
    }

    if (!apiKey) {
      this.showStatus('Please enter an API key', 'error');
      return;
    }

    if (!API_KEY_CONFIG.PATTERN.test(apiKey)) {
      this.showStatus('Invalid key format. OpenAI keys start with "sk-"', 'error');
      return;
    }

    this.showStatus('Validating...', 'loading');
    this.saveBtn?.setAttribute('disabled', 'true');

    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'VALIDATE_API_KEY',
        payload: { apiKey },
      })) as Response<ApiKeyValidationResponseData>;

      if (isSuccessResponse(response) && response.data.valid) {
        // Save the key
        await this.options.onSave({ apiKey });
        this.preferences.apiKey = apiKey;

        this.showStatus(`API key saved! Using ${response.data.model}`, 'success');

        // Mask the key
        if (this.apiKeyInput) {
          this.apiKeyInput.value = this.maskApiKey(apiKey);
        }
      } else {
        const errorMsg = isSuccessResponse(response)
          ? 'Invalid API key'
          : response.error.message;
        this.showStatus(errorMsg, 'error');
      }
    } catch (error) {
      console.error('Failed to validate API key:', error);
      this.showStatus('Failed to validate API key', 'error');
    } finally {
      this.saveBtn?.removeAttribute('disabled');
    }
  }

  private async handleClearCache(button: HTMLButtonElement): Promise<void> {
    button.setAttribute('disabled', 'true');
    button.textContent = 'Clearing...';

    try {
      await this.options.onClearCache();

      button.textContent = 'Cache Cleared!';
      await this.loadCacheStats();

      setTimeout(() => {
        button.textContent = 'Clear Cache';
        button.removeAttribute('disabled');
      }, 1500);
    } catch (error) {
      console.error('Failed to clear cache:', error);
      button.textContent = 'Failed';

      setTimeout(() => {
        button.textContent = 'Clear Cache';
        button.removeAttribute('disabled');
      }, 1500);
    }
  }

  private async loadCacheStats(): Promise<void> {
    try {
      const response = (await chrome.runtime.sendMessage({
        type: 'GET_CACHE_STATS',
      })) as Response<CacheStatsResponseData>;

      if (isSuccessResponse(response)) {
        const { entryCount, totalSizeBytes, oldestEntryAge } = response.data;

        if (this.cacheStatsEl) {
          this.cacheStatsEl.innerHTML = `
            <div class="cache-stat">
              <span>Cached entries</span>
              <span>${entryCount}</span>
            </div>
            <div class="cache-stat">
              <span>Storage used</span>
              <span>${this.formatBytes(totalSizeBytes)}</span>
            </div>
            <div class="cache-stat">
              <span>Oldest entry</span>
              <span>${oldestEntryAge > 0 ? this.formatAge(oldestEntryAge) : 'N/A'}</span>
            </div>
          `;
        }
      }
    } catch (error) {
      console.error('Failed to load cache stats:', error);
    }
  }

  private showStatus(message: string, type: 'success' | 'error' | 'loading'): void {
    if (!this.statusEl) return;

    const colors = {
      success: '#10b981',
      error: '#ef4444',
      loading: '#6b7280',
    };

    this.statusEl.textContent = message;
    this.statusEl.style.color = colors[type];
  }

  private maskApiKey(key: string): string {
    if (key.length <= 8) return key;
    return key.slice(0, 3) + '*'.repeat(key.length - 7) + key.slice(-4);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  private formatAge(ms: number): string {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    if (hours < 1) return 'Less than 1 hour';
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'}`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? '' : 's'}`;
  }
}
