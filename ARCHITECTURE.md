# System Architecture & Engineering Models

This document details the architectural principles, mathematical engines, algorithmic pipelines, and automated test matrix powering **Celebration Planner**.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Next.js 14 App Router                            │
└──────┬───────────────────────────────────────────────────────────────┬──────┘
       │                                                               │
       ▼                                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│       Frontend Clients        │               │       Server API Routes       │
│  (React 18 Concurrent Roots)  │               │      (Edge / Node Runtime)    │
└──────┬────────────────────────┘               └──────┬────────────────────────┘
       │                                                       │
       ├─► 1. Verlet Physics Rope (`lib/physics/rope.ts`)      ├─► /api/generate
       ├─► 2. Venue CAD & Clearance (`lib/floor/`)             ├─► /api/regenerate
       ├─► 3. Card Studio Canvas (`components/studio/`)        │   - 16KB Payload Cap
       ├─► 4. Seating Solver Engine (`lib/seating/`)           │   - Token-Bucket Limiter
       ├─► 5. Zero-Knowledge RSVP (`lib/rsvp/`)                │   - Delimiter Quarantine
       └─► 6. Accessible UI (`radix-ui` + `aria-live`)         └─► Gemini 1.5 Flash SDK
```

---

## 2. Core Mathematical Models & Algorithmic Engines

### A. Verlet Integration with Constraint Relaxation (`lib/physics/rope.ts`)

The hanging invitation card utilizes a discretized particle chain (rope) simulated using numerical **Verlet Integration**. Unlike standard Euler integration, Verlet integration is time-reversible, inherently energy-conserving, and stable under stiff positional constraints:

$$x_{t + \Delta t} = x_t + (x_t - x_{t - \Delta t}) \cdot (1 - \gamma) + a \cdot \Delta t^2$$

Where:

- $x_t$ is the current point position vector $\begin{bmatrix} x \\ y \end{bmatrix}$.
- $x_{t - \Delta t}$ is the previous step position, embedding implicit velocity.
- $\gamma \in [0.005, 0.02]$ is the numerical drag/damping coefficient.
- $a = \begin{bmatrix} 0 \\ g \end{bmatrix}$ is the gravitational acceleration vector.
- $\Delta t = \frac{1}{60\text{ Hz}}$ is clamped using an accumulator pattern to eliminate frame-rate stuttering.

Distance constraints between adjacent rope particles $i$ and $i+1$ with resting length $L_0$ are solved iteratively via **Jakobsen Position Relaxation**:

$$\Delta d = \|p_{i+1} - p_i\| - L_0$$
$$p_i \leftarrow p_i + \frac{1}{2} \Delta d \cdot \frac{p_{i+1} - p_i}{\|p_{i+1} - p_i\|}, \quad p_{i+1} \leftarrow p_{i+1} - \frac{1}{2} \Delta d \cdot \frac{p_{i+1} - p_i}{\|p_{i+1} - p_i\|}$$

---

### B. Two-Phase Collision & Clearance Engine (`lib/floor/clearance.ts` & `lib/floor/geometry.ts`)

To maintain 60 FPS performance during real-time dragging of venue items, clearance detection uses a **two-phase spatial pipeline**:

1. **Broad-Phase AABB Culling ($O(1)$ per pair):**
   Prior to executing trigonometric calculations or vertex projections, each pair of items $A$ and $B$ is tested against their Axis-Aligned Bounding Boxes (AABB) expanded by the required clearance buffer $\delta = 0.9\text{ m}$:
   $$\text{AABB}(A) \cap \text{AABB}(B, +0.9\text{m}) = \emptyset \implies \text{No Violation Possible}$$
   This prunes distant items in $O(1)$ time, yielding an average $O(N)$ active-node frame complexity.

2. **Narrow-Phase Separating Axis Theorem (SAT):**
   Candidate overlapping pairs undergo exact Separating Axis Theorem projections across all face normals $n_k$:
   $$\text{overlap} \iff \forall n_k \in (N_A \cup N_B), \quad \max(A \cdot n_k) \ge \min(B \cdot n_k) \land \max(B \cdot n_k) \ge \min(A \cdot n_k)$$
   Rotated tables, stages, corridors, and circular seating approximations (12-vertex convex polygons) are evaluated with sub-millimeter precision.

---

### C. W3C WCAG 2.1 Relative Luminance & Contrast Math (`lib/palette.ts`)

Color systems enforce accessible contrast compliance through relative luminance calculations based on the **CIE 1931 standard**:

For each channel $C \in \{R, G, B\}$ normalized to $[0, 1]$:

$$C_{\text{linear}} = \begin{cases} \frac{C}{12.92} & \text{if } C \le 0.04045 \\ \left(\frac{C + 0.055}{1.055}\right)^{2.4} & \text{otherwise} \end{cases}$$

Relative luminance $L$ is calculated as:
$$L = 0.2126 \cdot R_{\text{linear}} + 0.7152 \cdot G_{\text{linear}} + 0.0722 \cdot B_{\text{linear}}$$

The contrast ratio $CR$ between lighter luminance $L_1$ and darker luminance $L_2$ satisfies:
$$CR = \frac{L_1 + 0.05}{L_2 + 0.05} \ge 4.5:1 \quad (\text{WCAG AA Standard})$$

Automated fallback color adjusting loops adaptively lighten or darken palette tokens until the $4.5:1$ threshold is mathematically guaranteed.

---

### D. Squarified Treemap Partitioning (`lib/budget.ts`)

Budget visual breakdown uses a recursive Binary Space Partitioning (BSP) squarified treemap algorithm. Given budget weights $w_i$, the algorithm minimizes the aspect ratio distortion:

$$\text{AspectRatio}(R) = \max\left(\frac{w}{h}, \frac{h}{w}\right) \to 1.0$$

Categories are packed into rectangles while maintaining visual proportionality and preventing thin sliver artifacts across mobile viewports.

---

### E. Exact-Sum Budget Normalization ($\Delta$ Reconciliation)

When allocating percentage or category breakdowns across varied line items, floating-point rounding causes off-by-one penny errors ($\sum b_i \neq B_{\text{total}}$). The budget reconciliation engine guarantees exact sums:

1. Initial integer allocation: $b_i = \lfloor B_{\text{total}} \cdot r_i \rfloor$
2. Residual drift calculation: $\Delta = B_{\text{total}} - \sum b_i$
3. Sort items descending by fractional remainder: $f_i = (B_{\text{total}} \cdot r_i) - b_i$
4. Distribute $+1$ unit to top $\Delta$ items.

$$\sum_{i=1}^M b_i \equiv B_{\text{total}} \quad (\text{Exact penny reconciliation})$$

---

## 3. Automated Testing Matrix

The codebase is protected by comprehensive test coverage executed via Vitest and Playwright:

| Test Suite Category        | Target Modules                   | Coverage Highlights                                                                                                           |
| :------------------------- | :------------------------------- | :---------------------------------------------------------------------------------------------------------------------------- |
| **Floor Plan & Clearance** | `lib/floor/*`                    | Broad-phase AABB culling, SAT polygon collisions, clearance buffer (0.9m), room out-of-bounds, undo/redo history.             |
| **Physics Simulation**     | `lib/physics/rope.ts`            | Verlet integration stability, dampening, rope constraint relaxation, impulse response, reduced motion.                        |
| **RSVP Engine & Security** | `lib/rsvp/*`                     | RFC 3986 payload encoding/decoding, checksum validation, input bounds `[1, 20]`, control char stripping, XSS defense.         |
| **API Endpoints & Guards** | `app/api/*`                      | 16KB payload cap (413), token-bucket limiter (429 headers), `Cache-Control: no-store`, Zod schema errors.                     |
| **Accessibility & WCAG**   | `components/*`                   | ARIA live telemetry regions, screen-reader focus trap, keyboard navigation (`Arrow`, `R`, `Del`), `jest-axe` zero violations. |
| **Budget & Seating Math**  | `lib/budget.ts`, `lib/seating/*` | Exact-sum budget reconciliation, seating solver group affinity optimization, squarified treemap bounds.                       |

---

## 4. Production Build & Deployment Pipeline

- **Type Safety:** 100% TypeScript strict mode (`tsc --noEmit`).
- **Code Quality:** Automated ESLint rules with zero warnings and Prettier format validation.
- **Bundle Optimization:** Modular tree-shaking, dynamic imports for heavy canvas editors, zero client-side secret exposure.
