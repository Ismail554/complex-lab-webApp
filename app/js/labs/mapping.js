// Mapping lab: w = f(z) transforms the z-plane. Grid/shape images, probe point, u(x,y)+iv(x,y), morph, domain colouring.
import { Plane, animate } from "../plane.js";
import { C, tex, compile } from "../complex.js";
import { h, texHTML, toast } from "../ui.js";
import { segmented, slider, readout, note, shell, toggle, button } from "./kit.js";

export const FUNCS = [
  { id: "z^2", label: "z^2", expr: "z^2", u: "x^2-y^2", v: "2xy" },
  { id: "z^3", label: "z^3", expr: "z^3", u: "x^3-3xy^2", v: "3x^2y-y^3" },
  { id: "1/z", label: "1/z", expr: "1/z", u: "\\dfrac{x}{x^2+y^2}", v: "-\\dfrac{y}{x^2+y^2}", dom: "\\mathbb C\\setminus\\{0\\}" },
  { id: "conj", label: "\\bar z", expr: "conj(z)", u: "x", v: "-y" },
  { id: "2z+1", label: "2z+1", expr: "2z+1", u: "2x+1", v: "2y" },
  { id: "1/(z-2i)", label: "\\tfrac{1}{z-2i}", expr: "1/(z-2i)", u: "\\dfrac{x}{x^2+(y-2)^2}", v: "-\\dfrac{y-2}{x^2+(y-2)^2}", dom: "\\mathbb C\\setminus\\{2i\\}" },
  { id: "iz", label: "iz", expr: "i*z", u: "-y", v: "x" },
  { id: "exp", label: "e^z", expr: "exp(z)", u: "e^x\\cos y", v: "e^x\\sin y" },
];

const SHAPES = [{ value: "grid", label: { en: "grid", bn: "গ্রিড" } }, { value: "polar", label: { en: "polar grid", bn: "পোলার" } }, { value: "F", label: { en: "letter F", bn: "অক্ষর F" } }, { value: "disk", label: { en: "circle", bn: "বৃত্ত" } }];

export default {
  id: "mapping", icon: "map",
  title: { en: "Function Mapper  w = f(z)", bn: "ফাংশন ম্যাপার  w = f(z)" },
  blurb: { en: "See a complex function as a transformation: grids bend, circles flip, and you read u(x,y) and v(x,y) at any probe point. Type your own f(z).", bn: "Complex function কে একটা রূপান্তর হিসেবে দেখো — গ্রিড বাঁকে, বৃত্ত উল্টে যায়, আর যেকোনো বিন্দুতে u(x,y), v(x,y) পড়ো। নিজের f(z) লিখেও দেখো।" },
  topics: ["functions", "uv", "derivative"],
  mount(host, preset = {}) {
    const s = Object.assign({ f: "z^2", custom: "", shape: "grid", t: 1, probe: [1, 0.8], color: false, spanZ: 5, spanW: 8, centerZ: [0, 0], centerW: [0, 0] }, preset);
    const ui = shell(host, { dual: true, compact: preset.compact });
    const Z = new Plane(ui.p1, { span: s.spanZ, center: s.centerZ, title: "z-plane", snap: 0.25, xLabel: "x", yLabel: "y" });
    const W = new Plane(ui.p2, { span: s.spanW, center: s.centerW, title: "w-plane", xLabel: "u", yLabel: "v" });
    let fn = null, meta = null;
    const setF = () => {
      meta = FUNCS.find((f) => f.id === s.f) || { id: "custom", label: s.custom || "z", expr: s.custom || "z" };
      try { const g = compile(meta.expr); fn = (z) => g({ z, x: new C(z.re, 0), y: new C(z.im, 0) }); } catch (e) { toast(`Could not parse: ${e.message}`, "bad"); fn = (z) => z; }
      domainCache = null;
    };
    const F = (z) => { const w = fn(z); return s.t >= 1 ? w : z.scale(1 - s.t).add(w.scale(s.t)); };
    Z.addHandle({ id: "probe", get: () => s.probe, set: (x, y) => (s.probe = [x, y]), color: "a", label: "z" });

    // ----- shapes in z-plane -----
    function curves() {
      const out = []; const N = 120;
      if (s.shape === "grid") {
        const R = 2, st = 0.5;
        for (let a = -R; a <= R + 1e-9; a += st) {
          out.push({ pts: lin(-R, R, N).map((y) => new C(a, y)), color: "b" });
          out.push({ pts: lin(-R, R, N).map((x) => new C(x, a)), color: "a" });
        }
      } else if (s.shape === "polar") {
        for (const r of [0.5, 1, 1.5, 2]) out.push({ pts: lin(0, 2 * Math.PI, N).map((t) => C.polar(r, t)), color: "b" });
        for (let k = 0; k < 12; k++) out.push({ pts: lin(0.05, 2.2, N).map((r) => C.polar(r, (k * Math.PI) / 6)), color: k === 0 ? "c" : "a" });
      } else if (s.shape === "F") {
        const segs = [[[0.4, -0.8], [0.4, 1]], [[0.4, 1], [1.4, 1]], [[0.4, 0.2], [1.1, 0.2]]];
        segs.forEach(([p, q], k) => out.push({ pts: lin(0, 1, N).map((t) => new C(p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t)), color: ["a", "c", "b"][k], width: 3.5 }));
      } else if (s.shape === "disk") {
        const [px, py] = s.probe;
        out.push({ pts: lin(0, 2 * Math.PI, 200).map((t) => new C(px + 0.6 * Math.cos(t), py + 0.6 * Math.sin(t))), color: "c", width: 2.5, fill: "fillC" });
        out.push({ pts: lin(0, 2 * Math.PI, 200).map((t) => C.polar(1, t)), color: "b", width: 2 });
      }
      return out;
    }

    // ----- domain colouring -----
    let domainCache = null;
    function drawDomain(P) {
      const key = [P.cx, P.cy, P.o.span, P.w, P.h, s.f, s.custom].join("|");
      if (!domainCache || domainCache.key !== key) {
        const sc = 0.35; const w = Math.max(2, Math.round(P.w * sc)), hgt = Math.max(2, Math.round(P.h * sc));
        const cv = document.createElement("canvas"); cv.width = w; cv.height = hgt; const g = cv.getContext("2d"); const img = g.createImageData(w, hgt);
        for (let j = 0; j < hgt; j++) for (let i = 0; i < w; i++) {
          const z = new C(P.wx(i / sc), P.wy(j / sc)); const v = fn(z); const k = (j * w + i) * 4;
          if (!v.isFinite()) { img.data[k + 3] = 255; continue; }
          const hue = (v.arg() / (2 * Math.PI) + 1) % 1; const m = Math.log2(v.abs() + 1e-12); const light = 0.42 + 0.14 * (m - Math.floor(m));
          const [r, gg, b] = hsl(hue, 0.62, light); img.data[k] = r; img.data[k + 1] = gg; img.data[k + 2] = b; img.data[k + 3] = 255;
        }
        g.putImageData(img, 0, 0); domainCache = { key, cv };
      }
      P.ctx.save(); P.ctx.globalAlpha = 0.85; P.ctx.imageSmoothingEnabled = true; P.ctx.drawImage(domainCache.cv, 0, 0, P.w, P.h); P.ctx.restore(); P.drawGrid();
    }

    Z.onDraw = (P) => {
      if (s.color) drawDomain(P);
      for (const c of curves()) P.path(c.pts, { color: c.color, width: c.width || 1.5, alpha: 0.85, fill: c.fill, fillAlpha: 0.25 });
    };
    W.onDraw = (P) => {
      for (const c of curves()) P.path(c.pts.map(F), { color: c.color, width: c.width || 1.5, alpha: 0.85, fill: c.fill, fillAlpha: 0.25 });
      const z = new C(...s.probe); const w = F(z);
      if (w.isFinite()) P.point(w.re, w.im, { color: "c", r: 7, label: "w = f(z)" });
    };
    Z.onChange = () => { W.redraw(); update(); }; Z.onZoom = () => W.redraw();

    // ----- controls -----
    const fSeg = segmented([...FUNCS.map((f) => ({ value: f.id, tex: f.label })), { value: "custom", label: { en: "custom…", bn: "নিজের…" } }], s.f, (v) => { s.f = v; customRow.style.display = v === "custom" ? "" : "none"; setF(); redraw(); }, "wrap");
    const customInp = h("input.inp", { placeholder: "e.g. (z^2+1)/(z+1)", value: s.custom || "", style: { flex: 1 } });
    const applyCustom = () => { s.custom = customInp.value.trim() || "z"; setF(); redraw(); };
    customInp.addEventListener("keydown", (e) => { if (e.key === "Enter") applyCustom(); });
    const customRow = h("div.row", { style: { display: s.f === "custom" ? "" : "none" } }, h("span", { html: texHTML("f(z)=") }), customInp, button("plot", applyCustom));
    const shapeSeg = segmented(SHAPES, s.shape, (v) => { s.shape = v; redraw(); });
    const tSl = slider({ label: "morph t", min: 0, max: 1, step: 0.01, value: s.t, fmt: (v) => v.toFixed(2), onInput: (v) => { s.t = v; W.redraw(); update(); } });
    const morph = button("▶ morph", () => { let a = animate((tt) => { s.t = Math.min(1, tt / 2.2); tSl.set(s.t); W.redraw(); if (s.t >= 1) { update(); return false; } }); });
    ui.controls.append(fSeg, customRow, shapeSeg, tSl, h("div.row", morph, toggle({ en: "domain colouring", bn: "ডোমেইন কালারিং" }, s.color, (v) => { s.color = v; Z.redraw(); })));

    function redraw() { Z.redraw(); W.redraw(); update(); }
    function update() {
      const z = new C(...s.probe); const w = fn(z);
      const rows = [["f(z)", meta.label], ["z = x+iy", tex(z), "--c-a"], ["w=f(z)", w.isFinite() ? tex(w) : "\\text{undefined}", "--c-c"]];
      if (meta.u) rows.push(["u(x,y)", meta.u], ["v(x,y)", meta.v]);
      if (w.isFinite()) rows.push(["u,\\ v \\text{ here}", `${+w.re.toFixed(3)},\\ ${+w.im.toFixed(3)}`]);
      if (meta.dom) rows.push(["\\text{Domain}", meta.dom]);
      ui.info.replaceChildren(readout(rows), note(tips[meta.id] || "Drag the probe <b>z</b>; the orange dot shows where it lands. Use the morph slider to watch the plane deform."));
    }
    setF(); update();
    return { plane: Z, set(p) { Object.assign(s, p); if (p.f) fSeg.set(p.f); if (p.shape) shapeSeg.set(p.shape); if (p.t != null) tSl.set(p.t); setF(); redraw(); }, destroy() { Z.destroy(); W.destroy(); } };
  },
};

const tips = {
  "z^2": `Angles at the origin <b>double</b>: the first quadrant fills the whole upper half-plane. Each w ≠ 0 has two pre-images ±z — that is why ${texHTML("w^2=z")} is multi-valued.`,
  "1/z": `Inversion: |w| = 1/|z| and the angle is flipped. Circles through 0 become lines. z = 0 is not in the domain; w = 0 is never reached, so the range is ${texHTML("\\mathbb C\\setminus\\{0\\}")}.`,
  conj: `Pure reflection in the real axis — notice the letter F gets <b>mirrored</b>. Conformal maps never flip orientation; this is a hint that ${texHTML("\\bar z")} is not complex-differentiable.`,
  "2z+1": "Scale by 2, then shift by 1. Every distance doubles — this is why δ = ε/2 works in the ε–δ proof.",
  "1/(z-2i)": `Shift so 2i goes to 0, then invert. The point ${texHTML("2i")} is excluded from the domain.`,
  iz: "Multiplying by i rotates the whole plane by 90°.",
  exp: "Horizontal lines become rays, vertical lines become circles: e^z turns Cartesian into polar.",
};
const lin = (a, b, n) => Array.from({ length: n + 1 }, (_, k) => a + ((b - a) * k) / n);
function hsl(h, s, l) { const a = s * Math.min(l, 1 - l); const f = (n) => { const k = (n + h * 12) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))); }; return [f(0), f(8), f(4)]; }
