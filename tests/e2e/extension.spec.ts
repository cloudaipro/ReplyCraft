import { test, expect, chromium, type BrowserContext, type Browser } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * E2E Tests for ReplyCraft Chrome Extension
 *
 * These tests verify the extension's core functionality:
 * - Extension loads correctly
 * - Popup opens and displays API key warning
 * - Settings panel is accessible
 * - No errors on unsupported pages
 */

const EXTENSION_PATH = path.resolve(__dirname, '../../dist');

// Helper to get the extension ID by checking service workers
async function getExtensionId(context: BrowserContext): Promise<string> {
  // First check if service worker is already running
  let serviceWorkers = context.serviceWorkers();

  // If not, trigger it by opening a page and wait
  if (serviceWorkers.length === 0) {
    const page = await context.newPage();
    await page.goto('https://example.com', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // Wait for extension to initialize

    serviceWorkers = context.serviceWorkers();
    await page.close();
  }

  for (const worker of serviceWorkers) {
    const url = worker.url();
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  }

  // If still no service worker, wait for one
  try {
    const worker = await context.waitForEvent('serviceworker', { timeout: 5000 });
    const url = worker.url();
    const match = url.match(/chrome-extension:\/\/([^/]+)/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {
    // Timeout - service worker might not start until needed
  }

  return '';
}

test.describe('ReplyCraft Extension', () => {
  let browser: Browser;
  let context: BrowserContext;
  let extensionId: string;

  test.beforeAll(async () => {
    // Launch browser with extension
    browser = await chromium.launch({
      headless: false, // Extensions require non-headless mode
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });

    context = await browser.newContext();

    // Get extension ID
    extensionId = await getExtensionId(context);

    if (!extensionId) {
      // Fallback: try to find from manifest in dist
      console.warn('Could not detect extension ID from service worker');
    }
  });

  test.afterAll(async () => {
    await context?.close();
    await browser?.close();
  });

  test('extension loads and popup HTML is accessible', async () => {
    // Skip if we couldn't get extension ID
    test.skip(!extensionId, 'Extension ID not found');

    const popupPage = await context.newPage();
    const response = await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Popup should load successfully
    expect(response?.status()).toBe(200);

    // Title should be ReplyCraft
    const title = await popupPage.title();
    expect(title).toBe('ReplyCraft');

    await popupPage.close();
  });

  test('extension popup shows API key warning when no key configured', async () => {
    test.skip(!extensionId, 'Extension ID not found');

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    // Wait for page to load
    await popupPage.waitForLoadState('domcontentloaded');

    // Should show API key warning
    const warning = popupPage.locator('#api-key-warning');
    await expect(warning).toBeVisible({ timeout: 5000 });

    // Warning text should mention API key
    const warningText = await warning.textContent();
    expect(warningText).toContain('API key');

    // Configure API Key button should be visible
    const configureBtn = popupPage.locator('#open-settings-btn');
    await expect(configureBtn).toBeVisible();
    await expect(configureBtn).toHaveText('Configure API Key');

    await popupPage.close();
  });

  test('settings panel opens when clicking Configure API Key', async () => {
    test.skip(!extensionId, 'Extension ID not found');

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    // Click configure button
    await popupPage.click('#open-settings-btn');

    // Settings panel should be visible
    const settingsPanel = popupPage.locator('#settings-panel');
    await expect(settingsPanel).toBeVisible({ timeout: 5000 });

    // API key input should be present
    const apiKeyInput = popupPage.locator('#api-key-input');
    await expect(apiKeyInput).toBeVisible();

    // Back button should work
    await popupPage.click('#settings-back');
    await expect(settingsPanel).toBeHidden();

    await popupPage.close();
  });

  test('settings panel validates API key format', async () => {
    test.skip(!extensionId, 'Extension ID not found');

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    // Open settings
    await popupPage.click('#open-settings-btn');
    await popupPage.waitForSelector('#settings-panel:not(.hidden)');

    // Enter invalid API key
    const apiKeyInput = popupPage.locator('#api-key-input');
    await apiKeyInput.fill('invalid-key');

    // Click save
    await popupPage.click('button:has-text("Save API Key")');

    // Should show error message about format
    await expect(popupPage.locator('text=Invalid key format')).toBeVisible({ timeout: 5000 });

    await popupPage.close();
  });

  test('API key with correct format is validated', async () => {
    test.skip(!extensionId, 'Extension ID not found');

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);
    await popupPage.waitForLoadState('domcontentloaded');

    // Open settings
    await popupPage.click('#open-settings-btn');
    await popupPage.waitForSelector('#settings-panel:not(.hidden)');

    // Enter a valid format API key (won't actually validate with OpenAI)
    const apiKeyInput = popupPage.locator('#api-key-input');
    await apiKeyInput.fill('sk-proj-test1234567890abcdefghijklmnopqrstuvwxyz');

    // Click save - will try to validate with OpenAI (which will fail, but format is correct)
    await popupPage.click('button:has-text("Save API Key")');

    // Should show "Validating..." first (format is valid, so it attempts API validation)
    // Then it will show an error because the key is not real
    const status = popupPage.locator('.form-hint').nth(1);
    await expect(status).toContainText(/Validating|Invalid API key/, { timeout: 10000 });

    await popupPage.close();
  });
});

test.describe('Content Script', () => {
  let browser: Browser;
  let context: BrowserContext;

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false,
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
        '--no-sandbox',
      ],
    });

    context = await browser.newContext();
  });

  test.afterAll(async () => {
    await context?.close();
    await browser?.close();
  });

  test('no errors thrown on unsupported pages', async () => {
    const page = await context.newPage();

    // Collect console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate to unsupported page
    await page.goto('https://example.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Filter for ReplyCraft-specific errors
    const replyCraftErrors = errors.filter(
      (e) =>
        e.includes('ReplyCraft') ||
        e.includes('rewrite hotkey') ||
        e.includes('Could not establish connection')
    );

    // Should not have ReplyCraft-specific errors on unsupported pages
    expect(replyCraftErrors).toHaveLength(0);

    await page.close();
  });

  test('content script initializes on Reddit without errors', async () => {
    const page = await context.newPage();

    // Collect console messages
    const logs: string[] = [];
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      } else {
        logs.push(msg.text());
      }
    });

    // Navigate to Reddit
    await page.goto('https://www.reddit.com/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);

    // Filter for ReplyCraft-specific errors
    const replyCraftErrors = errors.filter(
      (e) =>
        e.includes('ReplyCraft') ||
        e.includes('rewrite hotkey') ||
        e.includes('Could not establish connection')
    );

    // Should have initialized without errors
    expect(replyCraftErrors).toHaveLength(0);

    await page.close();
  });
});
