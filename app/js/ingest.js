// Study-material ingestion: read .md / .txt / .tex / .html / .pdf, analyse, and integrate into the learning system.
import { docs } from "./store.js";
import { TOPICS, SETS } from "./content/curriculum.js";
import { KEYWORDS } from "./tutor.js";

// Topics that later sets of MATH 2361 are likely to bring. When an upload mentions them we create
// a new knowledge-map node and attach the most relevant existing lab.
export const FUTURE = {
  "cauchy-riemann": { title: "Cauchy–Riemann Equations", kws: ["cauchy-riemann", "cauchy riemann", "c-r equation", "u_x = v_y", "ux = vy"], lab: "derivative" },
  analytic: { title: "Analytic & Harmonic Functions", kws: ["analytic function", "holomorphic", "harmonic function", "harmonic conjugate", "entire function"], lab: "mapping" },
  elementary: { title: "Elementary Functions (e^z, log z, sin z)", kws: ["exponential function", "e^z", "logarithm", "log z", "branch cut", "sin z", "cos z", "hyperbolic"], lab: "mapping" },
  "de-moivre": { title: "De Moivre & Roots of Complex Numbers", kws: ["de moivre", "demoivre", "nth root", "roots of unity", "cube roots"], lab: "powers" },
  mapping: { title: "Conformal Mapping", kws: ["conformal", "mobius", "möbius", "bilinear transformation", "linear fractional"], lab: "mapping" },
  integration: { title: "Complex Integration", kws: ["contour integral", "line integral", "cauchy's integral", "cauchy integral", "cauchy-goursat", "cauchy theorem"], lab: null },
  series: { title: "Taylor & Laurent Series", kws: ["taylor series", "laurent series", "power series", "radius of convergence"], lab: null },
  residues: { title: "Singularities & Residues", kws: ["residue", "singularity", "pole of order", "essential singularity", "removable singularity"], lab: null },
  "fourier-series": { title: "Fourier Series", kws: ["fourier series", "fourier coefficient", "periodic function", "dirichlet condition", "half range", "even function", "odd function"], lab: "fourier" },
  "fourier-transform": { title: "Fourier Transform", kws: ["fourier transform", "inverse fourier", "convolution", "fourier integral", "parseval", "sine transform", "cosine transform"], lab: "fourier" },
};

export async function readFile(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (ext === "pdf") return { kind: "pdf", text: await pdfText(await file.arrayBuffer()) };
  const text = await file.text();
  if (ext === "html" || ext === "htm") { const d = new DOMParser().parseFromString(text, "text/html"); return { kind: "html", text: d.body.innerText }; }
  return { kind: ext === "tex" ? "tex" : "md", text };
}

let pdfjs;
export async function pdfText(buf) {
  if (!pdfjs) { pdfjs = await import("/vendor/pdfjs/pdf.min.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs"; }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise; const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p); const c = await page.getTextContent(); let last = null, line = [], lines = [];
    for (const it of c.items) { const y = Math.round(it.transform[5]); if (last !== null && Math.abs(y - last) > 3) { lines.push(line.join(" ")); line = []; } line.push(it.str); last = y; }
    lines.push(line.join(" ")); pages.push(`## Page ${p}\n\n${lines.join("\n")}`);
  }
  return pages.join("\n\n---\n\n");
}

export const ANALYZER_V = 2;
/** Analyse raw text → structured knowledge. */
export function analyse(name, text) {
  const clean = text.replace(/\r/g, "").replace(/^MATH 2361.*$/gm, "").replace(/\n{3,}/g, "\n\n");
  // --- sections: markdown headings or numbered headings like "2.3  Definition ..." ---
  const lines = clean.split("\n"); const sections = []; let cur = { title: "Introduction", lines: [] };
  const isHead = (l) => /^#{1,4}\s+\S/.test(l) && !/^#{1,4}\s+page\s+\d+/i.test(l) ? l.replace(/^#+\s+/, "") : (/^\s{0,4}(\d{1,2}(\.\d{1,2})?)\s{1,4}([A-Z][A-Za-z ,'’&\-–()]{3,70})\s*$/.test(l) ? l.trim() : null);
  for (const l of lines) { const hd = isHead(l); if (hd) { if (cur.lines.join("").trim()) sections.push(cur); cur = { title: hd.trim(), lines: [] }; } else cur.lines.push(l); }
  if (cur.lines.join("").trim()) sections.push(cur);
  const secs = sections.map((s) => ({ title: s.title, text: s.lines.join("\n").trim() })).filter((s) => s.text.length > 20);

  // --- worked examples "Question: ... Answer: ..." ---
  const examples = []; const qa = /Question:\s*([\s\S]*?)\n\s*Answer:\s*([\s\S]*?)(?=\n\s*Question:|\n\s*\d{1,2}(\.\d+)?\s{1,4}[A-Z]|\n## |$)/g; let m;
  while ((m = qa.exec(clean)) && examples.length < 120) examples.push({ q: squeeze(m[1]), a: m[2].trim().slice(0, 1600) });

  // --- exam/practice questions ---
  const questions = []; const seen = new Set();
  const qre = /^\s*(?:Q\s?\d{1,3}[.)]|\d{1,3}[.)])\s+((?:Define|Prove|Show|Find|Evaluate|Express|Solve|State|Explain|Determine|Using|Calculate|Compute|Multiply|Add|Subtract|Verify|Test|Differentiate|Distinguish|Why|What|Sketch|Obtain|Derive|Discuss|Write|Expand|Integrate|If|Let|Use|Check)[^\n]*(?:\n(?!\s*(?:Q\s?\d|\d{1,3}[.)]|#|\s*$))[^\n]{1,120}){0,2})/gim;
  while ((m = qre.exec(clean))) { const q = squeeze(m[1]); const k = q.toLowerCase().slice(0, 60); if (!seen.has(k) && q.length > 8) { seen.add(k); questions.push({ q }); } }

  // --- definitions → flashcards ---
  const defs = []; const sentences = lines.filter((l) => !isHead(l)).join("\n").replace(/\n(?!\n)/g, " ").split(/(?<=[.!?])\s+|\n\n+/);
  for (const s of sentences) { const t = squeeze(s); if (t.length > 30 && t.length < 320 && /\b(is called|are called|is defined|is said to be|is known as|denoted by|we say that)\b/i.test(t)) defs.push(t); }

  // --- formulas: short lines with = and math-ish symbols ---
  const formulas = [];
  for (const l of lines) { const t = squeeze(l); if (t.length > 4 && t.length < 90 && /=|≤|≥|⇒|⇐⇒|→/.test(t) && /[a-zA-Z]/.test(t) && /[|^√∑∫∂()+\-−·∈]/.test(t) && !/Question|Answer|Page/.test(t) && !/^(Q\s?\d|\d{1,3}[.)])/.test(t)) formulas.push(t); }

  // --- match topics ---
  const low = clean.toLowerCase(); const match = [];
  for (const [id, kws] of Object.entries(KEYWORDS)) { const n = kws.reduce((a, k) => a + count(low, k.toLowerCase()), 0); if (n >= 2) match.push({ id, n }); }
  match.sort((a, b) => b.n - a.n);
  const future = [];
  for (const [id, f] of Object.entries(FUTURE)) { const n = f.kws.reduce((a, k) => a + count(low, k), 0); if (n >= 1) future.push({ id, n, title: f.title, lab: f.lab }); }
  future.sort((a, b) => b.n - a.n);

  const isCore = SETS.some((s) => s.source === name || s.assignment === name);
  const words = clean.split(/\s+/).length;
  return { v: ANALYZER_V, sections: secs.slice(0, 80), examples, questions: questions.slice(0, 150), defs: [...new Set(defs)].slice(0, 80), formulas: [...new Set(formulas)].slice(0, 80), match: match.slice(0, 8), future: future.slice(0, 6), isCore, words, minutes: Math.max(1, Math.round(words / 160)) };
}
const squeeze = (s) => String(s).replace(/\s+/g, " ").trim();
const count = (hay, needle) => { let n = 0, i = 0; while ((i = hay.indexOf(needle, i)) !== -1) { n++; i += needle.length; } return n; };

/** Full pipeline: file → stored doc */
export async function ingestFile(file, { source = "upload", fingerprint } = {}) {
  const { kind, text } = await readFile(file);
  return ingestText(file.name, text, { kind, source, fingerprint });
}
export async function ingestText(name, text, { kind = "md", source = "upload", fingerprint = null } = {}) {
  const analysis = analyse(name, text);
  const doc = { id: `doc-${hash(name + (fingerprint || text.length))}`, name, kind, source, fingerprint, text, analysis, createdAt: Date.now() };
  await docs.put(doc); return doc;
}
export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

/** Pull new/changed files from the server's materials/ folder (and the course sheets) automatically. */
export async function syncServerFiles(onNew) {
  let list; try { list = (await (await fetch("/api/files")).json()).files || []; } catch { return []; }
  const existing = await docs.all();
  // re-analyse stored docs when the analyser improves — no re-upload needed
  for (const d of existing) if (!d.analysis || d.analysis.v !== ANALYZER_V) { d.analysis = analyse(d.name, d.text); await docs.put(d); }
  const have = new Map(existing.map((d) => [d.fingerprint, d]));
  const added = [];
  for (const f of list) {
    const fp = `${f.source}:${f.path}:${f.size}:${Math.round(f.mtime)}`; if (have.has(fp)) continue;
    // a browser upload is also saved into materials/ — adopt that copy instead of ingesting it twice
    const twin = [...have.values()].find((d) => d.source === "upload" && d.name === f.name && Math.abs(d.createdAt - f.mtime) < 120000);
    if (twin) { twin.fingerprint = fp; await docs.put(twin); have.set(fp, twin); continue; }
    try {
      const res = await fetch(`/api/file?source=${encodeURIComponent(f.source)}&path=${encodeURIComponent(f.path)}`); if (!res.ok) continue;
      const blob = await res.blob(); const file = new File([blob], f.name);
      const old = [...have.values()].find((d) => d.name === f.name && d.source === f.source); if (old) await docs.remove(old.id);
      const doc = await ingestFile(file, { source: f.source, fingerprint: fp }); added.push(doc); onNew && onNew(doc);
    } catch (e) { console.warn("ingest failed", f.name, e); }
  }
  return added;
}

/** Library topics derived from uploaded (non-core) docs → knowledge-map nodes. */
export function libraryTopics(allDocs) {
  const out = [];
  for (const d of allDocs) {
    if (d.analysis.isCore) continue;
    const fut = d.analysis.future[0];
    out.push({ id: `lib-${d.id}`, doc: d.id, title: fut ? fut.title : d.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "), lab: fut ? fut.lab : null, links: d.analysis.match.slice(0, 3).map((m) => m.id), future: !!fut });
  }
  return out;
}
export const coreTopicIds = TOPICS.map((t) => t.id);
