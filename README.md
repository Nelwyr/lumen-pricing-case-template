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

- [x] **Data**: The tool handles survey responses, competitor pricing, channel economics, cost structure, marketing funnel figures and regional market context. The survey is the only sensitive source: `data/customer_survey.csv` carries `first_name`, `last_name`, `email` and `respondent_id`. **We chose not to use any of them.** `scripts/prepare_app_data.py` aggregates the 420 responses by city and by city × segment, and writes only those aggregates to `data/app_data/`. No direct identifier is ever loaded by the browser. The cost of that choice is real and we accept it: we lose within-group distributions — a city × segment average can hide two very different sub-populations — and we can no longer test at respondent level whether price sensitivity actually explains purchase intent inside a segment, which is the mechanism our pricing recommendation rests on.

- [x] **API keys**: No external API is called. The app is fully static HTML, CSS and JavaScript, with no build step and no server-side code, so there is no key to store anywhere.

- [x] **Deployment**: We did not deploy a public demo. If we did, the honest answer is that the app itself only ever fetches the anonymised files under `data/app_data/`, but the original case CSVs still sit in this public repository — a static file server would serve them like any other file. The app's limited fetches are a design choice, not an access-control boundary, and a real deployment would need the raw survey removed from the served directory.

- [x] **Files generated along the way**: Yes, and we committed them deliberately. `data/app_data/` holds `customer_city_aggregates.csv`, `customer_segment_city_aggregates.csv`, `historical_sales_weekly_deduplicated.csv`, `simulator_assumptions.json` and `city_prioritisation.json`. They are committed because the app cannot run without them and because they are the anonymised layer we want reviewers to see. All of them are regenerated from the source CSVs by a single command (`py -3 scripts/prepare_app_data.py`), so nothing in the repository is a hand-edited artefact nobody can reproduce. Screenshots and temporary test output were not committed.

- [x] **Storage**: Nothing is stored at runtime. No database, no cookies, no browser storage, no session state — reload the page and every input returns to its default. Data lives in two prepared formats under `data/app_data/`: CSV for flat aggregates, JSON where values are already joined across sources (regional market size × city survey aggregates, or the simulator's model assumptions). We chose prepared files over reading the raw CSVs in the browser precisely so that the anonymisation happens once, in a script we can audit, rather than being re-implemented in front-end code every time.

- [x] **Robustness**: Covered by 22 automated browser checks on the simulator and 27 on the city screen, including a 390px viewport. Concretely: channel mix shares that do not sum correctly are rejected; a non-positive or non-finite price, budget or CAC is refused with a readable message; setting all three city criteria to zero clears the ranking rather than showing a stale or empty table; a criterion identical across all cities scores 50 everywhere instead of dividing by zero; a candidate city whose sample falls below n=15 blocks the ranking outright; and a failed data load shows an explanatory message with a retry button instead of a blank screen.

- [x] **Explainability**: Every screen states its own method and its own limits. The simulator shows the contribution breakdown channel by channel and a signed gap to the 3:1 target, and it names in plain language which of Jonas or Elena the current setting serves and what is being given up. The city screen shows each criterion's contribution to the index, the rank movement against equal weights, and a "Scoring, sources and limits" panel that spells out the min–max formula, the fact that wellness density is a survey-composition proxy rather than a population measure, and that the index is a relative priority ranking, not a sales forecast. A non-technical reader can follow why a city moves without reading any code.

- [x] **Business relevance**: The brief asks for a price, a channel and a launch timing, and asks explicitly what is being given up. The simulator answers the first two and quantifies the sacrifice; the city screen answers where to start. We deliberately did not build features that would look impressive without answering the question — the launch-window and competitor-benchmark diagnostics are still marked as not built, and we would rather say so than ship a chart that adds nothing to the decision.

These questions aren't here to slow you down — they're part of what's being evaluated. A thoughtful answer to one of them is worth more than an extra feature nobody asked for.

## What We Expect at the End

- A prototype that works, even partially, on the LUMEN case
- Your prompt log (`prompts/<your-id>/session-*.md`) committed and up to date
- A short paragraph below, written in business language (not technical), explaining what you did and why
- A live URL (Vercel or similar) if you deployed it — not required to still get credit, but expected if you did

## Our Approach

LUMEN has never sold a can in Germany, so no tool can predict German volume. We built something narrower and more useful: a way to see what each choice costs.

The simulator lets you set a price, a channel mix, a marketing budget and an acquisition cost, and shows what that combination leaves in margin, how many customers it buys, and how long it takes to earn the money back. Its point is not to produce a number. It is to make the disagreement between Jonas and Elena visible: at €2.59 the margin is strong but only a quarter of the market accepts the price; at €1.79 acceptance is high but the mix never repays its own acquisition. Every setting says out loud which of the two it serves and what it sacrifices.

The city screen answers where to begin. Berlin, Munich, Hamburg, Cologne and Frankfurt are compared on market size, regional growth and the share of wellness-oriented respondents. You move the weights yourself, because the right answer depends on what the company is optimising for. Berlin leads under almost any weighting; the only way to displace it is to bet entirely on wellness density, and then Cologne wins on sixteen respondents. That fragility is part of the answer.

Two things shaped the build as much as the analysis. We found four duplicated rows in the historical sales file, which inflated volume and revenue until removed. And we chose never to load the name and email columns from the survey: the app works entirely on aggregates, which costs us the ability to study individual behaviour but means no screen can expose a respondent.

What the tool does not do is as important as what it does. It does not forecast German sales, estimate market share, or price in distribution access. Every figure that reaches beyond the home markets is an extrapolation, and the app says so on the screen where it matters.

### Running the app

Serve the repository over HTTP and open `index.html`. No framework, build or external API is required. Regenerate prepared inputs with `py -3 scripts/prepare_app_data.py`.

### City prioritisation — method

- Market size is the 2026 national functional-beverage total (€9.1bn) multiplied by Exhibit 1's illustrative regional share. Growth uses that exhibit's regional CAGR.
- Wellness density is explicitly a proxy: Urban Wellness Professionals divided by all survey respondents in the city. The preparation script writes this count into the city aggregate. It measures sample composition, not population or venue density.
- Each criterion is min–max scaled across the five named cities to 0–100. The weighted sum uses automatically normalised slider values. Equal weights are the starting comparison; ties share ranks, and all-zero weights clear the ranking. A constant criterion scores 50 for every city.
- City-level aggregates alone supply survey inputs to the score. All segment averages remain diagnostic and show their count and reliability: n≥15 reliable, 8–14 directional, below 8 insufficient (intent withheld). A candidate city below n=15 blocks the ranking. These flags do not establish survey representativeness or statistical confidence.
- Other Germany is contextual only because it combines multiple places. It is excluded from both ranking and normalisation.

### Simulator — method

- Unit contribution is recalculated from the retailer margin, distributor cut, payment processing and fulfilment coefficients in `channel_economics.csv`, not read from `price_test_results.csv`. The derived formula reproduces all nine Exhibit 11 values to within display rounding.
- Acceptance is linearly interpolated between the three tested prices (€1.79, €2.19, €2.59) and clamped outside that range.
- Scenario LTV is derived from the scenario's own contribution, not held constant. Customer lifetime is calibrated at 23.2 months on the assumption that `ltv_estimate_eur` in the funnel is net revenue. The source does not state the basis; the assumption is recorded explicitly in the prepared data as `observed_ltv_basis`. Treating it as contribution instead would imply a 6.4-year lifetime for a brand founded in 2022, which we rejected.

### Data handling

The browser loads only prepared files under `data/app_data/`. `city_prioritisation.json` joins city aggregates and regional assumptions, with segment diagnostics stored separately. It contains no individual survey records or direct identifiers. The original case CSVs remain in this repository; the app's limited fetches do not constitute an access-control boundary for a deployed file server.

Browser checks: `py -3 scripts/check_simulator_ui.py` for the simulator and `py -3 scripts/check_simulator_ui.py --page tests/city-ui.browser.html` for cities. To check an actual 390px iframe viewport, use `--page tests/city-ui.browser.html?viewport=390`. The runner uses installed Chrome without added dependencies.