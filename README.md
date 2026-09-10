# LUMEN — Pricing & Go-to-Market Case — ATELIA × ESCP Starter Kit

> This repo is your starting point. Codex should read this README first.

## How to Get Started

This repo is a **template**: click **Fork** (top right), not "Use this template." Fork keeps your copy linked back to the original — that's what lets ATELIA automatically find every team's work, without anyone needing to send a link.

Once you've forked it, add your teammates as collaborators (Settings → Collaborators on your fork), and leave the visibility as **Public** — don't switch it to Private, or we lose access to your work.

## The Brief

The full brief is in `LUMEN_Case_Brief.md` (and a formatted version in `LUMEN_Case_Brief.pdf`). The data is in the `data/` folder, documented in `data/README_data.md`.

One-sentence summary: LUMEN, a functional beverage brand, has to decide **price, positioning, and launch channel(s)** to enter the German market — with no real German sales data (LUMEN isn't there yet), and a real trade-off between the CMO (premium positioning) and the CFO (fast return on investment).

## Rule #1 — Prompt Logging Is Automatic

This repo includes an `AGENTS.md` file, which Codex reads automatically at the start of every task — you don't need to open or edit it. The first time you talk to Codex in a new conversation, it will ask for your **student ID**. Answer it, and from then on Codex logs every prompt you send it — automatically, verbatim — into `prompts/<your-id>/session-*.md`, without you doing anything else.

**You don't fill this in by hand.** Your only job is to make sure that log file gets committed along with your code changes — Codex writes it, but you still need to include it when your pull request is created and merged. If a pull request only has code changes and no updated log file, that's a sign something didn't get logged.

Why we're doing this: it's not to monitor you. It's what lets us understand, at the end, how you reasoned — not just what you produced. A good result reached with a clear prompt from the start isn't scored the same as a good result reached after fifteen random attempts.

## Rule #2 — Before You Code, Ask Yourself These Questions

Check each box in this README as you go — not at the end, while you're working:

- [ ] **Data**: what data will your tool actually handle? Is any of it sensitive (personal data, company customer data)? `data/customer_survey.csv` has name/email columns — did you use them in your tool? If yes, how did you protect/anonymize them? If no, why did you choose not to expose them? (A team that never touches these columns should still be able to answer — "we chose not to use them" is a valid answer.)
- [ ] **API keys**: if your tool calls an external API (weather, or anything else), where is the key stored? Never hardcoded in a file committed to GitHub. (A valid answer: "we didn't use any external API.")
- [ ] **Deployment**: if you deployed a live demo, does any endpoint or response return raw, unfiltered data (e.g. the full survey with name/email) to any visitor?
- [ ] **Files generated along the way**: if your tool (or Codex) created new files derived from the provided data, did you think about whether they should be committed to the repo or not?
- [ ] **Storage**: if you're keeping any data, in what structure, and why that choice over another?
- [ ] **Robustness**: what happens if the user gives an empty, inconsistent, or unexpected input?
- [ ] **Explainability**: can you explain to someone non-technical why your tool does what it does?
- [ ] **Business relevance**: does your prototype actually answer the problem posed in the brief, or is it an interesting technical build that's off-target?

These questions aren't here to slow you down — they're part of what's being evaluated. A thoughtful answer to one of them is worth more than an extra feature nobody asked for.

## What We Expect at the End

- A prototype that works, even partially, on the LUMEN case
- Your prompt log (`prompts/<your-id>/session-*.md`) committed and up to date
- A short paragraph below, written in business language (not technical), explaining what you did and why
- A live URL (Vercel or similar) if you deployed it — not required to still get credit, but expected if you did

## Our Approach

The simulator compares price and channel choices through contribution, acquisition and return, with an explicit leadership trade-off. City prioritisation answers where to begin: change the relative importance of market size, regional growth and wellness survey share to see which cities move up or down. The index supports a discussion about priorities; it does not forecast city sales or ROI.

### City prioritisation

Serve the repository over HTTP and open `index.html#cities`. No framework, build or external API is required. Regenerate prepared inputs with `py -3 scripts/prepare_app_data.py`.

- Market size is the 2026 national functional-beverage total (€9.1bn) multiplied by Exhibit 1's illustrative regional share. Growth uses that exhibit's regional CAGR.
- Wellness density is explicitly a proxy: Urban Wellness Professionals divided by all survey respondents in the city. The preparation script writes this count into the city aggregate. It measures sample composition, not population or venue density.
- Each criterion is min–max scaled across the five named cities to 0–100. The weighted sum uses automatically normalised slider values. Equal weights are the starting comparison; ties share ranks, and all-zero weights clear the ranking. A constant criterion scores 50 for every city.
- City-level aggregates alone supply survey inputs to the score. All segment averages remain diagnostic and show their count and reliability: n≥15 reliable, 8–14 directional, below 8 insufficient (intent withheld). A candidate city below n=15 blocks the ranking. These flags do not establish survey representativeness or statistical confidence.
- Other Germany is contextual only because it combines multiple places. It is excluded from both ranking and normalisation.

The browser loads only prepared files under `data/app_data/`. The new `city_prioritisation.json` joins city aggregates and regional assumptions, with segment diagnostics stored separately. It contains no individual survey records or direct identifiers. The original case CSVs remain in this repository; the app's limited fetches do not constitute an access-control boundary for a deployed file server.

Browser checks: `py -3 scripts/check_simulator_ui.py` for the simulator and `py -3 scripts/check_simulator_ui.py --page tests/city-ui.browser.html` for cities. To check an actual 390px iframe viewport, use `--page tests/city-ui.browser.html?viewport=390`. The runner uses installed Chrome without added dependencies.
