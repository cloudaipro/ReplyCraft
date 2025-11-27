# Implementation Plan: AI Reply Assistant Chrome Extension

**Branch**: `001-ai-reply-assistant` | **Date**: 2025-11-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-ai-reply-assistant/spec.md`

## Summary

Build a Chrome extension (Manifest V3) that helps users write contextual replies on Reddit, Twitter, and Facebook. The extension analyzes thread content, generates AI-powered reply suggestions based on user-selected tones, and provides hotkey-triggered draft rewriting. Key features include local caching (24-hour TTL), secure API key storage, and platform-specific DOM adapters for content extraction and text insertion.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: Chrome Extension APIs (Manifest V3), OpenAI API client
**Storage**: chrome.storage.local (cache, preferences), chrome.storage.sync (API key)
**Testing**: Vitest for unit tests, Playwright for E2E extension testing
**Target Platform**: Google Chrome (Chromium-based browsers)
**Project Type**: Chrome Extension (single project with modular architecture)
**Performance Goals**: <4s AI response time, <100ms page load impact
**Constraints**: Manifest V3 service worker limitations, 10MB chrome.storage.local quota
**Scale/Scope**: 3 platforms (Reddit, Twitter, Facebook), 5 preset tones + custom

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Status |
|-----------|------|--------|
| I. Code Quality | TypeScript strict mode, modular architecture | ✅ PASS |
| II. Testing | Unit tests for core logic, CI pipeline | ✅ PASS |
| III. UX Consistency | No auto-submit, user review before insert | ✅ PASS |
| IV. Performance | Scoped DOM observers, caching, lazy loading | ✅ PASS |
| V. Privacy/Security | Secure API key storage, minimal data transmission | ✅ PASS |
| VI. Accessibility | Keyboard navigation, WCAG AA contrast, ARIA labels | ✅ PASS |
| VII. Scalability | Platform adapter pattern, AI provider adapter | ✅ PASS |

**Additional Constraints Check**:
- ✅ Manifest V3 compliance (service worker, no remote code)
- ✅ Platform adapters isolated per constitution requirement
- ✅ AI prompts versioned separately from extension code

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-reply-assistant/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (internal message contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── background/
│   ├── service-worker.ts      # Main service worker entry
│   ├── ai-service.ts          # AI provider adapter
│   ├── cache-service.ts       # Local caching logic
│   └── message-handler.ts     # Content script communication
├── content/
│   ├── content-script.ts      # Main content script entry
│   ├── thread-extractor.ts    # DOM extraction orchestrator
│   ├── text-inserter.ts       # Reply box text insertion
│   └── toast.ts               # Toast notification UI
├── popup/
│   ├── popup.html             # Popup HTML
│   ├── popup.ts               # Popup logic
│   ├── components/            # UI components
│   │   ├── ToneSelector.ts
│   │   ├── SuggestionList.ts
│   │   └── SettingsPanel.ts
│   └── styles/
│       └── popup.css
├── platform-adapters/
│   ├── adapter-interface.ts   # Common adapter interface
│   ├── reddit-adapter.ts      # Reddit DOM selectors & extraction
│   ├── twitter-adapter.ts     # Twitter/X DOM selectors & extraction
│   └── facebook-adapter.ts    # Facebook DOM selectors & extraction
├── shared/
│   ├── types.ts               # Shared TypeScript types
│   ├── constants.ts           # Configuration constants
│   ├── storage.ts             # chrome.storage wrapper
│   └── prompts/
│       ├── analyze-thread.ts  # Thread analysis prompt
│       └── rewrite-draft.ts   # Draft rewriting prompt
└── manifest.json              # Chrome extension manifest

tests/
├── unit/
│   ├── ai-service.test.ts
│   ├── cache-service.test.ts
│   ├── thread-extractor.test.ts
│   └── platform-adapters/
│       ├── reddit-adapter.test.ts
│       ├── twitter-adapter.test.ts
│       └── facebook-adapter.test.ts
├── integration/
│   └── message-flow.test.ts
└── e2e/
    └── extension.spec.ts
```

**Structure Decision**: Single Chrome extension project with modular architecture. Platform adapters are isolated in dedicated directory per constitution requirements. Background service worker handles all AI communication and caching. Content scripts are minimal, delegating to service worker via message passing.

## Complexity Tracking

No constitution violations requiring justification. Architecture follows all principles:
- Modular structure with single responsibility per module
- Platform adapters follow consistent interface pattern
- AI service uses adapter pattern for future provider flexibility
- Clear separation between content scripts and service worker
