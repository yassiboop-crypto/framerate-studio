(function () {
  'use strict';
  const DIALOG_SELECTOR = '[role="dialog"][aria-modal="true"]';
  const FOCUSABLE_SELECTOR = 'a[href],area[href],input:not([type="hidden"]):not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,[tabindex]:not([tabindex="-1"])';
  let activeDialog = null;
  let opener = null;
  let observer = null;

  function isVisible(element) {
    if (!element || !element.isConnected || element.hidden ||
        element.getAttribute('aria-hidden') === 'true' || element.closest('[inert]')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }
  function focusableElements(dialog) {
    return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter(element =>
      isVisible(element) && !element.closest('[aria-hidden="true"]') && element.getAttribute('tabindex') !== '-1'
    );
  }
  function focusElement(element) {
    if (!element || typeof element.focus !== 'function') return;
    try { element.focus({ preventScroll: true }); } catch (_) { element.focus(); }
  }
  function visibleDialog() {
    return Array.from(document.querySelectorAll(DIALOG_SELECTOR)).reverse().find(isVisible) || null;
  }
  function activate(dialog) {
    activeDialog = dialog;
    opener = dialog.contains(document.activeElement) ? null : document.activeElement;
    window.requestAnimationFrame(() => {
      if (activeDialog !== dialog || !isVisible(dialog) || dialog.contains(document.activeElement)) return;
      const candidates = focusableElements(dialog);
      const firstUseful = candidates.find(element =>
        !element.classList.contains('fr-cinema-backdrop') &&
        !element.classList.contains('tl-trailer-backdrop') &&
        !element.hasAttribute('data-modal-dismiss')
      );
      if (firstUseful) focusElement(firstUseful);
      else {
        if (!dialog.hasAttribute('tabindex')) dialog.setAttribute('tabindex', '-1');
        focusElement(dialog);
      }
    });
  }
  function deactivate(dialog) {
    const previousOpener = opener;
    const focusWasInside = dialog.contains(document.activeElement);
    activeDialog = null;
    opener = null;
    if (focusWasInside && previousOpener && previousOpener.isConnected) {
      window.requestAnimationFrame(() => {
        if (!visibleDialog() && previousOpener.isConnected) focusElement(previousOpener);
      });
    }
  }
  function refresh() {
    const next = visibleDialog();
    if (next === activeDialog) return;
    const previous = activeDialog;
    if (previous) deactivate(previous);
    if (next) activate(next);
  }
  document.addEventListener('keydown', event => {
    if (event.key !== 'Tab' || !activeDialog || !isVisible(activeDialog)) return;
    const items = focusableElements(activeDialog);
    if (!items.length) {
      event.preventDefault();
      if (!activeDialog.hasAttribute('tabindex')) activeDialog.setAttribute('tabindex', '-1');
      focusElement(activeDialog);
      return;
    }
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && (document.activeElement === first || !activeDialog.contains(document.activeElement))) {
      event.preventDefault(); focusElement(last);
    } else if (!event.shiftKey && (document.activeElement === last || !activeDialog.contains(document.activeElement))) {
      event.preventDefault(); focusElement(first);
    }
  });
  document.addEventListener('focusin', event => {
    if (!activeDialog || !isVisible(activeDialog) || activeDialog.contains(event.target)) return;
    const first = focusableElements(activeDialog)[0] || activeDialog;
    if (first === activeDialog && !activeDialog.hasAttribute('tabindex')) activeDialog.setAttribute('tabindex', '-1');
    focusElement(first);
  });
  function start() {
    if (!document.body || observer) return;
    observer = new MutationObserver(refresh);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'aria-hidden', 'hidden', 'inert'] });
    refresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  window.FrameRateModalAccessibility = Object.freeze({ refresh });
})();
