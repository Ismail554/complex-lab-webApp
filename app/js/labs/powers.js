// Powers lab: i^n cycles around the unit circle; z^n spirals (De Moivre preview).
import { Plane, animate } from "../plane.js";
import { C, tex, nice } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, slider, readout, note, shell, button } from "./kit.js";

export default {
  id: "powers", icon: "repeat",
  title: { en: "Powers & Rotation", bn: "ঘাত ও ঘূর্ণন" },
  blurb: { en: "Multiplying by i is a quarter-turn. Watch iⁿ cycle every 4 steps, then let any z spiral as zⁿ.", bn: "i দিয়ে গুণ মানে ৯০° ঘোরানো। দেখো iⁿ প্রতি ৪ ধাপে ঘুরে আসে, তারপর যেকোনো z কে zⁿ হিসেবে প্যাঁচাতে দাও।" },
  topics: ["powers-i", "polar", "imag-unit"],
  mount(host, preset = {}) {
    const s = Object.assign({ mode: "i", n: 3, z: [1.1, 0.45], big: 105 }, preset);
    const ui = shell(host, preset);
    const P = new Plane(ui.p1, { span: s.mode === "i" ? 3.2 : 6, center: [0, 0], snap: 0.05 });
    let anim = null, shown = s.n; // shown is animated (fractional) n
    const zh = P.addHandle({ id: "z", get: () => s.z, set: (x, y) => (s.z = [x, y]), color: "a", label: "z" });

    P.onDraw = (P) => {
      zh.hidden = s.mode === "i";
      P.circle(0, 0, 1, { stroke: "muted", dash: [4, 4] });
      if (s.mode === "i") {
        const pts = [[1, 0, "1"], [0, 1, "i"], [-1, 0, "−1"], [0, -1, "−i"]];
        pts.forEach(([x, y, l], k) => P.point(x, y, { color: k === ((Math.round(shown) % 4) + 4) % 4 ? "c" : "paper", r: 7, label: l, offset: [x >= 0 ? 10 : -26, y > 0 ? -14 : 14] }));
        const t = shown * Math.PI / 2; P.arc(0, 0, 0.35, 0, t, { color: "b", width: 2 });
        P.vector(0, 0, Math.cos(t), Math.sin(t), { color: "c", width: 3 });
        P.label(Math.cos(t), Math.sin(t), `i^${shown.toFixed(shown % 1 ? 1 : 0)}`, { offset: [12, 18], color: "c", bold: true });
      } else {
        const z = new C(s.z[0], s.z[1]); const nmax = Math.max(1, Math.ceil(shown));
        let w = new C(1, 0); const pts = [[1, 0]];
        // smooth spiral: polar interpolation
        const r = z.abs(), th = z.arg(); const curve = [];
        for (let k = 0; k <= shown * 40; k++) { const t = k / 40; curve.push([Math.pow(r, t) * Math.cos(th * t), Math.pow(r, t) * Math.sin(th * t)]); }
        P.path(curve, { color: "b", width: 1.6, alpha: 0.7 });
        for (let k = 1; k <= nmax && k <= shown + 1e-9; k++) { w = w.mul(z); pts.push([w.re, w.im]); }
        pts.forEach(([x, y], k) => { P.line(0, 0, x, y, { color: "muted", alpha: 0.35, width: 1 }); P.point(x, y, { color: k === pts.length - 1 ? "c" : "fillC", r: 4.5, label: k <= 6 ? (k === 0 ? "1" : k === 1 ? "" : `z^${k}`) : null }); });
      }
    };

    const controls = [];
    const modeSeg = segmented([{ value: "i", tex: "i^n" }, { value: "z", tex: "z^n" }], s.mode, (v) => { s.mode = v; P.setView([0, 0], v === "i" ? 3.2 : 6); update(); });
    const nSl = slider({ label: "$n$", min: 0, max: 12, step: 1, value: s.n, onInput: (v) => { s.n = v; go(v); } });
    const play = button("▶ animate", () => { s.n = 0; nSl.set(0); shown = 0; go(s.mode === "i" ? 8 : 6, 0.9); });
    const bigInput = h("input.inp", { type: "number", value: s.big, min: 0, max: 10000, style: { width: "6.5em" } });
    bigInput.addEventListener("input", () => { s.big = Math.max(0, Math.floor(+bigInput.value || 0)); update(); });
    controls.push(modeSeg, nSl, h("div.row", play));
    ui.controls.append(...controls, h("label.inline", { html: `Big exponent ${texHTML("i^{n}")}, n = ` }, bigInput));

    function go(target, speed = 3) {
      anim && anim.stop(); const from = shown;
      anim = animate((t) => { const p = Math.min(1, (t * speed) / Math.max(1, Math.abs(target - from))); shown = from + (target - from) * ease(p); P.redraw(); if (p >= 1) { shown = target; s.n = target; nSl.set(target); update(); return false; } });
    }
    function update() {
      const n = s.n; const r = ((n % 4) + 4) % 4; const vals = ["1", "i", "-1", "-i"];
      const b = s.big, q = Math.floor(b / 4), rb = b % 4;
      const rows = s.mode === "i"
        ? [[`i^{${n}}`, vals[r], "--c-c"], [`${n} = 4\\cdot${Math.floor(n / 4)} + ${r}`, `i^{${n}} = i^{${r}}`], [`i^{${b}}`, `i^{4\\cdot${q}+${rb}} = ${vals[rb]}`]]
        : (() => { const z = new C(s.z[0], s.z[1]); const w = z.pow(n); return [["z", tex(z), "--c-a"], [`z^{${n}}`, tex(w), "--c-c"], ["|z^n| = |z|^n", `${nice(z.abs())}^{${n}} \\approx ${w.abs().toFixed(3)}`], ["\\arg z^n = n\\arg z", `${n}\\times ${(z.arg0() * 180 / Math.PI).toFixed(1)}^\\circ`]]; })();
      ui.info.replaceChildren(readout(rows), note(s.mode === "i"
        ? `Each multiplication by ${texHTML("i")} rotates by ${texHTML("90^\\circ")}. Four quarter-turns = full turn, so ${texHTML("i^4=1")} and the pattern ${texHTML("1, i, -1, -i")} repeats. <b>Trick:</b> divide the exponent by 4, keep the remainder.`
        : `${texHTML("|z|>1")} spirals outward, ${texHTML("|z|<1")} spirals inward, ${texHTML("|z|=1")} stays on the circle. Lengths multiply, angles add.`));
    }
    P.onChange = update; update();
    return { plane: P, set(p) { Object.assign(s, p); if (p.mode) { modeSeg.set(p.mode); P.setView([0, 0], p.mode === "i" ? 3.2 : 6); } if (p.n != null) { nSl.set(p.n); shown = p.n; } if (p.big != null) bigInput.value = p.big; update(); P.redraw(); }, destroy() { anim && anim.stop(); P.destroy(); } };
  },
};
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
