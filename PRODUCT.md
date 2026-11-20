# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary buyer (the landing must convince them first):** the sales director (directeur commercial) of a French B2B SME/ETI — software publishers, consulting firms, B2B agencies, industry and services, specialised recruitment. They decide for the team and sign the 8-week guided programme. Confirmed by Jean, 12/10/2026.
- **Day-to-day user:** the field or inside sales rep (commercial) who prepares meetings, runs video calls and wants to close more. Can sign up alone with Google or Microsoft and prepare up to 10 briefs a day without a card.

## Product Purpose

Brief turns more opportunities into customers. It prepares every meeting (a brief on the prospect, ready the day before), debriefs every call (a bot records the video call, the AI answers three questions: what was said, where the deal stands, what to do next), and keeps each deal moving — one priority per deal, the commitments made on both sides, the CRM filled in on its own. Success = reps arrive prepared, every call is debriefed, no deal goes quiet unnoticed, and the manager works from the deals that need him first.

## Positioning

**Deals that move, not calls that get graded** (rewritten 20/11/2026, after the end of the 0-5 score on 05/11/2026 and the GTM framing of 19/11/2026). Brief reads a call against the team's own method — what a meeting must have obtained at the sales stage it belongs to, the team's own objections and their expected answers, the client references worth citing — and turns it into the state of the deal: one priority, the commitments taken, what is missing to advance, and the HubSpot properties updated without the rep typing anything. Modjo, Gong and Sybill grade a conversation on a generic grid; Brief answers « does this deal move, and what do I do next ». Secondary: built for the French market (French legal data, EU hosting, accessible price).

Note on the former positioning: « Scoring against YOUR method » (Jean, 12/10/2026) is dead. Nothing in the product gives a note out of 5 any more — not the app, not the site, not the help base (migration 044).

## Operating Context

- Reps live in Google Calendar or Outlook, Google Meet / Teams / Zoom, Gmail or Outlook mail, and a CRM (HubSpot, Pipedrive).
- Brief delivers its output where they already work (calendar event description, email, CRM notes, Slack DM) — the rep should not have to come to Brief to benefit from it.
- Sales is sold as a guided programme: 8 weekly review points, one module opened per week (playbook, follow-up emails, objections, CRM, training…).

## Capabilities and Constraints

- Free self-serve access: briefs only, 10 per day per user. Call analysis and team follow-up are set up with Oliverlist (booking link + mailto in `lib/sales-contact.ts`).
- Tasks and Quotes were removed from the product on 03/11/2026 (and the help article on tasks deleted by migration 044); the site must never mention them. Performance (/dashboard and its tabs), Équipe (/team) and the playbook grid (/playbook) left the sidebar on 27/10 and 05/11/2026: the pages stay reachable by URL, nothing public may describe them.
- Training (roleplay) is a paid add-on, locked by default.
- Recordings via Recall.ai, EU region only; participants are informed of the recording.
- French copy throughout; French typography (non-breaking spaces before `: ; ? !` and inside « »).

## Brand Commitments

- Name: **Brief**, published by **Oliverlist**. The page `<title>` must remain exactly « Brief » (Google OAuth verification).
- App brand blue **#2A5CE0**. Jean asked on 12/10/2026 for the landing accent to be blue rather than green.
- Light backgrounds on the landing, with two exceptions: the final CTA block (Jean, July 2026) and the hero, a 3D clay illustration of the three moments (folder, call microphone, podium) fading into an ink-blue panel with the title in white, lemlist/Clay style (Jean, 12/10/2026 — a team photo was tried and rejected).
- **No visible link to Oliverlist on the landing for now** (Jean, 12/10/2026): no « édité par Oliverlist », contact address contact@brief-ai.fr. Legal pages not touched. No visible mention that photos are AI-generated (Jean, 12/10/2026); sample data stays labelled as fictional.
- Hero promise since the V2 of 19/11/2026 (Hubert's GTM framing, approved by Jean): « Transformez davantage de vos opportunités en clients. » One single call to action across the whole site, « Voir Brief en action », pointing at the booking link (`CTA_LABEL` in `SiteChrome.tsx`); « Essayer gratuitement » is no longer on the site — self-serve signup is reachable from « Se connecter ». Dead promises, do not bring them back: « Briefs, débriefs, coaching : on s'en charge, vous closez. », « Quatre leviers. Un seul objectif : le ROI. », « Trois moments. Un seul objectif : le closing. », « Augmentez votre taux de closing ». The four numbered levers (Préparer / Débriefer / Progresser / Structurer) are gone with them.
- Home page order since 19/11/2026: promise → three pains (`PainSection`) → the solution for both audiences (`SolutionSection`: the deal page for reps, « Suivi des deals » large for directors) → reassurance (`ReassuranceSection`) → final CTA. The screen replicas are `DealsBoard.tsx` (Suivi des deals, deal list plus the selected deal's card, autoplay demo cursor that stops as soon as the visitor takes the mouse), `AnalysisObject` (a meeting in three questions), `DealObject` (a deal page), `MeetingPairObject` (brief before / analysis after) and `MethodPreview.tsx` (the Méthode page). Deleted with the old positioning, do not resurrect: `PerformanceDashboard.tsx`, `UpcomingMeetings.tsx`, `PlaybookPreview.tsx`, `MethodObject`, `TeamSection`, `ManagerSection`, `WeekSection`, `AccompanimentTeaser`. A week-calendar view was tried and rejected: show the app's real screens, not invented ones. A radar-style animated board was rejected too (« ça fait jeu vidéo ») — that screen stays sober: light background, one accent colour, nothing spinning.
- No scroll-pinned hero any more (removed 12/10/2026: it animated layout properties and stuttered). Scroll-driven motion on the landing must stay composited-only (opacity, transform). Fictional team: Thomas, Julie, Karim, Léa.
- No AI-generated testimonial video, ever: a testimonial must be a real customer on camera, with consent.
- The person from Brief who runs the 8-week programme is « un expert de l'équipe Brief » / « votre expert », never « coach » (Jean, 13/10/2026). « Coaching » stays for what managers do with their reps.

## Evidence on Hand

- **Testimonials** — all real: Camille Duval (confirmed by Jean 12/10/2026) and eight more sent by Jean on 13/10/2026, each person having agreed to be quoted by name with an AI-generated portrait. Companies are described, not named.
- **Product screens** — the real app can be captured from the `/demo/*` routes (sample data in `lib/demo-data.ts`, objection « équipe commerciale interne »). Since 20/11/2026 `/demo/feedback` renders the current library screen (`CallLibrary`), not the retired scored view. `/demo/dashboard`, `/demo/scores`, `/demo/analytics` and `/demo/playbook` still exist, like the app pages they mirror, but they show retired features: never capture them for the site. Sample data must be labelled as such.
- **Client logos** — the band « L'équipe derrière Brief a accompagné les équipes commerciales de… » was removed from the hero on 19/11/2026 at Jean's request; the files stay in `public/landing/logos/`. Known brands (Renault, Carrefour, Airbus, Orange, SNCF, Leroy Merlin, Schneider Electric, Dassault Systèmes — Simple Icons, in `public/landing/brands/`) appear only as the companies of the sample deals, with a footnote saying the team, situations and amounts are fictional. Never caption any logo as a Brief customer. Brief-specific logos and measured results: none on hand; do not fabricate them.
- **People imagery** — AI-generated portraits and scenes (Higgsfield, `public/landing/people/`) are allowed for fictional sample people (Claire Mercier, Thomas Lefèvre, Hugo Ravel — also shown as the video-call tiles of the analysis example) and for illustrative scenes. Fictional companies get drawn colour logos (`app/components/landing/brands.tsx`). Integration logos are the real tools' logos (`public/landing/stack/`). Testimonials show illustrative AI portraits, with each person's consent, and the section says so (« Portraits d'illustration »). Replace them with real portraits if provided.
- All other figures on the landing (deal amounts, counts, percentages) are illustrative examples and must be presented as such.

## Product Principles

1. One promise — closing rate. Anything that does not serve preparing, debriefing or progressing stays off the page.
2. The team's method, not ours: the Méthode page — objectives per sales stage, the team's objections and expected answers, its client references — is the reference everything is read against. No grade, no score out of 5.
3. Facts over impressions: show real product output, never decorative claims.
4. Meet reps where they work: delivery into calendar, email, CRM.
5. Never show a number that is not real or not labelled as an example.

## Accessibility & Inclusion

WCAG AA contrast (light theme only: the dark variant was removed on 19/11/2026 at Jean's request); touch targets ≥ 40 px on mobile; reduced-motion respected (fade instead of movement).

## Site structure (19/11/2026)

The public site is split into pages, like lemlist, PayFit or uptoo (Jean's decision). Menu since the V2 of 19/11/2026: `Accueil · Produit ▾ · Comment ça marche`, where Produit opens the two audience pages. `/` (promise, three pains, the solution for both audiences, reassurance, final CTA), `/directeurs-commerciaux` (Suivi des deals and its three benefits, then the Méthode page and the week's wrap-up), `/commerciaux` (three promises, then the sticky `RepJourney` sequence: deals, meetings, follow-up), `/accompagnement` = « Comment ça marche » (4 levers + 8-week programme + FAQ), `/integrations` and `/securite` (footer only; `/securite` is aligned with the privacy policy and says plainly that AI analysis runs on Anthropic). `/produit` is a `permanentRedirect` to `/commerciaux`. Shared sections live in `app/components/landing/sections.tsx`, the nav/footer/font in `SiteChrome.tsx`. Light theme only since 19/11/2026. No pricing page until pricing is decided; no blog or case studies until real content exists. The home page must keep the `<title>` « Brief » and explain what Brief does (Google OAuth verification). New public pages must stay out of the `middleware.ts` matcher and be added to `app/sitemap.ts`.


Each inner page opens with `PageHero` and its own clay illustration (`public/landing/art-produit.jpg`, `art-accompagnement.jpg`, `art-integrations.jpg`, `art-securite.jpg`): a right-hand panel on desktop blended into the page's ink colour, an image below the lead on mobile. Same 3D clay style as the home hero, no text in the images. The animation Jean wants on the home page is the 3-moments sequence (steps that come down one after another, as on `/produit`), not the self-writing brief, which was removed from under the hero (12/10/2026). In that sequence each step sits on a vertical rail that fills as you read, and each product view rises in from below with its own colour panel and is sized to fit the screen on its own.

Testimonials (13/10/2026): a carousel of three large testimonials (portrait + quote, auto-advancing every 8 s, paused on hover, focus or off-screen) followed by six cards, all real (`app/components/landing/testimonials-data.ts`). The `fictional: true` guard stays: any mock testimonial must carry it, which removes it from the production build (`VERCEL_ENV=production`) and shows a banner while it is on screen.
