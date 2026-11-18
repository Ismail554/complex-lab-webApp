# Complex Lab — MATH 2361 interactive mathematics laboratory

A visual, interactive learning and exam-prep app for **Complex Variable & Fourier Transformation** (Sets 01–02), built from the course sheets in the parent folder.

## Run it

```powershell
cd "D:\Complex variable & fourier transformation\math-lab"
npm install      # first time only
npm start        # → http://localhost:5173
```

No build step: the app is plain ES modules served by `server.mjs`.

## What's inside

| Area | What it does |
|---|---|
| **Learn** | 15 step-by-step visual lessons (EN + বাংলা). Each step drives a live lab, and a Socratic checkpoint gates the next step. Every lesson ends with a Feynman "explain it back" step that scores your explanation. |
| **Labs** | 9 interactive labs: Argand playground (+ − × ÷, conjugate, inverse, distance, triangle inequality), powers of i / zⁿ spirals, polar form explorer, circles & neighbourhoods & limit points, function mapper w = f(z) (morph, domain colouring, custom f), ε–δ limit machine (uniform continuity), path test for limits, derivative-from-all-directions (with a Cauchy–Riemann preview), Fourier series preview. |
| **Practice** | All 67 assignment questions + 10 practice extras. Numerical answers are auto-checked (complex numbers, angles, and expressions like u(x,y) checked by random sampling). Guided solutions are revealed step by step. Definitions and proofs are marked against key-point rubrics, with a model answer and self-assessment. 20 generators produce unlimited fresh problems. |
| **Mock Test** | Timed tests (6, 10 or 14 questions) weighted toward your weak topics. They are auto-marked, with a per-topic breakdown and a full review. |
| **Smart Revision** | Formula cards that are due (Leitner spaced repetition), past mistakes, and weak or fading topics, plus a 10-minute mixed sprint. |
| **Progress & Map** | Mastery with a forgetting curve, a knowledge map with prerequisite arrows (uploaded topics appear as new nodes), weak-topic detection with reasons, an activity heatmap, the score trend, and export/import of your progress. |
| **Jarvis tutor** | Chat drawer. Offline it runs a Socratic engine: quizzes from lessons and generators, a hint ladder, answer checking, a complex calculator (`polar -1+sqrt(3)i`), and replies in Bangla or English. With credentials it uses Claude. |
| **Library & Upload** | Drop `.md .pdf .txt .tex .html` files at any time. The app finds sections, exam questions, worked examples, definitions (turned into flashcards) and formulas. It links them to existing topics and creates new knowledge-map nodes for future topics (Cauchy–Riemann, Fourier series and transform, residues…), which are linked to the matching lab. |

## Adding new study material (no rebuild)

* **Upload** on the Library page. The file is stored in the browser and also copied to `materials/`.
* **Or copy files into `math-lab/materials/`.** The app scans this folder on load and every 45 seconds.
* `.md` files in the parent course folder are picked up too. The `raw_pdf_materials/` folder is ignored.

## AI tutor (Gemini) and custom instructions

* The Gemini key lives in `math-lab/.env` as `GEMINI_API_KEY=...`. Only the local server reads it; the browser never sees it, and `.env` is git-ignored. The model defaults to `gemini-2.5-flash`; you can override it with `GEMINI_MODEL=...` in `.env`.
* **`tutor-instructions.md`** holds the tutor's custom instructions (in Bangla): its persona, language rules, Socratic and Feynman teaching style, syllabus, course conventions and formatting. Edit the file and the next message uses it, no restart needed.
* The app also tells the tutor which lesson you're on, that lesson's key formulas and your weakest topics.
* If there's no key, or Gemini fails, Jarvis falls back to the offline Socratic tutor. A Claude key (`ANTHROPIC_API_KEY`) is used as a backup if present.
* Teaching language defaults to Bangla (বাংলা). Use the 🌐 button to switch to English.

## Answer input tips

`2-3i`, `3/13 - 4/13 i`, `sqrt(13)`, `3sqrt(2)`, `2pi/3`, `x^3 - 3x*y^2`, `5/(z+2)^2`, `e/4` (for ε/4). Prefixes such as `z =` are ignored.

## Tests

```powershell
npm test
```

This runs the logic checks: the parser, the answer checker, every bank answer and every generator.
