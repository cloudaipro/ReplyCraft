/**
 * Tone Selector Component
 *
 * Allows users to select preset tones or define custom tone
 */

import { TONE_PRESETS, TONE_DESCRIPTIONS } from '@shared/constants';

import type { Tone, TonePreset } from '@shared/types';

// =============================================================================
// Types
// =============================================================================

export interface ToneSelectorOptions {
  selectedTone: Tone;
  customToneText: string | null;
  onChange: (tone: Tone, customText: string | null) => void;
}

// =============================================================================
// Component
// =============================================================================

export class ToneSelector {
  private container: HTMLElement;
  private options: ToneSelectorOptions;
  private selectedTone: Tone;
  private customToneText: string | null;

  // DOM elements
  private customInput: HTMLTextAreaElement | null = null;

  constructor(container: HTMLElement, options: ToneSelectorOptions) {
    this.container = container;
    this.options = options;
    this.selectedTone = options.selectedTone;
    this.customToneText = options.customToneText;

    this.render();
  }

  getValue(): Tone {
    return this.selectedTone;
  }

  getCustomText(): string | null {
    return this.selectedTone === 'custom' ? this.customToneText : null;
  }

  setValue(tone: Tone, customText?: string): void {
    this.selectedTone = tone;
    if (customText !== undefined) {
      this.customToneText = customText;
    }
    this.render();
  }

  private render(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.className = 'tone-selector';

    // Label
    const label = document.createElement('label');
    label.className = 'section-title';
    label.textContent = 'Tone';
    label.id = 'tone-selector-label';
    wrapper.appendChild(label);

    // Tone options grid
    const optionsGrid = document.createElement('div');
    optionsGrid.className = 'tone-options';
    optionsGrid.setAttribute('role', 'radiogroup');
    optionsGrid.setAttribute('aria-labelledby', 'tone-selector-label');

    // Add preset options
    for (const preset of TONE_PRESETS) {
      optionsGrid.appendChild(this.createToneOption(preset));
    }

    // Add custom option
    optionsGrid.appendChild(this.createToneOption('custom'));

    wrapper.appendChild(optionsGrid);

    // Custom tone text input (shown when custom is selected)
    if (this.selectedTone === 'custom') {
      const customInputWrapper = document.createElement('div');
      customInputWrapper.className = 'custom-tone-input';

      this.customInput = document.createElement('textarea');
      this.customInput.className = 'form-input';
      this.customInput.placeholder = 'Describe your preferred tone (e.g., "sarcastic but friendly")';
      this.customInput.value = this.customToneText ?? '';
      this.customInput.rows = 2;
      this.customInput.maxLength = 200;
      this.customInput.setAttribute('aria-label', 'Custom tone description');

      this.customInput.addEventListener('input', () => {
        this.customToneText = this.customInput?.value ?? null;
        this.notifyChange();
      });

      customInputWrapper.appendChild(this.customInput);

      // Character count
      const charCount = document.createElement('div');
      charCount.className = 'form-hint';
      charCount.textContent = `${(this.customToneText ?? '').length}/200 characters`;
      customInputWrapper.appendChild(charCount);

      this.customInput.addEventListener('input', () => {
        charCount.textContent = `${(this.customInput?.value ?? '').length}/200 characters`;
      });

      wrapper.appendChild(customInputWrapper);
    }

    this.container.appendChild(wrapper);
  }

  private createToneOption(tone: Tone): HTMLElement {
    const option = document.createElement('label');
    option.className = `tone-option${this.selectedTone === tone ? ' selected' : ''}`;

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'tone';
    radio.value = tone;
    radio.checked = this.selectedTone === tone;
    radio.addEventListener('change', () => this.handleToneSelect(tone));

    const labelText = document.createElement('span');
    labelText.className = 'tone-option-label';
    labelText.textContent = this.getToneLabel(tone);

    option.appendChild(radio);
    option.appendChild(labelText);

    // Add tooltip with description
    if (tone !== 'custom') {
      option.title = TONE_DESCRIPTIONS[tone as TonePreset];
    } else {
      option.title = 'Define your own tone';
    }

    return option;
  }

  private getToneLabel(tone: Tone): string {
    if (tone === 'custom') {
      return 'Custom';
    }
    return tone.charAt(0).toUpperCase() + tone.slice(1);
  }

  private handleToneSelect(tone: Tone): void {
    this.selectedTone = tone;
    this.render();
    this.notifyChange();
  }

  private notifyChange(): void {
    this.options.onChange(this.selectedTone, this.customToneText);
  }
}
