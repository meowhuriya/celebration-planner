# Celebrate

**Event planning, made easy.** Tell Celebrate about a wedding, birthday, or community event and get a complete plan in seconds: budget, timeline, vendor checklist, ideas, a day-of schedule and a backup plan. Then use built-in tools to design the venue, seat every guest, and send personal QR invitations.

- **Live demo:** `<https://celebration-planner-two.vercel.app/>`
- **Demo video:** `<your-video-link>`

Built for the **PromptWars Virtual** "Celebration & Event Planner" challenge.

---

## What makes this different

Most planners stop at a list. Celebrate keeps going:

1. **One AI call, a whole plan.** A single Gemini request returns a validated plan, including a colour palette that themes the results.
2. **A venue designer.** Drag, rotate and resize tables, stage, buffet and more. Overlaps and tight walkways are flagged live, with undo and redo.
3. **Seating with a guest on every seat.** Hover a seat to see the name, drag guests around, auto-seat by group, and print the chart.
4. **QR invitations with no server.** Every guest gets a personal link and QR code. They scan, see their own name, and RSVP in one tap.
5. **Cards you can design.** Pick from 3 invitation styles, upload a card made in Canva (or anywhere), or build one in the Card Studio.
6. **Play the day.** Drag a slider through the day-of schedule and watch "now" and "next" change.
7. **Culture-aware.** An optional tradition field (for example Nikah, Haldi, Sangeet, Diwali) tailors ideas and vendors. Amounts default to INR.

Only the plan itself uses AI. Everything else runs in your browser, so it is fast and private.

Want the deep technical details (algorithms, file by file)? See [docs/TECHNICAL.md](docs/TECHNICAL.md).

---

## Features

| Area           | What you get                                                                                                                                  |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan (AI)      | Budget that sums exactly to your total, timeline, vendor checklist with questions to ask, ideas, day-of schedule, backup plan, colour palette |
| Budget         | Live "what-if" sliders for budget and guests, editable amounts, animated treemap                                                              |
| Timeline       | Dates scaled to the days you actually have left, tick-off milestones, "start this week" flags                                                 |
| Venue designer | 11 item types, grid snapping, rotation, 50-step undo, clearance warnings, venue backgrounds                                                   |
| Seating        | Seat-level assignment, hover names, drag and swap, auto-seat by group, print and copy as text                                                 |
| Invitations    | Hanging physics card, 3 styles, English / Hindi / Urdu / Telugu, calendar file, map link                                                      |
| QR RSVP        | Personal links and QR codes, envelope-opening guest page, WhatsApp reply, reply import for the host                                           |
| Own design     | Upload PNG, JPG or WebP, place the guest name and QR, export one image per guest                                                              |
| Card Studio    | Canvas editor with templates, stickers, fonts, layers and per-guest export                                                                    |
| Extras         | Live countdown, Play the day, print views, saved plans on your device                                                                         |

---

## How the AI is used

```
Browser ──► /api/generate ──► lib/ai.ts ──► Gemini (structured JSON)
   ▲              │                              │
   │              └── validate with Zod ◄────────┘
   └── everything else runs client-side
```

- **Server-side only.** Gemini is called from route handlers (`app/api/generate`, `app/api/regenerate`). The API key never reaches the browser.
- **Structured output.** The request asks Gemini for JSON that follows a schema built from the Zod schema. The response is then checked again with Zod.
- **One call per plan.** Regenerating a single section makes one more targeted call, and only when the user asks.
- **Budget is exact.** Category amounts are corrected in code so they always add up to the total.
- **Safe prompting.** The system prompt is fixed on the server. User text is sanitized, length-limited, and placed inside `<event_data>` tags that the prompt tells the model to treat as untrusted data.
- **Fails gracefully.** Each attempt has a 25-second timeout and is retried at most once. If generation still fails, a built-in fallback plan is shown instead of a blank screen. Identical requests are cached.
- **Model.** Set in `lib/ai.ts` (`DEFAULT_GEMINI_MODEL`) and can be overridden with the `GEMINI_MODEL` environment variable.

---

## Getting started

**Requirements:** Node.js 20 or newer and a Gemini API key from [Google AI Studio](https://aistudio.google.com).

```bash
git clone https://github.com/meowhuriya/celebration-planner.git
cd celebration-planner
npm install
cp .env.example .env      # then add your key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable               | Required       | Purpose                                                                                                                     |
| ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `GEMINI_API_KEY`       | Yes            | Server-side Gemini key. Never exposed to the browser.                                                                       |
| `GEMINI_MODEL`         | No             | Overrides the default model name in `lib/ai.ts`.                                                                            |
| `NEXT_PUBLIC_SITE_URL` | For QR invites | Your public address, for example `https://your-app.vercel.app`. QR codes made on `localhost` only work on your own network. |

### Scripts

| Command                       | What it does                 |
| ----------------------------- | ---------------------------- |
| `npm run dev`                 | Start the development server |
| `npm run build` / `npm start` | Production build and server  |
| `npm test`                    | Run all automated tests      |
| `npm run type-check`          | TypeScript check             |
| `npm run lint`                | ESLint                       |
| `npm run format:check`        | Prettier check               |

### Deploying

1. Push the repo to GitHub.
2. Import it into a host such as Vercel.
3. Add `GEMINI_API_KEY` and `NEXT_PUBLIC_SITE_URL` as environment variables (never commit `.env`).
4. Deploy, open the live link, generate a plan, and scan a QR invite from your phone.

---

## How RSVP works without a server

Celebrate has no database. Instead:

1. The host adds guests. Each guest gets a link of the form `/i#<payload>`, also shown as a QR code.
2. The payload holds the event essentials and the guest's name. It sits in the URL **hash**, so it is never sent to a server. It is compressed, checked with Zod, and shown as plain text.
3. The guest opens the link, sees "Dear [name]", picks Yes, No or Maybe with party size and food choice, and taps **Send**. WhatsApp opens with the reply already written.
4. The host pastes replies into the app, and guest statuses update.

**Limits:** replies are one tap for the guest and one paste for the host, not fully automatic. An uploaded card image cannot travel inside a link, so guests who scan see a clean RSVP page and receive the picture as an image you send them.

---

## Security

- API key only in server environment variables, with log sanitising that strips keys and bearer tokens.
- Zod validation for all inputs and for AI output, with length limits and allowed ranges.
- Prompt-injection hardening: fixed server prompt, untrusted user text wrapped in tagged data blocks, HTML and script stripping.
- Basic per-IP rate limiting on the API routes (10 requests per minute). This is held in server memory, so on hosts that run several instances it is a safeguard, not a strict limit.
- Security headers: Content-Security-Policy, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and the `X-Powered-By` header is removed.
- Uploads are checked by file signature (PNG, JPEG, WebP only), capped in size, and re-encoded to strip metadata. SVG and PDF are rejected.
- Rendering uses plain text only. No `dangerouslySetInnerHTML`.
- Guest names and designs stay in your browser (localStorage and IndexedDB).

---

## Accessibility

Designed to meet WCAG 2.1 AA:

- Semantic HTML, labelled fields, visible focus, full keyboard use
- Keyboard alternatives for drag and drop (seating, venue designer, card studio)
- Text contrast checks in code and in tests, never relying on colour alone
- `aria-live` announcements for loading, errors and updates
- `prefers-reduced-motion` turns off animation and physics
- Responsive from 320px
- Automated `jest-axe` checks on components

---

## Testing

564 automated tests across 46 suites (Vitest, React Testing Library, and jest-axe) cover the schemas, budget maths, timeline scaling, seating and venue logic, QR and RSVP parsing, upload validation, the AI timeout, retry and fallback with the AI call mocked, components and accessibility.

```bash
npm test
npm run type-check
npm run lint
npm run format:check
```

---

## Project structure

```
app/
  api/generate/        full plan generation (route handler)
  api/regenerate/      single-section regeneration
  i/                   guest invitation and RSVP page
components/
  editorial/           top bar and page chrome
  sections/            venue designer, seating, and plan sections
  invitation/          invitation cards and "use my own design"
  rsvp/                QR and RSVP flow
  studio/              Card Studio
lib/
  ai.ts                Gemini call, prompts, rate limiting, sanitising
  utils.ts             shared helpers
next.config.ts         security headers
```

---

## Known limits

- Plans and guest lists are stored in your browser, so clearing site data removes them.
- AI plans are suggestions. Review amounts, vendors and dates before relying on them.
- The language switch translates only the fixed invitation phrases. A native speaker should review them.
- QR codes must be generated from a public address to work for guests anywhere.

---

## Built with

Next.js, TypeScript, Tailwind CSS, Zod, Google Gemini, and `qrcode-generator` for QR codes.

Built with AI assistance in Google Antigravity (Claude and Gemini models). All code was reviewed and tested by the author.

Built by Huri.
