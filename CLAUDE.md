# ReplyCraft Development Guidelines

AI-powered Chrome extension for generating contextual replies on social media.

## Active Technologies

- TypeScript 5.x with strict mode enabled
- Chrome Extension APIs (Manifest V3)
- OpenAI API client
- Vite with CRXJS plugin for building
- Vitest for unit testing
- Playwright for E2E testing

## Project Structure

```text
src/
├── background/           # Service worker (AI service, cache, message handler)
├── content/              # Content scripts (thread extraction, text insertion, toast)
├── popup/                # Extension popup UI (components, styles)
├── platform-adapters/    # Reddit, Twitter/X, Facebook DOM adapters
├── shared/               # Types, constants, storage, prompts, errors
└── manifest.json         # Chrome extension manifest (Manifest V3)

tests/
├── unit/                 # Unit tests (Vitest)
├── integration/          # Integration tests
└── e2e/                  # E2E tests (Playwright)

specs/001-ai-reply-assistant/  # Feature specification and design docs
```

## Commands

```bash
npm run dev          # Start development server with HMR
npm run build        # Production build
npm test             # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests
npm run typecheck    # Type checking
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
npm run format       # Prettier formatting
```

## Code Style

- TypeScript strict mode enabled
- ESLint with @typescript-eslint rules
- Prettier for formatting
- Import ordering: builtin > external > internal > parent/sibling > type

## Architecture

### Message Flow
- Popup/Content Script -> Service Worker via `chrome.runtime.sendMessage`
- Service Worker -> Content Script via `chrome.tabs.sendMessage`
- All AI calls happen in the service worker (background)

### Key Components
- **Platform Adapters**: Abstract DOM extraction per platform (Reddit, Twitter, Facebook)
- **AI Service**: OpenAI API integration with error handling
- **Cache Service**: chrome.storage.local with TTL and size limits
- **Storage**: chrome.storage.sync for preferences, local for cache

### Message Types
See `src/shared/types.ts` for all message interfaces:
- `ANALYZE_THREAD` - Request thread analysis
- `REWRITE_DRAFT` - Rewrite draft text with tone
- `INSERT_TEXT` - Insert text into reply box
- `GET_DRAFT_TEXT` - Extract text from focused input
- `GET_PREFERENCES` / `SAVE_PREFERENCES` - Manage user settings
- `VALIDATE_API_KEY` - Validate OpenAI API key
- `GET_CACHE_STATS` / `CLEAR_CACHE` - Cache management

## Security Notes

- API key stored in chrome.storage.sync (encrypted by Chrome)
- API key NEVER exposed to content scripts
- All AI calls made from service worker only
- CSP: `script-src 'self'; object-src 'self'`

## Testing

- Unit tests: `tests/unit/` - Test adapters, services, utilities
- Mocks for chrome APIs in `tests/setup.ts`
- Platform adapter tests verify URL matching and DOM extraction

## Loading the Extension

1. Run `npm run dev` or `npm run build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" and select `dist/` directory

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
