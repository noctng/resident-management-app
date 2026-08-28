# Design System Master File

> **LOGIC:** When building a specific page, first check `design-system/pages/[page-name].md`.
> If that file exists, its rules **override** this Master file.
> If not, strictly follow the rules below.

---

**Project:** Resident Management App (Thành Phố Cà Phê)
**Generated:** 2026-08-26 09:26:26 · **Reconciled with codebase:** 2026-08-26
**Category:** Real Estate / Property Management
**Style Direction:** Minimalism & Swiss Style (clean, spacious, grid-based, high contrast)

> ⚠️ **RECONCILIATION NOTE:** Skill database suggested teal (#0F766E) + Fira Code/Fira Sans.
> Project already has an established coffee/beige brand identity and Vietnamese-first typography.
> Decision: **keep existing brand tokens below**, adopt the skill's style principles,
> effects, component specs and checklist. All tokens map 1:1 to `tailwind.config.js`.

---

## Global Rules

### Color Palette

| Role | Hex | Tailwind Token | Usage |
|------|-----|----------------|-------|
| Background | `#F2F3EF` | `bg` | App background |
| Surface | `#FFFFFF` | `surface` | Cards, panels, modals |
| Surface alt | `#EAEDE6` | `surface-alt` | Input backgrounds, subtle sections |
| Text | `#17231F` | `ink` | Headings, body text |
| Text soft | `#5A6960` | `ink-soft` | Secondary text |
| Text faint (min!) | `#8B978E` | `ink-faint` | Decorative only — NEVER body text (contrast 2.8:1 fails WCAG AA) |
| Primary/Accent | `#B8722E` | `accent` (`primary.500`) | CTA, active states, links |
| Accent hover | `#9E5F23` | `accent-hover` | Hover state of accent |
| Accent soft | `#F0DCC2` | `accent-soft` | Selected backgrounds, badges |
| Brand teal | `#3E6E64` | `secondary` (`brand.DEFAULT`) | Info accents, secondary actions |
| Sidebar | `#122120 → #0C1716` | `sidebar-bg` | Admin shell background only |
| Danger | `#B94A3D` | `brand-danger` | Destructive actions, errors |
| Warning | `#B98A2E` | `brand-warning` | Warnings, pending states |
| Success | `#3F7D53` | `brand-success` | Success states, paid status |
| Border | `#DFE2D9` | `brand-border` | Dividers, input borders |

**Rules:**
- ❌ NO raw default-palette classes (`gray-*`, `blue-*`, `slate-*`, `emerald-*`, `sky-*`, `rose-*`) in new code — use semantic tokens above.
- ❌ NO hardcoded hex literals (`bg-[#B8722E]`) — write `bg-accent`.
- ✅ Semantic mapping: success→`brand-success`, error→`brand-danger`, info→`brand` (teal), warning→`brand-warning`.

### Typography

- **Sans (UI + headings):** `"Be Vietnam Pro", Inter` — Vietnamese diacritics first-class
- **Mono (code, ID numbers, money, meter readings):** `"IBM Plex Mono"`, tabular figures
- **Serif display (PREMIUM):** `"Playfair Display", Georgia, serif` — Vietnamese subset. ONLY for: portal hero wordmark/headings, project name, large StatCard emphasis numbers. FORBIDDEN in buttons, form labels, tables, badges.
- Loaded via Google Fonts `<link>` in index.html with `preconnect` + `display=swap`
  (`font-serif` used BEFORE the Playfair token lands in tailwind.config.js is a bug — see Roadmap 0.3/0.4)

| Element | Spec |
|---------|------|
| Portal hero / wordmark | `font-serif text-2xl–4xl text-ink` |
| Page title (admin) | `text-xl font-bold text-ink` |
| Section heading | `text-base font-semibold text-ink` |
| Body | `text-sm text-ink-soft` |
| Caption/metadata | `text-xs text-ink-soft` (NOT ink-faint) |
| Data/numeric emphasis | `font-mono` tabular figures; big KPI may be `font-serif` |

### Spacing Variables

Tailwind default scale. ⚠️ Steps `.5` beyond `2.5` DO NOT EXIST in Tailwind 3.4 — `p-4.5`, `px-4.5`, `gap-4.5` generate NOTHING.

| Token | Value | Usage |
|-------|-------|-------|
| `gap-2` / `p-2` | 8px | Icon gaps, tight inline spacing |
| `gap-3` / `p-3` | 12px | Compact table cells, button padding |
| `gap-4` / `p-4` | 16px | Standard card/table padding (replaces all broken `*-4.5`) |
| `gap-6` / `p-6` | 24px | Section padding, modal body |
| `gap-8` | 32px | Large section gaps |

### Shadow Depths

| Level | Token | Usage |
|-------|-------|-------|
| sm | `shadow-sm` | Inputs, subtle lift |
| md | `shadow-md` | Cards, dropdown triggers |
| lg | `shadow-lg` | Modals, popovers |

Border radius base: `10px` (`--radius`); cards `rounded-xl`; modals `rounded-2xl`.

---

## Component Specs

All new UI MUST use the shared kit at `src/components/ui/` (Button, Modal, Table, Card, Badge, Input, Toast, ConfirmDialog, Skeleton, EmptyState, PageHeader). Do NOT hand-roll inline markup for these.

### Buttons (`ui/Button.tsx`)

- Variants: primary (`bg-accent hover:bg-accent-hover text-white`) · secondary (outline `border-brand-border text-ink`) · ghost · danger (`bg-brand-danger`) · soft (`bg-accent-soft text-accent-ink`)
- Padding: `px-3 py-2` (sm) / `px-4 py-2.5` (md) — never `px-4.5`
- `transition-colors duration-200` · always `cursor-pointer`
- Hover = color/shadow change only, NO scale transforms
- Loading state uses built-in spinner, disables pointer events

### Cards (`ui/Card.tsx`)

```
bg-surface border border-brand-border rounded-xl p-4 shadow-sm
hover: shadow-md + border-color shift (200ms) — no translateY on data cards
```

Numeric stats use `font-mono`. Never `font-serif`.

### Tables (`ui/Table.tsx`)

- Wrapper: `overflow-x-auto` (mobile safe — UX guideline severity: Medium)
- Header: `bg-surface-alt text-ink text-xs uppercase tracking-wide`
- Row hover: `hover:bg-surface-alt/60 transition-colors duration-150`
- Clickable rows: pass `isClickable` → gets `cursor-pointer` automatically
- Cell padding: `px-4 py-3` (never `px-4.5`)
- Result count text: `text-ink-soft` (not ink-faint — contrast rule)

### Inputs (`ui/Input.tsx` / `.form-input`)

```
bg-surface-alt border border-brand-border rounded-[10px] px-3 py-2.5
placeholder:text-ink-faint (placeholders may use faint; values never)
focus: border-accent + ring-accent/20 (visible focus, a11y required)
Always paired with <label htmlFor> — placeholder-only is forbidden
```

### Modals (`ui/Modal.tsx`)

```
overlay: bg-black/50 backdrop-blur-sm
panel:   bg-surface rounded-2xl shadow-lg max-w-lg w-full
title:   font-sans font-semibold text-ink (NEVER font-serif)
close:   ESC key + backdrop click + visible focus trap
```

One modal system ONLY. Legacy `src/components/Modal.tsx` must not be imported by new code.

### Feedback

- Success/error/info → `useToast()` (ToastProvider). NO `alert()`.
- Destructive confirmation → `useConfirm()` (ConfirmDialog). NO `window.confirm()`.

---

## Icons

- Single source: `src/components/icons.tsx` (~70 Heroicons-style SVG, 24×24 viewBox)
- Size: `w-5 h-5` inline / `w-6 h-6` nav — consistent per context
- ❌ NEVER emoji as UI icons (📊 🚀 ⚙️ 🟢…) — replace with SVG equivalents
- Status dots in tables/badges → colored `<span class="w-2 h-2 rounded-full bg-brand-success">`, not 🟢🔴🟡
- Amenity/utility emoji catalogs (AmenityManager) → map each amenity to an icon name or keep emoji as DATA display inside avatar chips only, not as action-button icons

## Interaction Rules

- Every clickable element: `cursor-pointer`
- Transitions: `duration-150`–`duration-300` (target 200ms), `transition-colors` preferred
- Form submit: loading → success toast / inline error (no silent failures)
- Focus states visible everywhere (`focus-visible:ring-2 ring-accent/40`)
- Respect `prefers-reduced-motion` for decorative animation

---

## Page Patterns

**Admin pages (Dashboard, Lists, Billing, CRM):** Swiss-grid layout —
`PageHeader` (title + actions right) → stat row (`StatCard`) → content panel (`Card` + `Table`). Max width consistent per area; sidebar fixed dark teal; content area `bg` beige.

**Resident portal landing:** Hero-Centric + Feature-Rich — Hero > Features > CTA above fold. Portal auth screens must migrate from gray/blue-500 palette → brand tokens (beige bg, teal/accent CTAs).

---

## Anti-Patterns (Do NOT Use)

- ❌ Poor photos / no real imagery on portal marketing surfaces
- ❌ Emojis as icons
- ❌ Missing cursor:pointer on clickable elements
- ❌ Layout-shifting hovers (scale transforms on cards/buttons)
- ❌ Low contrast text (<4.5:1) — includes `text-ink-faint` for body/captions on white
- ❌ Instant state changes without transitions
- ❌ Invisible focus states
- ❌ `alert()` / `window.confirm()` native dialogs
- ❌ Default Tailwind palette classes & hardcoded hex (breaks single source of truth)
- ❌ `font-serif` outside the 3 allowed premium surfaces (portal hero, project name, big KPI)
- ❌ Invalid spacing utilities (`*-4.5`)
- ❌ Importing legacy `components/Modal.tsx` or dead `Sidebar.tsx` patterns

---

## Pre-Delivery Checklist

Before delivering any UI code, verify:

- [ ] No emojis used as icons (use SVG instead)
- [ ] All icons from `src/components/icons.tsx`
- [ ] `cursor-pointer` on all clickable elements
- [ ] Hover states with smooth transitions (150-300ms)
- [ ] Light mode: text contrast 4.5:1 minimum (ink-faint ≠ body text)
- [ ] Focus states visible for keyboard navigation
- [ ] `prefers-reduced-motion` respected
- [ ] Responsive: 375px, 768px, 1024px, 1440px
- [ ] No content hidden behind fixed navbars
- [ ] No horizontal scroll on mobile (tables wrapped in overflow-x-auto)
- [ ] Uses `ui/*` kit components, no inline duplicates
- [ ] Colors via semantic tokens only (`bg-accent`, `text-ink`…)
