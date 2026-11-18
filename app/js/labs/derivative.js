// Derivative lab: the difference quotient from every direction at once. Differentiable ⇔ the ring collapses to one point.
import { Plane, animate } from "../plane.js";
import { C, tex, compile } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, slider, readout, note, shell, button } from "./kit.js";

const FS = [
  { id: "z^2", tex: "z^2", expr: "z^2", d: (z) => z.scale(2), dtex: "2z" },
  { id: "z^3", tex: "z^3", expr: "z^3", d: (z) => z.mul(z).scale(3), dtex: "3z^2" },
  { id: "1/z", tex: "1/z", expr: "1/z", d: (z) => z.mul(z).inv().neg(), dtex: "-1/z^2" },
  { id: "2z+1", tex: "2z+1", expr: "2z+1", d: () => new C(2, 0), dtex: "2" },
  { id: "conj", tex: "\\bar z", expr: "conj(z)", d: null },
  { id: "abs2", tex: "|z|^2", expr: "z*conj(z)", d: (z) => (z.abs() < 1e-9 ? new C(0, 0) : null) },
  { id: "re", tex: "\\mathrm{Re}\\,z", expr: "re(z)", d: null },
];

export default {
  id: "derivative", icon: "spark",
  title: { en: "Derivative from All Directions", bn: "সব দিক থেকে ডেরিভেটিভ" },
  blurb: { en: "Plot the difference quotient [f(z₀+h) − f(z₀)]/h for h in every direction. Shrink |h|: a differentiable f collapses to a single point f′(z₀); z̄ stays a ring forever.", bn: "সব দিকের h এর জন্য difference quotient আঁকো। |h| ছোট করো: differentiable হলে সব একটা বিন্দু f′(z₀) তে মিলে যায়; z̄ এর বেলায় চিরকাল একটা রিং থাকে।" },
  topics: ["derivative", "diff-cont"],
  mount(host, preset = {}) {
    const s = Object.assign({ f: "z^2", z0: [1, 0.5], rho: 0.8 }, preset);
    const ui = shell(host, { dual: true, compact: preset.compact });
    const Z = new Plane(ui.p1, { span: 4, center: [0.5, 0.3], title: "h around z₀", snap: 0.25 });
    const W = new Plane(ui.p2, { span: 6, center: [2, 1], title: "difference quotients" });
    let def, fn, anim;
    const setF = () => { def = FS.find((f) => f.id === s.f); const g = compile(def.expr); fn = (z) => g({ z }); recenter(); };
    const z0 = () => new C(...s.z0);
    const Q = (th) => { const hh = C.polar(s.rho, th); return fn(z0().add(hh)).sub(fn(z0())).div(hh); };
    const hue = (th) => `hsl(${(th * 180) / Math.PI}, 65%, 48%)`;
    function recenter() { const vals = Array.from({ length: 24 }, (_, k) => Q((k * Math.PI) / 12)); const c = vals.reduce((a, b) => a.add(b), new C()).scale(1 / 24); const r = Math.max(...vals.map((v) => v.sub(c).abs())); W.setView([c.re, c.im], Math.max(2.5, r * 3.2)); }
    Z.addHandle({ id: "z0", get: () => s.z0, set: (x, y) => (s.z0 = [x, y]), color: "b", label: "z₀" });
    Z.onRelease = recenter;

    Z.onDraw = (P) => {
      const [u, v] = s.z0; P.circle(u, v, s.rho, { stroke: "muted", dash: true });
      for (let k = 0; k < 24; k++) { const th = (k * Math.PI) / 12; P.vector(u, v, u + s.rho * Math.cos(th), v + s.rho * Math.sin(th), { color: hue(th), width: 1.6, alpha: 0.85 }); }
    };
    W.onDraw = (P) => {
      const ctx = P.ctx; const N = 180;
      for (let k = 0; k < N; k++) { const a = Q((2 * Math.PI * k) / N), b = Q((2 * Math.PI * (k + 1)) / N); if (!a.isFinite() || !b.isFinite()) continue; ctx.strokeStyle = hue((2 * Math.PI * k) / N); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(P.X(a.re), P.Y(a.im)); ctx.lineTo(P.X(b.re), P.Y(b.im)); ctx.stroke(); }
      const r = Q(0), i = Q(Math.PI / 2);
      P.point(r.re, r.im, { color: hue(0), r: 6, label: "h real" }); P.point(i.re, i.im, { color: hue(Math.PI / 2), r: 6, label: "h imaginary", offset: [12, 14] });
      const d = def.d && def.d(z0()); if (d && d.isFinite()) P.point(d.re, d.im, { color: "ink", r: 4, hollow: true, label: "f′(z₀)", offset: [-70, -14] });
    };
    Z.onChange = () => { W.redraw(); update(); };

    const fSeg = segmented(FS.map((f) => ({ value: f.id, tex: f.tex })), s.f, (v) => { s.f = v; setF(); redraw(); }, "wrap");
    const rSl = slider({ label: "$|h|$", min: -3, max: 0, step: 0.01, value: Math.log10(s.rho), fmt: (v) => Math.pow(10, v).toFixed(3), onInput: (v) => { s.rho = Math.pow(10, v); redraw(); } });
    const shrink = button("▶ shrink h → 0", () => { anim && anim.stop(); const from = Math.log10(s.rho); anim = animate((t) => { const v = from + (-3 - from) * Math.min(1, t / 2.5); s.rho = Math.pow(10, v); rSl.set(v); if (Math.round(t * 60) % 10 === 0) recenter(); redraw(); if (t >= 2.5) { recenter(); return false; } }); });
    const reset = button("reset |h|", () => { s.rho = 0.8; rSl.set(Math.log10(0.8)); recenter(); redraw(); });
    ui.controls.append(fSeg, rSl, h("div.row", shrink, reset));

    function redraw() { Z.redraw(); W.redraw(); update(); }
    function update() {
      const vals = Array.from({ length: 72 }, (_, k) => Q((k * Math.PI) / 36)).filter((v) => v.isFinite());
      let spread = 0; for (const a of vals) for (const b of vals) spread = Math.max(spread, a.sub(b).abs());
      const d = def.d && def.d(z0());
      // Cauchy–Riemann preview with finite differences
      const e = 1e-5; const f = (x, y) => fn(new C(x, y)); const [x, y] = s.z0;
      const ux = (f(x + e, y).re - f(x - e, y).re) / (2 * e), uy = (f(x, y + e).re - f(x, y - e).re) / (2 * e), vx = (f(x + e, y).im - f(x - e, y).im) / (2 * e), vy = (f(x, y + e).im - f(x, y - e).im) / (2 * e);
      const cr = Math.abs(ux - vy) < 1e-3 && Math.abs(uy + vx) < 1e-3;
      ui.info.replaceChildren(
        readout([["f(z)", def.tex], ["z_0", tex(z0()), "--c-b"], ["\\text{spread of quotients}", spread.toFixed(4)], ["\\Delta z\\ \\text{real}", tex(Q(0))], ["\\Delta z\\ \\text{imag.}", tex(Q(Math.PI / 2))],
          ["f'(z_0)", d ? `${def.dtex ? def.dtex + " = " : ""}${tex(d)}` : "\\text{does not exist}", "--c-c"]]),
        h("div", { html: d ? `<div class="verdict good">As |h| → 0 the whole coloured ring shrinks to <b>one</b> point: the limit is direction-independent.</div>` : `<div class="verdict bad">The ring does <b>not</b> shrink — the quotient depends on the direction of h, so f′(z₀) does not exist.</div>` }),
        note(`<b>Preview — Cauchy–Riemann:</b> ${texHTML(`u_x=${ux.toFixed(3)},\\ v_y=${vy.toFixed(3)},\\ u_y=${uy.toFixed(3)},\\ v_x=${vx.toFixed(3)}`)}<br>${texHTML("u_x=v_y,\\ u_y=-v_x")} ${cr ? "✓ hold here" : "✗ fail here"}.`),
      );
    }
    setF(); update();
    return { plane: Z, set(p) { Object.assign(s, p); if (p.f) { fSeg.set(p.f); setF(); } if (p.rho) rSl.set(Math.log10(p.rho)); redraw(); }, destroy() { anim && anim.stop(); Z.destroy(); W.destroy(); } };
  },
};
