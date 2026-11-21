// Solmar Bay — keyboard + mouse input with edge-triggered "pressed" keys.
// A key counts as pressed only on the frame it goes down, so E never double-fires
// and a pause toggle cannot bounce.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.pressedKeys = new Set();
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;
    this.canvas = canvas;
    this._onKeyDown = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (!this.keys.has(k)) this.pressedKeys.add(k);
      this.keys.add(k);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
    };
    this._onKeyUp = (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    };
    this._onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouseY = (e.clientY - r.top) * (canvas.height / r.height);
    };
    this._onMouseDown = (e) => {
      this._onMouseMove(e);
      this.mouseDown = true;
      this.mouseClicked = true;
    };
    this._onMouseUp = () => { this.mouseDown = false; };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
  }

  down(key) { return this.keys.has(key); }
  pressed(key) { return this.pressedKeys.has(key); }
  consume(key) { this.pressedKeys.delete(key); }

  // WASD / arrow drive + walk axes, each in [-1, 1].
  axes() {
    const x = (this.down('d') || this.down('ArrowRight') ? 1 : 0)
      - (this.down('a') || this.down('ArrowLeft') ? 1 : 0);
    const y = (this.down('s') || this.down('ArrowDown') ? 1 : 0)
      - (this.down('w') || this.down('ArrowUp') ? 1 : 0);
    return { x, y };
  }

  // Clear the edge-triggered set at the end of each frame.
  endFrame() {
    this.pressedKeys.clear();
    this.mouseClicked = false;
  }
}
