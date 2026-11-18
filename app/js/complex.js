// Complex arithmetic + a small expression language used by labs and answer checking.
export class C {
  constructor(re = 0, im = 0) { this.re = re; this.im = im; }
  static of(v) { return v instanceof C ? v : new C(+v, 0); }
  static polar(r, t) { return new C(r * Math.cos(t), r * Math.sin(t)); }
  add(b) { b = C.of(b); return new C(this.re + b.re, this.im + b.im); }
  sub(b) { b = C.of(b); return new C(this.re - b.re, this.im - b.im); }
  mul(b) { b = C.of(b); return new C(this.re * b.re - this.im * b.im, this.re * b.im + this.im * b.re); }
  div(b) {
    b = C.of(b); const d = b.re * b.re + b.im * b.im;
    if (d === 0) return new C(NaN, NaN);
    return new C((this.re * b.re + this.im * b.im) / d, (this.im * b.re - this.re * b.im) / d);
  }
  scale(k) { return new C(this.re * k, this.im * k); }
  neg() { return new C(-this.re, -this.im); }
  conj() { return new C(this.re, -this.im); }
  abs() { return Math.hypot(this.re, this.im); }
  abs2() { return this.re * this.re + this.im * this.im; }
  arg() { return Math.atan2(this.im, this.re); } // (-π, π]
  arg0() { const a = Math.atan2(this.im, this.re); return a < 0 ? a + 2 * Math.PI : a; } // course convention [0, 2π)
  inv() { return new C(1, 0).div(this); }
  exp() { const e = Math.exp(this.re); return new C(e * Math.cos(this.im), e * Math.sin(this.im)); }
  log() { return new C(Math.log(this.abs()), this.arg()); }
  sqrt() { const r = Math.sqrt(this.abs()), t = this.arg() / 2; return C.polar(r, t); }
  pow(b) {
    b = C.of(b);
    if (b.im === 0 && Number.isInteger(b.re) && Math.abs(b.re) <= 64) {
      let n = Math.abs(b.re), base = this, out = new C(1, 0);
      while (n) { if (n & 1) out = out.mul(base); base = base.mul(base); n >>= 1; }
      return b.re < 0 ? out.inv() : out;
    }
    if (this.re === 0 && this.im === 0) return b.re > 0 ? new C(0, 0) : new C(NaN, NaN);
    return b.mul(this.log()).exp();
  }
  sin() { return new C(Math.sin(this.re) * Math.cosh(this.im), Math.cos(this.re) * Math.sinh(this.im)); }
  cos() { return new C(Math.cos(this.re) * Math.cosh(this.im), -Math.sin(this.re) * Math.sinh(this.im)); }
  tan() { return this.sin().div(this.cos()); }
  sinh() { return new C(Math.sinh(this.re) * Math.cos(this.im), Math.cosh(this.re) * Math.sin(this.im)); }
  cosh() { return new C(Math.cosh(this.re) * Math.cos(this.im), Math.sinh(this.re) * Math.sin(this.im)); }
  isFinite() { return Number.isFinite(this.re) && Number.isFinite(this.im); }
  eq(b, tol = 1e-6) { b = C.of(b); const s = Math.max(1, this.abs(), b.abs()); return Math.abs(this.re - b.re) <= tol * s && Math.abs(this.im - b.im) <= tol * s; }
  toString(d = 3) { return fmt(this, d); }
}

const round = (x, d) => { const k = 10 ** d; const v = Math.round(x * k) / k; return Object.is(v, -0) ? 0 : v; };
const numStr = (x, d) => String(round(x, d));

/** "3 - 4i" style formatting (plain text). */
export function fmt(z, d = 3) {
  if (!z || !z.isFinite()) return "undefined";
  const a = round(z.re, d), b = round(z.im, d);
  if (b === 0) return numStr(a, d);
  const bAbs = Math.abs(b), bs = bAbs === 1 ? "i" : `${bAbs}i`;
  if (a === 0) return (b < 0 ? "-" : "") + bs;
  return `${a} ${b < 0 ? "-" : "+"} ${bs}`;
}

/** LaTeX formatting, with optional exact recognition of simple surds / fractions. */
export function tex(z, d = 3) {
  if (!z || !z.isFinite()) return "\\text{undefined}";
  const a = nice(z.re, d), b = nice(z.im, d);
  const bz = Math.abs(round(z.im, d)) < 10 ** -d, az = Math.abs(round(z.re, d)) < 10 ** -d;
  if (bz) return a;
  const bAbs = nice(Math.abs(z.im), d);
  const bs = bAbs === "1" ? "i" : `${bAbs}\\,i`;
  if (az) return (z.im < 0 ? "-" : "") + bs;
  return `${a} ${z.im < 0 ? "-" : "+"} ${bs}`;
}

/** Recognise small rationals and sqrt(n)/q values for nicer display. */
export function nice(x, d = 3) {
  if (!Number.isFinite(x)) return "\\infty";
  const s = x < 0 ? "-" : ""; const ax = Math.abs(x);
  if (Math.abs(ax - Math.round(ax)) < 1e-9) return s + Math.round(ax);
  for (let q = 2; q <= 30; q++) { const p = ax * q; if (Math.abs(p - Math.round(p)) < 1e-9) return `${s}\\tfrac{${Math.round(p)}}{${q}}`; }
  for (let n = 2; n <= 200; n++) {
    const r = Math.sqrt(n); if (Number.isInteger(r)) continue;
    for (let q = 1; q <= 12; q++) { const p = ax * q / r; if (Math.abs(p - Math.round(p)) < 1e-9 && Math.round(p) > 0 && Math.round(p) < 40) {
      const P = Math.round(p); const num = `${P === 1 ? "" : P}\\sqrt{${n}}`; return s + (q === 1 ? num : `\\tfrac{${num}}{${q}}`);
    } }
  }
  return s + numStr(ax, d);
}

/** Express an angle (radians) as a multiple of π when possible. */
export function texAngle(t) {
  const k = t / Math.PI;
  if (Math.abs(k) < 1e-9) return "0";
  for (let q = 1; q <= 12; q++) {
    const p = k * q;
    if (Math.abs(p - Math.round(p)) < 1e-7) {
      const P = Math.round(p); const sgn = P < 0 ? "-" : ""; const A = Math.abs(P);
      const num = A === 1 ? "\\pi" : `${A}\\pi`;
      return sgn + (q === 1 ? num : `\\frac{${num}}{${q}}`);
    }
  }
  return `${round(t, 3)}`;
}

// ---------------- Expression parser ----------------
const FUNCS = {
  sqrt: (z) => z.sqrt(), conj: (z) => z.conj(), bar: (z) => z.conj(), abs: (z) => new C(z.abs(), 0),
  arg: (z) => new C(z.arg0(), 0), re: (z) => new C(z.re, 0), im: (z) => new C(z.im, 0),
  exp: (z) => z.exp(), ln: (z) => z.log(), log: (z) => z.log(), sin: (z) => z.sin(), cos: (z) => z.cos(),
  tan: (z) => z.tan(), sinh: (z) => z.sinh(), cosh: (z) => z.cosh(),
};
const CONSTS = { pi: new C(Math.PI, 0), e: new C(Math.E, 0), i: new C(0, 1), j: new C(0, 1) };

function normalize(src) {
  return String(src)
    .replace(/\\left|\\right|\\,|\\!|\\;/g, "")
    .replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "(($1)/($2))")
    .replace(/\\sqrt\{([^{}]*)\}/g, "sqrt($1)")
    .replace(/\\overline\{([^{}]*)\}|\\bar\{([^{}]*)\}/g, (m, a, b) => `conj(${a || b})`)
    .replace(/\\pi|π/g, "pi").replace(/\\cdot|·|×/g, "*").replace(/÷/g, "/")
    .replace(/[−–—]/g, "-").replace(/²/g, "^2").replace(/³/g, "^3").replace(/⁴/g, "^4")
    .replace(/√\s*\(/g, "sqrt(").replace(/√\s*([0-9.]+|[a-z])/gi, "sqrt($1)")
    .replace(/z̄|zbar|z̅/gi, "conj(z)")
    .replace(/\*\*/g, "^").replace(/[{}]/g, (c) => (c === "{" ? "(" : ")"));
}

function tokenize(s) {
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) { let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++; out.push({ t: "num", v: parseFloat(s.slice(i, j)) }); i = j; continue; }
    if (/[a-zA-Z_]/.test(c)) { let j = i; while (j < s.length && /[a-zA-Z_]/.test(s[j])) j++; out.push(...splitIdent(s.slice(i, j))); i = j; continue; }
    if ("+-*/^(),|".includes(c)) { out.push({ t: c }); i++; continue; }
    throw new Error(`Unexpected '${c}'`);
  }
  return out;
}
// split "2xi" style identifiers like "xy" or "iz" into known pieces
function splitIdent(w) {
  const lw = w.toLowerCase();
  if (FUNCS[lw] || CONSTS[lw] || ["x", "y", "z", "t", "w", "a", "b", "r", "theta"].includes(lw)) return [{ t: "id", v: lw }];
  const parts = []; let rest = lw;
  const names = ["sqrt", "conj", "sinh", "cosh", "theta", "exp", "abs", "arg", "sin", "cos", "tan", "bar", "pi", "ln", "log", "re", "im", "x", "y", "z", "t", "w", "a", "b", "r", "i", "j", "e"];
  while (rest) { const n = names.find((k) => rest.startsWith(k)); if (!n) throw new Error(`Unknown name '${w}'`); parts.push({ t: "id", v: n }); rest = rest.slice(n.length); }
  return parts;
}

export function parse(src) {
  const toks = tokenize(normalize(src)); let p = 0;
  const peek = () => toks[p]; const eat = (t) => { if (!toks[p] || toks[p].t !== t) throw new Error(`Expected '${t}'`); return toks[p++]; };
  const startsAtom = (tk) => tk && (tk.t === "num" || tk.t === "id" || tk.t === "(" || tk.t === "|");
  function expr() { let n = term(); while (peek() && (peek().t === "+" || peek().t === "-")) { const op = toks[p++].t; n = { op, a: n, b: term() }; } return n; }
  function term() {
    let n = unary();
    while (peek() && (peek().t === "*" || peek().t === "/" || (startsAtom(peek()) && !(peek().t === "|" && inAbs > 0)))) {
      const tk = peek(); let op = "*"; if (tk.t === "*" || tk.t === "/") { op = tk.t; p++; }
      n = { op, a: n, b: unary() };
    }
    return n;
  }
  function unary() { if (peek() && (peek().t === "-" || peek().t === "+")) { const op = toks[p++].t; const n = unary(); return op === "-" ? { op: "neg", a: n } : n; } return power(); }
  function power() { const base = atom(); if (peek() && peek().t === "^") { p++; return { op: "^", a: base, b: unary() }; } return base; }
  let inAbs = 0;
  function atom() {
    const tk = toks[p++]; if (!tk) throw new Error("Unexpected end");
    if (tk.t === "num") return { num: tk.v };
    if (tk.t === "(") { const n = expr(); eat(")"); return n; }
    if (tk.t === "|") { inAbs++; const n = expr(); inAbs--; eat("|"); return { fn: "abs", a: n }; }
    if (tk.t === "id") {
      if (FUNCS[tk.v]) { if (peek() && peek().t === "(") { p++; const a = expr(); eat(")"); return { fn: tk.v, a }; } return { fn: tk.v, a: power() }; }
      return { id: tk.v };
    }
    throw new Error(`Unexpected '${tk.t}'`);
  }
  const tree = expr(); if (p < toks.length) throw new Error(`Unexpected '${toks[p].t}'`);
  return tree;
}

export function evaluate(tree, env = {}) {
  const ev = (n) => {
    if (n.num !== undefined) return new C(n.num, 0);
    if (n.id) { if (env[n.id] !== undefined) return C.of(env[n.id]); if (CONSTS[n.id]) return CONSTS[n.id]; throw new Error(`Unknown variable '${n.id}'`); }
    if (n.fn) return FUNCS[n.fn](ev(n.a));
    if (n.op === "neg") return ev(n.a).neg();
    const a = ev(n.a), b = ev(n.b);
    switch (n.op) { case "+": return a.add(b); case "-": return a.sub(b); case "*": return a.mul(b); case "/": return a.div(b); case "^": return a.pow(b); }
    throw new Error("bad node");
  };
  return ev(tree);
}

/** Compile an expression into a function of an env object. Throws on syntax errors. */
export function compile(src) { const tree = parse(src); return (env = {}) => evaluate(tree, env); }

/** Safe numeric evaluation, returns null when it fails. */
export function tryEval(src, env) { try { const v = compile(src)(env); return v.isFinite() ? v : null; } catch { return null; } }

/** Do two expressions agree as functions of the given variables? (random sampling) */
export function equivalent(a, b, vars = [], { samples = 7, tol = 1e-6, complexVars = false } = {}) {
  let fa, fb; try { fa = compile(a); fb = compile(b); } catch { return false; }
  let tested = 0;
  for (let k = 0; k < samples * 4 && tested < samples; k++) {
    const env = {}; for (const v of vars) env[v] = complexVars ? new C(rnd(), rnd()) : new C(rnd(), 0);
    let x, y; try { x = fa(env); y = fb(env); } catch { return false; }
    if (!y.isFinite()) continue; if (!x.isFinite()) return false;
    if (!x.eq(y, tol)) return false; tested++;
  }
  return tested > 0;
}
const rnd = () => Math.round((Math.random() * 4 - 2) * 1000) / 1000 + 0.137;
