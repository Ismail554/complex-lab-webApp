// Logic checks: parser, answer checker, every bank answer, every generator.  Run: npm test
import { checkField } from "../app/js/checker.js";
import { tryEval, fmt } from "../app/js/complex.js";
import { GENERATORS } from "../app/js/content/generators.js";
import { BANK } from "../app/js/content/bank.js";

let fail = 0;
const expect = (name, cond) => { if (!cond) { fail++; console.log("FAIL", name); } };

const cases = [
  [{ label: "z", ans: "1+3i" }, "1 + 3i", true], [{ label: "z", ans: "2/13-3/13i" }, "(2-3i)/13", true], [{ label: "z", ans: "2/13-3/13i" }, "0.154-0.231i", true],
  [{ label: "d", ans: "sqrt(13)" }, "√13", true], [{ label: "θ", ans: "2pi/3" }, "2π/3", true], [{ label: "θ", ans: "5pi/6" }, "-7pi/6", false],
  [{ label: "u", ans: "x^3-3x*y^2", vars: ["x", "y"] }, "x³ - 3xy²", true], [{ label: "f", ans: "5/(z+2)^2", vars: ["z"], complex: true }, "5/(z^2+4z+4)", true],
  [{ label: "δ", ans: "e/4", vars: ["e"] }, "δ = ε/4", true], [{ label: "?", ans: "Δz", alt: ["dz"] }, "∆z", true], [{ label: "z", ans: "-8i" }, "z - z̄ = -8i", true],
  [{ label: "x", ans: "4" }, "x = 4", true], [{ label: "z", ans: "22-7i" }, "22+7i", false], [{ label: "u", ans: "x^2-y^2", vars: ["x", "y"] }, "2xy", false],
];
for (const [f, v, want] of cases) expect(`checkField ${v}`, checkField(f, v).ok === want);

expect("mul", fmt(tryEval("(3+2i)(4-5i)")) === "22 - 7i");
expect("powers of i", fmt(tryEval("i^105+i^23+i^20-i^34")) === "2");
expect("abs bars", fmt(tryEval("2|3+4i|+1")) === "11");
expect("division", fmt(tryEval("(4+2i)/(1-i)")) === "1 + 3i");

for (const q of BANK) for (const f of q.fields || []) expect(`bank ${q.id} answer self-check`, checkField(f, f.ans).ok);
for (const g of GENERATORS) for (let k = 0; k < 60; k++) { const p = g.make(); for (const f of p.fields) expect(`gen ${g.id} ${f.ans}`, checkField(f, f.ans).ok); }

console.log(fail ? `${fail} failure(s)` : `all checks passed · ${BANK.length} bank questions · ${GENERATORS.length} generators`);
process.exit(fail ? 1 : 0);
