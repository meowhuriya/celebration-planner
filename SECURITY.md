# Security Policy & Threat Model

This document outlines the security architecture, threat model, and defense-in-depth mitigations implemented across **Celebration Planner** to protect user privacy, API infrastructure, and client execution.

---

## Threat Model & Defenses

```
                 Incoming Client Request
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Edge & Transport Defense                                 │
│    • Content-Length & Raw Body Cap: 16 KB (HTTP 413)        │
│    • In-Memory Token-Bucket Limiter (HTTP 429 + Headers)    │
│    • Cache-Control: no-store, max-age=0                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Server-Side Gemini API Key Isolation                     │
│    • Strictly isolated in Node.js runtime (process.env)     │
│    • Zero client exposure / Next.js NEXT_PUBLIC_ bypass     │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. LLM Prompt Injection & Delimiter Quarantine              │
│    • User inputs wrapped in <event_data> XML tags           │
│    • Strict System Persona separation                       │
│    • Two-Pass JSON Repair & Strict Zod Schema Validation    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Client-Side Image Upload Sanitization                    │
│    • Magic-Byte Header Verification (PNG, JPEG, WebP)       │
│    • Offscreen Canvas Re-Encoding (strips EXIF & polyglots) │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Zero-Knowledge RSVP Privacy (RFC 3986)                   │
│    • /i#<payload> URI Fragments never hit the server        │
│    • Client-side Base64URL + HMAC / Local Host Verification │
└─────────────────────────────────────────────────────────────┘
```

---

### 1. API Route Hardening & HTTP Semantics (`app/api/generate` & `app/api/regenerate`)

- **Payload Size Guard (HTTP 413):** Every incoming request is checked for both `Content-Length` headers and raw request body byte length before parsing. Payloads exceeding **16 KB (16,384 bytes)** are immediately rejected with `413 Payload Too Large` to prevent memory exhaustion, ReDoS, and buffer overflow attacks.
- **Token-Bucket Rate Limiter (HTTP 429):** Per-client IP rate limiting is enforced with sliding replenishment. When thresholds are exceeded, the API responds with RFC-compliant rate-limit headers:
  - `Retry-After: 60`
  - `X-RateLimit-Limit: 10`
  - `X-RateLimit-Remaining: 0`
- **Cache-Control & Privacy Headers:** All API responses strictly enforce `Cache-Control: no-store, max-age=0` to prevent shared proxies, CDN caches, or corporate gateways from storing sensitive, custom event generation payloads.

### 2. Server-Side Secret Isolation (`lib/ai.ts`)

- **Strict Environment Isolation:** Google Gemini API keys (`GEMINI_API_KEY`) are accessed strictly within server-side route handlers via `process.env`.
- **Zero Client Bundling:** Secrets are never prefixed with `NEXT_PUBLIC_` and never leak to the client JavaScript bundles. If the key is omitted or invalid, the system cleanly triggers local deterministic algorithmic fallback generators (`lib/fallback.ts`) rather than crashing or exposing stack traces.

### 3. Delimiter Quarantine Against Indirect Prompt Injection

- **Context Isolation:** Untrusted user input (event titles, dietary notes, budgets, venue descriptions) is quarantined within `<event_data>...</event_data>` XML delimiter boundaries before interpolation into Gemini model prompts.
- **System Persona Boundary:** System instructions explicitly command the model to treat content inside delimiter tags strictly as raw passive data, neutralising prompt injection techniques attempting to override output schema or exfiltrate prompts.
- **Two-Pass JSON Parsing & Zod Sanitization:** Model completions are scrubbed of markdown code fences, balanced using regex brace repairing, and validated against strict `eventPlanSchema` Zod schemas before being returned.

### 4. Binary Magic-Byte Inspection & Canvas De-Weaponization (`components/invitation/CustomDesignEditor.tsx`)

- **Magic-Byte Signature Verification:** Uploaded custom design images are inspected byte-by-byte using `Uint8Array` slice verification to guarantee file signature authenticity:
  - **PNG:** `89 50 4E 47 0D 0A 1A 0A`
  - **JPEG:** `FF D8 FF`
  - **WebP:** `52 49 46 46 ... 57 45 42 50`
- **Offscreen Canvas Re-Encoding:** User-supplied files are not stored directly or served to third parties. Instead, images are drawn into an offscreen HTML5 `<canvas>` element and re-exported via `canvas.toDataURL("image/webp", 0.85)`. This completely strips all EXIF metadata, GPS geotags, malicious polyglot payloads, and steganographic vectors.

### 5. Zero-Knowledge RSVP Privacy (RFC 3986 URI Fragments)

- **Zero-Server Exposure:** Digital invitations and guest identities are encoded entirely within client-side URI fragments (`/i#<payload>`). According to RFC 3986 §3.5, URI fragments are never transmitted to web servers in HTTP request headers.
- **Host Verification & Local Storage:** Host UUID registries and RSVP state mutations remain strictly client-side within browser `localStorage`, eliminating database surveillance, data leaks, and server-side tracking.
- **RSVP Parser Validation:** The WhatsApp reply parser strictly bounds party sizes to `[1, 20]`, validates guest IDs against alphanumeric/UUID patterns, strips ASCII control characters (`[\x00-\x1F\x7F]`), and truncates free-form notes to 200 characters to prevent injection.

---

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please open a private security advisory or contact the maintainers directly. Vulnerabilities are reviewed and patched within 24 hours.
