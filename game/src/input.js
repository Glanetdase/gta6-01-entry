// Solmar Bay — keyboard and mouse input.
// Tracks which keys are held and which were pressed since the last
// frame, plus the mouse position in canvas pixels and its buttons.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mousePressed = false;
    this.anyKey = false;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      this.anyKey = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
    });
    window.addEventListener('blur', () => {
      this.down.clear();
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = true;
      this.mousePressed = true;
      this.anyKey = true;
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = false;
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // True while the key is held down.
  isDown(code) {
    return this.down.has(code);
  }

  // True once, on the frame the key went down. Consumed by endFrame.
  wasPressed(code) {
    return this.pressed.has(code);
  }

  // Drop a press so no later system in the same frame sees it.
  consume(code) {
    this.pressed.delete(code);
  }

  // True once, on the frame the left mouse button went down.
  wasClicked() {
    return this.mousePressed;
  }

  // Movement vector from WASD / arrows, normalised, in screen space
  // (x right, y down). Zero when nothing is held.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  // Call once per frame, after the game has read the inputs.
  endFrame() {
    this.pressed.clear();
    this.mousePressed = false;
    this.anyKey = false;
  }
}
