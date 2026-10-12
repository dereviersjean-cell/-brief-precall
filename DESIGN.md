---
name: Brief — landing
description: Public home page of Brief. One deal followed end to end, on cool near-white grounds with the brand blue as the only working color.
colors:
  accent: "oklch(0.52 0.2 265)"
  accent-ink: "oklch(1 0 0)"
  accent-soft: "oklch(0.955 0.025 265)"
  warn: "oklch(0.55 0.13 55)"
  ground: "oklch(0.987 0.002 265)"
  surface: "oklch(1 0 0)"
  sunken: "oklch(0.968 0.004 265)"
  ink: "oklch(0.19 0.02 266)"
  muted: "oklch(0.49 0.018 266)"
  faint: "oklch(0.55 0.014 266)"
  line: "oklch(0.912 0.006 266)"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(46px, 7vw, 96px)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.04em"
    fontFeature: "\"ss01\""
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.5vw, 60px)"
    fontWeight: 600
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(28px, 3vw, 36px)"
    fontWeight: 600
    lineHeight: 1.12
    letterSpacing: "-0.03em"
  lead:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(18px, 1.6vw, 20px)"
    fontWeight: 400
    lineHeight: 1.625
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.625
  document:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "14.5px"
    fontWeight: 400
    lineHeight: 1.375
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
    lineHeight: 1.4
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
rounded:
  mark: "8px"
  small: "12px"
  sheet: "20px"
  block: "28px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-sm: "24px"
  sheet-x: "28px"
  section-y: "80px"
  section-y-lg: "128px"
  container: "1152px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "0 24px"
    height: "48px"
  button-secondary-hover:
    backgroundColor: "{colors.accent-soft}"
  button-nav:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  document-sheet:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sheet}"
    padding: "24px 28px"
  chip-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
    padding: "2px 8px"
  chip-term:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  segmented-control:
    backgroundColor: "{colors.sunken}"
    textColor: "{colors.muted}"
    rounded: "{rounded.pill}"
    padding: "4px"
    height: "36px"
  cta-block:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.block}"
    padding: "96px 48px"
---

# Design System: Brief — landing

> **Scope.** This system governs the **public landing page only**: `app/page.tsx`, `app/components/landing/*`, and the `.landing` block at the end of `app/globals.css` (custom properties `--land-*`, utilities `bg-land-*` / `text-land-*` / `border-land-*`, motion classes `land-*`). Every token here is defined under the `.landing` class and resolves nowhere else. The logged-in app keeps its own, older system (oklch tokens `--violet` / `--lavender` at the top of `app/globals.css`, primitives in `app/components/ui/ui-bits.tsx`, Inter Tight + Instrument Serif via `.brief-ui`, documented in CLAUDE.md under "Design system"). Do not apply these tokens to the app, and do not use the app's tokens on the landing. The two worlds share one fact: the brand blue (#2A5CE0).

## Overview

**Creative North Star: "The Product Page for One Deal"**

The landing reads like an Apple product page whose product is a single sales meeting. Huge, tight-tracked Geist statements sit on cool near-white grounds; the product appears as real documents (a brief, a scoring grid, an objection library) drawn as white sheets with a hairline border and one long, soft shadow. Nothing is a mock window or a fake sidebar: each sheet is an excerpt of what Brief actually produces, and each one says so in its footer ("Exemple. … fictifs.").

Density is low and deliberate: one idea per band, generous section padding, measured line lengths. Color is almost absent; the brand blue carries every job that needs attention (the primary action, the active step, the caret writing the brief, the team's weakest dimension, the decision-maker chip). Hierarchy comes from size and from a two-tone headline (claim in ink, continuation in faint grey), never from labels stacked above titles.

Motion has one strong moment (the pinned "un deal, trois moments" sequence) and three supporting gestures (the hero brief writing itself, charts tracing as they enter, FAQ answers opening). Headlines never move.

**Key Characteristics:**
- Cool near-white grounds alternating with pure-white bands, separated by hairlines.
- One chroma: brand blue, rendered `oklch(0.52 0.2 265)`.
- Geist only, semibold display with negative tracking; figures in tabular numerals, no monospace face.
- Product shown as white document sheets (20px corners, hairline, long soft shadow), always labelled as examples.
- Pills for every action and chip; no gradients, no glass panels except the nav, no icon tiles.
- French typography: non-breaking spaces before `: ; ? !` and inside « ».

## Colors

Cool neutrals tinted toward the brand hue (265), with one saturated blue that does real work.

### Primary
- **Brief Blue** (`accent`; brand #2A5CE0): primary and nav buttons, the final CTA ground, the step verb in Journey titles, the timeline fill, the active ScoreGrid bars (R2), the top performer's bar and percentage, the weakest playbook dimension, check marks, focus outlines, text caret, the blinking cursor in the hero brief.
- **Blue Wash** (`accent-soft`): ground for accent chips ("Décisionnaire", "Brief prêt"), the new-occurrence callout in the library, the testimonial initials disc, text selection, secondary-button hover.
- **On-Blue White** (`accent-ink`): text on the blue (buttons, final CTA); also the final CTA's inverted primary button ground.

### Secondary
- **Objection Amber** (`warn`): a single semantic use, the "Objection à 21:04, partiellement traitée" label inside the scoring grid. It marks a status inside a document, never a page-level accent.

### Neutral
- **Cool Paper** (`ground`): page ground and alternating bands (hero, statement, method, testimonial, FAQ), the nav at 80% with backdrop blur, the weekly-review email sheet.
- **White Sheet** (`surface`): document sheets and alternating bands (problem, manager, integrations).
- **Sunken Grey** (`sunken`): bar tracks, the segmented control well, the warn box, the right column of the hero brief (at 60%).
- **Ink** (`ink`): headline claims, document values, primary text. Also used at 70% for non-active ScoreGrid bars.
- **Muted Slate** (`muted`): sublines, body copy, document field labels, nav links.
- **Faint Slate** (`faint`): headline continuations, example footers, inactive timeline steps, non-highlighted bars (at 30–45%).
- **Hairline** (`line`): every border and divider.

### Named Rules
**The One Chroma Rule.** Brief Blue is the only hue on the page that signals anything. A second hue exists only as a status inside a product document (Objection Amber), never on page chrome.

**The Light Ground Rule.** Grounds alternate between Cool Paper and White Sheet, separated by a hairline top border. The final CTA block is the one colored ground on the page.

## Typography

**Display Font:** Geist (via `next/font`, variable `--font-land-sans`, fallback `ui-sans-serif, system-ui, sans-serif`), stylistic set `ss01` on.
**Body Font:** Geist.
**Label/Mono Font:** none. Figures and times use Geist with `tabular-nums`.

**Character:** One grotesk at every size; contrast comes from weight 600 at display sizes with tracking pulled to -0.03/-0.04em against relaxed 400 body text.

### Hierarchy
- **Display** (600, 46 / 68 / 96px, line-height 1, -0.04em): the hero statement only, max 14ch. The final CTA heading uses the same voice at 40 / 64px.
- **Headline** (600, 34 / 52 / 60px, 1.06, -0.035em): section h2, two-tone. Large statements (statement band 26 / 38px, testimonial 30 / 46px) follow the same two-tone logic.
- **Title** (600, 28 / 36px, 1.12, -0.03em): Journey step h3, verb in blue then claim in ink.
- **Lead** (400, 18 / 20px, relaxed): sublines under headlines, 38–56ch.
- **Body** (400, 15–16.5px, relaxed): step bodies, point lists, FAQ answers (max 62ch).
- **Document** (400–500, 14.5px, snug): values inside sheets; sheet titles at 17px semibold.
- **Label** (500, 12.5–13px): field labels inside sheets and figure captions, sentence case, never uppercase.
- **Figure** (600, 20–34px, tabular-nums, tight): key numbers (effectifs, CA, scores).

### Named Rules
**The Two-Tone Headline Rule.** A section headline is a claim in Ink followed by its continuation in Faint Slate. That is the only hierarchy above a section; there is no eyebrow or kicker.

**The Tabular Figure Rule.** Every number, time and score is set in Geist with `tabular-nums`; decimals use a French comma ("3,8"), and a non-breaking space separates a value from "%" or "/ 5".

## Layout

Single column of full-width bands, content held in a 1152px container (`max-w-6xl`) with 16px gutters (24px from `sm`). Statement and testimonial narrow to 1024px. Section padding is 80px vertical, 128px from `lg` (hero 56/80/96px top). Two-column splits appear only from `lg`: manager (1fr / 1.1fr), FAQ (0.8fr / 1.2fr), Journey (5fr text / 7fr object).

The Journey is the signature layout: on `lg` and up, each step's text occupies at least 78vh while the product object stays pinned (`sticky top-16`, full viewport height minus nav) and changes state; the column carries 22vh of trailing space so the pinned object never detaches early. Below `lg` nothing is pinned: each step shows its object directly under its text.

Breakpoints: `sm` 640px, `md` 768px, `lg` 1024px. The nav's anchor links and the Journey pin both switch at `lg`; below it, a drawer menu replaces the links. Touch targets are at least 40px (nav button 40px, menu toggle 44px, footer links `min-h-10` on mobile).

## Elevation & Depth

Flat bands, lifted documents. Page structure is drawn with hairlines and ground alternation; shadow is reserved for the product sheets that float above it.

### Shadow Vocabulary
- **Sheet lift** (`--land-shadow-lg`: `0 1px 2px oklch(0.19 0.02 266 / 0.04), 0 40px 80px -32px oklch(0.25 0.06 265 / 0.28)`): every product document (hero brief, compile sheet, score grid, objection library).
- **Panel lift** (`--land-shadow`: `0 1px 2px oklch(0.19 0.02 266 / 0.04), 0 24px 48px -24px oklch(0.19 0.02 266 / 0.18)`): the mobile menu drawer.

### Named Rules
**The Paper Rule.** Only product documents cast a shadow. Bands, cards of copy, the weekly-review email and the CTA block stay flat.

## Shapes

Three corner sizes and the pill: product documents at 20px, the final CTA block at 28px, small inner surfaces (warn box, chart bar tops) at 12px, and every button, chip, track and segmented control fully rounded. The brand mark is an 8px square. Borders are always 1px hairlines; the integrations groups are the single exception, topped by a 2px Ink rule.

## Components

### Buttons
Calm pills that press in.
- **Shape:** full pill, 48px tall (nav variant 40px, 36px from `lg`).
- **Primary:** Brief Blue ground, white 16px medium text, 24px horizontal padding, trailing arrow icon.
- **Hover / Focus:** `brightness(1.1)` on hover, `scale(0.98)` on press; focus is a 2px blue outline offset 2–3px.
- **Secondary:** transparent with blue text, Blue Wash ground on hover.
- **On the CTA block:** inverted (white ground, blue text) beside a ghost pill with a 35%-current border.

### Chips
- **Accent chip:** Blue Wash ground, blue 12px semibold text ("Décisionnaire", "Brief prêt").
- **Term chip:** white ground, hairline border, 13px ink text (sector vocabulary).

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** White Sheet; inner columns may use Sunken Grey at 60%.
- **Shadow Strategy:** Sheet lift (see Elevation).
- **Border:** 1px hairline; header and footer rows divided by hairlines.
- **Internal Padding:** 24px, 28px from `sm`.
- **Footer:** every sheet ends with a 12px Faint line stating it is an example.

### Navigation
Sticky 64px bar on Cool Paper at 80% with `backdrop-blur-xl` and a 70% hairline below. Brand mark left, five 14px muted anchors centred (hover to Ink), "Se connecter" and the nav button right. Below `lg`, a 44px round toggle opens a full-width drawer of 16px links divided by hairlines, with a bordered "Se connecter" pill; Escape closes it.

### Segmented Control
The R1 / R2 / R3 toggle: Sunken pill well with 4px padding, 36px pill buttons, the selected one lifted onto White Sheet with a small shadow; the detected stage carries a 6px blue dot.

### Journey (signature)
Three steps (Préparer / Débriefer / Progresser), a 2px timeline track with a blue fill driven by scroll timeline where supported (stepwise fallback from 15%), and a stage where the active object fades in and sharpens while the others recede with `blur(8px)`, scale 0.965 and ±28px. Inactive step text dims to 35% opacity. Rows inside the active object stagger in at 140ms.

### Motion
Standard easing `cubic-bezier(0.16, 1, 0.3, 1)` for entrances and state changes; writing mask `cubic-bezier(0.45, 0, 0.2, 1)`; chip pop `cubic-bezier(0.34, 1.4, 0.64, 1)`; FAQ height `cubic-bezier(0.23, 1, 0.32, 1)` over 260ms. Under reduced motion every movement becomes a 200–250ms fade.

## Do's and Don'ts

### Do:
- **Do** scope every new landing style under `.landing` and use the `land-*` utilities; never the app's `--violet` / `--lavender` tokens.
- **Do** write section headlines as a two-tone pair: Ink claim, Faint continuation.
- **Do** show the product as a white document sheet (20px corners, hairline, Sheet lift) with an example footer.
- **Do** set figures in Geist `tabular-nums` with French decimal commas and non-breaking spaces before `%`, `:`, `;`, `?`, `!` and inside « ».
- **Do** keep Brief Blue for jobs: the primary action, the active state, the one highlighted value.
- **Do** give every motion a reduced-motion fade and leave headlines static.

### Don't:
- **Don't** add eyebrows or kickers above headlines; the two-tone headline carries the hierarchy.
- **Don't** introduce a dark or colored band other than the final CTA block.
- **Don't** use gradients, glassmorphism beyond the nav bar, icon tiles, or a monospace face for numbers.
- **Don't** add a second accent hue to page chrome; Objection Amber stays inside documents as a status.
- **Don't** put shadows on bands or copy blocks; only product documents float.
- **Don't** draw fake app windows or sidebars around product excerpts.
