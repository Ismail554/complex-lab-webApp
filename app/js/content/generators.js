// Procedural problem generators — unlimited fresh practice, auto-checked, with step-by-step solutions.
import { C, tex, nice, texAngle } from "../complex.js";

const ri = (a, b, nz = false) => { let v; do v = a + Math.floor(Math.random() * (b - a + 1)); while (nz && v === 0); return v; };
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const z = (a, b) => new C(a, b);
const P = (w) => `(${tex(w)})`;
const ans = (w) => `${w.re}+(${w.im})i`;
const fr = (p, q) => `(${p})/(${q})`;

export const GENERATORS = [
  { id: "g-add", topic: "arithmetic", name: "Add / subtract", make() {
    const a = z(ri(-9, 9), ri(-9, 9, true)), b = z(ri(-9, 9), ri(-9, 9, true)); const sub = Math.random() < 0.5; const r = sub ? a.sub(b) : a.add(b);
    return { q: `Compute $${P(a)} ${sub ? "-" : "+"} ${P(b)}$.`, fields: [{ label: "result", ans: ans(r) }], solution: [`${sub ? "Subtract" : "Add"} real parts: $${a.re} ${sub ? "-" : "+"} (${b.re}) = ${r.re}$.`, `${sub ? "Subtract" : "Add"} imaginary parts: $${a.im} ${sub ? "-" : "+"} (${b.im}) = ${r.im}$.`, `Answer: $${tex(r)}$.`] };
  } },
  { id: "g-mul", topic: "arithmetic", name: "Multiply", make() {
    const a = z(ri(-6, 6, true), ri(-6, 6, true)), b = z(ri(-6, 6, true), ri(-6, 6, true)); const r = a.mul(b);
    return { q: `Multiply $${P(a)}${P(b)}$.`, fields: [{ label: "product", ans: ans(r) }], solution: [`$(ac-bd)+(ad+bc)i$ with $a=${a.re}, b=${a.im}, c=${b.re}, d=${b.im}$.`, `Real: $${a.re}\\cdot${b.re}-(${a.im})(${b.im})=${r.re}$; Imag: $${a.re}\\cdot${b.im}+(${a.im})(${b.re})=${r.im}$.`, `Answer: $${tex(r)}$.`] };
  } },
  { id: "g-div", topic: "arithmetic", name: "Divide", make() {
    const a = z(ri(-6, 6), ri(-6, 6, true)), b = z(ri(-4, 4, true), ri(-4, 4, true)); const n = a.mul(b.conj()), d = b.abs2(); const r = a.div(b);
    return { q: `Evaluate $\\dfrac{${tex(a)}}{${tex(b)}}$.`, fields: [{ label: "quotient", ans: `${fr(n.re, d)}+${fr(n.im, d)}i` }], solution: [`Multiply top and bottom by $\\overline{${tex(b)}}=${tex(b.conj())}$.`, `Numerator: $${tex(n)}$, denominator: $${b.re}^2+${b.im < 0 ? `(${b.im})` : b.im}^2=${d}$.`, `Answer: $${tex(r)}$.`] };
  } },
  { id: "g-inv", topic: "arithmetic", name: "Inverse", make() {
    const a = z(ri(-6, 6, true), ri(-6, 6, true)); const d = a.abs2();
    return { q: `Find the multiplicative inverse of $z=${tex(a)}$.`, fields: [{ label: "z⁻¹", ans: `${fr(a.re, d)}+${fr(-a.im, d)}i` }], solution: [`$z^{-1}=\\dfrac{\\bar z}{|z|^2}=\\dfrac{${tex(a.conj())}}{${d}}$.`, `Answer: $${tex(a.inv())}$.`] };
  } },
  { id: "g-powi", topic: "powers-i", name: "Powers of i", make() {
    const ns = [ri(10, 140), ri(10, 140), ri(10, 140)]; const sg = [1, pick([1, -1]), pick([1, -1])]; const V = [z(1, 0), z(0, 1), z(-1, 0), z(0, -1)];
    let r = z(0, 0); ns.forEach((n, k) => (r = r.add(V[n % 4].scale(sg[k]))));
    const expr = ns.map((n, k) => `${k === 0 ? "" : sg[k] > 0 ? " + " : " - "}i^{${n}}`).join("");
    return { q: `Evaluate $${expr}$.`, fields: [{ label: "value", ans: ans(r) }], solution: [...ns.map((n) => `$${n}=4\\cdot${Math.floor(n / 4)}+${n % 4}\\Rightarrow i^{${n}}=${["1", "i", "-1", "-i"][n % 4]}$`), `Total: $${tex(r)}$.`] };
  } },
  { id: "g-conj", topic: "conjugate", name: "Conjugate identities", make() {
    const a = z(ri(-9, 9, true), ri(-9, 9, true));
    return { q: `For $z=${tex(a)}$ find $\\bar z$, $z+\\bar z$ and $z\\bar z$.`, fields: [{ label: "z̄", ans: ans(a.conj()) }, { label: "z + z̄", ans: `${2 * a.re}` }, { label: "z z̄", ans: `${a.abs2()}` }], solution: [`$\\bar z=${tex(a.conj())}$.`, `$z+\\bar z=2\\,\\mathrm{Re}z=${2 * a.re}$.`, `$z\\bar z=${a.re}^2+${a.im < 0 ? `(${a.im})` : a.im}^2=${a.abs2()}$.`] };
  } },
  { id: "g-mod", topic: "modulus", name: "Modulus", make() {
    const t = pick([[3, 4], [5, 12], [8, 15], [6, 8], [7, 24], [1, 1], [2, 3], [1, 2]]); const a = z(t[0] * pick([1, -1]), t[1] * pick([1, -1]));
    return { q: `Find $|${tex(a)}|$.`, fields: [{ label: "|z|", ans: `sqrt(${a.abs2()})` }], solution: [`$\\sqrt{(${a.re})^2+(${a.im})^2}=\\sqrt{${a.abs2()}}=${nice(a.abs())}$.`] };
  } },
  { id: "g-dist", topic: "argand", name: "Distance", make() {
    const a = z(ri(-5, 5), ri(-5, 5)), b = z(ri(-5, 5), ri(-5, 5)); const d = a.sub(b);
    if (d.abs() === 0) return this.make();
    return { q: `Find the distance between $z_1=${tex(a)}$ and $z_2=${tex(b)}$.`, fields: [{ label: "|z₁ − z₂|", ans: `sqrt(${d.abs2()})` }], solution: [`$z_1-z_2=${tex(d)}$.`, `$|z_1-z_2|=\\sqrt{${d.abs2()}}=${nice(d.abs())}$.`] };
  } },
  { id: "g-circle", topic: "argand", name: "Circle equation", make() {
    const u = ri(-5, 5), v = ri(-5, 5, true), r = ri(1, 6);
    return { q: `Write the circle with centre $${tex(z(u, v))}$ and radius $${r}$ as $(x-u)^2+(y-v)^2=r^2$.`, fields: [{ label: "u", ans: `${u}` }, { label: "v", ans: `${v}` }, { label: "r²", ans: `${r * r}` }], solution: [`$|z-(${tex(z(u, v))})|=${r}$ with $z=x+yi$.`, `$(x-(${u}))^2+(y-(${v}))^2=${r * r}$.`] };
  } },
  { id: "g-polar", topic: "polar", name: "Polar form", make() {
    const R = pick([1, 2, 2, 3, 4]); const angs = [1, 2, 3, 4, 5, 7, 8, 10, 11].map((k) => (k * Math.PI) / 6).concat([1, 3, 5, 7].map((k) => (k * Math.PI) / 4), [Math.PI / 2, Math.PI, 1.5 * Math.PI]);
    const t = pick(angs); const w = C.polar(R, t); const cl = (x) => (Math.abs(x) < 1e-9 ? 0 : x);
    const q = cl(w.re) > 0 && cl(w.im) >= 0 ? "I" : cl(w.re) <= 0 && cl(w.im) > 0 ? "II" : cl(w.re) < 0 && cl(w.im) <= 0 ? "III" : "IV";
    return { q: `Express $z=${tex(w)}$ in polar form: give $r$ and the principal argument $\\theta\\in[0,2\\pi)$.`, fields: [{ label: "r", ans: `${R}` }, { label: "θ", ans: texAngle(t).replace(/\\frac\{(.*?)\}\{(.*?)\}/, "($1)/($2)").replace(/\\pi/g, "pi") }], solution: [`$r=\\sqrt{x^2+y^2}=${R}$.`, `Quadrant ${q}, so $\\theta=${texAngle(t)}$.`, `$z=${R}\\left(\\cos ${texAngle(t)}+i\\sin ${texAngle(t)}\\right)$.`] };
  } },
  { id: "g-equal", topic: "construction", name: "Equality", make() {
    const p = ri(2, 5), q = ri(-6, 6), x = ri(-4, 6), r = ri(2, 4), s = ri(-6, 6), y = ri(-4, 6);
    return { q: `If $(${p}x ${q < 0 ? "-" : "+"} ${Math.abs(q)}) + (${r}y ${s < 0 ? "-" : "+"} ${Math.abs(s)})i = ${tex(z(p * x + q, r * y + s))}$, find $x$ and $y$.`, fields: [{ label: "x", ans: `${x}` }, { label: "y", ans: `${y}` }], solution: [`Real parts: $${p}x${q < 0 ? "" : "+"}${q}=${p * x + q}\\Rightarrow x=${x}$.`, `Imaginary parts: $${r}y${s < 0 ? "" : "+"}${s}=${r * y + s}\\Rightarrow y=${y}$.`] };
  } },
  { id: "g-limpoly", topic: "limits", name: "Limit of a polynomial", make() {
    const z0 = z(ri(-3, 3), ri(-3, 3, true)); const a = ri(-4, 4), b = ri(-5, 5); const r = z0.mul(z0).add(z0.scale(a)).add(b);
    return { q: `Evaluate $\\displaystyle\\lim_{z\\to ${tex(z0)}}\\left(z^2 ${a < 0 ? "-" : "+"} ${Math.abs(a)}z ${b < 0 ? "-" : "+"} ${Math.abs(b)}\\right)$.`, fields: [{ label: "limit", ans: ans(r) }], solution: ["Polynomials are continuous: substitute directly.", `$(${tex(z0)})^2=${tex(z0.mul(z0))}$.`, `Result: $${tex(r)}$.`] };
  } },
  { id: "g-lim00", topic: "limits", name: "0/0 limit by factoring", make() {
    const c = z(ri(-3, 3), ri(-3, 3, true));
    return { q: `Evaluate $\\displaystyle\\lim_{z\\to ${tex(c)}}\\frac{z^2-(${tex(c.mul(c))})}{z-(${tex(c)})}$.`, fields: [{ label: "limit", ans: ans(c.scale(2)) }], solution: [`Difference of squares: $z^2-c^2=(z-c)(z+c)$ with $c=${tex(c)}$.`, `Cancel: limit $=2c=${tex(c.scale(2))}$.`] };
  } },
  { id: "g-liminf", topic: "limits", name: "Limit at infinity", make() {
    const a = ri(1, 7), b = ri(-5, 5), c = ri(1, 5), d = ri(-5, 5, true);
    return { q: `Evaluate $\\displaystyle\\lim_{z\\to\\infty}\\frac{${a}z^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}}{${c}z^2 ${d < 0 ? "-" : "+"} ${Math.abs(d)}}$.`, fields: [{ label: "limit", ans: `${a}/${c}` }], solution: [`Divide numerator and denominator by $z^2$; the $1/z^2$ terms vanish.`, `Limit $=${nice(a / c)}$.`] };
  } },
  { id: "g-eps", topic: "limits", name: "Choose δ for ε", make() {
    const k = ri(2, 9), z0 = z(ri(-2, 3), ri(-2, 3)), b = z(ri(-4, 4), ri(-4, 4)); const L = z0.scale(k).add(b);
    return { q: `In the ε–δ proof of $\\displaystyle\\lim_{z\\to ${tex(z0)}}(${k}z ${b.re || b.im ? "+ (" + tex(b) + ")" : ""}) = ${tex(L)}$, which $\\delta$ works? (type e for ε)`, fields: [{ label: "δ", ans: `e/${k}`, vars: ["e"] }], solution: [`$|f(z)-L|=${k}|z-z_0|$.`, `Choose $\\delta=\\varepsilon/${k}$: then $|f(z)-L|<${k}\\delta=\\varepsilon$.`] };
  } },
  { id: "g-uv", topic: "uv", name: "u + iv of a polynomial", make() {
    const a = ri(-3, 3, true), b = ri(-3, 3);
    return { q: `Express $f(z)=${a === 1 ? "" : a === -1 ? "-" : a}z^2 ${b < 0 ? "-" : "+"} ${Math.abs(b)}z$ as $u+iv$. Give $u(x,y)$ and $v(x,y)$.`, fields: [{ label: "u(x,y)", ans: `${a}(x^2-y^2)+${b}x`, vars: ["x", "y"] }, { label: "v(x,y)", ans: `${2 * a}xy+${b}y`, vars: ["x", "y"] }], solution: ["$z^2=(x^2-y^2)+2xyi$, $z=x+iy$.", `$u=${a}(x^2-y^2)${b < 0 ? "" : "+"}${b}x$, $v=${2 * a}xy${b < 0 ? "" : "+"}${b}y$.`] };
  } },
  { id: "g-deriv", topic: "derivative", name: "Derivative at a point", make() {
    const a = ri(1, 3), b = ri(-5, 5), c = z(ri(-3, 3), ri(-3, 3)); const z0 = z(ri(-3, 3), ri(-3, 3, true));
    const d = z0.mul(z0).scale(3 * a).add(b);
    return { q: `Find $f'(z_0)$ for $f(z)=${a === 1 ? "" : a}z^3 ${b < 0 ? "-" : "+"} ${Math.abs(b)}z + (${tex(c)})$ at $z_0=${tex(z0)}$.`, fields: [{ label: "f′(z₀)", ans: ans(d) }], solution: [`$f'(z)=${3 * a}z^2${b < 0 ? "" : "+"}${b}$.`, `$z_0^2=${tex(z0.mul(z0))}$.`, `$f'(z_0)=${tex(d)}$.`] };
  } },
  { id: "g-quot", topic: "derivative", name: "Quotient rule", make() {
    const a = ri(1, 4), b = ri(-5, 5, true), c = ri(-5, 5, true); const det = a * c - b;
    if (det === 0) return this.make();
    return { q: `Differentiate $f(z)=\\dfrac{${a}z ${b < 0 ? "-" : "+"} ${Math.abs(b)}}{z ${c < 0 ? "-" : "+"} ${Math.abs(c)}}$.`, fields: [{ label: "f′(z)", ans: `${det}/(z+${c})^2`, vars: ["z"], complex: true }], solution: [`$\\dfrac{(z${c < 0 ? "" : "+"}${c})\\cdot${a}-(${a}z${b < 0 ? "" : "+"}${b})\\cdot1}{(z${c < 0 ? "" : "+"}${c})^2}$.`, `$=\\dfrac{${det}}{(z${c < 0 ? "" : "+"}${c})^2}$, $z\\ne${-c}$.`] };
  } },
  { id: "g-cont", topic: "continuity", name: "Removable discontinuity", make() {
    const c = ri(-5, 5, true);
    return { q: `What value must $f(${c})$ take so that $f(z)=\\dfrac{z^2-${c * c}}{z ${c < 0 ? "+" : "-"} ${Math.abs(c)}}$ is continuous at $z=${c}$?`, fields: [{ label: `f(${c})`, ans: `${2 * c}` }], solution: [`Factor: $\\dfrac{(z-(${c}))(z+(${c}))}{z-(${c})}=z${c < 0 ? "" : "+"}${c}$.`, `Limit $=${2 * c}$, so define $f(${c})=${2 * c}$.`] };
  } },
  { id: "g-domain", topic: "functions", name: "Domain of a rational function", make() {
    const p = z(ri(-4, 4), ri(-4, 4, true));
    return { q: `Which point is excluded from the domain of $f(z)=\\dfrac{1}{z-(${tex(p)})}$, and which value is never attained?`, fields: [{ label: "excluded z", ans: ans(p) }, { label: "excluded w", ans: "0" }], solution: [`Denominator zero at $z=${tex(p)}$.`, `$f(z)\\ne0$ ever; any $w\\ne0$ is hit by $z=${tex(p)}+1/w$. Range $=\\mathbb C\\setminus\\{0\\}$.`] };
  } },
];

export const genById = (id) => GENERATORS.find((g) => g.id === id);
export const gensForTopic = (topic) => GENERATORS.filter((g) => g.topic === topic);
