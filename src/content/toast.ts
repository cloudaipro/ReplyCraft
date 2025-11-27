/**
 * Toast Notification Component
 *
 * Displays toast notifications in the content script context
 */

import { UI_CONFIG } from '@shared/constants';

// =============================================================================
// Types
// =============================================================================

type ToastType = 'success' | 'error' | 'loading';

// =============================================================================
// State
// =============================================================================

let currentToast: HTMLElement | null = null;
let hideTimeout: ReturnType<typeof setTimeout> | null = null;

// =============================================================================
// Toast Functions
// =============================================================================

/**
 * Show a toast notification
 */
export function showToast(
  message: string,
  type: ToastType = 'success',
  duration: number = UI_CONFIG.TOAST_DURATION_MS
): void {
  // Remove existing toast
  hideToast();

  // Create toast element
  const toast = createToastElement(message, type);
  document.body.appendChild(toast);
  currentToast = toast;

  // Trigger animation
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  // Auto-hide (except for loading toasts)
  if (type !== 'loading' && duration > 0) {
    hideTimeout = setTimeout(() => {
      hideToast();
    }, duration);
  }
}

/**
 * Hide the current toast
 */
export function hideToast(): void {
  if (hideTimeout) {
    clearTimeout(hideTimeout);
    hideTimeout = null;
  }

  if (currentToast) {
    const toast = currentToast;
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(-20px)';

    setTimeout(() => {
      toast.remove();
    }, UI_CONFIG.ANIMATION_DURATION_MS);

    currentToast = null;
  }
}

/**
 * Update the message of the current toast
 */
export function updateToast(message: string, type?: ToastType): void {
  if (!currentToast) {
    showToast(message, type);
    return;
  }

  const messageEl = currentToast.querySelector('[data-toast-message]');
  if (messageEl) {
    messageEl.textContent = message;
  }

  if (type) {
    updateToastType(currentToast, type);
  }
}

// =============================================================================
// Element Creation
// =============================================================================

function createToastElement(message: string, type: ToastType): HTMLElement {
  const toast = document.createElement('div');
  toast.setAttribute('data-replycraft-toast', '');
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');

  // Apply styles
  Object.assign(toast.style, getToastStyles());
  Object.assign(toast.style, getTypeStyles(type));

  // Add icon
  const icon = createIcon(type);
  toast.appendChild(icon);

  // Add message
  const messageSpan = document.createElement('span');
  messageSpan.setAttribute('data-toast-message', '');
  messageSpan.textContent = message;
  messageSpan.style.marginLeft = '8px';
  toast.appendChild(messageSpan);

  // Add loading spinner for loading type
  if (type === 'loading') {
    const spinner = createSpinner();
    toast.appendChild(spinner);
  }

  return toast;
}

function createIcon(type: ToastType): HTMLElement {
  const icon = document.createElement('span');
  icon.style.fontSize = '16px';
  icon.style.lineHeight = '1';

  switch (type) {
    case 'success':
      icon.innerHTML = '&#10003;'; // Checkmark
      break;
    case 'error':
      icon.innerHTML = '&#10007;'; // X mark
      break;
    case 'loading':
      icon.innerHTML = '&#8987;'; // Hourglass
      break;
  }

  return icon;
}

function createSpinner(): HTMLElement {
  const spinner = document.createElement('span');
  spinner.style.marginLeft = '8px';
  spinner.style.display = 'inline-block';
  spinner.style.width = '14px';
  spinner.style.height = '14px';
  spinner.style.border = '2px solid rgba(255,255,255,0.3)';
  spinner.style.borderTopColor = '#fff';
  spinner.style.borderRadius = '50%';
  spinner.style.animation = 'replycraft-spin 0.8s linear infinite';

  // Add keyframes if not already present
  if (!document.querySelector('#replycraft-toast-styles')) {
    const style = document.createElement('style');
    style.id = 'replycraft-toast-styles';
    style.textContent = `
      @keyframes replycraft-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return spinner;
}

// =============================================================================
// Styles
// =============================================================================

function getToastStyles(): Partial<CSSStyleDeclaration> {
  return {
    position: 'fixed',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    zIndex: '2147483647', // Maximum z-index
    opacity: '0',
    transition: `opacity ${UI_CONFIG.ANIMATION_DURATION_MS}ms ease, transform ${UI_CONFIG.ANIMATION_DURATION_MS}ms ease`,
    maxWidth: '90vw',
    wordBreak: 'break-word',
  };
}

function getTypeStyles(type: ToastType): Partial<CSSStyleDeclaration> {
  switch (type) {
    case 'success':
      return {
        backgroundColor: '#10b981',
        color: '#ffffff',
      };
    case 'error':
      return {
        backgroundColor: '#ef4444',
        color: '#ffffff',
      };
    case 'loading':
      return {
        backgroundColor: '#3b82f6',
        color: '#ffffff',
      };
    default:
      return {
        backgroundColor: '#374151',
        color: '#ffffff',
      };
  }
}

function updateToastType(toast: HTMLElement, type: ToastType): void {
  const typeStyles = getTypeStyles(type);
  Object.assign(toast.style, typeStyles);
}
