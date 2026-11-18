// input.js — keyboard + mouse state for LUMENFALL.
// One job: turn raw DOM events into a clean per-frame input snapshot
// (held keys, just-pressed edges, mouse position and button state).

// Key codes the game cares about, grouped by meaning.
export const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

/** Build an input tracker bound to a canvas element. */
export function createInput(canvas) {
  const held = new Set();
  // Live edges, written by event handlers. endFrame() snapshots them
  // into `frame` and clears the live set, so wasPressed() reads exactly
  // the presses that arrived before the last snapshot: an edge can
  // never be eaten by a frame that ran no simulation step, and it is
  // visible to exactly one step's worth of updates.
  const pressed = new Set();
  let frame = new Set();
  const mouse = { x: 640, y: 400, down: false, inside: false };

  function canvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  function onKeyDown(event) {
    if (MOVE_KEYS.includes(event.code) || event.code === 'Space') event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    held.add(event.code);
  }

  function onKeyUp(event) {
    held.delete(event.code);
  }

  function onMouseMove(event) {
    const p = canvasPoint(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.inside = true;
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    const p = canvasPoint(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    // Clicks are edges, same as keys: a fast down+up between two
    // simulation steps must not vanish before the step sees it.
    pressed.add('Mouse0');
  }

  function onMouseUp(event) {
    if (event.button !== 0) return;
    mouse.down = false;
  }

  function onBlur() {
    held.clear();
    pressed.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  window.addEventListener('mouseup', onMouseUp);

  return {
    mouse,

    /** True while the key is held down. */
    isDown(code) {
      return held.has(code);
    },

    /**
     * True only on the step the key went down (edge trigger). The read
     * is destructive: one frame can run several fixed steps, and a
     * toggle key (P to pause) must not fire once per step in that frame.
     */
    wasPressed(code) {
      if (frame.has(code)) {
        frame.delete(code);
        return true;
      }
      return false;
    },

    /** Movement vector from WASD/arrows, normalized, zero when idle. */
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },

    /** Snapshot live edges for the next step; call after the step ran. */
    endFrame() {
      frame = new Set(pressed);
      pressed.clear();
    },

    /** Detach all listeners (used by tests that rebuild the game). */
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}
