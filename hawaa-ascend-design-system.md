# Hawaa — "Ascend" Design System (component-by-component colors)

This is the single source of truth for the re-theme. Pair it with `ascend.theme.css` (the tokens are already coded there). Every component's colors are listed below so nothing is guessed.

---

## Surface rule (important)

| Page / element | Background | Class |
|---|---|---|
| **Landing / home page** | The Ascend gradient | `.page` |
| Product page, cart, checkout, account, FAQ, blog post | Solid `--paper` (#FBF6EC) | `.surface` |
| **All modals, popups, drawers, toasts** | Solid (`--surface-raised` #FFFFFF) over a scrim | `.modal` |

The gradient is the landing experience only. Everything functional uses one calm solid background. Buttons, text colors, accent and cards stay identical across both, so the brand reads as one system.

---

## Core tokens

| Token | Hex | Use |
|---|---|---|
| `--ink` | #2C2419 | primary text on light |
| `--muted` | #7C6E58 | secondary text, captions |
| `--paper` | #FBF6EC | solid page background |
| `--surface-raised` | #FFFFFF | cards / inputs / modals on solid pages |
| `--surface-sunken` | #F4EEE2 | wells, secondary panels |
| `--line` | rgba(44,36,25,.14) | hairlines, borders |
| `--accent` | #9A7641 | decorative brass |
| `--accent-strong` | #876235 | buttons, links (text-safe on white) |
| `--accent-tint` | rgba(154,118,65,.12) | icon tiles, pills |
| `--led` | #3FB7AC | teal device LED only, sparingly |
| `--hero-ink` | #F4ECDC | text on the dark hero / CTA / footer |
| `--hero-sub` | #E2D2B8 | hero sub-text |
| `--hero-kicker` | #E9D3AC | hero eyebrow / on-dark accents |
| `--ink-bg` | #2C2419 | dark band (CTA) |
| `--foot-bg` | #241B12 | footer |
| `--scrim` | rgba(36,27,18,.55) | modal overlay |
| `--star` | #E2A93B | review stars |

---

## Component palettes

### Nav (on the dark hero)
- Logo: `--hero-ink` · Links: #E6D8C0 · Text button: `--hero-kicker`
- Outline button: `.btn-outline.on-dark` · Primary button: `.btn-primary`
- On solid pages the nav sits on `--paper`: logo `--ink`, links `--muted`, same buttons.

### Hero
- Eyebrow/kicker: `--hero-kicker` · Headline: `--hero-ink` (display face, weight 300) · Sub: `--hero-sub`
- Spotlight glow behind product: `radial-gradient(circle, rgba(255,240,214,.22), transparent 60%)`
- Product: real almond PNG · soft drop shadow + mirrored reflection (~40% opacity)
- LED dot on product: `--led`

### Buttons
| Variant | Fill | Text | Border |
|---|---|---|---|
| Primary | `--accent-strong` #876235 (hover #714F29) | #FFFFFF | — |
| Secondary | `--ink` #2C2419 | `--hero-ink` | — |
| Outline | transparent | `--ink` (or `--hero-ink` via `.on-dark`) | currentColor |
| Text | transparent | `--accent-strong` | — (underline) |
| Icon | rgba(255,255,255,.5) | `--ink` | `--line` |
Focus ring: 2px `--accent-strong`, offset 2px. Disabled: 50% opacity.

### Stat strip
- Band bg: rgba(255,255,255,.3) · top/bottom border `--line`
- Icon tile: bg rgba(255,255,255,.6), border `--line`, icon `--accent-strong`
- Number: `--ink` (display) · Label: `--muted` (mono, uppercase)

### Feature cards (gradient page → use `.card-glass`)
- Bg rgba(255,255,255,.6) + blur · border `--line`
- Icon tile: `.icon-tile` (bg `--accent-tint`, icon `--accent-strong`)
- Title: `--ink` · Body: `--muted` · "more" link: `.btn-text` (`--accent-strong`)

### Feature cards (solid page → use `.card`)
- Bg `--surface-raised` #FFFFFF · soft shadow · everything else identical.

### Testimonial carousel
- Section bg: subtle white wash over the gradient
- Card: `--surface-raised` · border `--line` · active card border rgba(154,118,65,.5)
- Stars: `--star` #E2A93B · Quote mark: `--accent` at ~30% opacity
- Avatar: gradient #C9A36B → #876235, text #FFFFFF · Name: `--ink` · Meta: `--muted` (mono)
- Prev arrow: outline (`--line`, bg rgba white .7) · Next arrow: `.arrow.primary` (`--accent-strong`)
- Dots: `--line`; active dot elongated, `--accent-strong`

### CTA band
- Bg `--ink-bg` #2C2419 · Heading `--hero-ink` · Body #C7B596
- Buttons: `.btn-primary` + `.btn-outline.on-dark`

### Footer
- Bg `--foot-bg` #241B12 · Logo/links `--foot-ink` #F2E9D9 (links 80% opacity)
- Labels/meta `--foot-muted` #A2937C · Social icon tiles: border rgba(255,255,255,.14), icon #D9C9B0

### Forms / inputs (solid pages & popups)
- Field: bg `--surface-raised`, border `--line`, text `--ink`, placeholder `--muted`
- Focus: border `--accent-strong` + 3px ring `--accent-tint`
- Label: `--muted` (mono, uppercase)

### Modal / popup
- Scrim: `--scrim` rgba(36,27,18,.55)
- Panel: `--surface-raised` #FFFFFF, border `--line`, radius `--r-lg`, big soft shadow
- Title: display face `--ink` · Body: `--muted` · Actions: primary + outline buttons
- Close: `.btn-icon`

### Toast
- Bg `--ink-bg` · Text `--hero-ink` · status accent stripe: `--ok` / `--error`

### Pills / badges / tags
- Bg `--accent-tint` · Text `--accent-strong` (mono, uppercase)

---

## Typography
- Display: thin/light weight (300) — carries the premium feel. Pick a real brand face (e.g. Fraunces, or a light grotesque) and set `--font-display`.
- Body: clean sans (`--font-sans`).
- Mono: labels, spec data, meta (`--font-mono`).
- Never set body paragraphs in the brass accent — accent is for links, kickers, and small labels only.

## Accessibility / performance
- Body text ≥ AA (4.5:1). Brass `#876235` passes for large/bold only — never small body text.
- Visible keyboard focus everywhere. `prefers-reduced-motion`: no autoplay/parallax.
- `backdrop-filter` fallback already in the CSS. Test gradient + blur on a low-end Android.
