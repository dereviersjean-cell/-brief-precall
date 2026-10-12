# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary buyer (the landing must convince them first):** the sales director (directeur commercial) of a French B2B SME/ETI — software publishers, consulting firms, B2B agencies, industry and services, specialised recruitment. They decide for the team and sign the 8-week guided programme. Confirmed by Jean, 12/10/2026.
- **Day-to-day user:** the field or inside sales rep (commercial) who prepares meetings, runs video calls and wants to close more. Can sign up alone with Google or Microsoft and prepare up to 10 briefs a day without a card.

## Product Purpose

Brief raises a sales team's closing rate. It prepares every meeting (a brief on the prospect, ready the day before), debriefs every call (a bot records the video call, the AI scores it against the team's own playbook), and spreads what wins across the team (shared objection library, per-dimension progress). Success = reps arrive prepared, every call is debriefed, and the manager coaches on facts.

## Positioning

**Scoring against YOUR method** (confirmed by Jean, 12/10/2026): each call is scored on the manager's own playbook — their dimensions, criteria and weighting — with stage-specific instructions (R1 discovery, R2 presentation, R3 closing, detected from the meeting title), and objections are classified into the team's own categories. Gong and Sybill score on a generic grid. Secondary: built for the French market (French legal data, EU hosting, accessible price).

## Operating Context

- Reps live in Google Calendar or Outlook, Google Meet / Teams / Zoom, Gmail or Outlook mail, and a CRM (HubSpot, Pipedrive).
- Brief delivers its output where they already work (calendar event description, email, CRM notes, Slack DM) — the rep should not have to come to Brief to benefit from it.
- Sales is sold as a guided programme: 8 weekly review points, one module opened per week (playbook, follow-up emails, objections, CRM, training…).

## Capabilities and Constraints

- Free self-serve access: briefs only, 10 per day per user. Call analysis and team follow-up are set up with Oliverlist (booking link + mailto in `lib/sales-contact.ts`).
- Tasks and Quotes modules are hidden; the landing must never mention them.
- Training (roleplay) is a paid add-on, locked by default.
- Recordings via Recall.ai, EU region only; participants are informed of the recording.
- French copy throughout; French typography (non-breaking spaces before `: ; ? !` and inside « »).

## Brand Commitments

- Name: **Brief**, published by **Oliverlist**. The page `<title>` must remain exactly « Brief » (Google OAuth verification).
- App brand blue **#2A5CE0**. Jean asked on 12/10/2026 for the landing accent to be blue rather than green.
- Light backgrounds only on the landing; the final CTA block is the single exception (Jean, July 2026).
- Promise: « Augmentez votre taux de closing ». Three pillars, same words as the app: Préparer / Débriefer / Progresser.

## Evidence on Hand

- **Testimonial** — Camille Duval, Head of Sales, B2B SaaS publisher. Real, confirmed by Jean 12/10/2026.
- **Product screens** — the real app can be captured from the `/demo/*` routes (realistic sample data: Camille Roussel progressing 2.6 → 3.4, objection « équipe commerciale interne »). Sample data must be labelled as such.
- **Client logos and measured results** — Jean approved showing them (12/10/2026), but **none are on hand in the repo**. Do not fabricate logos, customer names or result figures; add them only when Jean supplies them with the client's agreement.
- All other figures on the landing (team closing rates, scores, percentages) are illustrative examples and must be presented as such.

## Product Principles

1. One promise — closing rate. Anything that does not serve preparing, debriefing or progressing stays off the page.
2. The team's method, not ours: the manager's playbook is the reference everything is judged against.
3. Facts over impressions: show real product output, never decorative claims.
4. Meet reps where they work: delivery into calendar, email, CRM.
5. Never show a number that is not real or not labelled as an example.

## Accessibility & Inclusion

WCAG AA contrast in light and dark modes; touch targets ≥ 40 px on mobile; reduced-motion respected (fade instead of movement).
