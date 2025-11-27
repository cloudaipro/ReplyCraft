import { vi } from 'vitest';

// Mock chrome.storage API
const storageMock = {
  local: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getBytesInUse: vi.fn().mockResolvedValue(0),
  },
  sync: {
    get: vi.fn().mockResolvedValue({}),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  },
};

// Mock chrome.runtime API
const runtimeMock = {
  sendMessage: vi.fn(),
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
  getURL: vi.fn((path: string) => `chrome-extension://mock-id/${path}`),
  id: 'mock-extension-id',
};

// Mock chrome.commands API
const commandsMock = {
  onCommand: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Mock chrome.alarms API
const alarmsMock = {
  create: vi.fn(),
  clear: vi.fn(),
  onAlarm: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
  },
};

// Mock chrome.tabs API
const tabsMock = {
  query: vi.fn().mockResolvedValue([]),
  sendMessage: vi.fn(),
};

// Assign mocks to global chrome object
global.chrome = {
  storage: storageMock,
  runtime: runtimeMock,
  commands: commandsMock,
  alarms: alarmsMock,
  tabs: tabsMock,
} as unknown as typeof chrome;
