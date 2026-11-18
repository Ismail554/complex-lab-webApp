// Polar form lab: modulus, principal argument in [0, 2π), quadrant reasoning, all arguments θ + 2kπ.
import { Plane } from "../plane.js";
import { C, tex, nice, texAngle } from "../complex.js";
import { texHTML } from "../ui.js";
import { readout, note, shell, toggle } from "./kit.js";

export default {
  id: "polar", icon: "globe",
  title: { en: "Polar Form Explorer", bn: "পোলার ফর্ম এক্সপ্লোরার" },
  blurb: { en: "Drag z and read off r = |z| and the principal argument θ ∈ [0, 2π), with the quadrant reasoning written out for you.", bn: "z টেনে r = |z| আর principal argument θ ∈ [0, 2π) বের করো — কোন quadrant, reference angle কত, সব লিখে দেখাবে।" },
  topics: ["polar", "modulus", "argand"],
  mount(host, preset = {}) {
    const s = Object.assign({ z: [-1, Math.sqrt(3)], ghosts: false, span: 6 }, preset);
    const ui = shell(host, preset);
    const P = new Plane(ui.p1, { span: s.span, center: [0, 0.4], snap: 0.25 });
    P.addHandle({ id: "z", get: () => s.z, set: (x, y) => (s.z = [x, y]), color: "a", label: "z" });
    // snap to "nice" exam points like (−1, √3)
    const NICE = [Math.sqrt(3), -Math.sqrt(3), Math.sqrt(3) / 2, -Math.sqrt(3) / 2, Math.sqrt(2), -Math.sqrt(2)];
    P.handles[0].set = (x, y) => { const sn = (v) => { for (const q of NICE) if (Math.abs(v - q) < 0.09) return q; return v; }; s.z = [sn(x), sn(y)]; };

    P.onDraw = (P) => {
      const z = new C(s.z[0], s.z[1]); const r = z.abs(), t = z.arg0();
      P.circle(0, 0, r, { stroke: "muted", dash: [3, 5], width: 1 });
      P.line(z.re, 0, z.re, z.im, { color: "b", dash: true }); P.line(0, 0, z.re, 0, { color: "b", dash: true });
      P.label(z.re / 2, 0, `x = ${+z.re.toFixed(3)}`, { offset: [0, z.im >= 0 ? 14 : -14], color: "b", align: "center", size: 11 });
      P.label(z.re, z.im / 2, `y = ${+z.im.toFixed(3)}`, { offset: [8, 0], color: "b", size: 11 });
      if (r > 0) {
        P.arc(0, 0, Math.min(0.9, r * 0.45), 0, t, { color: "c", width: 2.5, fill: "fillC", fillAlpha: 0.3 });
        if (s.ghosts) for (const k of [-1, 1]) P.arc(0, 0, Math.min(1.25, r * 0.6) + 0.12 * (k + 1), 0, t + 2 * Math.PI * k, { color: "muted", width: 1, dash: true });
        // reference angle wedge
        const ref = Math.atan2(Math.abs(z.im), Math.abs(z.re));
        if (t > Math.PI / 2 + 1e-9) { const a0 = z.re < 0 ? Math.PI : 2 * Math.PI; const dir = (z.re < 0) === (z.im >= 0) ? -1 : 1; P.arc(0, 0, Math.min(0.55, r * 0.3), a0, a0 + dir * ref, { color: "d", width: 2.5 }); }
      }
      P.vector(0, 0, z.re, z.im, { color: "a", width: 3 });
      P.label(z.re / 2, z.im / 2, `r = ${r.toFixed(3)}`, { offset: [-10, -14], color: "a", align: "right", bold: true });
    };

    function update() {
      const z = new C(s.z[0], s.z[1]); const r = z.abs(), t = z.arg0();
      const ref = Math.atan2(Math.abs(z.im), Math.abs(z.re));
      const q = z.re > 0 && z.im >= 0 ? 1 : z.re <= 0 && z.im > 0 ? 2 : z.re < 0 && z.im <= 0 ? 3 : 4;
      const rule = { 1: "\\theta = \\alpha", 2: "\\theta = \\pi - \\alpha", 3: "\\theta = \\pi + \\alpha", 4: "\\theta = 2\\pi - \\alpha" }[q];
      const T = texAngle(t), R = nice(r);
      if (r === 0) { ui.info.replaceChildren(note("The argument of $0$ is <b>undefined</b> — there is no direction.".replace(/\$([^$]+)\$/g, (m, x) => texHTML(x)))); return; }
      ui.info.replaceChildren(
        readout([["z", tex(z), "--c-a"], ["r=|z|=\\sqrt{x^2+y^2}", R], ["\\text{Quadrant}", ["", "I", "II", "III", "IV"][q]], ["\\alpha=\\tan^{-1}\\left|\\tfrac{y}{x}\\right|", texAngle(ref)], [rule, T, "--c-c"]]),
        note(`${texHTML(`z = ${R}\\left(\\cos ${T} + i\\sin ${T}\\right)`, true)}All arguments: ${texHTML(`\\theta + 2k\\pi = ${T} + 2k\\pi,\\ k\\in\\mathbb{Z}`)}. This course takes the <b>principal argument</b> in ${texHTML("[0,2\\pi)")}.`),
      );
    }
    ui.controls.append(toggle({ en: "Show other arguments θ ± 2π", bn: "অন্য argument গুলো দেখাও" }, s.ghosts, (v) => { s.ghosts = v; P.redraw(); }));
    P.onChange = update; update();
    return { plane: P, set(p) { Object.assign(s, p); P.redraw(); update(); }, destroy() { P.destroy(); } };
  },
};
