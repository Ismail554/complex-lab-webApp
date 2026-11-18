// ε–δ lab: choose ε, find a δ so the deleted δ-disc around z0 lands inside the ε-disc around L. Also shows uniform continuity.
import { Plane } from "../plane.js";
import { C, tex, nice, compile } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, slider, readout, note, shell, button, toggle } from "./kit.js";

const FS = [
  { id: "2z+1", expr: "2z+1", tex: "2z+1", a: 2, z0: [1, 1] },
  { id: "3z-2", expr: "3z-2", tex: "3z-2", a: 3, z0: [1, 1] },
  { id: "4z+1", expr: "4z+1", tex: "4z+1", a: 4, z0: [2, 0] },
  { id: "z^2", expr: "z^2", tex: "z^2", z0: [1, 1] },
  { id: "conj", expr: "conj(z)", tex: "\\bar z", a: 1, z0: [1, 1] },
];

export default {
  id: "epsdelta", icon: "target",
  title: { en: "ε–δ Limit Machine", bn: "ε–δ লিমিট মেশিন" },
  blurb: { en: "The challenger picks ε. You must answer with a δ that traps every image f(z) inside the ε-disc. See why δ = ε/2 works for 2z+1, and why z² is not uniformly continuous.", bn: "প্রতিপক্ষ ε বেছে নেয়, তোমাকে এমন δ দিতে হবে যাতে সব f(z) ε-disc এর ভিতরে থাকে। দেখো কেন 2z+1 এর জন্য δ = ε/2 কাজ করে, আর কেন z² uniformly continuous না।" },
  topics: ["limits", "continuity", "neighbourhood"],
  mount(host, preset = {}) {
    const s = Object.assign({ f: "2z+1", eps: 1, delta: 0.8, z0: null, auto: false }, preset);
    const ui = shell(host, { dual: true, compact: preset.compact });
    const Z = new Plane(ui.p1, { span: 4.5, center: [1, 1], title: "z-plane (input)", snap: 0.5 });
    const W = new Plane(ui.p2, { span: 7, center: [3, 2], title: "w-plane (output)" });
    let def, fn;
    const seeds = Array.from({ length: 520 }, (_, k) => [Math.sqrt((k + 0.5) / 520), k * 2.399963]); // sunflower pattern
    const setF = (keepZ0) => { def = FS.find((f) => f.id === s.f) || FS[0]; const g = compile(def.expr); fn = (z) => g({ z }); if (!keepZ0 || !s.z0) s.z0 = [...def.z0]; fit(); };
    const z0 = () => new C(...s.z0); const L = () => fn(z0());
    const bestDelta = () => def.a ? s.eps / def.a : -z0().abs() + Math.sqrt(z0().abs2() + s.eps);
    function fit() { const l = L(); Z.setView([s.z0[0], s.z0[1]], 4.5); W.setView([l.re, l.im], Math.max(4, s.eps * 4.5)); }
    Z.addHandle({ id: "z0", get: () => s.z0, set: (x, y) => { s.z0 = [x, y]; }, color: "b", label: "z₀" });
    Z.onRelease = () => { const l = L(); W.setView([l.re, l.im]); };

    let fails = 0;
    Z.onDraw = (P) => {
      const [u, v] = s.z0;
      P.circle(u, v, s.delta, { fill: "fillB", fillAlpha: 0.35, stroke: "b", dash: true, width: 2 });
      for (const [r, t] of seeds) { const x = u + s.delta * r * Math.cos(t), y = v + s.delta * r * Math.sin(t); const ok = fn(new C(x, y)).sub(L()).abs() < s.eps; P.point(x, y, { r: 1.7, color: ok ? "good" : "bad" }); }
      P.point(u, v, { hollow: true, r: 5, color: "b" });
      P.label(u + s.delta, v, `δ = ${s.delta.toFixed(3)}`, { color: "b", offset: [6, 0], bold: true });
    };
    W.onDraw = (P) => {
      const l = L(); fails = 0;
      P.circle(l.re, l.im, s.eps, { fill: "fillC", fillAlpha: 0.3, stroke: "c", width: 2.2 });
      const [u, v] = s.z0;
      for (const [r, t] of seeds) { const w = fn(new C(u + s.delta * r * Math.cos(t), v + s.delta * r * Math.sin(t))); const ok = w.sub(l).abs() < s.eps; if (!ok) fails++; P.point(w.re, w.im, { r: 1.7, color: ok ? "good" : "bad" }); }
      // image of the δ-circle boundary
      P.path(Array.from({ length: 121 }, (_, k) => fn(new C(u + s.delta * Math.cos(k * Math.PI / 60), v + s.delta * Math.sin(k * Math.PI / 60)))), { color: "b", dash: [4, 4], width: 1.4 });
      P.point(l.re, l.im, { color: "c", r: 5, label: "L" });
      P.label(l.re + s.eps, l.im, `ε = ${s.eps.toFixed(2)}`, { color: "c", offset: [6, 0], bold: true });
      queueMicrotask(update);
    };
    Z.onChange = () => { if (s.auto) { s.delta = bestDelta() * 0.999; dSl.set(s.delta); } W.redraw(); };

    const fSeg = segmented(FS.map((f) => ({ value: f.id, tex: f.tex })), s.f, (v) => { s.f = v; setF(); if (s.auto) s.delta = bestDelta() * 0.999; dSl.set(s.delta); redraw(); });
    const eSl = slider({ label: "$\\varepsilon$", min: 0.05, max: 3, step: 0.01, value: s.eps, fmt: (v) => v.toFixed(2), onInput: (v) => { s.eps = v; if (s.auto) { s.delta = bestDelta() * 0.999; dSl.set(s.delta); } redraw(); } });
    const dSl = slider({ label: "$\\delta$", min: 0.01, max: 2, step: 0.005, value: s.delta, fmt: (v) => v.toFixed(3), onInput: (v) => { s.delta = v; s.auto = false; autoT.set(false); redraw(); } });
    const autoT = toggle({ en: "auto δ (best)", bn: "অটো δ" }, s.auto, (v) => { s.auto = v; if (v) { s.delta = bestDelta() * 0.999; dSl.set(s.delta); } redraw(); });
    ui.controls.append(fSeg, eSl, dSl, h("div.row", autoT, button("fit view", () => { fit(); })));

    function redraw() { Z.redraw(); W.redraw(); }
    function update() {
      const bd = bestDelta(); const ok = fails === 0;
      const rows = [["f(z)", def.tex], ["z_0", tex(z0()), "--c-b"], ["L=\\lim_{z\\to z_0}f(z)", tex(L()), "--c-c"], ["\\varepsilon", s.eps.toFixed(2)], ["\\delta", s.delta.toFixed(3)],
        ["\\delta_{\\max}", def.a ? `\\varepsilon/${def.a} = ${bd.toFixed(3)}` : `\\sqrt{|z_0|^2+\\varepsilon}-|z_0| = ${bd.toFixed(3)}`]];
      const status = ok ? `<div class="verdict good">✓ δ works: every z in the deleted δ-disc maps inside the ε-disc.</div>` : `<div class="verdict bad">✗ ${fails} sample points escape. Shrink δ.</div>`;
      const extra = def.a
        ? `${texHTML(`|f(z)-L| = ${def.a === 1 ? "" : def.a}|z-z_0| < ${def.a === 1 ? "" : def.a}\\delta`)}, so choosing ${texHTML(`\\delta=\\varepsilon/${def.a}`)} gives ${texHTML("|f(z)-L|<\\varepsilon")}. The same δ works at every ${texHTML("z_0")} → <b>uniformly continuous</b>.`
        : `For ${texHTML("z^2")}, ${texHTML("\\delta_{\\max}")} depends on ${texHTML("z_0")}. Drag ${texHTML("z_0")} far from the origin: δ must shrink towards 0, so no single δ works everywhere → <b>not uniformly continuous</b> on ${texHTML("\\mathbb C")}.`;
      ui.info.replaceChildren(readout(rows), h("div", { html: status }), note(extra));
    }
    setF(true); if (s.auto) s.delta = bestDelta() * 0.999; dSl.set(s.delta);
    return { plane: Z, set(p) { Object.assign(s, p); if (p.f) fSeg.set(p.f); setF(!p.f); if (p.eps) eSl.set(p.eps); if (s.auto) s.delta = bestDelta() * 0.999; dSl.set(s.delta); autoT.set(s.auto); redraw(); }, destroy() { Z.destroy(); W.destroy(); } };
  },
};
