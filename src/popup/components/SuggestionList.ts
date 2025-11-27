/**
 * Suggestion List Component
 *
 * Displays AI-generated suggestions with copy and insert actions
 */

import type { AISuggestion } from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface SuggestionListOptions {
  onInsert: (suggestion: AISuggestion) => void;
  onCopy: (suggestion: AISuggestion) => void;
}

// =============================================================================
// Component
// =============================================================================

export class SuggestionList {
  private container: HTMLElement;
  private options: SuggestionListOptions;
  private suggestions: AISuggestion[] = [];

  constructor(container: HTMLElement, options: SuggestionListOptions) {
    this.container = container;
    this.options = options;
  }

  setSuggestions(suggestions: AISuggestion[]): void {
    this.suggestions = suggestions;
    this.render();
  }

  getSuggestions(): AISuggestion[] {
    return this.suggestions;
  }

  clearSuggestions(): void {
    this.suggestions = [];
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    if (this.suggestions.length === 0) {
      return;
    }

    for (const suggestion of this.suggestions) {
      const item = this.createSuggestionItem(suggestion);
      this.container.appendChild(item);
    }
  }

  private createSuggestionItem(suggestion: AISuggestion): HTMLElement {
    const item = document.createElement('div');
    item.className = 'suggestion-item';
    item.setAttribute('role', 'listitem');

    // Suggestion text
    const text = document.createElement('p');
    text.className = 'suggestion-text';
    text.textContent = suggestion.text;
    item.appendChild(text);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'suggestion-actions';

    // Insert button
    const insertBtn = document.createElement('button');
    insertBtn.className = 'suggestion-btn';
    insertBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M5 12h14M12 5l7 7-7 7"/>
      </svg>
      Insert
    `;
    insertBtn.setAttribute('aria-label', `Insert suggestion: ${truncate(suggestion.text, 30)}`);
    insertBtn.addEventListener('click', () => this.options.onInsert(suggestion));
    actions.appendChild(insertBtn);

    // Copy button
    const copyBtn = document.createElement('button');
    copyBtn.className = 'suggestion-btn';
    copyBtn.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"></path>
      </svg>
      Copy
    `;
    copyBtn.setAttribute('aria-label', `Copy suggestion to clipboard`);
    copyBtn.addEventListener('click', () => this.handleCopy(suggestion, copyBtn));
    actions.appendChild(copyBtn);

    item.appendChild(actions);

    return item;
  }

  private async handleCopy(suggestion: AISuggestion, button: HTMLButtonElement): Promise<void> {
    // Store original content
    const originalHTML = button.innerHTML;

    try {
      await this.options.onCopy(suggestion);

      // Show success state
      button.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        Copied!
      `;

      // Reset after delay
      setTimeout(() => {
        button.innerHTML = originalHTML;
      }, 1500);
    } catch {
      // Show error state
      button.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
        Failed
      `;

      setTimeout(() => {
        button.innerHTML = originalHTML;
      }, 1500);
    }
  }
}

// =============================================================================
// Utility
// =============================================================================

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
