import { h, L, T, lang, icon, richInline } from "../ui.js";
import { store } from "../store.js";
import { TOPICS, SETS, topicsOfSet, topicById } from "../content/curriculum.js";
import { labById } from "../labs/index.js";
import { ring, topicCard } from "./common.js";
import { BANK } from "../content/bank.js";
import { openTutor, pickWeakTopic } from "../tutor.js";

export function render(root) {
  const bn = lang() === "bn";
  const st = store.state;
  const last = Object.entries(st.lessons).sort((a, b) => (b[1].ts || 0) - (a[1].ts || 0))[0];
  const nextTopic = last && !last[1].done ? topicById(last[0]) : TOPICS.find((t) => !(st.lessons[t.id] && st.lessons[t.id].done)) || TOPICS[0];
  const overall = TOPICS.reduce((a, t) => a + store.masteryOf(t.id), 0) / TOPICS.length;
  const weak = pickWeakTopic();
  const attempts = st.attempts.length; const acc = attempts ? st.attempts.filter((a) => a.ok).length / attempts : 0;

  const heroLab = h("div.hero-lab");
  const hero = h("section.hero.card",
    h("div.hero-copy",
      h("div.kicker", "MATH 2361 · Complex Variable & Fourier Transformation"),
      h("h1", { html: bn ? "যেখানে complex number <mark>হাতে ধরে</mark> বোঝা যায়" : "A laboratory where complex numbers <mark>move</mark>" }),
      h("p.sub", bn ? "টেনে দেখো, ঘুরিয়ে দেখো, প্রশ্নের উত্তর দাও — তারপর পরীক্ষার জন্য প্রস্তুত হও। প্রতিটা ধারণার পাশে লাইভ ভিজ্যুয়ালাইজেশন, সক্রেটিক প্রশ্ন আর গাইডেড সমাধান।" : "Drag, rotate, predict, then prove. Every idea from Set 01 and Set 02 has a live visual, Socratic questions, guided exam solutions and a revision plan that adapts to you."),
      h("div.hero-cta",
        h("a.btn.primary.big", { href: `#/learn/${nextTopic.id}` }, icon("play"), h("span", `${last ? T("continue") : T("start")}: ${L(nextTopic.title)}`)),
        h("a.btn.big", { href: "#/exam" }, icon("clock"), h("span", T("exam"))),
        h("button.btn.big.ghost", { onclick: () => openTutor("quiz me") }, icon("chat"), h("span", bn ? "Jarvis quiz" : "Socratic quiz with Jarvis"))),
      h("div.hero-stats",
        stat(ring(overall, 46), bn ? "সামগ্রিক দক্ষতা" : "overall mastery"),
        stat(h("b.big-num", String(store.streak())), bn ? "দিনের স্ট্রিক" : "day streak"),
        stat(h("b.big-num", `${Math.round(acc * 100)}%`), bn ? `${attempts} চেষ্টায় সঠিক` : `accuracy · ${attempts} tries`),
        stat(h("b.big-num", String(BANK.length)), bn ? "পরীক্ষার প্রশ্ন" : "exam questions"))),
    heroLab);

  const plan = h("section.card.pad.plan",
    h("h3", icon("target"), bn ? " আজকের পরিকল্পনা" : " Today's plan"),
    h("ol.plan-list",
      h("li", h("a", { href: `#/learn/${nextTopic.id}` }, bn ? "লেসন: " : "Lesson: ", h("b", L(nextTopic.title)))),
      h("li", h("a", { href: `#/practice/topic/${weak}` }, bn ? "দুর্বল টপিক অনুশীলন: " : "Fix a weak spot: ", h("b", L(topicById(weak).title)))),
      h("li", h("a", { href: "#/revise" }, bn ? "স্মার্ট রিভিশন (ফর্মুলা কার্ড + ভুলগুলো)" : "Smart revision — due cards & past mistakes")),
      h("li", h("a", { href: "#/exam" }, bn ? "১৫ মিনিটের মিনি মক টেস্ট" : "A 15-minute mini mock test"))));

  const sets = SETS.map((s) => h("section.set-block",
    h("div.set-head", h("span.pill.violet", s.code), h("h2", L(s.title))),
    h("div.topic-grid", topicsOfSet(s.id).map((t) => topicCard(t)))));

  const labsRow = h("section", h("div.set-head", h("span.pill.green", T("labs")), h("h2", bn ? "ইন্টারঅ্যাকটিভ ল্যাব" : "Interactive labs")),
    h("div.lab-strip", ["argand", "mapping", "epsdelta", "derivative", "paths", "fourier"].map((id) => { const lb = labById(id); return h("a.lab-chip", { href: `#/labs/${id}` }, icon(lb.icon), h("b", L(lb.title)), h("small", L(lb.blurb).slice(0, 88) + "…")); })));

  root.append(hero, h("div.home-grid", plan, howItWorks(bn)), labsRow, ...sets);

  // live hero visual: rotating multiplication demo
  const lab = labById("argand").mount(heroLab, { op: "mul", z1: [1.6, 0.9], z2: [0.6, 1.2], span: 6.2, center: [0.4, 1.3], compact: true, ops: ["add", "mul", "div", "conj"] });
  let t = 0; const id = setInterval(() => { if (document.hidden || lab.plane.drag) return; t += 0.035; lab.set({ z2: [+(1.3 * Math.cos(1 + t)).toFixed(3), +(1.3 * Math.sin(1 + t)).toFixed(3)] }); }, 50);
  heroLab.addEventListener("pointerdown", () => clearInterval(id), { once: true });
  return { destroy() { clearInterval(id); lab.destroy(); } };
}
const stat = (v, l) => h("div.stat", v, h("small", l));
function howItWorks(bn) {
  const items = bn
    ? [["1", "দেখো", "প্রতিটা ধারণা একটা লাইভ ভিজ্যুয়াল দিয়ে শুরু।"], ["2", "অনুমান করো", "সক্রেটিক প্রশ্নের উত্তর না দিলে সামনে যাওয়া যায় না।"], ["3", "বুঝিয়ে বলো", "Feynman পদ্ধতি: নিজের ভাষায় লিখো, অ্যাপ মূল্যায়ন করবে।"], ["4", "পরীক্ষা দাও", "মক টেস্ট, গাইডেড সমাধান, দুর্বল টপিক শনাক্তকরণ।"]]
    : [["1", "See it", "Every idea starts with a live, draggable visual."], ["2", "Predict", "Socratic checkpoints gate each step — think before you read on."], ["3", "Explain it back", "Feynman technique: write it simply; the app scores your explanation."], ["4", "Prove it in exams", "Mock tests, guided solutions, weak-topic detection, spaced revision."]];
  return h("section.card.pad.how", h("h3", icon("bulb"), bn ? " কীভাবে শিখবে" : " How you'll learn"), h("div.how-grid", items.map(([n, a, b]) => h("div.how-item", h("span.how-n", n), h("b", a), h("p", b)))));
}
