// Answer evaluation: numeric/complex answers, expression equivalence, theory rubrics, Feynman explanations.
import { tryEval, equivalent, C } from "./complex.js";

const clean = (s) => String(s ?? "").trim().replace(/^.*=\s*(?=[^=]+$)/, "")
  .replace(/^\s*[a-zA-ZΔθδ'′₀-₉⁻¹]+\s*(\([^)]*\))?\s*=\s*/, "") // drop "x =", "f'(z) =", "u(x,y) ="
  .replace(/ε/g, "e").replace(/′/g, "'").replace(/,(?=\d{3}\b)/g, "");
const squash = (s) => String(s).toLowerCase().replace(/\s+/g, "").replace(/[∆Δ]/g, "δ");

/** Check one answer field. Returns { ok, msg } */
export function checkField(field, raw) {
  const input = clean(raw);
  if (!input) return { ok: false, msg: "empty" };
  const targets = [field.ans, ...(field.alt || [])];
  if (targets.some((t) => squash(t) === squash(input))) return { ok: true };
  if (field.vars && field.vars.length) {
    const ok = equivalent(input, field.ans, field.vars, { complexVars: !!field.complex, tol: 1e-6 });
    if (ok) return { ok: true };
    if (tryEval(input, Object.fromEntries(field.vars.map((v) => [v, new C(0.7, 0.3)]))) === null) return { ok: false, msg: "Could not read that expression — use * and ^, e.g. 3x^2*y - y^3" };
    return { ok: false };
  }
  const want = tryEval(field.ans); const got = tryEval(input);
  if (!got) return { ok: false, msg: "Could not read that — try a form like 2-3i, 3/13, sqrt(13), 2pi/3" };
  if (!want) return { ok: false };
  if (got.eq(want, 2e-3)) return { ok: true };
  if (/θ|theta|arg/i.test(field.label) && Math.abs(got.im) < 1e-9) {
    const d = (got.re - want.re) / (2 * Math.PI);
    if (Math.abs(d - Math.round(d)) < 1e-3) return { ok: false, msg: "That angle points the right way, but the principal argument must lie in [0, 2π)." };
  }
  if (got.eq(want.conj(), 2e-3)) return { ok: false, msg: "Check the sign of the imaginary part." };
  if (got.eq(want.neg(), 2e-3)) return { ok: false, msg: "Off by a sign." };
  return { ok: false };
}

export function checkFields(fields, values) {
  const res = fields.map((f, k) => checkField(f, values[k]));
  return { ok: res.every((r) => r.ok), res };
}

/** Keyword-group rubric. groups: array of arrays of alternatives. */
export function rubric(text, groups) {
  const t = " " + String(text).toLowerCase().replace(/\s+/g, " ") + " ";
  const tn = t.replace(/\s/g, "");
  const hit = groups.map((alts) => alts.some((a) => { const x = a.toLowerCase(); return t.includes(x) || tn.includes(x.replace(/\s/g, "")); }));
  return { hit, score: groups.length ? hit.filter(Boolean).length / groups.length : 0 };
}

/** Feynman-technique evaluation: coverage + clarity signals. */
export function feynmanScore(text, keywords) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const r = rubric(text, keywords);
  const hasExample = /\d|উদাহরণ|example|e\.g|যেমন/i.test(text);
  const hasAnalogy = /like|imagine|think of|as if|similar|ধরো|ভাবো|মতো|মত |যেন/i.test(text);
  const sentences = String(text).split(/[.!?।]+/).filter((s) => s.trim().length > 3);
  const avgLen = words.length / Math.max(1, sentences.length);
  const lengthScore = Math.min(1, words.length / 45);
  const clarity = avgLen < 28 ? 1 : avgLen < 40 ? 0.7 : 0.4;
  const score = Math.round(100 * (0.55 * r.score + 0.15 * lengthScore + 0.1 * clarity + 0.1 * (hasExample ? 1 : 0) + 0.1 * (hasAnalogy ? 1 : 0)));
  return { score, coverage: r, hasExample, hasAnalogy, words: words.length, avgLen };
}
