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
- Light backgrounds on the landing, with two exceptions: the final CTA block (Jean, July 2026) and the hero, a 3D clay illustration of the three moments (folder, call microphone, podium) fading into an ink-blue panel with the title in white, lemlist/Clay style (Jean, 12/10/2026 — a team photo was tried and rejected).
- **No visible link to Oliverlist on the landing for now** (Jean, 12/10/2026): no « édité par Oliverlist », contact address contact@brief-ai.fr. Legal pages not touched. No visible mention that photos are AI-generated (Jean, 12/10/2026); sample data stays labelled as fictional.
- Hero promise (Jean, 12/10/2026), PayFit-style: « Briefs, débriefs, coaching : on s'en charge, vous closez. » Subtitle: « La plateforme qui structure votre équipe commerciale autour de votre méthode… ». Closing stays the goal (« Trois moments. Un seul objectif : le closing. »). Earlier tries: « Augmentez votre taux de closing », « Structurez votre équipe commerciale ». Three pillars, same words as the app: Préparer / Débriefer / Progresser, always numbered 1-2-3 on the landing.
- The former « Votre meilleur commercial close 2 à 3 fois plus » section is replaced by « Votre équipe »: an interactive replica of Performance (`PerformanceDashboard.tsx`, data in `team-data.ts`) — app sidebar, Équipe/rep selector, tabs Vue d'ensemble / Scores / Analytics / Objections, same metrics, thresholds and rules as the app. Page order (Jean, 12/10/2026): hero → les 3 moments → « Votre équipe » with the interactive dashboard (autoplay demo cursor that stops as soon as the visitor takes the mouse) → « Vos prochains rendez-vous, déjà préparés », a static (non-interactive, Jean's choice) replica of the app's Brief page (`UpcomingMeetings.tsx`). Then « Vous fixez la méthode. Brief l'applique à chaque call. »: the app's Playbook page (`PlaybookPreview.tsx`) next to the director photo, then the Friday digest. The « Comment ça marche » statement (agenda + « Conçu pour les PME et ETI… ») was removed. A week-calendar view was tried and rejected: show the app's real screens, not invented ones.
- No scroll-pinned hero any more (removed 12/10/2026: it animated layout properties and stuttered). Scroll-driven motion on the landing must stay composited-only (opacity, transform). Fictional team: Thomas, Julie, Karim, Léa.
- No AI-generated testimonial video, ever: a testimonial must be a real customer on camera, with consent.

## Evidence on Hand

- **Testimonial** — Camille Duval, Head of Sales, B2B SaaS publisher. Real, confirmed by Jean 12/10/2026.
- **Product screens** — the real app can be captured from the `/demo/*` routes (realistic sample data: Camille Roussel progressing 2.6 → 3.4, objection « équipe commerciale interne »). Sample data must be labelled as such.
- **Client logos** — Oliverlist's client logos (`public/landing/logos/`, Jean's approval « on a le droit ») are back in the hero, captioned « L'équipe derrière Brief a accompagné les équipes commerciales de » — true, and without naming Oliverlist (Jean, 12/10/2026). Never caption them as Brief customers. Brief-specific logos and measured results: none on hand; do not fabricate them.
- **People imagery** — AI-generated portraits and scenes (Higgsfield, `public/landing/people/`) are allowed for fictional sample people (Claire Mercier, Thomas Lefèvre, Hugo Ravel — also shown as the video-call tiles of the analysis example) and for illustrative scenes. Fictional companies get drawn colour logos (`app/components/landing/brands.tsx`). Integration logos are the real tools' logos (`public/landing/stack/`). The Camille Duval testimonial shows an illustrative AI portrait: Camille agreed that any photo could accompany her words (Jean, 12/10/2026). Replace it with her real portrait if she provides one.
- All other figures on the landing (team closing rates, scores, percentages) are illustrative examples and must be presented as such.

## Product Principles

1. One promise — closing rate. Anything that does not serve preparing, debriefing or progressing stays off the page.
2. The team's method, not ours: the manager's playbook is the reference everything is judged against.
3. Facts over impressions: show real product output, never decorative claims.
4. Meet reps where they work: delivery into calendar, email, CRM.
5. Never show a number that is not real or not labelled as an example.

## Accessibility & Inclusion

WCAG AA contrast in light and dark modes; touch targets ≥ 40 px on mobile; reduced-motion respected (fade instead of movement).

## Site structure (12/10/2026)

The public site is split into pages, like lemlist, PayFit or uptoo (Jean's decision): `/` (short showcase: hero, the full animated 3-moments sequence, interactive Performance dashboard, accompaniment teaser, testimonial, FAQ, final call to action), `/produit` (full 3-moments sequence, Brief page, Playbook and Friday digest), `/accompagnement` (4 levers + 8-week programme), `/integrations`, `/securite` (aligned with the privacy policy; says plainly that AI analysis runs on Anthropic). Shared sections live in `app/components/landing/sections.tsx`, the nav/footer/font in `SiteChrome.tsx`. No pricing page until pricing is decided; no blog or case studies until real content exists. The home page must keep the `<title>` « Brief » and explain what Brief does (Google OAuth verification). New public pages must stay out of the `middleware.ts` matcher and be added to `app/sitemap.ts`.


Each inner page opens with `PageHero` and its own clay illustration (`public/landing/art-produit.jpg`, `art-accompagnement.jpg`, `art-integrations.jpg`, `art-securite.jpg`): a right-hand panel on desktop blended into the page's ink colour, an image below the lead on mobile. Same 3D clay style as the home hero, no text in the images. The animation Jean wants on the home page is the 3-moments sequence (steps that come down one after another, as on `/produit`), not the self-writing brief, which was removed from under the hero (12/10/2026). In that sequence each step sits on a vertical rail that fills as you read, and each product view rises in from below with its own colour panel and is sized to fit the screen on its own.

Testimonials (12/10/2026): a carousel of large testimonials (portrait + quote, auto-advancing every 8 s, paused on hover, focus or off-screen) followed by three cards with a key figure. Only Camille Duval's testimonial is real. The others (people, companies, quotes and figures) are invented for internal discussion at Jean's request and are flagged `fictional: true` in `app/components/landing/testimonials-data.ts`: they are removed from the production build (`VERCEL_ENV=production`), and while they are on screen a banner says so. Replace them with real, validated testimonials before going live.
