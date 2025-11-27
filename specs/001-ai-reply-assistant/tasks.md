# Tasks: AI Reply Assistant Chrome Extension

**Input**: Design documents from `/specs/001-ai-reply-assistant/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Tests included per constitution requirement (Principle II: Testing & Reliability)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Chrome Extension**: `src/` at repository root
- **Tests**: `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and Chrome extension scaffolding

- [X] T001 Create project directory structure per plan.md in src/
- [X] T002 Initialize npm project with TypeScript 5.x and dependencies (vite, @anthropic/crxjs-plugin, openai) in package.json
- [X] T003 [P] Configure TypeScript with strict mode in tsconfig.json
- [X] T004 [P] Configure ESLint and Prettier with pre-commit hooks in .eslintrc.js and .prettierrc
- [X] T005 [P] Configure Vitest for unit testing in vitest.config.ts
- [X] T006 Create Chrome extension manifest.json with Manifest V3 configuration in src/manifest.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Implement shared TypeScript types from contracts/messages.ts in src/shared/types.ts
- [X] T008 [P] Implement constants and configuration values in src/shared/constants.ts
- [X] T009 [P] Implement chrome.storage wrapper for preferences and cache in src/shared/storage.ts
- [X] T010 Implement PlatformAdapter interface from contracts/platform-adapter.ts in src/platform-adapters/adapter-interface.ts
- [X] T011 [P] Implement Reddit adapter with DOM selectors in src/platform-adapters/reddit-adapter.ts
- [X] T012 [P] Implement Twitter/X adapter with DOM selectors in src/platform-adapters/twitter-adapter.ts
- [X] T013 [P] Implement Facebook adapter with DOM selectors in src/platform-adapters/facebook-adapter.ts
- [X] T014 Implement adapter factory for platform detection in src/platform-adapters/adapter-factory.ts
- [X] T015 Implement base service worker entry point in src/background/service-worker.ts
- [X] T016 [P] Implement message handler for content script communication in src/background/message-handler.ts
- [X] T017 Implement base content script entry point in src/content/content-script.ts
- [X] T018 [P] Write unit tests for platform adapters in tests/unit/platform-adapters/

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Generate AI-Powered Reply Suggestions (Priority: P1) MVP

**Goal**: Users can analyze a thread and receive 3-5 AI-generated reply suggestions

**Independent Test**: Navigate to Reddit/Twitter/Facebook, click extension icon, select "Analyze Thread", verify 3-5 relevant suggestions appear within 4 seconds

### Tests for User Story 1

- [X] T019 [P] [US1] Write unit tests for AI service in tests/unit/ai-service.test.ts
- [X] T020 [P] [US1] Write unit tests for cache service in tests/unit/cache-service.test.ts
- [X] T021 [P] [US1] Write unit tests for thread extractor in tests/unit/thread-extractor.test.ts

### Implementation for User Story 1

- [X] T022 [US1] Implement thread analysis prompt template in src/shared/prompts/analyze-thread.ts
- [X] T023 [US1] Implement AI service with OpenAI integration in src/background/ai-service.ts
- [X] T024 [US1] Implement cache service with TTL and storage limits in src/background/cache-service.ts
- [X] T025 [US1] Implement thread extractor orchestrator in src/content/thread-extractor.ts
- [X] T026 [US1] Implement ANALYZE_THREAD message handling in src/background/message-handler.ts
- [X] T027 [US1] Create popup HTML structure in src/popup/popup.html
- [X] T028 [P] [US1] Create popup styles with WCAG AA contrast in src/popup/styles/popup.css
- [X] T029 [US1] Implement popup main logic in src/popup/popup.ts
- [X] T030 [US1] Implement SuggestionList component with copy/insert actions in src/popup/components/SuggestionList.ts
- [X] T031 [US1] Add loading indicators during AI processing in src/popup/popup.ts
- [X] T032 [US1] Implement error handling for AI failures with user-friendly messages in src/background/ai-service.ts

**Checkpoint**: User Story 1 complete - users can analyze threads and get suggestions

---

## Phase 4: User Story 2 - Rewrite User Draft with Hotkey (Priority: P2)

**Goal**: Users can press Cmd+Shift+R to rewrite their draft text with AI

**Independent Test**: Type draft in reply box, press hotkey, verify draft is replaced with improved version matching selected tone

### Tests for User Story 2

- [ ] T033 [P] [US2] Write unit tests for draft rewrite prompt in tests/unit/prompts.test.ts
- [ ] T034 [P] [US2] Write unit tests for text inserter in tests/unit/text-inserter.test.ts

### Implementation for User Story 2

- [X] T035 [US2] Implement draft rewrite prompt template in src/shared/prompts/rewrite-draft.ts
- [X] T036 [US2] Register hotkey command in src/manifest.json commands section
- [X] T037 [US2] Implement hotkey listener in service worker in src/background/service-worker.ts
- [X] T038 [US2] Implement GET_DRAFT_TEXT message handling in src/content/content-script.ts
- [X] T039 [US2] Implement text inserter for reply boxes in src/content/text-inserter.ts
- [X] T040 [US2] Implement REWRITE_DRAFT message handling in src/background/message-handler.ts
- [X] T041 [US2] Implement toast notification UI component in src/content/toast.ts
- [X] T042 [US2] Implement INSERT_TEXT message handling in src/content/content-script.ts
- [X] T043 [US2] Add draft preservation on rewrite failure in src/background/message-handler.ts
- [X] T044 [US2] Add empty text box detection and user feedback in src/content/content-script.ts

**Checkpoint**: User Story 2 complete - users can rewrite drafts with hotkey

---

## Phase 5: User Story 3 - Select and Customize Tone (Priority: P3)

**Goal**: Users can select preset tones or define custom tone for AI responses

**Independent Test**: Select different tones, generate suggestions for same thread, verify output styles differ

### Tests for User Story 3

- [ ] T045 [P] [US3] Write unit tests for tone selector component in tests/unit/components/tone-selector.test.ts

### Implementation for User Story 3

- [X] T046 [US3] Implement ToneSelector component in src/popup/components/ToneSelector.ts
- [X] T047 [US3] Implement custom tone text input in ToneSelector in src/popup/components/ToneSelector.ts
- [X] T048 [US3] Implement tone persistence to chrome.storage.sync in src/shared/storage.ts
- [X] T049 [US3] Implement GET_PREFERENCES message handling in src/background/message-handler.ts
- [X] T050 [US3] Implement SAVE_PREFERENCES message handling in src/background/message-handler.ts
- [X] T051 [US3] Integrate tone selection with AI prompts in src/shared/prompts/analyze-thread.ts
- [X] T052 [US3] Add tone parameter to cache key generation in src/background/cache-service.ts

**Checkpoint**: User Story 3 complete - users can customize tone for all AI interactions

---

## Phase 6: User Story 4 - Insert Generated Content into Reply Box (Priority: P4)

**Goal**: Users can one-click insert AI suggestions into reply boxes

**Independent Test**: Generate suggestions, click "Insert", verify text appears in active reply field

### Tests for User Story 4

- [ ] T053 [P] [US4] Write unit tests for text insertion logic in tests/unit/text-inserter.test.ts

### Implementation for User Story 4

- [X] T054 [US4] Implement reply input detection in platform adapters in src/platform-adapters/adapter-interface.ts
- [X] T055 [US4] Add insert button to each suggestion in SuggestionList in src/popup/components/SuggestionList.ts
- [X] T056 [US4] Implement INSERT_TEXT popup-to-content-script flow in src/popup/popup.ts
- [X] T057 [US4] Handle multiple text input fields with last-focused tracking in src/content/text-inserter.ts
- [X] T058 [US4] Add user feedback when no input field is active in src/content/toast.ts

**Checkpoint**: User Story 4 complete - users can insert suggestions with one click

---

## Phase 7: User Story 5 - Configure API Key (Priority: P5)

**Goal**: Users can configure their OpenAI API key to enable extension functionality

**Independent Test**: Enter API key in settings, verify subsequent AI requests succeed

### Tests for User Story 5

- [ ] T059 [P] [US5] Write unit tests for API key validation in tests/unit/api-key-validation.test.ts
- [ ] T060 [P] [US5] Write unit tests for settings panel in tests/unit/components/settings-panel.test.ts

### Implementation for User Story 5

- [X] T061 [US5] Implement SettingsPanel component in src/popup/components/SettingsPanel.ts
- [X] T062 [US5] Implement API key format validation in src/popup/components/SettingsPanel.ts
- [X] T063 [US5] Implement secure API key storage in chrome.storage.sync in src/shared/storage.ts
- [X] T064 [US5] Implement API key masking for display in src/popup/components/SettingsPanel.ts
- [X] T065 [US5] Implement VALIDATE_API_KEY message handling in src/background/message-handler.ts
- [X] T066 [US5] Add first-run experience with API key prompt in src/popup/popup.ts
- [X] T067 [US5] Implement GET_CACHE_STATS and CLEAR_CACHE handlers in src/background/message-handler.ts
- [X] T068 [US5] Add cache management UI in settings panel in src/popup/components/SettingsPanel.ts

**Checkpoint**: User Story 5 complete - users can configure and manage their API key

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [X] T069 [P] Implement ARIA labels and keyboard navigation for accessibility in src/popup/
- [X] T070 [P] Add comprehensive error messages for all error codes in src/shared/errors.ts
- [X] T071 Implement cache pruning alarm (hourly cleanup) in src/background/service-worker.ts
- [ ] T072 [P] Write integration tests for message flow in tests/integration/message-flow.test.ts
- [ ] T073 [P] Write E2E tests with Playwright in tests/e2e/extension.spec.ts
- [X] T074 Configure Vite build for production bundle in vite.config.ts
- [ ] T075 Validate extension against quickstart.md scenarios
- [ ] T076 Performance audit: ensure <100ms page load impact

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (P1) can start immediately after Phase 2
  - US2 (P2) can start after Phase 2, builds on AI service from US1
  - US3 (P3) can start after Phase 2, integrates with US1/US2
  - US4 (P4) can start after Phase 2, uses platform adapters
  - US5 (P5) can start after Phase 2, provides API key for all stories
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - No dependencies on other stories (MVP)
- **User Story 2 (P2)**: Requires AI service from US1, otherwise independent
- **User Story 3 (P3)**: Enhances US1/US2 with tone selection, independently testable
- **User Story 4 (P4)**: Uses platform adapters, independently testable
- **User Story 5 (P5)**: Provides API key storage used by US1/US2, can be developed in parallel

### Within Each User Story

- Tests MUST be written FIRST and FAIL before implementation
- Prompts/models before services
- Services before UI components
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

**Phase 1 (Setup)**:
- T003, T004, T005 can run in parallel

**Phase 2 (Foundational)**:
- T008, T009 can run in parallel
- T011, T012, T013 can run in parallel (platform adapters)
- T016, T018 can run in parallel

**Phase 3 (US1)**:
- T019, T020, T021 can run in parallel (tests)
- T028 can run in parallel with T027

**Phase 4 (US2)**:
- T033, T034 can run in parallel (tests)

**Phase 5 (US3)**:
- T045 can run with other setup

**Phase 6 (US4)**:
- T053 can run with other setup

**Phase 7 (US5)**:
- T059, T060 can run in parallel (tests)

**Phase 8 (Polish)**:
- T069, T070, T072, T073 can all run in parallel

---

## Parallel Example: Phase 2 Platform Adapters

```bash
# Launch all platform adapter implementations together:
Task: "T011 [P] Implement Reddit adapter with DOM selectors in src/platform-adapters/reddit-adapter.ts"
Task: "T012 [P] Implement Twitter/X adapter with DOM selectors in src/platform-adapters/twitter-adapter.ts"
Task: "T013 [P] Implement Facebook adapter with DOM selectors in src/platform-adapters/facebook-adapter.ts"
```

## Parallel Example: User Story 1 Tests

```bash
# Launch all tests for User Story 1 together:
Task: "T019 [P] [US1] Write unit tests for AI service in tests/unit/ai-service.test.ts"
Task: "T020 [P] [US1] Write unit tests for cache service in tests/unit/cache-service.test.ts"
Task: "T021 [P] [US1] Write unit tests for thread extractor in tests/unit/thread-extractor.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1 (Generate AI-Powered Reply Suggestions)
4. **STOP and VALIDATE**: Test on Reddit, Twitter, Facebook
5. Deploy to Chrome Web Store as beta if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. User Story 1 → Test independently → **MVP Release**
3. User Story 5 → API key management (improves first-run experience)
4. User Story 3 → Tone customization (user personalization)
5. User Story 2 → Hotkey rewrite (power user feature)
6. User Story 4 → One-click insert (convenience)
7. Polish → Full release

### Recommended Priority Adjustment

Consider implementing US5 (API Key Configuration) early alongside US1, as it improves the first-run experience. The suggested order:
1. US1 (core functionality)
2. US5 (setup experience)
3. US3 (tone customization)
4. US2 (hotkey rewrite)
5. US4 (insert convenience)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Write tests FIRST, ensure they FAIL before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Platform adapters are isolated per constitution requirement
- All UI must meet WCAG 2.1 AA contrast requirements
- API key must NEVER be exposed to content scripts or logs
