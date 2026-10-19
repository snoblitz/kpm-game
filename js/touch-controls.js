// Each control owns its pointer until release, cancellation, or loss of capture.
// A look gesture can never become a shot when it crosses the fire button.
export class TouchControls {
  constructor({ root, move, stick, look, fire, jump, onLook, onFire, viewport = () => [innerWidth, innerHeight] }) {
    Object.assign(this, { root, move, stick, look, fire, jump, onLook, onFire, viewport });
    this.input = { x: 0, y: 0, jump: false, run: false };
    this.pointers = new Map();
    this.active = false;
    this.listeners = [];
    for (const [role, element] of [['move', move], ['look', look], ['fire', fire], ['jump', jump]]) {
      this.listen(element, 'pointerdown', event => this.down(role, element, event));
      this.listen(element, 'pointermove', event => this.drag(event));
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        this.listen(element, type, event => this.release(event.pointerId));
      }
      this.listen(element, 'contextmenu', event => event.preventDefault());
    }
    this.setActive(false);
  }
  listen(element, type, handler) {
    element.addEventListener(type, handler, { passive: false });
    this.listeners.push([element, type, handler]);
  }
  setActive(active) {
    this.active = active;
    this.root.hidden = !active;
    if (!active) this.reset();
  }
  down(role, element, event) {
    if (!this.active || event.pointerType === 'mouse') return;
    event.preventDefault();
    event.stopPropagation();
    if (this.pointers.has(event.pointerId) || [...this.pointers.values()].some(pointer => pointer.role === role)) return;
    const pointer = { role, element, x: event.clientX, y: event.clientY };
    if (role === 'move') {
      const bounds = element.getBoundingClientRect();
      pointer.x = bounds.left + bounds.width / 2;
      pointer.y = bounds.top + bounds.height / 2;
      pointer.radius = Math.max(1, bounds.width / 2 - 24);
    }
    this.pointers.set(event.pointerId, pointer);
    try { element.setPointerCapture(event.pointerId); } catch {
      this.release(event.pointerId);
      return;
    }
    element.classList.add('pressed');
    if (role === 'move') this.drag(event);
    if (role === 'jump') this.input.jump = true;
    if (role === 'fire') this.onFire();
  }
  drag(event) {
    const pointer = this.pointers.get(event.pointerId);
    if (!this.active || !pointer) return;
    event.preventDefault();
    if (pointer.role === 'look') {
      const sensitivity = Math.PI / Math.max(320, Math.min(...this.viewport()));
      this.onLook(event.clientX - pointer.x, event.clientY - pointer.y, sensitivity);
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    } else if (pointer.role === 'move') {
      const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
      const distance = Math.hypot(dx, dy);
      const extent = Math.min(distance / pointer.radius, 1);
      const magnitude = Math.max(0, (extent - 0.12) / 0.88);
      this.input.x = distance ? dx / distance * magnitude : 0;
      this.input.y = distance ? -dy / distance * magnitude : 0;
      this.input.run = extent > 0.92;
      const scale = distance ? Math.min(distance, pointer.radius) / distance : 0;
      this.stick.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    }
  }
  release(id) {
    const pointer = this.pointers.get(id);
    if (!pointer) return;
    this.pointers.delete(id);
    pointer.element.classList.remove('pressed');
    if (pointer.role === 'move') {
      this.input.x = this.input.y = 0;
      this.input.run = false;
      this.stick.style.transform = 'translate(0px, 0px)';
    }
    if (pointer.role === 'jump') this.input.jump = false;
    try {
      if (pointer.element.hasPointerCapture(id)) pointer.element.releasePointerCapture(id);
    } catch { /* Capture may already be gone after browser cancellation. */ }
  }
  reset() {
    for (const id of [...this.pointers.keys()]) this.release(id);
  }
  dispose() {
    this.setActive(false);
    for (const [element, type, handler] of this.listeners) element.removeEventListener(type, handler);
    this.listeners = [];
  }
}
