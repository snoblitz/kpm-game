// CSS pixels and milliseconds. A quick upward look is inherently ambiguous;
// only a fast, straight launch and prompt release can qualify as a jump.
export const GESTURE = Object.freeze({ tapMs: 180, slop: 10, launchMs: 70,
  launchSpeed: 0.75, flickMs: 180, flickDistance: 64, flickSpeed: 0.8,
  directionRatio: 0.28, reversal: 4 });

export class TouchControls {
  constructor({ root, move, stick, look, onLook, onFire, viewport = () => [innerWidth, innerHeight] }) {
    Object.assign(this, { root, move, stick, look, onLook, onFire, viewport });
    this.input = { x: 0, y: 0, jump: false, run: false };
    this.pointers = new Map();
    this.active = false;
    this.listeners = [];
    for (const [role, element] of [['move', move], ['look', look]]) {
      this.listen(element, 'pointerdown', event => this.down(role, element, event));
      this.listen(element, 'pointermove', event => this.drag(event));
      this.listen(element, 'pointerup', event => this.up(event));
      for (const type of ['pointercancel', 'lostpointercapture']) {
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
    // One owner per pad. Another finger cannot steal a drag or fire during it.
    if (this.pointers.has(event.pointerId) || [...this.pointers.values()].some(pointer => pointer.role === role)) return;
    const pointer = { role, element, x: event.clientX, y: event.clientY,
      startX: event.clientX, startY: event.clientY, sentX: event.clientX, sentY: event.clientY,
      started: event.timeStamp, state: 'pending', maxDistance: 0, path: 0 };
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
  }
  aim(pointer) {
    const dx = pointer.x - pointer.sentX, dy = pointer.y - pointer.sentY;
    if (dx || dy) this.onLook(dx, dy, Math.PI / Math.max(320, Math.min(...this.viewport())));
    pointer.sentX = pointer.x; pointer.sentY = pointer.y;
  }
  sample(pointer, event) {
    const stepY = event.clientY - pointer.y;
    pointer.path += Math.hypot(event.clientX - pointer.x, stepY);
    pointer.x = event.clientX; pointer.y = event.clientY;
    const dx = pointer.x - pointer.startX, up = pointer.startY - pointer.y;
    const age = Math.max(0, event.timeStamp - pointer.started);
    pointer.maxDistance = Math.max(pointer.maxDistance, Math.hypot(dx, up));
    const straightUp = up > 0 && Math.abs(dx) <= Math.max(5, up * GESTURE.directionRatio);
    if (pointer.state === 'pending') {
      if (age > GESTURE.tapMs) pointer.state = 'drag';
      else if (pointer.maxDistance > GESTURE.slop) {
        pointer.state = age <= GESTURE.launchMs && straightUp && up / Math.max(1, age) >= GESTURE.launchSpeed
          ? 'flick' : 'drag';
      }
    }
    if (pointer.state === 'flick' && (age > GESTURE.flickMs || !straightUp ||
      stepY > GESTURE.reversal || up / Math.max(1, age) < 0.55)) pointer.state = 'drag';
    // Drag is terminal: accelerating later or reversing never creates a jump.
    if (pointer.state === 'drag') this.aim(pointer);
  }
  drag(event) {
    const pointer = this.pointers.get(event.pointerId);
    if (!this.active || !pointer) return;
    event.preventDefault();
    if (pointer.role === 'look') {
      // Inspect intermediate direction changes if the browser coalesced moves.
      for (const sample of event.getCoalescedEvents?.() || []) this.sample(pointer, sample);
      this.sample(pointer, event);
    } else {
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
  up(event) {
    const pointer = this.pointers.get(event.pointerId);
    if (!this.active || !pointer) return;
    event.preventDefault();
    let fire = false;
    if (pointer.role === 'look') {
      this.drag(event); // Include the final position even if no move was delivered.
      const age = Math.max(0, event.timeStamp - pointer.started);
      const up = pointer.startY - pointer.y;
      fire = pointer.state === 'pending' && age <= GESTURE.tapMs &&
        pointer.maxDistance <= GESTURE.slop && pointer.path <= GESTURE.slop * 2;
      if (pointer.state === 'flick' && age <= GESTURE.flickMs &&
        up >= GESTURE.flickDistance && up / Math.max(1, age) >= GESTURE.flickSpeed) {
        this.input.jump = true; // Consumed once by the next physics update.
      } else if (!fire) this.aim(pointer);
    }
    this.release(event.pointerId); // Callback may finish/reset the game.
    if (fire) this.onFire(); // Every tap, synchronously; no debounce/frame boolean.
  }
  update(now = performance.now()) {
    // A held potential flick becomes aiming after the bounded decision window.
    for (const pointer of this.pointers.values()) {
      if (pointer.role === 'look' && pointer.state !== 'drag' && now - pointer.started > GESTURE.flickMs) {
        pointer.state = 'drag'; this.aim(pointer);
      }
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
    try {
      if (pointer.element.hasPointerCapture(id)) pointer.element.releasePointerCapture(id);
    } catch { /* Capture may already be gone after browser cancellation. */ }
  }
  reset() {
    for (const id of [...this.pointers.keys()]) this.release(id);
    this.input.jump = false;
  }
  dispose() {
    this.setActive(false);
    for (const [element, type, handler] of this.listeners) element.removeEventListener(type, handler);
    this.listeners = [];
  }
}
