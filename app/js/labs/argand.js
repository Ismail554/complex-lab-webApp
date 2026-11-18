// Argand Playground: drag z1, z2 and watch +, −, ×, ÷, conjugate, inverse, distance, triangle inequality.
import { Plane } from "../plane.js";
import { C, tex, nice, texAngle } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, readout, note, shell, toggle } from "./kit.js";

const OPS = [
  { value: "add", tex: "z_1+z_2" }, { value: "sub", tex: "z_1-z_2" }, { value: "mul", tex: "z_1 z_2" }, { value: "div", tex: "z_1/z_2" },
  { value: "conj", tex: "\\bar z_1" }, { value: "inv", tex: "z_1^{-1}" }, { value: "dist", tex: "|z_1-z_2|" }, { value: "tri", tex: "|z_1+z_2|\\le" },
];

export default {
  id: "argand", icon: "target",
  title: { en: "Argand Playground", bn: "আর্গান্ড প্লেগ্রাউন্ড" },
  blurb: { en: "Drag two complex numbers and see addition, multiplication (rotation + scaling), division, conjugate, distance and the triangle inequality live.", bn: "দুটো complex number টেনে দেখো — যোগ, গুণ (ঘোরানো + বড়-ছোট), ভাগ, conjugate, দূরত্ব আর triangle inequality লাইভ।" },
  topics: ["arithmetic", "conjugate", "modulus", "argand", "construction"],
  mount(host, preset = {}) {
    const s = Object.assign({ op: "add", z1: [2, 1], z2: [1, 2], span: 9, center: [1.5, 1.2], showPolar: false, ops: null }, preset);
    const z1 = () => new C(s.z1[0], s.z1[1]); const z2 = () => new C(s.z2[0], s.z2[1]);
    const ui = shell(host, preset);
    const P = new Plane(ui.p1, { span: s.span, center: s.center, snap: 0.5 });
    const usesZ2 = () => !["conj", "inv"].includes(s.op);
    P.addHandle({ id: "z1", get: () => s.z1, set: (x, y) => (s.z1 = [x, y]), color: "a", label: "z₁" });
    const H2 = P.addHandle({ id: "z2", get: () => s.z2, set: (x, y) => (s.z2 = [x, y]), color: "b", label: "z₂" });

    P.onDraw = (P) => {
      const a = z1(), b = z2(); const O = [0, 0];
      H2.hidden = !usesZ2();
      if (s.showPolar || ["mul", "div", "inv"].includes(s.op)) {
        P.circle(0, 0, 1, { stroke: "muted", dash: [3, 4], width: 1 });
      }
      switch (s.op) {
        case "add": case "tri": {
          const r = a.add(b);
          P.polygon([[0, 0], [a.re, a.im], [r.re, r.im], [b.re, b.im]], { fill: "fillA", fillAlpha: 0.35, color: "muted", width: 1, dash: [4, 4] });
          P.vector(a.re, a.im, r.re, r.im, { color: "b", alpha: 0.45, dash: true }); P.vector(b.re, b.im, r.re, r.im, { color: "a", alpha: 0.45, dash: true });
          P.vector(0, 0, a.re, a.im, { color: "a" }); P.vector(0, 0, b.re, b.im, { color: "b" });
          P.vector(0, 0, r.re, r.im, { color: "c", width: 3 }); P.point(r.re, r.im, { color: "c", label: "z₁+z₂" });
          break;
        }
        case "sub": {
          const r = a.sub(b);
          P.vector(0, 0, a.re, a.im, { color: "a" }); P.vector(0, 0, b.re, b.im, { color: "b" });
          P.vector(b.re, b.im, a.re, a.im, { color: "c", dash: true, alpha: 0.7 });
          P.vector(0, 0, r.re, r.im, { color: "c", width: 3 }); P.point(r.re, r.im, { color: "c", label: "z₁−z₂" });
          P.polygon([[0, 0], [r.re, r.im], [a.re, a.im], [b.re, b.im]], { fill: "fillC", fillAlpha: 0.18, color: "muted", width: 1, dash: [3, 4] });
          break;
        }
        case "mul": case "div": {
          const r = s.op === "mul" ? a.mul(b) : a.div(b);
          const t1 = a.arg(), t2 = b.arg();
          P.arc(0, 0, 0.55, 0, t1, { color: "a", width: 2 }); P.arc(0, 0, 0.8, 0, t2, { color: "b", width: 2 });
          if (r.isFinite()) { P.arc(0, 0, 1.15, 0, r.arg(), { color: "c", width: 2.4 }); }
          P.vector(0, 0, a.re, a.im, { color: "a" }); P.vector(0, 0, b.re, b.im, { color: "b" });
          if (r.isFinite()) { P.vector(0, 0, r.re, r.im, { color: "c", width: 3 }); P.point(r.re, r.im, { color: "c", label: s.op === "mul" ? "z₁z₂" : "z₁/z₂" }); }
          break;
        }
        case "conj": {
          const r = a.conj(); const b0 = P.bounds;
          P.line(b0.x0, 0, b0.x1, 0, { color: "c", width: 2.5, alpha: 0.35 });
          P.line(a.re, a.im, r.re, r.im, { color: "muted", dash: true });
          P.vector(0, 0, a.re, a.im, { color: "a" }); P.vector(0, 0, r.re, r.im, { color: "c", width: 3 }); P.point(r.re, r.im, { color: "c", label: "z̄₁" });
          break;
        }
        case "inv": {
          const r = a.inv();
          P.vector(0, 0, a.re, a.im, { color: "a" });
          if (r.isFinite()) { P.vector(0, 0, r.re, r.im, { color: "c", width: 3 }); P.point(r.re, r.im, { color: "c", label: "1/z₁" }); const cj = a.conj(); P.line(0, 0, cj.re * 6, cj.im * 6, { color: "muted", dash: [2, 5], alpha: 0.6 }); }
          break;
        }
        case "dist": {
          P.line(a.re, a.im, b.re, a.im, { color: "muted", dash: true }); P.line(b.re, a.im, b.re, b.im, { color: "muted", dash: true });
          P.line(a.re, a.im, b.re, b.im, { color: "c", width: 3 });
          P.label((a.re + b.re) / 2, (a.im + b.im) / 2, `|z₁−z₂| = ${a.sub(b).abs().toFixed(3)}`, { color: "c", bold: true, offset: [10, 0] });
          break;
        }
      }
      if (s.showPolar) { P.label(a.re, a.im, `r=${a.abs().toFixed(2)}, θ=${(a.arg0() * 180 / Math.PI).toFixed(0)}°`, { offset: [12, 12], color: "a", size: 11 }); }
    };

    const opSeg = segmented(OPS.filter((o) => !s.ops || s.ops.includes(o.value)), s.op, (v) => { s.op = v; P.redraw(); update(); });
    ui.controls.append(opSeg, toggle({ en: "Polar labels", bn: "পোলার লেবেল" }, s.showPolar, (v) => { s.showPolar = v; P.redraw(); }));

    function update() {
      const a = z1(), b = z2(); let rows = [["z_1", tex(a), "--c-a"]]; if (usesZ2()) rows.push(["z_2", tex(b), "--c-b"]);
      let explain = "";
      const A = s.z1, B = s.z2;
      switch (s.op) {
        case "add": { const r = a.add(b); rows.push(["z_1+z_2", tex(r), "--c-c"]); explain = `$(${nice(A[0])}+${nice(B[0])}) + (${nice(A[1])}+${nice(B[1])})i$ — add real parts and imaginary parts separately. Geometrically: the diagonal of the parallelogram.`; break; }
        case "sub": { const r = a.sub(b); rows.push(["z_1-z_2", tex(r), "--c-c"]); explain = "Subtracting = adding $-z_2$. The arrow from $z_2$ to $z_1$ is exactly $z_1-z_2$ moved to the origin."; break; }
        case "mul": { const r = a.mul(b); rows.push(["z_1z_2", tex(r), "--c-c"], ["|z_1||z_2|", `${nice(a.abs())}\\cdot${nice(b.abs())} = ${nice(r.abs())}`], ["\\arg z_1+\\arg z_2", `${(a.arg0() * 180 / Math.PI).toFixed(1)}^\\circ + ${(b.arg0() * 180 / Math.PI).toFixed(1)}^\\circ`]);
          explain = "**Multiply = scale and rotate.** Lengths multiply, angles add: $(ac-bd)+(ad+bc)i$."; break; }
        case "div": { const r = a.div(b); rows.push(["z_1/z_2", r.isFinite() ? tex(r) : "\\text{undefined}", "--c-c"], ["|z_1|/|z_2|", r.isFinite() ? nice(r.abs()) : "-"]);
          explain = b.abs() === 0 ? "Division by $0$ is undefined." : `Multiply top and bottom by $\\bar z_2$: $\\dfrac{z_1\\bar z_2}{|z_2|^2}$. Lengths divide, angles subtract.`; break; }
        case "conj": rows.push(["\\bar z_1", tex(a.conj()), "--c-c"], ["z_1+\\bar z_1 = 2\\,\\mathrm{Re}(z_1)", tex(a.add(a.conj()))], ["z_1\\bar z_1=|z_1|^2", nice(a.abs2())]);
          explain = "Conjugate = **mirror image in the real axis**. $z$ is real exactly when it sits on the mirror, i.e. $z=\\bar z$."; break;
        case "inv": rows.push(["z_1^{-1}", a.abs() ? tex(a.inv()) : "\\text{undefined}", "--c-c"], ["|z_1^{-1}|", a.abs() ? nice(1 / a.abs()) : "-"]);
          explain = "$z^{-1} = \\dfrac{\\bar z}{|z|^2}$: same direction as $\\bar z$, length $1/|z|$. Points outside the unit circle go inside and vice versa."; break;
        case "dist": { const d = a.sub(b); rows.push(["|z_1-z_2|", `\\sqrt{(${nice(d.re)})^2+(${nice(d.im)})^2}=${nice(d.abs())}`, "--c-c"]); explain = "Distance between two points = modulus of their difference."; break; }
        case "tri": { const l = a.add(b).abs(), r = a.abs() + b.abs(); rows.push(["|z_1+z_2|", nice(l), "--c-c"], ["|z_1|+|z_2|", nice(r)]);
          explain = `${barCompare(l, r)}<br>Equality only when $z_1, z_2$ point the same way (one side of a triangle can never beat the other two).`; break; }
      }
      ui.info.replaceChildren(readout(rows), note(richish(explain)));
    }
    P.onChange = update; update();
    return {
      plane: P,
      set(p) { Object.assign(s, p); if (p.op) opSeg.set(p.op); if (p.span || p.center) P.setView(p.center, p.span); P.redraw(); update(); },
      destroy() { P.destroy(); },
    };
  },
};

function barCompare(l, r) {
  const m = Math.max(l, r, 0.001);
  return `<div class="bars"><div><span>|z₁+z₂|</span><b style="width:${(l / m) * 100}%;background:var(--c-c)"></b></div><div><span>|z₁|+|z₂|</span><b style="width:${(r / m) * 100}%;background:var(--c-a)"></b></div></div>`;
}
// tiny inline renderer that keeps the HTML above intact
function richish(s) { return s.replace(/\$([^$]+)\$/g, (m, t) => texHTML(t)).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>"); }
