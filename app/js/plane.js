// Reusable interactive complex plane on <canvas>: grid, axes, vectors, draggable handles, pan & zoom.
const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export class Plane {
  /**
   * @param {HTMLElement} host container element (plane fills it)
   * @param {object} o { center:[x,y], span: world units visible across the smaller side, xLabel, yLabel, pan, zoom, snap }
   */
  constructor(host, o = {}) {
    this.o = Object.assign({ center: [0, 0], span: 10, xLabel: "Re", yLabel: "Im", pan: true, zoom: true, snap: 0.5, grid: true, title: "" }, o);
    this.host = host; host.classList.add("plane-host");
    this.canvas = document.createElement("canvas"); this.canvas.className = "plane"; host.append(this.canvas);
    if (this.o.title) { const t = document.createElement("div"); t.className = "plane-title"; t.textContent = this.o.title; host.append(t); }
    this.ctx = this.canvas.getContext("2d");
    this.cx = this.o.center[0]; this.cy = this.o.center[1];
    this.handles = []; this.drag = null; this.hover = null; this.onDraw = null; this.onChange = null; this._raf = 0;
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(host);
    this._bind(); this.resize();
  }
  get colors() {
    return {
      paper: css("--canvas"), grid: css("--grid"), grid2: css("--grid-2"), axis: css("--ink-2"), ink: css("--ink"), muted: css("--muted"),
      a: css("--c-a"), b: css("--c-b"), c: css("--c-c"), d: css("--c-d"), e: css("--c-e"), bad: css("--bad"), good: css("--good"),
      fillA: css("--fill-a"), fillB: css("--fill-b"), fillC: css("--fill-c"), card: css("--card"),
    };
  }
  resize() {
    const r = this.host.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
    this.w = Math.max(50, r.width); this.h = Math.max(50, r.height);
    this.canvas.width = Math.round(this.w * dpr); this.canvas.height = Math.round(this.h * dpr);
    this.canvas.style.width = this.w + "px"; this.canvas.style.height = this.h + "px";
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); this.redraw(true);
  }
  get scale() { return Math.min(this.w, this.h) / this.o.span; }
  X(x) { return this.w / 2 + (x - this.cx) * this.scale; }
  Y(y) { return this.h / 2 - (y - this.cy) * this.scale; }
  wx(px) { return this.cx + (px - this.w / 2) / this.scale; }
  wy(py) { return this.cy - (py - this.h / 2) / this.scale; }
  get bounds() { return { x0: this.wx(0), x1: this.wx(this.w), y0: this.wy(this.h), y1: this.wy(0) }; }
  setView(center, span) { if (center) { this.cx = center[0]; this.cy = center[1]; } if (span) this.o.span = span; this.redraw(); }

  /** Add a draggable point. h = {id, get:()=>[x,y], set:(x,y)=>void, color, label, r, snap} */
  addHandle(hd) { this.handles.push(Object.assign({ r: 9, color: "a" }, hd)); this.redraw(); return hd; }
  clearHandles() { this.handles = []; }

  redraw(now = false) {
    if (now) { cancelAnimationFrame(this._raf); this._raf = 0; this._paint(); return; }
    if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this._paint(); });
  }
  _paint() {
    const { ctx, w, h } = this; const col = this.colors; this.col = col;
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = col.paper; ctx.fillRect(0, 0, w, h);
    if (this.o.grid) this.drawGrid();
    if (this.onDraw) { try { this.onDraw(this); } catch (e) { console.error(e); } }
    for (const hd of this.handles) { if (hd.hidden) continue; const [x, y] = hd.get(); this.point(x, y, { color: hd.color, r: hd.r, label: hd.label, handle: true, active: this.drag === hd || this.hover === hd }); }
  }
  niceStep() { const target = 70 / this.scale; const p = 10 ** Math.floor(Math.log10(target)); for (const m of [1, 2, 5, 10]) if (m * p >= target) return m * p; return 10 * p; }
  drawGrid() {
    const { ctx } = this; const col = this.col; const b = this.bounds; const st = this.niceStep(); const minor = st / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = col.grid2; ctx.beginPath();
    for (let x = Math.ceil(b.x0 / minor) * minor; x <= b.x1; x += minor) { const X = Math.round(this.X(x)) + 0.5; ctx.moveTo(X, 0); ctx.lineTo(X, this.h); }
    for (let y = Math.ceil(b.y0 / minor) * minor; y <= b.y1; y += minor) { const Y = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(this.w, Y); }
    ctx.stroke();
    ctx.strokeStyle = col.grid; ctx.beginPath();
    for (let x = Math.ceil(b.x0 / st) * st; x <= b.x1; x += st) { const X = Math.round(this.X(x)) + 0.5; ctx.moveTo(X, 0); ctx.lineTo(X, this.h); }
    for (let y = Math.ceil(b.y0 / st) * st; y <= b.y1; y += st) { const Y = Math.round(this.Y(y)) + 0.5; ctx.moveTo(0, Y); ctx.lineTo(this.w, Y); }
    ctx.stroke();
    // axes
    const ax = Math.min(Math.max(this.Y(0), 0), this.h), ay = Math.min(Math.max(this.X(0), 0), this.w);
    ctx.strokeStyle = col.axis; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, ax); ctx.lineTo(this.w, ax); ctx.moveTo(ay, 0); ctx.lineTo(ay, this.h); ctx.stroke();
    ctx.fillStyle = col.muted; ctx.font = "10.5px JetBrains Mono, ui-monospace, monospace";
    const fmtN = (v) => (Math.abs(v) < 1e-9 ? "0" : +v.toFixed(4) + "");
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    for (let x = Math.ceil(b.x0 / st) * st; x <= b.x1; x += st) if (Math.abs(x) > 1e-9) ctx.fillText(fmtN(x), this.X(x), Math.min(ax + 4, this.h - 14));
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    for (let y = Math.ceil(b.y0 / st) * st; y <= b.y1; y += st) if (Math.abs(y) > 1e-9) ctx.fillText(fmtN(y) + "i", Math.max(ay - 5, 26), this.Y(y));
    ctx.font = "600 11px JetBrains Mono, ui-monospace, monospace"; ctx.fillStyle = col.ink;
    ctx.textAlign = "right"; ctx.textBaseline = "bottom"; ctx.fillText(this.o.xLabel, this.w - 8, ax - 4);
    ctx.textAlign = "left"; ctx.textBaseline = "top"; ctx.fillText(this.o.yLabel, ay + 6, 8);
  }
  c(name) { return (this.col && this.col[name]) || name; }

  // ---------- drawing primitives (world coords) ----------
  line(x0, y0, x1, y1, o = {}) {
    const { ctx } = this; ctx.save(); ctx.strokeStyle = this.c(o.color || "ink"); ctx.lineWidth = o.width || 1.6; ctx.globalAlpha = o.alpha ?? 1;
    if (o.dash) ctx.setLineDash(o.dash === true ? [5, 5] : o.dash);
    ctx.beginPath(); ctx.moveTo(this.X(x0), this.Y(y0)); ctx.lineTo(this.X(x1), this.Y(y1)); ctx.stroke(); ctx.restore();
  }
  vector(x0, y0, x1, y1, o = {}) {
    const { ctx } = this; const X0 = this.X(x0), Y0 = this.Y(y0), X1 = this.X(x1), Y1 = this.Y(y1);
    const len = Math.hypot(X1 - X0, Y1 - Y0); if (len < 1) return;
    ctx.save(); ctx.strokeStyle = ctx.fillStyle = this.c(o.color || "ink"); ctx.lineWidth = o.width || 2.4; ctx.globalAlpha = o.alpha ?? 1; ctx.lineCap = "round";
    if (o.dash) ctx.setLineDash(o.dash === true ? [6, 5] : o.dash);
    const ang = Math.atan2(Y1 - Y0, X1 - X0); const hl = Math.min(12, len * 0.4);
    ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1 - Math.cos(ang) * hl * 0.6, Y1 - Math.sin(ang) * hl * 0.6); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(X1, Y1); ctx.lineTo(X1 - hl * Math.cos(ang - 0.42), Y1 - hl * Math.sin(ang - 0.42)); ctx.lineTo(X1 - hl * Math.cos(ang + 0.42), Y1 - hl * Math.sin(ang + 0.42)); ctx.closePath(); ctx.fill();
    if (o.label) this.label((x0 + x1) / 2, (y0 + y1) / 2, o.label, { color: o.color, offset: o.labelOffset || [8, -8] });
    ctx.restore();
  }
  circle(cx, cy, r, o = {}) {
    const { ctx } = this; ctx.save(); ctx.beginPath(); ctx.arc(this.X(cx), this.Y(cy), Math.abs(r) * this.scale, 0, Math.PI * 2);
    if (o.fill) { ctx.fillStyle = this.c(o.fill); ctx.globalAlpha = o.fillAlpha ?? 1; ctx.fill(); ctx.globalAlpha = 1; }
    if (o.stroke !== false) { ctx.strokeStyle = this.c(o.stroke || "ink"); ctx.lineWidth = o.width || 1.6; if (o.dash) ctx.setLineDash(o.dash === true ? [6, 5] : o.dash); ctx.globalAlpha = o.alpha ?? 1; ctx.stroke(); }
    ctx.restore();
  }
  arc(cx, cy, r, a0, a1, o = {}) { // r in world units, angles math-convention
    const { ctx } = this; ctx.save(); ctx.strokeStyle = this.c(o.color || "ink"); ctx.lineWidth = o.width || 1.6; if (o.dash) ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(this.X(cx), this.Y(cy), r * (o.px ? 1 / this.scale : 1) * this.scale, -a0, -a1, a1 > a0); ctx.stroke();
    if (o.fill) { ctx.lineTo(this.X(cx), this.Y(cy)); ctx.closePath(); ctx.globalAlpha = o.fillAlpha ?? 0.25; ctx.fillStyle = this.c(o.fill); ctx.fill(); }
    ctx.restore();
  }
  path(pts, o = {}) {
    if (!pts.length) return; const { ctx } = this; ctx.save(); ctx.strokeStyle = this.c(o.color || "ink"); ctx.lineWidth = o.width || 1.6; ctx.globalAlpha = o.alpha ?? 1; ctx.lineJoin = "round";
    if (o.dash) ctx.setLineDash(o.dash === true ? [5, 5] : o.dash);
    ctx.beginPath(); let pen = false;
    for (const p of pts) { const x = Array.isArray(p) ? p[0] : p.re, y = Array.isArray(p) ? p[1] : p.im; const X = this.X(x), Y = this.Y(y);
      if (!Number.isFinite(X) || !Number.isFinite(Y) || Math.abs(X) > 1e5 || Math.abs(Y) > 1e5) { pen = false; continue; }
      pen ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); pen = true; }
    if (o.close) ctx.closePath();
    if (o.fill) { ctx.fillStyle = this.c(o.fill); ctx.globalAlpha = o.fillAlpha ?? 0.3; ctx.fill(); ctx.globalAlpha = o.alpha ?? 1; }
    ctx.stroke(); ctx.restore();
  }
  point(x, y, o = {}) {
    const { ctx } = this; const X = this.X(x), Y = this.Y(y); if (!Number.isFinite(X) || !Number.isFinite(Y)) return;
    const r = o.r || 5; ctx.save();
    if (o.handle) { ctx.fillStyle = this.c("ink"); ctx.beginPath(); ctx.arc(X + 1.5, Y + 2.2, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.beginPath(); ctx.arc(X, Y, o.active ? r + 2 : r, 0, Math.PI * 2);
    ctx.fillStyle = o.hollow ? this.c("paper") : this.c(o.color || "ink"); ctx.fill();
    ctx.lineWidth = o.handle ? 2 : 1.6; ctx.strokeStyle = o.hollow ? this.c(o.color || "ink") : this.c("ink"); ctx.stroke();
    if (o.handle) { ctx.fillStyle = this.c("paper"); ctx.beginPath(); ctx.arc(X, Y, 2.2, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    if (o.label) this.label(x, y, o.label, { color: o.labelColor || "ink", offset: o.offset || [12, -12], bold: true });
  }
  label(x, y, text, o = {}) {
    const { ctx } = this; const X = this.X(x) + (o.offset ? o.offset[0] : 0), Y = this.Y(y) + (o.offset ? o.offset[1] : 0);
    if (!Number.isFinite(X) || !Number.isFinite(Y)) return;
    ctx.save(); ctx.font = `${o.bold ? 600 : 500} ${o.size || 12}px JetBrains Mono, ui-monospace, monospace`; ctx.textBaseline = "middle"; ctx.textAlign = o.align || "left";
    const tw = ctx.measureText(text).width; let bx = o.align === "center" ? X - tw / 2 : o.align === "right" ? X - tw : X;
    bx = Math.min(Math.max(bx, 4), this.w - tw - 8); const by = Math.min(Math.max(Y, 12), this.h - 12);
    ctx.fillStyle = this.c("card"); ctx.globalAlpha = 0.86; ctx.fillRect(bx - 4, by - 9, tw + 8, 18); ctx.globalAlpha = 1;
    ctx.fillStyle = this.c(o.color || "ink"); ctx.textAlign = "left"; ctx.fillText(text, bx, by); ctx.restore();
  }
  polygon(pts, o = {}) { this.path(pts, Object.assign({ close: true }, o)); }

  // ---------- interaction ----------
  _bind() {
    const cv = this.canvas; cv.style.touchAction = "none";
    const pos = (e) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    const hit = (px, py) => { let best = null, bd = 1e9; for (const hd of this.handles) { if (hd.locked || hd.hidden) continue; const [x, y] = hd.get(); const d = Math.hypot(this.X(x) - px, this.Y(y) - py); if (d < Math.max(18, hd.r + 8) && d < bd) { bd = d; best = hd; } } return best; };
    cv.addEventListener("pointerdown", (e) => {
      const [px, py] = pos(e); const hd = hit(px, py); cv.setPointerCapture(e.pointerId);
      if (hd) { this.drag = hd; this.host.classList.add("dragging"); }
      else if (this.o.pan) this.pan = { px, py, cx: this.cx, cy: this.cy };
      else if (this.onClick) this.onClick(this.wx(px), this.wy(py));
      this.redraw();
    });
    cv.addEventListener("pointermove", (e) => {
      const [px, py] = pos(e);
      if (this.drag) {
        let x = this.wx(px), y = this.wy(py); const sn = this.drag.snap ?? this.o.snap;
        if (sn && !e.shiftKey) { const sx = Math.round(x / sn) * sn, sy = Math.round(y / sn) * sn; if (Math.hypot(this.X(sx) - px, this.Y(sy) - py) < 10) { x = sx; y = sy; } }
        this.drag.set(+x.toFixed(4), +y.toFixed(4)); this.onChange && this.onChange(this.drag); this.redraw();
      } else if (this.pan) {
        this.cx = this.pan.cx - (px - this.pan.px) / this.scale; this.cy = this.pan.cy + (py - this.pan.py) / this.scale; this.redraw();
      } else { const hv = hit(px, py); if (hv !== this.hover) { this.hover = hv; cv.style.cursor = hv ? "grab" : this.o.pan ? "move" : "crosshair"; this.redraw(); } }
      if (this.onHover) this.onHover(this.wx(px), this.wy(py));
    });
    const up = () => { if (this.drag && this.onRelease) this.onRelease(this.drag); this.drag = null; this.pan = null; this.host.classList.remove("dragging"); this.redraw(); };
    cv.addEventListener("pointerup", up); cv.addEventListener("pointercancel", up);
    cv.addEventListener("wheel", (e) => {
      if (!this.o.zoom) return; e.preventDefault(); const [px, py] = pos(e); const wx = this.wx(px), wy = this.wy(py);
      const f = Math.exp(e.deltaY * 0.0012); this.o.span = Math.min(200, Math.max(0.05, this.o.span * f));
      this.cx = wx - (px - this.w / 2) / this.scale; this.cy = wy + (py - this.h / 2) / this.scale; this.redraw(); this.onZoom && this.onZoom();
    }, { passive: false });
  }
  destroy() { this.ro.disconnect(); cancelAnimationFrame(this._raf); this.canvas.remove(); }
}

/** Simple animation loop helper. Returns {stop}. fn(t, dt) → return false to stop. */
export function animate(fn) {
  let id, last = performance.now(), t0 = last, alive = true;
  const tick = (now) => { if (!alive) return; const r = fn((now - t0) / 1000, (now - last) / 1000); last = now; if (r === false) { alive = false; return; } id = requestAnimationFrame(tick); };
  id = requestAnimationFrame(tick);
  return { stop() { alive = false; cancelAnimationFrame(id); } };
}
