// Circles, discs and neighbourhoods: |z − z0| = r, N_δ(z0), deleted neighbourhoods, limit points, open/closed sets.
import { Plane } from "../plane.js";
import { C, tex, nice } from "../complex.js";
import { h, texHTML } from "../ui.js";
import { segmented, readout, note, shell, toggle, button } from "./kit.js";

const MODES = [
  { value: "circle", tex: "|z-z_0|=r" }, { value: "open", tex: "|z-z_0|<\\delta" }, { value: "deleted", tex: "0<|z-z_0|<\\delta" },
  { value: "closed", tex: "|z-z_0|\\le r" }, { value: "limitpt", label: { en: "limit point", bn: "limit point" } },
];

export default {
  id: "regions", icon: "target",
  title: { en: "Circles & Neighbourhoods", bn: "বৃত্ত ও নেইবারহুড" },
  blurb: { en: "Drag the centre and radius. Test points for membership in circles, open discs, deleted neighbourhoods; see why 0 is a limit point of {1/n}.", bn: "কেন্দ্র আর ব্যাসার্ধ টেনে দেখো। কোন বিন্দু বৃত্তে, open disc এ, deleted neighbourhood এ আছে — আর কেন 0 হলো {1/n} এর limit point।" },
  topics: ["argand", "neighbourhood", "modulus"],
  mount(host, preset = {}) {
    const s = Object.assign({ mode: "circle", z0: [2, -1], r: 4, p: [4.5, 1.5], span: 13, center: [2, -0.5] }, preset);
    const ui = shell(host, preset);
    const P = new Plane(ui.p1, { span: s.span, center: s.center, snap: 0.5 });
    const rh = () => [s.z0[0] + s.r * Math.cos(0.7), s.z0[1] + s.r * Math.sin(0.7)];
    const H0 = P.addHandle({ id: "z0", get: () => s.z0, set: (x, y) => (s.z0 = [x, y]), color: "b", label: "z₀" });
    const HR = P.addHandle({ id: "r", get: rh, set: (x, y) => (s.r = Math.max(0.05, +Math.hypot(x - s.z0[0], y - s.z0[1]).toFixed(2))), color: "d", r: 7, snap: 0 });
    const HP = P.addHandle({ id: "p", get: () => s.p, set: (x, y) => (s.p = [x, y]), color: "a", label: "z" });

    P.onDraw = (P) => {
      const [u, v] = s.z0; const lp = s.mode === "limitpt";
      H0.hidden = lp; HR.hidden = false; HP.hidden = lp;
      if (lp) {
        const d = s.r; const pts = Array.from({ length: 60 }, (_, k) => 1 / (k + 1));
        P.circle(0, 0, d, { fill: "fillB", fillAlpha: 0.35, stroke: "b", dash: true });
        pts.forEach((x) => P.point(x, 0, { color: Math.abs(x) < d ? "c" : "muted", r: 3 }));
        P.point(0, 0, { hollow: true, color: "b", r: 5, label: "0" });
        return;
      }
      const fill = s.mode === "circle" ? null : "fillB";
      P.circle(u, v, s.r, { fill, fillAlpha: 0.38, stroke: "b", width: 2.2, dash: s.mode === "open" || s.mode === "deleted" ? [7, 6] : null });
      if (s.mode === "deleted") P.point(u, v, { hollow: true, color: "b", r: 6 });
      P.line(u, v, ...rh(), { color: "d", width: 2 });
      P.label((u + rh()[0]) / 2, (v + rh()[1]) / 2, `${s.mode === "open" || s.mode === "deleted" ? "δ" : "r"} = ${s.r}`, { color: "d", offset: [6, -12], bold: true });
      const z = new C(...s.p); const d = z.sub(new C(u, v)).abs();
      P.line(u, v, z.re, z.im, { color: "a", dash: [3, 4], alpha: 0.8 });
    };

    const modeSeg = segmented(MODES.filter((m) => !s.modes || s.modes.includes(m.value)), s.mode, (m) => { s.mode = m; if (m === "limitpt") { s.r = 0.35; P.setView([0.4, 0], 2.2); } else if (s.r < 0.5) { s.r = 2; P.setView(s.center, s.span); } P.redraw(); update(); });
    ui.controls.append(modeSeg, h("div.row", button("z₀ = 2 − i, r = 4", () => { s.mode = "circle"; modeSeg.set("circle"); s.z0 = [2, -1]; s.r = 4; P.setView([2, -0.5], 13); update(); }), button("z₀ = 2 + 3i, δ = 2", () => { s.mode = "deleted"; modeSeg.set("deleted"); s.z0 = [2, 3]; s.r = 2; s.p = [3, 4]; P.setView([2, 2.5], 8); update(); })));

    function update() {
      const [u, v] = s.z0; const z0 = new C(u, v); const z = new C(...s.p); const d = z.sub(z0).abs(); const r = s.r;
      if (s.mode === "limitpt") {
        const n = Math.floor(1 / r) + 1;
        ui.info.replaceChildren(readout([["\\delta", nice(r)], ["n > 1/\\delta", `n = ${n}`], ["\\tfrac1n", `${nice(1 / n)} < \\delta`, "--c-c"]]),
          note(`However small you make ${texHTML("\\delta")} (drag the orange handle), the deleted disc around ${texHTML("0")} still catches points ${texHTML("1/n")} of ${texHTML("S")}. So ${texHTML("0")} is a <b>limit point</b> of ${texHTML("S=\\{1/n\\}")} even though ${texHTML("0\\notin S")}.`));
        return;
      }
      const inside = { circle: Math.abs(d - r) < 0.03, open: d < r, deleted: d > 1e-9 && d < r, closed: d <= r + 1e-9 }[s.mode];
      const sh = (n, c) => (Math.abs(c) < 1e-9 ? `${n}^2` : c > 0 ? `(${n}-${nice(c)})^2` : `(${n}+${nice(-c)})^2`);
      const cart = `${sh("x", u)}+${sh("y", v)}`;
      const rel = { circle: "=", open: "<", deleted: "<", closed: "\\le" }[s.mode];
      const lhs = s.mode === "deleted" ? `0<${cart}` : cart;
      ui.info.replaceChildren(
        readout([["z_0", tex(z0), "--c-b"], [s.mode === "circle" || s.mode === "closed" ? "r" : "\\delta", nice(r), "--c-d"], ["z", tex(z), "--c-a"], ["|z-z_0|", nice(d)],
          ["z\\in\\text{set?}", inside ? "\\color{green}\\text{yes}" : "\\text{no}"]]),
        note(`${texHTML(`${lhs} ${rel} ${nice(r * r)}`, true)}${s.mode === "deleted" ? "Centre removed (hollow dot) and boundary excluded (dashed)." : s.mode === "open" ? "Boundary excluded (dashed) → this is an <b>open</b> set: every point has a small disc around it inside the set." : s.mode === "closed" ? "Boundary included → <b>closed</b> set: it contains all its limit points." : "Every point on the circle is exactly distance r from z₀."}`),
      );
    }
    P.onChange = update; update();
    return { plane: P, set(p) { Object.assign(s, p); if (p.mode) modeSeg.set(p.mode); if (p.center || p.span) P.setView(p.center, p.span); P.redraw(); update(); }, destroy() { P.destroy(); } };
  },
};
