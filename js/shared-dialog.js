/* 弹窗的键盘焦点循环与关闭后焦点恢复。 */
class ModalFocus {
  constructor(overlay) {
    this.overlay = overlay;
    this.returnFocus = null;
    const active = overlay.classList.contains('active');
    this.overlay.tabIndex = -1;
    this.setVisible(active);
    this.keyHandler = event => this.onKeyDown(event);
    document.addEventListener('keydown', this.keyHandler);
  }

  setVisible(visible) {
    this.overlay.hidden = !visible;
    this.overlay.inert = !visible;
    this.overlay.classList.toggle('hidden', !visible);
    this.overlay.classList.toggle('active', visible);
    this.overlay.setAttribute('aria-hidden', String(!visible));
  }

  focusableElements() {
    const selector = 'button, a[href], input, select, textarea, summary, [tabindex]';
    return [...this.overlay.querySelectorAll(selector)].filter(element => {
      if (element.tabIndex < 0 || element.matches(':disabled, [aria-disabled="true"]')) return false;
      if (element.closest('[hidden], [inert], [aria-hidden="true"]')) return false;
      return element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
    });
  }

  open() {
    if (!this.overlay.classList.contains('active')) this.returnFocus = document.activeElement;
    this.setVisible(true);
    const first = this.focusableElements()[0] || this.overlay;
    first.focus({ preventScroll: true });
  }

  close() {
    if (!this.overlay.classList.contains('active')) return;
    this.overlay.inert = true;
    if (this.returnFocus?.isConnected) this.returnFocus.focus({ preventScroll: true });
    this.returnFocus = null;
    this.setVisible(false);
  }

  onKeyDown(event) {
    if (event.key !== 'Tab' || !this.overlay.classList.contains('active')) return;
    const active = [...document.querySelectorAll('.modal-overlay.active')];
    const top = document.querySelector('.guide-overlay.active') || active[active.length - 1];
    if (top !== this.overlay) return;
    const elements = this.focusableElements();
    const first = elements[0];
    const last = elements[elements.length - 1];
    if (!first) { event.preventDefault(); this.overlay.focus({ preventScroll: true }); return; }
    const outside = !elements.includes(document.activeElement);
    const atBoundary = event.shiftKey ? document.activeElement === first : document.activeElement === last;
    if (!outside && !atBoundary) return;
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  }

  destroy() {
    if (this.overlay.classList.contains('active')) this.close();
    document.removeEventListener('keydown', this.keyHandler);
  }
}
