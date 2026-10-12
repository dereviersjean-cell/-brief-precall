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

STORY: First viewport: the offer + a brief in the real product's format (accroche by first name, overview, pain points ending « Question : … », news with source · date, enriched contact, call objectives, sector vocabulary) writing itself. Pinned hero (lg): the title fades, the brief lifts to be read whole, then folds (secondary sections collapse) and docks at the exact measured slot of the « Préparer » stage object while the method intro appears left; handoff: the sequence (overlapping the hero end) fades in at that slot, rail included — no cut. Then the sticky journey: the same brief annotated with each block's source, the call analysis in the real /feedback format (speaker timeline, weighted playbook dimensions, R1/R2/R3 manager consigne toggle), the objection restitution (bullets, verbatim, what should have been said, extract). Then problem, managers (dimension scores + real weekly digest sections), proof, integrations, FAQ, close. All examples fictional, labelled « Exemple au format réel ».

FIRST VIEWPORT: Centred statement « Augmentez votre taux de closing. » at ~96px desktop / 44px mobile, one-line muted subline, primary blue pill + secondary pill centred beneath; the brief sheet rises below at near-real scale, its fields typing in with a blue caret, its top edge visible above the fold at 1440×900 and 390×844.

FORM: grounded candidate 1 (« Un deal, trois moments »), chosen by Jean; seed 8f2c2c7e. Signature interactions: (1) pinned hero whose brief folds and docks into the journey's first stage object (CSS view-timeline --hero shared via timeline-scope, geometry measured by HeroStage), (2) sticky journey stage with scroll-filled meeting timeline, measured zoom-to-fit, (3) R1/R2/R3 consigne toggle re-scoring the same call. Revised 12/10/2026 after Jean asked for the hero→step morph and real-format previews.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
