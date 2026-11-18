// Path test: approach z0 along different paths and watch f(z). Different limits ⇒ limit does not exist.
import { Plane, animate } from "../plane.js";
import { C, tex, compile } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, slider, readout, note, shell, button, toggle } from "./kit.js";

const FS = [
  { id: "conj/z", tex: "\\dfrac{\\bar z}{z}", expr: "conj(z)/z", z0: [0, 0], verdict: { en: "does not exist", bn: "অস্তিত্ব নেই" } },
  { id: "xy", tex: "\\dfrac{x^2-y^2}{x^2+y^2}", expr: "(x^2-y^2)/(x^2+y^2)", z0: [0, 0], verdict: { en: "does not exist", bn: "অস্তিত্ব নেই" } },
  { id: "z2/conj", tex: "\\dfrac{z^2}{\\bar z}", expr: "z^2/conj(z)", z0: [0, 0], verdict: { en: "= 0 (squeeze: |f| = |z|)", bn: "= 0 (squeeze)" } },
  { id: "rational", tex: "\\dfrac{z^2+1}{z-i}", expr: "(z^2+1)/(z-i)", z0: [0, 1], verdict: { en: "= 2i", bn: "= 2i" } },
  { id: "dq-conj", tex: "\\dfrac{\\overline{\\Delta z}}{\\Delta z}\\ (\\bar z\\text{'s difference quotient})", expr: "conj(z)/z", z0: [0, 0], verdict: { en: "does not exist ⇒ z̄ not differentiable", bn: "নেই ⇒ z̄ differentiable না" } },
];
const PATHS = [
  { id: "real", tex: "z_0+t", color: "a", at: (t) => new C(t, 0) },
  { id: "imag", tex: "z_0+it", color: "b", at: (t) => new C(0, t) },
  { id: "diag", tex: "z_0+te^{i\\theta}", color: "c", at: (t, th) => C.polar(t, th) },
  { id: "parab", tex: "z_0+t+it^2", color: "d", at: (t) => new C(t, t * t) },
  { id: "spiral", tex: "\\text{spiral}", color: "e", at: (t) => C.polar(t, 5 * Math.log(1 / t)) },
];

export default {
  id: "paths", icon: "map",
  title: { en: "Path Test for Limits", bn: "লিমিটের পাথ টেস্ট" },
  blurb: { en: "In ℂ you can approach a point from infinitely many directions. Race along several paths at once — if they arrive at different values, the limit does not exist.", bn: "ℂ এ একটা বিন্দুর দিকে অসংখ্য দিক থেকে যাওয়া যায়। কয়েকটা পথে একসাথে দৌড়াও — ভিন্ন মান এলে limit এর অস্তিত্ব নেই।" },
  topics: ["limits", "derivative"],
  mount(host, preset = {}) {
    const s = Object.assign({ f: "conj/z", on: ["real", "imag", "diag"], theta: Math.PI / 3, t: 1 }, preset);
    const ui = shell(host, { dual: true, compact: preset.compact });
    const Z = new Plane(ui.p1, { span: 3, center: [0, 0], title: "approach z → z₀", pan: true });
    const W = new Plane(ui.p2, { span: 3.2, center: [0, 0], title: "values f(z)" });
    let def, fn, anim;
    const setF = () => { def = FS.find((f) => f.id === s.f); const g = compile(def.expr); fn = (z) => g({ z, x: new C(z.re, 0), y: new C(z.im, 0) }); Z.setView(def.z0, 3); const c = fn(new C(def.z0[0] + 1e-4, def.z0[1] + 1e-4)); W.setView(c.isFinite() && c.abs() < 5 ? [c.re, c.im] : [0, 0], 3.2); };
    const z0 = () => new C(...def.z0);
    const ts = (tmax) => { const out = []; for (let k = 0; k <= 160; k++) { const t = 1 * Math.pow(1e-3, k / 160); if (t < tmax - 1e-12) break; out.push(t); } return out; };

    Z.onDraw = (P) => {
      P.point(def.z0[0], def.z0[1], { hollow: true, r: 6, color: "ink", label: "z₀" });
      for (const p of PATHS) if (s.on.includes(p.id)) {
        const pts = ts(0.001).map((t) => z0().add(p.at(t, s.theta)));
        P.path(pts, { color: p.color, width: 1.4, alpha: 0.5, dash: [3, 3] });
        const cur = z0().add(p.at(Math.max(s.t, 0.001), s.theta)); P.point(cur.re, cur.im, { color: p.color, r: 5 });
      }
    };
    W.onDraw = (P) => {
      for (const p of PATHS) if (s.on.includes(p.id)) {
        const vals = ts(Math.max(s.t, 0.001)).map((t) => fn(z0().add(p.at(t, s.theta))));
        P.path(vals, { color: p.color, width: 2.2 });
        const v = vals[vals.length - 1]; if (v && v.isFinite()) P.point(v.re, v.im, { color: p.color, r: 6 });
      }
    };

    const fSeg = segmented(FS.map((f) => ({ value: f.id, tex: f.tex.replace(/\\ \(.*\)$/, "") })), s.f, (v) => { s.f = v; setF(); redraw(); }, "wrap");
    const pathBox = h("div.chips", PATHS.map((p) => {
      const b = h("button.chip", { class: s.on.includes(p.id) ? "on" : "", style: { "--chip": `var(--c-${p.color})` }, html: texHTML(p.tex), onclick: () => { s.on = s.on.includes(p.id) ? s.on.filter((x) => x !== p.id) : [...s.on, p.id]; b.classList.toggle("on"); redraw(); } });
      return b;
    }));
    const thSl = slider({ label: "$\\theta$", min: 0, max: 6.283, step: 0.01, value: s.theta, fmt: (v) => `${Math.round((v * 180) / Math.PI)}°`, onInput: (v) => { s.theta = v; redraw(); } });
    const tSl = slider({ label: "$|z-z_0|$", min: 0.001, max: 1, step: 0.001, value: s.t, fmt: (v) => v.toFixed(3), onInput: (v) => { s.t = v; redraw(); } });
    const go = button("▶ approach z₀", () => { anim && anim.stop(); anim = animate((tt) => { s.t = Math.max(0.001, Math.pow(1e-3, tt / 2.5)); tSl.set(s.t); redraw(); if (s.t <= 0.001) return false; }); });
    ui.controls.append(fSeg, pathBox, thSl, tSl, h("div.row", go));

    function redraw() { Z.redraw(); W.redraw(); update(); }
    function update() {
      const rows = [["f(z)", def.tex], ["z_0", tex(z0())]];
      const lims = [];
      for (const p of PATHS) if (s.on.includes(p.id)) { const v = fn(z0().add(p.at(1e-7, s.theta))); lims.push(v); rows.push([`\\text{along } ${p.tex}`, v.isFinite() ? tex(v, 3) : "\\text{osc.}", `--c-${p.color}`]); }
      const differ = lims.some((a) => lims.some((b) => !a.eq(b, 1e-3)));
      ui.info.replaceChildren(readout(rows),
        h("div", { html: differ ? `<div class="verdict bad">Different paths → different values ⇒ the limit <b>does not exist</b>.</div>` : `<div class="verdict good">These paths agree. (Agreement on a few paths does <b>not</b> prove the limit exists — that needs ε–δ or squeeze.)</div>` }),
        note(`Expected: limit ${def.verdict.en}.`));
    }
    setF(); update();
    return { plane: Z, set(p) { Object.assign(s, p); if (p.f) { fSeg.set(p.f); setF(); } pathBox.querySelectorAll(".chip").forEach((b, k) => b.classList.toggle("on", s.on.includes(PATHS[k].id))); if (p.t) tSl.set(p.t); redraw(); }, destroy() { anim && anim.stop(); Z.destroy(); W.destroy(); } };
  },
};
