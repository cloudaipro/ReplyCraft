/**
 * Floating Action Button (FAB) Component
 *
 * Provides an alternative to keyboard shortcuts for mobile/touch devices.
 * The button floats on the right edge of the screen and triggers the
 * rewrite/generate functionality when tapped.
 */

// =============================================================================
// Types
// =============================================================================

interface FABPosition {
  y: number; // percentage from top (0-100)
}

interface FABState {
  visible: boolean;
  position: FABPosition;
}

// =============================================================================
// Constants
// =============================================================================

const FAB_ID = 'replycraft-fab';
const FAB_STORAGE_KEY = 'replycraft-fab-state';
const DEFAULT_POSITION: FABPosition = { y: 50 }; // Middle of screen

// =============================================================================
// State
// =============================================================================

let fabElement: HTMLElement | null = null;
let isDragging = false;
let dragStartY = 0;
let dragStartTop = 0;

// =============================================================================
// Initialization
// =============================================================================

/**
 * Initialize the floating action button
 */
export async function initFloatingButton(): Promise<void> {
  // Check if FAB already exists (avoid duplicates)
  if (document.getElementById(FAB_ID)) {
    return;
  }

  // Load saved state
  const state = await loadFABState();

  if (!state.visible) {
    return; // User has hidden the FAB
  }

  // Create and inject FAB
  fabElement = createFABElement(state.position);
  document.body.appendChild(fabElement);

  // Set up event listeners
  setupEventListeners(fabElement);

  // Add animation styles
  injectStyles();
}

/**
 * Show the FAB (if hidden)
 */
export async function showFAB(): Promise<void> {
  const state = await loadFABState();
  state.visible = true;
  await saveFABState(state);

  if (!fabElement) {
    await initFloatingButton();
  } else {
    fabElement.style.display = 'flex';
  }
}

/**
 * Hide the FAB
 */
export async function hideFAB(): Promise<void> {
  const state = await loadFABState();
  state.visible = false;
  await saveFABState(state);

  if (fabElement) {
    fabElement.style.display = 'none';
  }
}

/**
 * Toggle FAB visibility
 */
export async function toggleFAB(): Promise<boolean> {
  const state = await loadFABState();
  state.visible = !state.visible;
  await saveFABState(state);

  if (state.visible) {
    await showFAB();
  } else {
    await hideFAB();
  }

  return state.visible;
}

// =============================================================================
// Element Creation
// =============================================================================

function createFABElement(position: FABPosition): HTMLElement {
  const fab = document.createElement('div');
  fab.id = FAB_ID;
  fab.setAttribute('role', 'button');
  fab.setAttribute('aria-label', 'ReplyCraft - Generate or rewrite reply');
  fab.setAttribute('tabindex', '0');

  // Apply styles
  Object.assign(fab.style, getFABStyles(position));

  // Add icon
  const icon = createIcon();
  fab.appendChild(icon);

  // Add tooltip
  const tooltip = createTooltip();
  fab.appendChild(tooltip);

  return fab;
}

function createIcon(): HTMLElement {
  const icon = document.createElement('div');
  icon.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
      <path d="M13 11H7V9H13V11Z" fill="white"/>
      <path d="M17 7H7V5H17V7Z" fill="white"/>
      <path d="M17 15H7V13H17V15Z" fill="white"/>
    </svg>
  `;
  icon.style.display = 'flex';
  icon.style.alignItems = 'center';
  icon.style.justifyContent = 'center';
  icon.style.pointerEvents = 'none';
  return icon;
}

function createTooltip(): HTMLElement {
  const tooltip = document.createElement('div');
  tooltip.className = 'replycraft-fab-tooltip';
  tooltip.textContent = 'ReplyCraft';
  Object.assign(tooltip.style, getTooltipStyles());
  return tooltip;
}

// =============================================================================
// Styles
// =============================================================================

function getFABStyles(position: FABPosition): Partial<CSSStyleDeclaration> {
  return {
    position: 'fixed',
    right: '16px',
    top: `${position.y}%`,
    transform: 'translateY(-50%)',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6', // Blue-500
    color: '#ffffff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 4px rgba(0, 0, 0, 0.1)',
    zIndex: '2147483646', // Just below toast
    border: 'none',
    outline: 'none',
    transition: 'transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease',
    userSelect: 'none',
    touchAction: 'none', // Prevent default touch behavior for dragging
  };
}

function getTooltipStyles(): Partial<CSSStyleDeclaration> {
  return {
    position: 'absolute',
    right: '100%',
    top: '50%',
    transform: 'translateY(-50%)',
    marginRight: '12px',
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    fontSize: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
    opacity: '0',
    visibility: 'hidden',
    transition: 'opacity 0.2s ease, visibility 0.2s ease',
    pointerEvents: 'none',
  };
}

function injectStyles(): void {
  const styleId = 'replycraft-fab-styles';
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    #${FAB_ID}:hover {
      transform: translateY(-50%) scale(1.1) !important;
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5), 0 4px 8px rgba(0, 0, 0, 0.15) !important;
    }

    #${FAB_ID}:active {
      transform: translateY(-50%) scale(0.95) !important;
      background-color: #2563eb !important;
    }

    #${FAB_ID}:focus-visible {
      outline: 2px solid #fff !important;
      outline-offset: 2px !important;
    }

    #${FAB_ID}:hover .replycraft-fab-tooltip {
      opacity: 1 !important;
      visibility: visible !important;
    }

    #${FAB_ID}.replycraft-fab-dragging {
      transition: none !important;
      cursor: grabbing !important;
    }

    #${FAB_ID}.replycraft-fab-loading {
      pointer-events: none !important;
      opacity: 0.7 !important;
    }

    #${FAB_ID}.replycraft-fab-loading::after {
      content: '';
      position: absolute;
      width: 100%;
      height: 100%;
      border: 2px solid transparent;
      border-top-color: #fff;
      border-radius: 50%;
      animation: replycraft-fab-spin 0.8s linear infinite;
    }

    @keyframes replycraft-fab-spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

// =============================================================================
// Event Listeners
// =============================================================================

function setupEventListeners(fab: HTMLElement): void {
  // Click handler
  fab.addEventListener('click', handleClick);

  // Keyboard support
  fab.addEventListener('keydown', handleKeydown);

  // Drag support (mouse)
  fab.addEventListener('mousedown', handleDragStart);
  document.addEventListener('mousemove', handleDragMove);
  document.addEventListener('mouseup', handleDragEnd);

  // Drag support (touch)
  fab.addEventListener('touchstart', handleTouchStart, { passive: false });
  document.addEventListener('touchmove', handleTouchMove, { passive: false });
  document.addEventListener('touchend', handleTouchEnd);

  // Hover for tooltip
  fab.addEventListener('mouseenter', () => {
    if (!isDragging) {
      const tooltip = fab.querySelector('.replycraft-fab-tooltip') as HTMLElement;
      if (tooltip) {
        tooltip.style.opacity = '1';
        tooltip.style.visibility = 'visible';
      }
    }
  });

  fab.addEventListener('mouseleave', () => {
    const tooltip = fab.querySelector('.replycraft-fab-tooltip') as HTMLElement;
    if (tooltip) {
      tooltip.style.opacity = '0';
      tooltip.style.visibility = 'hidden';
    }
  });
}

function handleClick(event: Event): void {
  if (isDragging) {
    event.preventDefault();
    return;
  }

  triggerReplyCraft();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    triggerReplyCraft();
  }
}

// =============================================================================
// Drag Handlers (Mouse)
// =============================================================================

function handleDragStart(event: MouseEvent): void {
  if (!fabElement) return;

  isDragging = false; // Will be set to true if mouse moves
  dragStartY = event.clientY;
  dragStartTop = fabElement.getBoundingClientRect().top + fabElement.offsetHeight / 2;

  fabElement.classList.add('replycraft-fab-dragging');
}

function handleDragMove(event: MouseEvent): void {
  if (!fabElement || dragStartY === 0) return;

  const deltaY = event.clientY - dragStartY;

  // Only start dragging if moved more than 5px
  if (Math.abs(deltaY) > 5) {
    isDragging = true;
  }

  if (!isDragging) return;

  event.preventDefault();

  const newTop = dragStartTop + deltaY;
  const viewportHeight = window.innerHeight;
  const percentage = Math.max(5, Math.min(95, (newTop / viewportHeight) * 100));

  fabElement.style.top = `${percentage}%`;
}

function handleDragEnd(): void {
  if (!fabElement) return;

  fabElement.classList.remove('replycraft-fab-dragging');

  if (isDragging) {
    // Save new position
    const top = parseFloat(fabElement.style.top);
    saveFABPosition({ y: top });
  }

  // Reset drag state after a short delay to prevent click
  setTimeout(() => {
    isDragging = false;
    dragStartY = 0;
    dragStartTop = 0;
  }, 50);
}

// =============================================================================
// Drag Handlers (Touch)
// =============================================================================

let touchStartTime = 0;
let touchMoved = false;

function handleTouchStart(event: TouchEvent): void {
  if (!fabElement || !event.touches[0]) return;

  touchStartTime = Date.now();
  touchMoved = false;
  isDragging = false;
  dragStartY = event.touches[0].clientY;
  dragStartTop = fabElement.getBoundingClientRect().top + fabElement.offsetHeight / 2;

  fabElement.classList.add('replycraft-fab-dragging');
}

function handleTouchMove(event: TouchEvent): void {
  if (!fabElement || dragStartY === 0 || !event.touches[0]) return;

  const deltaY = event.touches[0].clientY - dragStartY;

  // Only start dragging if moved more than 10px
  if (Math.abs(deltaY) > 10) {
    isDragging = true;
    touchMoved = true;
    event.preventDefault();
  }

  if (!isDragging) return;

  const newTop = dragStartTop + deltaY;
  const viewportHeight = window.innerHeight;
  const percentage = Math.max(5, Math.min(95, (newTop / viewportHeight) * 100));

  fabElement.style.top = `${percentage}%`;
}

function handleTouchEnd(): void {
  if (!fabElement) return;

  fabElement.classList.remove('replycraft-fab-dragging');

  if (isDragging) {
    // Save new position
    const top = parseFloat(fabElement.style.top);
    saveFABPosition({ y: top });
  }

  // If it was a tap (short touch without movement), trigger action
  const touchDuration = Date.now() - touchStartTime;
  if (!touchMoved && touchDuration < 300) {
    triggerReplyCraft();
  }

  // Reset drag state
  isDragging = false;
  dragStartY = 0;
  dragStartTop = 0;
  touchMoved = false;
}

// =============================================================================
// Action Trigger
// =============================================================================

function triggerReplyCraft(): void {
  if (!fabElement) return;

  // Show loading state
  fabElement.classList.add('replycraft-fab-loading');

  // Send message to service worker to trigger the rewrite/generate flow
  chrome.runtime.sendMessage({ type: 'TRIGGER_FAB' }, () => {
    // Remove loading state after response
    setTimeout(() => {
      if (fabElement) {
        fabElement.classList.remove('replycraft-fab-loading');
      }
    }, 500);
  });
}

// =============================================================================
// State Persistence
// =============================================================================

async function loadFABState(): Promise<FABState> {
  try {
    const result = await chrome.storage.local.get(FAB_STORAGE_KEY);
    const saved = result[FAB_STORAGE_KEY] as FABState | undefined;

    return {
      visible: saved?.visible ?? true, // Visible by default
      position: saved?.position ?? DEFAULT_POSITION,
    };
  } catch {
    return {
      visible: true,
      position: DEFAULT_POSITION,
    };
  }
}

async function saveFABState(state: FABState): Promise<void> {
  try {
    await chrome.storage.local.set({ [FAB_STORAGE_KEY]: state });
  } catch (error) {
    console.error('[ReplyCraft] Failed to save FAB state:', error);
  }
}

async function saveFABPosition(position: FABPosition): Promise<void> {
  const state = await loadFABState();
  state.position = position;
  await saveFABState(state);
}

// =============================================================================
// External API for Message Handling
// =============================================================================

/**
 * Set FAB loading state (called by content script when processing)
 */
export function setFABLoading(loading: boolean): void {
  if (!fabElement) return;

  if (loading) {
    fabElement.classList.add('replycraft-fab-loading');
  } else {
    fabElement.classList.remove('replycraft-fab-loading');
  }
}
