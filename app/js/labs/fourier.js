// Fourier preview: partial sums of Fourier series and their complex-exponential epicycles.
import { Plane, animate } from "../plane.js";
import { h, texHTML } from "../ui.js";
import { segmented, slider, note, shell, toggle } from "./kit.js";

const WAVES = {
  square: { tex: "\\text{square}", f: (x) => (wrap(x) >= 0 ? 1 : -1), b: (n) => (n % 2 ? 4 / (Math.PI * n) : 0), a: () => 0, series: "\\frac{4}{\\pi}\\sum_{n\\ \\text{odd}} \\frac{\\sin nx}{n}" },
  saw: { tex: "\\text{sawtooth}", f: (x) => wrap(x) / Math.PI, b: (n) => (2 * (n % 2 ? 1 : -1)) / (Math.PI * n), a: () => 0, series: "\\frac{2}{\\pi}\\sum_{n\\ge1} \\frac{(-1)^{n+1}\\sin nx}{n}" },
  triangle: { tex: "\\text{triangle}", f: (x) => 1 - (2 * Math.abs(wrap(x))) / Math.PI, a: (n) => (n % 2 ? 8 / (Math.PI * Math.PI * n * n) : 0), b: () => 0, series: "\\frac{8}{\\pi^2}\\sum_{n\\ \\text{odd}} \\frac{\\cos nx}{n^2}" },
};
function wrap(x) { return ((((x + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; }

export default {
  id: "fourier", icon: "spark", preview: true,
  title: { en: "Fourier Series Preview", bn: "ফুরিয়ার সিরিজ প্রিভিউ" },
  blurb: { en: "Coming up in the course: build a square wave from sines, and see each term as a rotating complex number cₙe^{inx}. Upload the Fourier notes and this lab links up automatically.", bn: "কোর্সে সামনে আসছে: sine যোগ করে square wave বানাও, আর প্রতিটি পদকে ঘুরন্ত complex number cₙe^{inx} হিসেবে দেখো। Fourier নোট আপলোড করলে এই ল্যাব নিজে থেকেই যুক্ত হবে।" },
  topics: ["fourier"],
  mount(host, preset = {}) {
    const s = Object.assign({ wave: "square", N: 5, epi: true, play: true }, preset);
    const ui = shell(host, preset);
    const P = new Plane(ui.p1, { span: 5, center: [1.25, 0], pan: false, zoom: false, snap: 0, xLabel: "x", yLabel: "" });
    let t = 0, anim = null, trail = [];
    const S = (x) => { const w = WAVES[s.wave]; let v = 0; for (let n = 1; n <= s.N; n++) v += w.a(n) * Math.cos(n * x) + w.b(n) * Math.sin(n * x); return v; };
    P.onDraw = (P) => {
      const w = WAVES[s.wave]; const x0 = s.epi ? 0.6 : -Math.PI; const xs = (x) => x0 + (x + Math.PI) * (s.epi ? 0.55 : 1);
      // target and partial sum over one period
      const pts = [], ps = [];
      for (let k = 0; k <= 400; k++) { const x = -Math.PI + (2 * Math.PI * k) / 400; pts.push([xs(x), w.f(x)]); ps.push([xs(x), S(x)]); }
      P.path(pts, { color: "muted", dash: [4, 4], width: 1.4 }); P.path(ps, { color: "c", width: 2.6 });
      if (s.epi) {
        // epicycles: sum of rotating phasors, project imaginary part
        let cx = -1.15, cy = 0; const x = wrap(t);
        for (let n = 1; n <= s.N; n++) {
          const amp = Math.hypot(w.a(n), w.b(n)); if (amp < 1e-9) continue;
          const ph = n * x + (w.b(n) ? 0 : Math.PI / 2) + (w.b(n) < 0 ? Math.PI : 0);
          P.circle(cx, cy, amp, { stroke: "muted", width: 1, alpha: 0.6 });
          const nx = cx + amp * Math.cos(ph), ny = cy + amp * Math.sin(ph);
          P.line(cx, cy, nx, ny, { color: "a", width: 1.8 }); cx = nx; cy = ny;
        }
        P.point(cx, cy, { color: "c", r: 4 });
        const X = xs(x); P.line(cx, cy, X, cy, { color: "c", dash: [3, 3], width: 1 }); P.point(X, S(x), { color: "c", r: 4 });
      }
    };
    const loop = () => { anim && anim.stop(); anim = animate((tt, dt) => { if (!s.play) return; t += dt * 1.2; P.redraw(); }); };
    ui.controls.append(
      segmented(Object.entries(WAVES).map(([k, w]) => ({ value: k, tex: w.tex })), s.wave, (v) => { s.wave = v; P.redraw(); info(); }),
      slider({ label: "$N$ terms", min: 1, max: 40, step: 1, value: s.N, onInput: (v) => { s.N = v; P.redraw(); info(); } }),
      h("div.row", toggle({ en: "epicycles", bn: "এপিসাইকেল" }, s.epi, (v) => { s.epi = v; P.redraw(); }), toggle({ en: "animate", bn: "অ্যানিমেট" }, s.play, (v) => { s.play = v; })),
    );
    function info() {
      const w = WAVES[s.wave];
      ui.info.replaceChildren(h("div.mathblock", { html: texHTML(`f(x)\\approx S_N(x)=${w.series}`, true) }),
        note(`Each term is the shadow of a spinning complex number ${texHTML("c_n e^{inx}")} — a point moving on a circle, exactly the polar form ${texHTML("r(\\cos\\theta+i\\sin\\theta)")} from Set 01. Near the jump the overshoot (~9%, Gibbs phenomenon) never disappears, it just gets narrower.`));
    }
    info(); loop();
    return { plane: P, set(p) { Object.assign(s, p); P.redraw(); info(); }, destroy() { anim && anim.stop(); P.destroy(); } };
  },
};
