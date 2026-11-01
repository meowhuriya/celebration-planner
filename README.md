# Celebrate 🎉

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-580%20Passing-brightgreen?style=flat&logo=vitest)](https://vitest.dev/)
[![A11y](https://img.shields.io/badge/WCAG%202.1-AA%20Compliant-purple?style=flat)](https://www.w3.org/WAI/WCAG21/AA/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-3.5%20Flash%20Lite-orange?style=flat&logo=google)](https://ai.google.dev/)

**Event planning, made easy.** Tell Celebrate about a wedding, birthday, or community gathering and get a comprehensive, culturally tailored plan in seconds: budget, timeline, vendor checklist, creative ideas, a day-of schedule, and a contingency backup plan. Then use built-in browser CAD tools to design the venue, seat every guest, and send personal QR invitations.

- 🌐 **Live Demo:** [celebration-planner-two.vercel.app](https://celebration-planner-two.vercel.app/)
- 📹 **Demo Video:** [Watch Demo Video](https://celebration-planner-two.vercel.app/)

Built for the **PromptWars Virtual** "Celebration & Event Planner" challenge.

---

## What Makes Celebrate Different

Most planners stop at a static text list. Celebrate delivers an interactive, end-to-end planning studio:

1. **One AI call, a whole celebration.** A single Gemini request generates a structured, verified plan along with an event color palette that themes the entire interface and stationery.
2. **Interactive 2D Venue Designer.** Drag, rotate, and snap 11 item types (tables, stage, dance floor, bar, buffet) with a live clearance engine that flags overlaps and tight walkways.
3. **Seat-level guest management.** Hover any chair to see who is seated, drag and swap guests between tables, auto-seat by family or friend group, and print the seating chart.
4. **Zero-Server QR RSVP System.** Every guest gets a personal QR code and link encoded via deflate compression in the URL hash. No database, zero tracking, total privacy. Guests scan, open their animated envelope, and reply in one tap via WhatsApp.
5. **Unified Invitation Suite.** Switch seamlessly between **👑 Designer Card** (Verlet rope physics, architectural shapes), **🖼️ Use My Own Design** (Canva/image uploader with QR placement editor), and **🎨 Card Studio** (HTML5 canvas designer with batch per-guest export).
6. **"Play the Day" timeline scrubber.** Drag through the day-of run-sheet to visualize "Current Event" and "Up Next" in real time.
7. **Culture-aware curation.** Tailor recommendations by tradition (e.g., Nikah, Haldi, Sangeet, Mehndi, Diwali, Quinceañera). Budgets default to INR with exact rupee formatting.

> **Privacy & Speed:** Only the initial plan generation touches the AI. All physics, seating charts, venue layouts, Card Studio editing, and QR encoding run 100% locally in the browser.

_For deep architectural details, physics equations, and data schemas, see [docs/TECHNICAL.md](docs/TECHNICAL.md)._

---

## Feature Matrix

| Capability               | Highlights                                                                                                                                                                                     |
| :----------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **AI Plan Generation**   | Exact-sum budget reconciliation, timeline milestones scaled to remaining preparation days, vendor interview checklist, culturally nuanced ideas, day-of run-sheet, and dual-layer backup plan. |
| **Interactive Budget**   | Real-time "What-If" budget and guest sliders, editable amounts with automatic variance calculations, and an interactive proportional treemap.                                                  |
| **Dynamic Timeline**     | Scaled to the days between today and your event date, milestone checkboxes, and "Start this week" urgency badges.                                                                              |
| **Venue Designer**       | 11 item types, customizable hall dimensions, 50-step undo/redo stack, 0.9m clearance rule enforcement, and grid snapping.                                                                      |
| **Seating Engine**       | Interactive round & rectangular tables, seat-level hover cards, auto-seat by party group, and high-DPI printable charts.                                                                       |
| **Designer Invitation**  | 7-point Verlet rope physics hanging card, architectural shapes (Royal Arch, Birthday Scallop, Geometric Frame), English / Hindi / Urdu / Telugu copy, calendar (.ics) download, and maps link. |
| **Zero-Server RSVP**     | URL-safe base64 + deflate hash compression, interactive envelope opening, 1-tap WhatsApp RSVP message (`RSVP1\|...`), and host reply-import parser.                                            |
| **Custom Card Uploader** | Magic-byte file validation (PNG, JPEG, WebP), draggable guest name and QR placement boxes, and batch high-DPI image exports.                                                                   |
| **Card Studio**          | In-browser drag-and-drop stationery builder with typography presets, festive stickers, WCAG AA contrast warnings, and batch multi-guest export.                                                |
| **Accessibility**        | Semantic landmarks, complete keyboard operability, `prefers-reduced-motion` fallbacks, and 0 `jest-axe` violations.                                                                            |

---

## How the AI Works

```text
Browser ────────► POST /api/generate ────────► lib/ai.ts ────────► Google Gemini (Structured JSON)
   ▲                       │                                                 │
   │                       └─── Zod Schema Validation & Budget Correction ◄──┘
   │
   └───────────── All interactive tools run client-side (Zero latency)
```

- **Server-Side Security:** Calls to Gemini are strictly confined to route handlers (`app/api/generate` and `app/api/regenerate`). The API key is never exposed to the client.
- **Strict Structured Output:** Schemas are derived from Zod definitions using `zod-to-json-schema`. AI responses are parsed and re-validated through Zod before reaching the frontend.
- **Budget Integrity:** Category amounts are mathematically checked and adjusted in code to ensure they sum exactly to 100% of the total budget.
- **Prompt Injection Defense:** User inputs are sanitized, capped in length, and wrapped inside `<event_data>` tags marked as untrusted data in the server prompt.
- **Resilient Fallbacks:** Calls feature a 25-second timeout with an automatic retry. If the network or service is unreachable, a culturally matching offline fallback template is returned instantly.

---

## Quickstart

### Prerequisites

- **Node.js:** v20.0 or higher
- **Gemini API Key:** Free key available at [Google AI Studio](https://aistudio.google.com)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/meowhuriya/celebration-planner.git
cd celebration-planner

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env to add your GEMINI_API_KEY

# 4. Start local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view Celebrate.

---

## Configuration

| Environment Variable   |   Required   | Description                                                                                                           |
| :--------------------- | :----------: | :-------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`       |   **Yes**    | Google Gemini API key used on the server. Never leaked to the client.                                                 |
| `GEMINI_MODEL`         |      No      | Overrides the Gemini model (defaults to `gemini-3.5-flash-lite`).                                                     |
| `NEXT_PUBLIC_SITE_URL` | For QR scans | Public domain (e.g. `https://celebration-planner-two.vercel.app`) so phone cameras can scan QR codes from any device. |

---

## NPM Scripts

| Command                | Action                                                     |
| :--------------------- | :--------------------------------------------------------- |
| `npm run dev`          | Starts local Next.js development server with hot reloading |
| `npm run build`        | Builds optimized production bundle                         |
| `npm start`            | Runs production server                                     |
| `npm test`             | Runs 565 automated tests via Vitest                        |
| `npm run type-check`   | Validates TypeScript types (`tsc --noEmit`)                |
| `npm run lint`         | Runs Next.js ESLint rules                                  |
| `npm run format:check` | Verifies code formatting via Prettier                      |
| `npm run format`       | Auto-formats codebase with Prettier                        |

---

## How RSVP Works Without a Database

Celebrate operates completely serverless and database-free:

1. **Host Side:** When guests are added, Celebrate compresses the event metadata and guest credentials into a compact string using `CompressionStream('deflate-raw')` and Base64URL.
2. **Payload Security:** The resulting hash is placed after `#` in the link (`/i#<payload>`). Because URL fragments are never sent over HTTP to a server, guest data remains private to the host and recipient.
3. **Guest Experience:** Scanning the QR code or clicking the link opens an interactive greeting card inside an envelope. The guest selects attending status, party size, and meal preferences, then taps **"Send via WhatsApp"**.
4. **Closing the Loop:** The generated reply contains a compact code line (`RSVP1|guestId|status|partySize|food|note`). The host simply pastes incoming replies into the **"Import Pasted Replies"** box in the Invites panel, updating the guest list and budget automatically.

---

## Security & Privacy Highlights

- **Zero-Database Footprint:** Guest rosters, seating assignments, and custom card templates are persisted strictly in local browser storage (`localStorage` and `IndexedDB`).
- **Input Sanitization:** HTML tags and script delimiters are stripped; uploaded images are validated via file magic bytes (rejecting fake extensions and SVGs).
- **Hardened HTTP Headers:** Configured in `next.config.ts` with Content-Security-Policy, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
- **In-Memory Rate Limiting:** API routes enforce a token bucket rate limiter to prevent automated abuse.

---

## Accessibility (WCAG 2.1 AA)

- **Contrast Ratios:** All card text, button labels, and status badges maintain a minimum contrast ratio of $\ge 4.5:1$ against their backgrounds.
- **Keyboard Navigation:** Full arrow-key navigation and keyboard shortcuts for dragging cards, moving furniture, and arranging seating.
- **Screen Reader Support:** Dynamic updates are broadcasted through `role="status"` and `aria-live="polite"` regions.
- **Reduced Motion:** Respects `prefers-reduced-motion: reduce` by disabling physics simulations and animations.
- **Automated Audits:** Validated with `jest-axe` across all components and viewports with **zero violations**.

---

## Test Suite

Celebrate is verified by **580 automated tests across 47 suites**:

```bash
# Run the complete test suite
npm test
```

- **Unit Tests:** Zod schemas, budget math, timeline date math, rope physics, water simulation, RSVP hash encoding/decoding.
- **Integration Tests:** AI timeout, retry logic, fallback handling, What-If recalculation, and seating reassignments.
- **Accessibility Tests:** Automated `jest-axe` checks on dialogs, modal traps, invitation cards, forms, and print views.

---

## Tech Stack

- **Framework:** Next.js 15 (App Router, Server Route Handlers)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS, Lucide icons, Google Fonts (DM Serif Display, Cormorant Garamond, Great Vibes)
- **AI Engine:** Google Gemini API (`@google/genai` SDK)
- **Testing:** Vitest, React Testing Library, jest-axe
- **Utilities:** Zod, zod-to-json-schema, qrcode-generator

---

Built with pride by **Huri** for **PromptWars Virtual**.
