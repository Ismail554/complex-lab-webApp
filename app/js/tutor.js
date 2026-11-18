// "Jarvis" — the Socratic tutor. Works fully offline (rule-based Socratic engine + calculator),
// and upgrades to a Claude-powered tutor when the local server has Anthropic credentials.
import { h, L, lang, richInline, icon, toast, texHTML } from "./ui.js";
import { store } from "./store.js";
import { TOPICS, topicById } from "./content/curriculum.js";
import { gensForTopic } from "./content/generators.js";
import { checkFields } from "./checker.js";
import { tryEval, tex, nice, texAngle } from "./complex.js";

// ---------------- AI bridge ----------------
export const ai = {
  status: null,
  async check() { try { const r = await fetch("/api/status"); this.status = await r.json(); } catch { this.status = { ok: false, ai: false }; } return this.status; },
  get enabled() { return !!(this.status && this.status.ai) && store.state.aiOn !== false; },
  async ask(messages, system = "", { effort = "low", max_tokens = 1500 } = {}) {
    const r = await fetch("/api/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages, system, effort, max_tokens }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { if (r.status === 503) this.status = { ...(this.status || {}), ai: false }; throw new Error(j.error || `AI error ${r.status}`); }
    return j.text;
  },
};

export const KEYWORDS = {
  "imag-unit": ["imaginary unit", "why complex", "x^2+1", "x²+1", "sqrt(-1)", "√-1", "i^2", "i²"],
  construction: ["ordered pair", "standard form", "real part", "imaginary part", "re(z)", "im(z)", "equality", "purely imaginary", "number system"],
  arithmetic: ["add", "subtract", "multiply", "divide", "division", "inverse", "field", "distributive", "commutative", "গুণ", "ভাগ", "যোগ"],
  "powers-i": ["power of i", "powers of i", "i^n", "iⁿ", "ঘাত"],
  conjugate: ["conjugate", "z bar", "zbar", "z̄", "কনজুগেট"],
  modulus: ["modulus", "absolute value", "triangle inequality", "|z|", "মডুলাস"],
  argand: ["argand", "distance", "circle", "parallelogram", "plane", "দূরত্ব", "বৃত্ত"],
  polar: ["polar", "argument", "arg", "trigonometric form", "পোলার"],
  functions: ["function", "domain", "range", "single-valued", "multi-valued", "branch", "ফাংশন"],
  uv: ["u(x", "v(x", "u+iv", "u + iv", "real and imaginary parts of f"],
  neighbourhood: ["neighbourhood", "neighborhood", "deleted", "limit point", "open set", "closed set", "accumulation"],
  limits: ["limit", "epsilon", "ε", "delta", "δ", "path", "squeeze", "লিমিট"],
  continuity: ["continuous", "continuity", "uniform", "কন্টিনিউ"],
  derivative: ["derivative", "differentiable", "differentiation", "quotient rule", "ডেরিভেটিভ"],
  "diff-cont": ["implies continuity", "differentiability implies", "converse"],
};
export function detectTopic(text) {
  const t = String(text).toLowerCase(); let best = null, bs = 0;
  for (const [id, kws] of Object.entries(KEYWORDS)) { const s = kws.reduce((a, k) => a + (t.includes(k.toLowerCase()) ? k.length : 0), 0); if (s > bs) { bs = s; best = id; } }
  return best;
}

// ---------------- Offline Socratic engine ----------------
const bn = () => lang() === "bn";
const say = (en, b) => (bn() ? b : en);

function questionsFor(topicId) {
  const t = topicById(topicId); if (!t) return [];
  const qs = t.steps.filter((s) => s.ask).map((s) => ({ ...s.ask, key: s.key, topic: topicId, body: s.body }));
  for (const g of gensForTopic(topicId)) qs.push({ gen: g, topic: topicId });
  return qs;
}

export class Jarvis {
  constructor() { this.topic = null; this.pending = null; this.asked = new Set(); }
  setTopic(id) { if (id) this.topic = id; }

  greet() {
    const t = this.topic && topicById(this.topic);
    return say(
      `Hi, I'm **Jarvis** 👋 I teach by asking questions. ${t ? `We're on **${L(t.title)}**.` : ""} Try: **quiz me**, **explain**, **hint**, or type a calculation like \`(3+2i)(4-5i)\` or \`polar -1+sqrt(3)i\`.`,
      `Hello, I am **Jarvis**. I teach by asking questions. Try: **quiz me**, **explain**, **hint**, or enter a calculation like (3+2i)(4-5i).`);
  }

  ask(topicId = this.topic) {
    const tid = topicId || pickWeakTopic(); this.topic = tid;
    let qs = questionsFor(tid).filter((q, k) => !this.asked.has(`${tid}:${k}`));
    if (!qs.length) { this.asked.clear(); qs = questionsFor(tid); }
    const all = questionsFor(tid); const q = qs[Math.floor(Math.random() * qs.length)]; this.asked.add(`${tid}:${all.indexOf(q)}`);
    let p;
    if (q.gen) { const m = q.gen.make(); p = { type: "input", q: m.q, fields: m.fields, solution: m.solution, topic: tid, hints: [say("Write down the formula you'd use first. Which one is it?", "প্রথমে কোন সূত্র লাগবে সেটা লেখো। কোনটা?"), ...m.solution.slice(0, -1)] }; }
    else p = { ...q, hints: [L(q.hint) || say(`Think about this: ${L(q.key)}`, `এটা ভাবো: ${L(q.key)}`), L(q.key), L(q.body)].filter(Boolean) };
    p.hintIdx = 0; this.pending = p;
    const opts = p.type === "mcq" ? "\n" + p.options.map((o, k) => `**${"ABCD"[k]}.** ${L(o)}`).join("\n") : p.fields.length > 1 ? say(`\n_(answer as: ${p.fields.map((f) => f.label).join(", ")} — separated by commas)_`, `\n_(উত্তর দাও: ${p.fields.map((f) => f.label).join(", ")} — কমা দিয়ে আলাদা করে)_`) : "";
    return `${say("🤔 **Question:**", "🤔 **প্রশ্ন:**")} ${L(p.q)}${opts}`;
  }

  reply(text) {
    const raw = String(text).trim(); const lo = raw.toLowerCase();
    const wantsHint = /^(hint|help|i don'?t know|idk|জানি না|হিন্ট|সাহায্য|bujhi na|বুঝি না|pari na|পারি না)\b/i.test(lo);
    const wantsQuiz = /(quiz|ask me|test me|question|প্রশ্ন|কুইজ|practice)/i.test(lo);
    const wantsExplain = /^(explain|why|what is|what's|বোঝাও|বুঝিয়ে|কী|কি|keno|ki)\b/i.test(lo) || /(explain|বোঝাও|বুঝিয়ে)/i.test(lo);
    const skip = /^(skip|next|পরের|বাদ)/i.test(lo);

    // calculator
    const calc = lo.replace(/^(calc(ulate)?|compute|evaluate|what is|find|polar|modulus of|হিসাব)\s*/i, "");
    if (!this.pending || /^(calc|compute|evaluate|polar)/i.test(lo)) {
      const v = /[0-9i)]/.test(calc) && !/[a-hj-z]{4,}/i.test(calc.replace(/sqrt|conj|abs|arg|exp|sin|cos|pi/gi, "")) ? tryEval(calc) : null;
      if (v) {
        const r = v.abs(); const out = [`$${texSafe(calc)} = ${tex(v)}$`];
        if (r > 1e-12) out.push(say(`Modulus $|w|=${nice(r)}$, principal argument $\\theta=${texAngle(v.arg0())}$, so $w=${nice(r)}\\left(\\cos ${texAngle(v.arg0())}+i\\sin ${texAngle(v.arg0())}\\right)$.`, `Modulus $|w|=${nice(r)}$, principal argument $\\theta=${texAngle(v.arg0())}$।`));
        out.push(say("🧭 Socratic check: can you predict the *angle* of the answer from the angles of the inputs?", "🧭 ভেবে দেখো: input গুলোর কোণ থেকে উত্তরের *কোণ* আগেই বলতে পারবে?"));
        return out.join("\n\n");
      }
    }

    // switching subject mid-question ("explain conjugate") abandons the pending question
    if (this.pending && (wantsExplain || (/[a-z]{3,}\s+[a-z]{3,}/i.test(raw) && detectTopic(raw) && detectTopic(raw) !== this.pending.topic))) this.pending = null;
    if (this.pending) {
      const p = this.pending;
      if (skip) { this.pending = null; return say("Skipped. ", "বাদ দিলাম। ") + this.ask(); }
      if (wantsHint) {
        if (p.hintIdx < p.hints.length) return `💡 ${say("Hint", "হিন্ট")} ${p.hintIdx + 1}: ${p.hints[p.hintIdx++]}`;
        this.pending = null; store.record(p.topic, false, { kind: "socratic", weight: 0.5 });
        const sol = p.solution ? p.solution.join("\n") : p.type === "mcq" ? `**${L(p.options[p.answer])}** — ${L(p.why)}` : `${p.fields.map((f) => `${f.label} = $${texSafe(f.ans)}$`).join(", ")}. ${L(p.why)}`;
        return `${say("Here is the full solution:", "সম্পূর্ণ সমাধান:")}\n${sol}\n\n${say("Now explain the key step back to me in one sentence (Feynman!) — or say **quiz me** for another.", "এবার মূল ধাপটা এক বাক্যে আমাকে বুঝিয়ে বলো (Feynman!) — অথবা **quiz me** লিখো।")}`;
      }
      if (wantsQuiz) { this.pending = null; return this.ask(detectTopic(raw) || this.topic); }
      // grade
      let ok = false;
      if (p.type === "mcq") {
        const k = /^[a-d]\b/i.test(raw) ? "abcd".indexOf(raw[0].toLowerCase()) : /^\d$/.test(raw) ? +raw - 1 : p.options.findIndex((o) => L(o).toLowerCase().replace(/\$/g, "").includes(lo.replace(/\$/g, "")));
        ok = k === p.answer;
      } else {
        const parts = p.fields.length > 1 ? raw.split(/[,;]|\band\b|এবং/).map((s) => s.trim()) : [raw];
        ok = checkFields(p.fields, parts).ok;
      }
      if (ok) {
        this.pending = null; store.record(p.topic, true, { kind: "socratic", weight: 0.6 });
        const follow = [say("Why does that work? Say it in your own words.", "এটা কেন কাজ করে? নিজের ভাষায় বলো।"), say("Could you have predicted it from the picture in the lab?", "ল্যাবের ছবি দেখে আগেই অনুমান করতে পারতে?"), say("What would change if the sign of the imaginary part flipped?", "Imaginary part এর চিহ্ন উল্টালে কী বদলাতো?")];
        return `✅ ${say("Correct!", "সঠিক!")} ${p.why ? L(p.why) : p.solution ? p.solution[p.solution.length - 1] : ""}\n\n🧭 ${follow[Math.floor(Math.random() * follow.length)]} ${say("Or type **quiz me** for the next question.", "অথবা পরের প্রশ্নের জন্য **quiz me** লিখো।")}`;
      }
      store.record(p.topic, false, { kind: "socratic", weight: 0.4 });
      const nudge = p.hintIdx < p.hints.length ? `\n💡 ${p.hints[p.hintIdx++]}` : "";
      return `${say("Not quite — let's reason it out.", "পুরোপুরি ঠিক হয়নি — চলো যুক্তি দিয়ে ভাবি।")}${nudge}\n${say("Try again, or type **hint** / **skip**.", "আবার চেষ্টা করো, অথবা **hint** / **skip** লিখো।")}`;
    }

    const tid = detectTopic(raw) || (wantsQuiz || wantsExplain ? this.topic : null);
    if (wantsQuiz) return this.ask(tid || this.topic);
    if (tid) {
      this.topic = tid; const t = topicById(tid); const st = t.steps[0];
      const f = t.formulas[0];
      return `**${L(t.title)}** — ${L(t.summary)}\n\n$$${f.tex}$$\n${L(st.key)}\n\n🧭 ${say("Before I say more — what do you *think* the picture looks like? Answer this:", "আরো বলার আগে — তুমি কী *মনে করো*? এটার উত্তর দাও:")}\n\n${this.ask(tid)}`;
    }
    return say(
      "I couldn't match that to a topic yet. Try naming one (e.g. *conjugate*, *polar form*, *ε–δ limit*, *derivative*), type a calculation, or say **quiz me**.",
      "এটা কোনো টপিকের সাথে মেলাতে পারিনি। একটা টপিকের নাম লেখো (যেমন *conjugate*, *polar form*, *limit*, *derivative*), হিসাব লেখো, অথবা **quiz me** বলো।");
  }
}
const texSafe = (s) => String(s).replace(/\*/g, "\\cdot ").replace(/sqrt\(([^)]*)\)/g, "\\sqrt{$1}").replace(/pi/g, "\\pi ");

export function pickWeakTopic() {
  const scored = TOPICS.map((t) => ({ id: t.id, m: store.masteryOf(t.id) + Math.random() * 0.08 }));
  scored.sort((a, b) => a.m - b.m); return scored[0].id;
}

// ---------------- Chat drawer UI ----------------
let drawer, log, input, jarvis, history = [], currentTopic = null;
export function setTutorTopic(id) { currentTopic = id; if (jarvis) jarvis.setTopic(id); }

export function openTutor(prefill) {
  if (!drawer) buildDrawer();
  drawer.classList.add("open"); document.body.classList.add("tutor-open");
  if (prefill) { input.value = prefill; send(); }
  setTimeout(() => input.focus(), 50);
}
export function closeTutor() { drawer && drawer.classList.remove("open"); document.body.classList.remove("tutor-open"); }

function buildDrawer() {
  jarvis = new Jarvis(); jarvis.setTopic(currentTopic);
  log = h("div.chat-log", { "aria-live": "polite" });
  input = h("textarea.chat-input", { rows: 2, placeholder: lang() === "bn" ? "জার্ভিসকে লিখো… (Enter = পাঠাও)" : "Message Jarvis… (Enter to send)" });
  input.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } });
  const modeBadge = h("span.ai-badge");
  const refreshBadge = () => { modeBadge.textContent = ai.enabled ? (ai.status.provider === "gemini" ? "Gemini AI" : "Claude AI") : "offline Socratic"; modeBadge.className = "ai-badge " + (ai.enabled ? "on" : "off"); };
  const chips = h("div.chat-chips", ["quiz me", "hint", "explain", "(3+2i)(4-5i)", "polar -1+sqrt(3)i"].map((c) => h("button.chip", { onclick: () => { input.value = c; send(); } }, c)));
  drawer = h("aside#tutor.drawer", { "aria-label": "Jarvis tutor" },
    h("header.drawer-head", h("div.jarvis-avatar", "J"), h("div", h("b", "Jarvis"), h("small", lang() === "bn" ? "সক্রেটিক টিউটর" : "Socratic tutor")), modeBadge,
      h("button.icon-btn", { title: "Toggle AI", onclick: () => { store.set({ aiOn: store.state.aiOn === false }); refreshBadge(); if (!ai.status?.ai) toast(lang() === "bn" ? "AI চালু করতে math-lab/.env ফাইলে GEMINI_API_KEY দিন" : "AI needs GEMINI_API_KEY in math-lab/.env — running offline Socratic mode.", "info", 4000); } }, icon("spark")),
      h("button.icon-btn", { title: "Close", onclick: closeTutor }, icon("x"))),
    log, chips, h("div.chat-row", input, h("button.btn.primary", { onclick: send }, icon("arrow"))));
  document.body.append(drawer); refreshBadge();
  ai.check().then(refreshBadge);
  push("jarvis", jarvis.greet());
}

function push(role, md) {
  const el = h(`div.msg.${role}`, { html: richInline(md) }); log.append(el); log.scrollTop = log.scrollHeight; return el;
}

async function send() {
  const text = input.value.trim(); if (!text) return; input.value = "";
  push("me", text.replace(/[<>]/g, "")); jarvis.setTopic(currentTopic);
  if (ai.enabled) {
    history.push({ role: "user", content: text }); const wait = push("jarvis", "…");
    const t = currentTopic && topicById(currentTopic);
    const weak = TOPICS.map((x) => ({ x, m: store.masteryOf(x.id) })).sort((a, b) => a.m - b.m).slice(0, 4);
    const sys = [
      `- উত্তরের ভাষা: ${lang() === "bn" ? "বাংলা (বাংলা হরফ, গাণিতিক পরিভাষা ইংরেজিতে)" : "English"} — তবে শিক্ষার্থী যে ভাষায় লেখে সেটাকে অগ্রাধিকার দাও।`,
      t ? `- শিক্ষার্থী এখন এই লেসনে আছে: ${t.title.bn} (${t.title.en}) — ${t.summary.bn}\n- এই টপিকের মূল সূত্র: ${t.formulas.map((f) => `$${f.tex}$`).join(" ; ")}` : "- শিক্ষার্থী এখন কোনো নির্দিষ্ট লেসনে নেই।",
      `- অ্যাপের পেজ: ${location.hash || "#/"}`,
      `- দুর্বল টপিক (mastery 0–1): ${weak.map(({ x, m }) => `${x.title.en} ${m.toFixed(2)}`).join(", ")}`,
    ].join("\n");
    try { const ans = await ai.ask(history.slice(-12), sys); history.push({ role: "assistant", content: ans }); wait.innerHTML = richInline(ans); }
    catch (e) { history.pop(); wait.innerHTML = richInline(`_(${e.message} — switching to offline mode)_\n\n${jarvis.reply(text)}`); }
    log.scrollTop = log.scrollHeight; return;
  }
  push("jarvis", jarvis.reply(text));
}
