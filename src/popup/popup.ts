/**
 * Popup Main Logic
 *
 * Main entry point for the extension popup
 */

import { DEFAULT_PREFERENCES } from '@shared/constants';
import { isSuccessResponse } from '@shared/types';

import { ToneSelector } from './components/ToneSelector';
import { SuggestionList } from './components/SuggestionList';
import { SettingsPanel } from './components/SettingsPanel';

import type {
  UserPreferences,
  ThreadContext,
  AISuggestion,
  Tone,
  Response,
  AnalyzeThreadResponseData,
  PreferencesResponseData,
} from '@shared/types';

// =============================================================================
// State
// =============================================================================

interface PopupState {
  preferences: UserPreferences | null;
  currentTab: chrome.tabs.Tab | null;
  threadContext: ThreadContext | null;
  suggestions: AISuggestion[];
  isLoading: boolean;
  error: string | null;
}

const state: PopupState = {
  preferences: null,
  currentTab: null,
  threadContext: null,
  suggestions: [],
  isLoading: false,
  error: null,
};

// =============================================================================
// DOM References
// =============================================================================

const elements = {
  apiKeyWarning: document.getElementById('api-key-warning')!,
  unsupportedWarning: document.getElementById('unsupported-warning')!,
  mainContent: document.getElementById('main-content')!,
  toneSelectorContainer: document.getElementById('tone-selector-container')!,
  analyzeBtn: document.getElementById('analyze-btn')!,
  threadSummary: document.getElementById('thread-summary')!,
  summaryText: document.getElementById('summary-text')!,
  suggestionsContainer: document.getElementById('suggestions-container')!,
  suggestionsList: document.getElementById('suggestions-list')!,
  errorContainer: document.getElementById('error-container')!,
  errorMessage: document.getElementById('error-message')!,
  errorDismiss: document.getElementById('error-dismiss')!,
  settingsBtn: document.getElementById('settings-btn')!,
  openSettingsBtn: document.getElementById('open-settings-btn')!,
  settingsPanel: document.getElementById('settings-panel')!,
  settingsBack: document.getElementById('settings-back')!,
  settingsContent: document.getElementById('settings-content')!,
};

// =============================================================================
// Components
// =============================================================================

let toneSelector: ToneSelector | null = null;
let suggestionList: SuggestionList | null = null;
let settingsPanel: SettingsPanel | null = null;

// =============================================================================
// Initialization
// =============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initialize().catch(console.error);
});

async function initialize(): Promise<void> {
  // Load preferences
  await loadPreferences();

  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentTab = tab ?? null;

  // Always set up settings navigation (needed for API key config)
  setupSettingsListeners();

  // Check if we have API key
  if (!state.preferences?.apiKey) {
    showApiKeyWarning();
    return;
  }

  // Check if current page is supported
  if (!isPageSupported(state.currentTab?.url)) {
    showUnsupportedWarning();
    return;
  }

  // Initialize UI
  initializeUI();

  // Set up event listeners
  setupEventListeners();
}

function initializeUI(): void {
  // Initialize tone selector
  toneSelector = new ToneSelector(elements.toneSelectorContainer, {
    selectedTone: state.preferences?.selectedTone ?? 'friendly',
    customToneText: state.preferences?.customToneText ?? null,
    onChange: handleToneChange,
  });

  // Initialize suggestion list
  suggestionList = new SuggestionList(elements.suggestionsList, {
    onInsert: handleInsertSuggestion,
    onCopy: handleCopySuggestion,
  });

  // Initialize settings panel
  settingsPanel = new SettingsPanel(elements.settingsContent, {
    preferences: state.preferences!,
    onSave: handleSavePreferences,
    onClearCache: handleClearCache,
  });
}

function setupSettingsListeners(): void {
  // Settings navigation - always needed for API key configuration
  elements.settingsBtn.addEventListener('click', showSettings);
  elements.openSettingsBtn.addEventListener('click', showSettings);
  elements.settingsBack.addEventListener('click', hideSettings);

  // Keyboard navigation
  document.addEventListener('keydown', handleKeydown);
}

function setupEventListeners(): void {
  // Analyze button
  elements.analyzeBtn.addEventListener('click', handleAnalyze);

  // Error dismiss
  elements.errorDismiss.addEventListener('click', hideError);
}

// =============================================================================
// Event Handlers
// =============================================================================

async function handleAnalyze(): Promise<void> {
  if (state.isLoading) return;

  setLoading(true);
  hideError();

  try {
    // Extract thread context from content script
    const context = await extractThreadContext();

    if (!context) {
      showError('Could not extract thread content. Please make sure you are on a post page.');
      return;
    }

    state.threadContext = context;

    // Send analyze request to background
    const tone = toneSelector?.getValue() ?? 'friendly';
    const customToneText = toneSelector?.getCustomText() ?? undefined;

    const response = (await chrome.runtime.sendMessage({
      type: 'ANALYZE_THREAD',
      payload: {
        context,
        tone,
        customToneText,
      },
    })) as Response<AnalyzeThreadResponseData>;

    if (isSuccessResponse(response)) {
      const { result } = response.data;

      // Update UI with results
      state.suggestions = result.suggestions;

      // Show summary
      if (result.threadSummary) {
        elements.summaryText.textContent = result.threadSummary;
        elements.threadSummary.classList.remove('hidden');
      }

      // Show suggestions
      suggestionList?.setSuggestions(result.suggestions);
      elements.suggestionsContainer.classList.remove('hidden');

      // Show cache indicator if from cache
      if (result.fromCache) {
        console.log('Results loaded from cache');
      }
    } else {
      showError(response.error.message);
    }
  } catch (error) {
    console.error('Analysis failed:', error);
    showError('Failed to analyze thread. Please try again.');
  } finally {
    setLoading(false);
  }
}

async function handleToneChange(tone: Tone, customText: string | null): Promise<void> {
  // Save to preferences
  await chrome.runtime.sendMessage({
    type: 'SAVE_PREFERENCES',
    payload: {
      selectedTone: tone,
      customToneText: customText,
    },
  });

  // Clear current suggestions since tone changed
  state.suggestions = [];
  suggestionList?.setSuggestions([]);
  elements.suggestionsContainer.classList.add('hidden');
  elements.threadSummary.classList.add('hidden');
}

async function handleInsertSuggestion(suggestion: AISuggestion): Promise<void> {
  if (!state.currentTab?.id) {
    showError('No active tab found');
    return;
  }

  try {
    await chrome.tabs.sendMessage(state.currentTab.id, {
      type: 'INSERT_TEXT',
      payload: {
        text: suggestion.text,
      },
    });

    // Close popup after successful insert
    window.close();
  } catch (error) {
    console.error('Insert failed:', error);
    showError('Could not insert text. Please click on a reply box first.');
  }
}

async function handleCopySuggestion(suggestion: AISuggestion): Promise<void> {
  try {
    await navigator.clipboard.writeText(suggestion.text);
    // Could show a brief toast here
  } catch (error) {
    console.error('Copy failed:', error);
    showError('Failed to copy to clipboard');
  }
}

async function handleSavePreferences(prefs: Partial<UserPreferences>): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: 'SAVE_PREFERENCES',
    payload: prefs,
  })) as Response<PreferencesResponseData>;

  if (isSuccessResponse(response)) {
    state.preferences = response.data.preferences;
  }
}

async function handleClearCache(): Promise<void> {
  await chrome.runtime.sendMessage({
    type: 'CLEAR_CACHE',
    payload: {},
  });
}

function handleKeydown(event: KeyboardEvent): void {
  // Escape closes settings
  if (event.key === 'Escape' && !elements.settingsPanel.classList.contains('hidden')) {
    hideSettings();
  }
}

// =============================================================================
// UI Helpers
// =============================================================================

function showApiKeyWarning(): void {
  elements.apiKeyWarning.classList.remove('hidden');
  elements.mainContent.classList.add('hidden');
  elements.unsupportedWarning.classList.add('hidden');
}

function showUnsupportedWarning(): void {
  elements.unsupportedWarning.classList.remove('hidden');
  elements.mainContent.classList.add('hidden');
  elements.apiKeyWarning.classList.add('hidden');
}

function showSettings(): void {
  // Initialize settings panel if not already done
  if (!settingsPanel) {
    settingsPanel = new SettingsPanel(elements.settingsContent, {
      preferences: state.preferences ?? { ...DEFAULT_PREFERENCES },
      onSave: handleSavePreferences,
      onClearCache: handleClearCache,
    });
  }

  elements.settingsPanel.classList.remove('hidden');
  settingsPanel.refresh();
}

function hideSettings(): void {
  elements.settingsPanel.classList.add('hidden');

  // Re-check API key status
  if (state.preferences?.apiKey && !isPageSupported(state.currentTab?.url)) {
    showUnsupportedWarning();
  } else if (state.preferences?.apiKey) {
    elements.mainContent.classList.remove('hidden');
    elements.apiKeyWarning.classList.add('hidden');
    elements.unsupportedWarning.classList.add('hidden');
  }
}

function setLoading(loading: boolean): void {
  state.isLoading = loading;

  const btnText = elements.analyzeBtn.querySelector('.btn-text');
  const btnLoading = elements.analyzeBtn.querySelector('.btn-loading');

  if (loading) {
    btnText?.classList.add('hidden');
    btnLoading?.classList.remove('hidden');
    elements.analyzeBtn.setAttribute('disabled', 'true');
  } else {
    btnText?.classList.remove('hidden');
    btnLoading?.classList.add('hidden');
    elements.analyzeBtn.removeAttribute('disabled');
  }
}

function showError(message: string): void {
  state.error = message;
  elements.errorMessage.textContent = message;
  elements.errorContainer.classList.remove('hidden');
}

function hideError(): void {
  state.error = null;
  elements.errorContainer.classList.add('hidden');
}

// =============================================================================
// API Helpers
// =============================================================================

async function loadPreferences(): Promise<void> {
  const response = (await chrome.runtime.sendMessage({
    type: 'GET_PREFERENCES',
  })) as Response<PreferencesResponseData>;

  if (isSuccessResponse(response)) {
    state.preferences = response.data.preferences;
  }
}

async function extractThreadContext(): Promise<ThreadContext | null> {
  if (!state.currentTab?.id) {
    return null;
  }

  try {
    const response = await chrome.tabs.sendMessage(state.currentTab.id, {
      type: 'EXTRACT_THREAD',
    });

    return response?.context ?? null;
  } catch {
    // Content script might not be loaded, try injecting extraction
    return null;
  }
}

function isPageSupported(url: string | undefined): boolean {
  if (!url) return false;

  const patterns = [
    /reddit\.com\/r\/[^/]+\/comments/,
    /(twitter|x)\.com\/[^/]+\/status/,
    /facebook\.com.*(posts|permalink)/,
  ];

  return patterns.some((pattern) => pattern.test(url));
}
