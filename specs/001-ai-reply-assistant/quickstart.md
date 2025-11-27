# Quickstart: AI Reply Assistant Chrome Extension

**Feature**: 001-ai-reply-assistant
**Date**: 2025-11-27

## Prerequisites

- Node.js 18+ and npm 9+
- Google Chrome browser
- OpenAI API key ([Get one here](https://platform.openai.com/api-keys))

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd ReplyCraft
git checkout 001-ai-reply-assistant
npm install
```

### 2. Development Build

```bash
npm run dev
```

This starts Vite in watch mode with HMR for the extension.

### 3. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top-right)
3. Click "Load unpacked"
4. Select the `dist/` directory from the project root
5. The extension icon should appear in your toolbar

### 4. Configure API Key

1. Click the extension icon to open the popup
2. Click "Settings" (gear icon)
3. Enter your OpenAI API key
4. Click "Save"

## Development Workflow

### File Structure

```
src/
├── background/          # Service worker (runs in background)
├── content/             # Content scripts (injected into pages)
├── popup/               # Extension popup UI
├── platform-adapters/   # Reddit, Twitter, Facebook DOM adapters
└── shared/              # Shared types, utilities, prompts
```

### Key Commands

```bash
# Development with hot reload
npm run dev

# Production build
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

### Testing Changes

After making changes:
1. If running `npm run dev`, changes auto-reload
2. For manifest.json changes, click "Reload" on the extension card in `chrome://extensions/`
3. Refresh any open tabs on supported sites to reload content scripts

## Usage Guide

### Analyze a Thread

1. Navigate to a post on Reddit, Twitter, or Facebook
2. Click the extension icon
3. Click "Analyze Thread"
4. Wait for AI suggestions to appear (3-5 suggestions)
5. Click "Insert" on any suggestion to add it to the reply box

### Rewrite a Draft

1. Type your draft reply in any reply box
2. Press `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Wait for the rewrite (toast notification confirms activation)
4. Your draft is replaced with the improved version

### Change Tone

1. Open the extension popup
2. Select a tone from the dropdown:
   - Friendly
   - Professional
   - Humorous
   - Concise
   - Custom (enter your own description)
3. The selected tone applies to all future suggestions

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run specific test file
npm test -- src/background/cache-service.test.ts

# Run with coverage
npm run test:coverage
```

### E2E Tests

```bash
# Run E2E tests (requires built extension)
npm run build
npm run test:e2e
```

### Manual Testing Checklist

- [ ] Reddit: Analyze a post with multiple comments
- [ ] Twitter: Analyze a thread with replies
- [ ] Facebook: Analyze a post with comments
- [ ] Hotkey rewrite works on all platforms
- [ ] Tone selection affects output style
- [ ] Cache returns instantly on repeat analysis
- [ ] Error messages appear for network failures
- [ ] API key validation rejects invalid formats

## Troubleshooting

### Extension not loading

1. Check `chrome://extensions/` for errors (red error badge)
2. Click "Errors" to see details
3. Ensure `dist/` contains `manifest.json`

### Content scripts not working

1. Refresh the page after loading/reloading extension
2. Check console (F12) for content script errors
3. Verify the URL matches supported patterns

### API errors

| Error | Cause | Fix |
|-------|-------|-----|
| API_KEY_MISSING | No key configured | Add key in Settings |
| API_KEY_INVALID | Invalid key format | Check key format (sk-...) |
| API_RATE_LIMITED | Too many requests | Wait and retry |
| NETWORK_ERROR | No connection | Check internet |

### Cache issues

Clear cache via extension popup → Settings → "Clear Cache"

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Chrome Browser                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Popup UI   │  │Content Script│  │  Service Worker  │  │
│  │              │  │  (per tab)   │  │   (background)   │  │
│  │ - Tone select│  │ - DOM extract│  │ - AI API calls   │  │
│  │ - Suggestions│  │ - Text insert│  │ - Cache mgmt     │  │
│  │ - Settings   │  │ - Toast UI   │  │ - Message router │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬─────────┘  │
│         │                 │                    │            │
│         └─────────────────┼────────────────────┘            │
│                           │                                  │
│              chrome.runtime.sendMessage                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  OpenAI API   │
                    └───────────────┘
```

## Next Steps

1. Read [plan.md](./plan.md) for full technical context
2. Review [data-model.md](./data-model.md) for entity definitions
3. Check [contracts/](./contracts/) for message type definitions
4. Run `/speckit.tasks` to generate implementation tasks
