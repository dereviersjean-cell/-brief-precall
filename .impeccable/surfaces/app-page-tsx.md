---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: []
---

# Landing (/)

Scope: the public home page `app/page.tsx` (+ `app/components/landing/*`, `.landing` scope in `app/globals.css`). Visitor mode: **Persuade**.

Audience & job: the French SME/ETI sales director decides for the team; the rep may try alone. They must leave believing Brief scores calls against *their own* method and makes the whole team close more. Action: « Essayer gratuitement » (Google/Microsoft sign-up, briefs only) — secondary: book a call for analysis & team follow-up.

Constraints: light grounds only (final CTA block excepted); accent = brand blue #2A5CE0; French typography (NBSP); `<title>` stays « Brief »; no Tasks/Quotes; every figure is real or labelled as an example; no invented logos, customers or results (Jean approved real ones, none supplied yet). Reduced motion respected; mobile first-class.

## Direction contract

THESIS: One deal, followed end to end. The page is a single meeting — Valdor Emballages, Thursday 14:30 — travelling through Préparer → Débriefer → Progresser, the product object transforming as you scroll. Refuses the category default: a split hero over three equal feature cards.

OWN-WORLD: Apple product-page grammar on cool near-white grounds. Brand blue #2A5CE0 is the only chroma and does real jobs (active step, live cursor, the team's grid, primary action). Huge tight-tracked Geist statements, two-tone headlines (ink claim + muted continuation), product documents as white sheets with hairline borders and one soft long shadow; tabular figures; no gradients, no glass, no icon tiles.

STORY: First viewport: the offer + the brief writing itself. Then the pinned journey, under a persistent meeting timeline (Wednesday 18:00 → Thursday 15:20 → Monday 08:00) filled by scroll: the brief compiles from its sources, the call is scored on the manager's grid (R1/R2/R3 toggle re-scores live), the objection lands in the team library. Then managers, proof, integrations, FAQ, close. Visitor understands the mechanism, believes it is *their* method, signs up or books.

FIRST VIEWPORT: Centred statement « Augmentez votre taux de closing. » at ~96px desktop / 44px mobile, one-line muted subline, primary blue pill + secondary pill centred beneath; the brief sheet rises below at near-real scale, its fields typing in with a blue caret, its top edge visible above the fold at 1440×900 and 390×844.

FORM: grounded candidate 1 (« Un deal, trois moments »), chosen by Jean over the Apple one-idea-per-screen gallery and the SaaS canon; seed 8f2c2c7e. Signature interaction: sticky product object that changes state per step (blur-crossfade, IntersectionObserver) under a timeline whose fill is CSS scroll-driven where supported (stepwise fallback). Revised after the finish review of 12/10/2026: no hero-to-step morph, plus the R1/R2/R3 grid toggle that re-weights the score.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
