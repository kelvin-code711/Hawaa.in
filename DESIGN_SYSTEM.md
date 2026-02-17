# Hawaa Design System & Brand Guidelines

> Comprehensive design language documentation for maintaining consistent branding across all Hawaa web pages.

---

## Table of Contents
1. [Color Palette](#1-color-palette)
2. [Typography](#2-typography)
3. [Spacing System](#3-spacing-system)
4. [Component Styles](#4-component-styles)
5. [Section Backgrounds](#5-section-backgrounds)
6. [Effects & Animations](#6-effects--animations)
7. [Responsive Breakpoints](#7-responsive-breakpoints)
8. [Icons](#8-icons)
9. [Images & Media](#9-images--media)
10. [Brand Voice](#10-brand-voice)

---

## 1. Color Palette

### Primary Colors (Dark)
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Charcoal Black | `#111827` | rgb(17, 24, 39) | Primary text, buttons, headings |
| Near Black | `#171717` | rgb(23, 23, 23) | Body text |
| Dark Slate | `#1e293b` | rgb(30, 41, 59) | Dark section backgrounds |
| Deep Navy | `#0f172a` | rgb(15, 23, 42) | Dark gradient end |
| Dark Gray | `#1a1a1a` | rgb(26, 26, 26) | Hero fallback background |

### Accent Colors (Blue/Cyan Family)
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Cyan 600 | `#0891b2` | rgb(8, 145, 178) | Primary accent, gradient end |
| Cyan 500 | `#06b6d4` | rgb(6, 182, 212) | Filter section, shadows |
| Sky 500 | `#0ea5e9` | rgb(14, 165, 233) | Buy button gradient start |
| Sky 400 | `#38bdf8` | rgb(56, 189, 248) | Hover states, borders |
| Cyan 300 | `#22d3ee` | rgb(34, 211, 238) | Gradient highlights |

### Secondary Accent (Blue)
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Blue 600 | `#2563eb` | rgb(37, 99, 235) | Warranty badge, focus states |
| Blue 500 | `#3b82f6` | rgb(59, 130, 246) | FAQ hover, newsletter button |

### Utility Colors
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Yellow 400 | `#FACC15` | rgb(250, 204, 21) | Star ratings |
| India Saffron | `#FF9933` | - | Made in India flag |
| India Green | `#138808` | - | Made in India flag |

### Neutral Grays
| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| White | `#ffffff` | rgb(255, 255, 255) | Backgrounds, text on dark |
| Gray 50 | `#f9fafb` | rgb(249, 250, 251) | Card backgrounds, FAQ section |
| Gray 100 | `#f3f4f6` | rgb(243, 244, 246) | Button backgrounds, tags |
| Gray 200 | `#e5e7eb` | rgb(229, 231, 235) | Borders, inactive dots |
| Gray 300 | `#d1d5db` | rgb(209, 213, 219) | Slider dots inactive |
| Gray 400 | `#9ca3af` | rgb(156, 163, 175) | Placeholder text, disclaimers |
| Gray 500 | `#6b7280` | rgb(107, 114, 128) | Secondary text, subtitles |
| Gray 600 | `#374151` | rgb(55, 65, 81) | Tertiary text |
| Gray 700 | `#1f2937` | rgb(31, 41, 55) | Badge text, hover states |

### Transparency Values (Glassmorphism)
```css
/* Light Glass */
rgba(255, 255, 255, 0.1)   /* Subtle overlay */
rgba(255, 255, 255, 0.2)   /* Light glass background */
rgba(255, 255, 255, 0.25)  /* CTA buttons */
rgba(255, 255, 255, 0.4)   /* Glass borders */

/* Dark Glass */
rgba(0, 0, 0, 0.2)         /* Light dark overlay */
rgba(0, 0, 0, 0.4)         /* Secondary buttons */
rgba(0, 0, 0, 0.5)         /* Card overlays */
rgba(0, 0, 0, 0.7)         /* Modal overlays */

/* Sticky Bar */
rgba(30, 30, 30, 0.7)      /* Sticky buy bar background */
```

---

## 2. Typography

### Font Families

**Primary Font (Body & UI)**
```css
font-family: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

**Accent Font (Headlines & Emphasis)**
```css
font-family: 'Playfair Display', Georgia, serif;
```

### Google Fonts Import
```html
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap" rel="stylesheet">
```

### Font Weights
| Weight | Outfit | Playfair Display | Usage |
|--------|--------|------------------|-------|
| 300 | Light | - | Hero title "Hawaa" |
| 400 | Regular | Regular + Italic | Body text, quotes |
| 500 | Medium | Medium + Italic | Buttons, labels, italic accents |
| 600 | Semibold | Semibold | Headlines, card titles |
| 700 | Bold | - | Strong emphasis |

### Type Scale

| Element | Mobile | Desktop | Weight | Line Height | Font |
|---------|--------|---------|--------|-------------|------|
| Hero Title | 2.5rem (40px) | 5rem (80px) | 300/600 | 1.2 | Outfit |
| Section Title (H2) | 1.5rem (24px) | 2.25rem (36px) | 600 | 1.3 | Outfit |
| Card Title (H3) | 1.2rem (19px) | 1.4rem (22px) | 500-600 | 1.3 | Outfit |
| Body Text | 0.9rem (14px) | 1rem (16px) | 400 | 1.5-1.6 | Outfit |
| Subtitle/Label | 0.65rem (10px) | 0.75rem (12px) | 500 | 1.4 | Outfit |
| Button Text | 0.9rem (14px) | 1rem (16px) | 500 | 1 | Outfit |
| Small Text | 0.75rem (12px) | 0.85rem (14px) | 400-500 | 1.4 | Outfit |
| Italic Accent | varies | varies | 400-500 | inherit | Playfair Display Italic |

### Letter Spacing
```css
/* Uppercase subtitles/labels */
letter-spacing: 0.15em;  /* Standard */
letter-spacing: 0.2em;   /* Wide */

/* Logo */
letter-spacing: 0.01em;  /* "H" */
letter-spacing: 0.02em;  /* "awaa" */

/* Sticky bar "EDGE" */
letter-spacing: 0.15em;
```

### Text Styling Patterns

**Uppercase Subtitle**
```css
.subtitle {
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #6b7280;
}
```

**Section Title with Italic Accent**
```css
.section-title {
    font-family: 'Outfit', sans-serif;
    font-size: 2.25rem;
    font-weight: 600;
    color: #111827;
    line-height: 1.3;
}

.section-title .italic {
    font-family: 'Playfair Display', serif;
    font-style: italic;
    font-weight: 500;
}
```

**Hero Title with Shadow**
```css
.hero-title {
    font-size: 5rem;
    color: white;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.5);
}
```

### Italic Accent Examples
Headlines use Playfair Display italic for the final phrase:
- "Built for accuracy, designed for *your every day*"
- "Real stories from *real homes*"
- "What our customers *say*"
- "Guides for *cleaner living*"
- "Answers to help you *breathe easy*"
- "We don't run on promises. We *certify.*"

---

## 3. Spacing System

### Container Max-Widths
```css
max-width: 1280px;  /* Header, main content */
max-width: 1200px;  /* Sliders, feature sections */
max-width: 1100px;  /* Footer */
max-width: 1000px;  /* Certification section */
max-width: 720px;   /* FAQ section */
max-width: 600px;   /* Trust badges, AQI checker */
max-width: 480px;   /* Newsletter */
max-width: 420px;   /* Modals, AQI checker */
```

### Section Padding
```css
/* Small sections */
padding: 40px 16px;   /* Mobile */
padding: 50px 24px;   /* Desktop */

/* Medium sections */
padding: 50px 16px;   /* Mobile */
padding: 60px 24px;   /* Desktop */

/* Large sections */
padding: 60px 16px;   /* Mobile */
padding: 80px 24px;   /* Desktop */
```

### Component Spacing
| Element | Mobile | Tablet | Desktop |
|---------|--------|--------|---------|
| Card padding | 20px | 24px | 28px |
| Button padding (small) | 10px 16px | 12px 20px | 12px 20px |
| Button padding (large) | 12px 24px | 14px 28px | 14px 28px |
| Grid gap | 12px | 16px | 20-24px |
| Section gap | 16px | 20px | 24px |

### Border Radius Scale
```css
border-radius: 2px;     /* Tiny (flag corners) */
border-radius: 8px;     /* Small buttons */
border-radius: 10px;    /* Inputs, small buttons */
border-radius: 12px;    /* FAQ items, small cards */
border-radius: 14px;    /* Impact cards */
border-radius: 16px;    /* Standard cards, modals */
border-radius: 20px;    /* Large cards, feature cards */
border-radius: 24px;    /* Extra large modals */
border-radius: 9999px;  /* Pills, CTAs (fully rounded) */
```

---

## 4. Component Styles

### Buttons

**Primary CTA (Glassmorphism Light)**
```css
.cta-primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 14px 28px;
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.4);
    border-radius: 9999px;
    color: white;
    font-family: 'Outfit', sans-serif;
    font-size: 1rem;
    font-weight: 500;
    text-decoration: none;
    transition: all 0.3s ease;
}

.cta-primary:hover {
    background: rgba(255, 255, 255, 0.35);
    transform: scale(1.02);
}
```

**Secondary CTA (Glassmorphism Dark)**
```css
.cta-secondary {
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    /* Other properties same as primary */
}

.cta-secondary:hover {
    background: rgba(0, 0, 0, 0.5);
    border-color: rgba(255, 255, 255, 0.3);
}
```

**Solid Button (Dark)**
```css
.btn-solid {
    padding: 12px 20px;
    background: #111827;
    color: white;
    border: none;
    border-radius: 9999px;
    font-weight: 500;
    transition: all 0.2s ease;
}

.btn-solid:hover {
    background: #1f2937;
    transform: translateY(-1px);
}
```

**Blue Buy Button (Gradient + Glass Effect)**
```css
.sticky-buy-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 8px 18px;
    background: linear-gradient(135deg, #0ea5e9 0%, #0891b2 100%);
    border: 1px solid rgba(56, 189, 248, 0.5);
    border-radius: 9999px;
    color: white;
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 600;
    text-decoration: none;
    transition: all 0.3s ease;
    box-shadow: 0 2px 12px rgba(14, 165, 233, 0.5),
                inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.sticky-buy-btn:hover {
    background: linear-gradient(135deg, #38bdf8 0%, #0ea5e9 100%);
    border-color: rgba(56, 189, 248, 0.7);
    box-shadow: 0 4px 16px rgba(14, 165, 233, 0.6),
                inset 0 1px 0 rgba(255, 255, 255, 0.25);
    transform: scale(1.02);
}
```

**Glassmorphism Button (AQI)**
```css
.aqi-btn-glass {
    padding: 14px 28px;
    background: rgba(17, 24, 39, 0.9);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 9999px;
    color: white;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15),
                inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### Cards

**Standard Card (Light)**
```css
.card {
    background: white;
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
    transition: all 0.3s ease;
}

.card:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
}
```

**Glassmorphism Card**
```css
.glass-card {
    background: rgba(249, 250, 251, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(0, 0, 0, 0.06);
    border-radius: 20px;
}
```

**Feature Card (Image Background)**
```css
.feature-card {
    flex: 0 0 280px;
    height: 380px;
    border-radius: 20px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.3s ease;
}

.feature-card-image {
    width: 100%;
    height: 100%;
    background-size: cover;
    background-position: center;
    position: relative;
}

/* Gradient overlay */
.feature-card-image::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.1) 0%,
        rgba(0, 0, 0, 0) 30%,
        rgba(0, 0, 0, 0.5) 100%
    );
}

@media (min-width: 768px) {
    .feature-card {
        flex: 0 0 320px;
        height: 420px;
    }
}
```

**Review Card (Dark Background)**
```css
.review-card {
    flex: 0 0 280px;
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 20px;
    padding: 24px;
    color: white;
}
```

### Sliders

**Slider Wrapper**
```css
.slider-wrapper {
    overflow: hidden;
    padding: 0 10px;
}
```

**Slider Track**
```css
.slider {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 10px 16px;
    margin: 0 16px;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
}

.slider::-webkit-scrollbar {
    display: none;
}

@media (min-width: 768px) {
    .slider {
        gap: 20px;
    }
}
```

**Slider Item**
```css
.slider-item {
    flex: 0 0 280px;
    scroll-snap-align: start;
}

@media (min-width: 768px) {
    .slider-item {
        flex: 0 0 320px;
    }
}
```

### Navigation Arrows

**Standard Arrow**
```css
.slider-arrow {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.2s ease;
}

.slider-arrow:hover {
    background: #111827;
    border-color: #111827;
    color: white;
}

.slider-arrow:disabled {
    opacity: 0.3;
    cursor: not-allowed;
}

.slider-arrow svg {
    width: 18px;
    height: 18px;
}

@media (min-width: 768px) {
    .slider-arrow {
        width: 44px;
        height: 44px;
    }

    .slider-arrow svg {
        width: 20px;
        height: 20px;
    }
}
```

**Arrow on Dark Background**
```css
.slider-arrow-dark {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: white;
}

.slider-arrow-dark:hover {
    background: white;
    border-color: white;
    color: #111827;
}
```

### Slider Dots

**Light Background**
```css
.slider-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
}

.dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #e5e7eb;
    cursor: pointer;
    transition: all 0.3s ease;
}

.dot.active {
    width: 20px;
    border-radius: 4px;
    background: #111827;
}
```

**Dark Background**
```css
.dot-dark {
    background: rgba(255, 255, 255, 0.3);
}

.dot-dark.active {
    background: white;
}
```

### Inputs

**Standard Input**
```css
.input {
    width: 100%;
    padding: 12px 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    color: #111827;
    background: white;
    transition: all 0.2s ease;
}

.input::placeholder {
    color: #9ca3af;
}

.input:focus {
    outline: none;
    border-color: #111827;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
}
```

**Input with Icon**
```css
.input-with-icon {
    padding-left: 42px;
}

.input-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    width: 18px;
    height: 18px;
    color: #9ca3af;
}
```

### Tags/Badges

**Glassmorphism Tag (on images)**
```css
.feature-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 20px;
    color: white;
    font-size: 0.75rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.feature-tag svg {
    width: 14px;
    height: 14px;
}
```

**Solid Badge**
```css
.badge {
    display: inline-block;
    padding: 6px 12px;
    background: #111827;
    color: white;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 4px;
}
```

### FAQ Accordion

```css
.faq-item {
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    background: white;
    transition: all 0.2s ease;
}

.faq-item:hover {
    border-color: #d1d5db;
}

.faq-question {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 20px;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Outfit', sans-serif;
    font-size: 0.95rem;
    font-weight: 500;
    color: #111827;
    text-align: left;
}

.faq-icon {
    font-size: 1.25rem;
    color: #6b7280;
    transition: transform 0.3s ease;
}

.faq-item.active .faq-icon {
    transform: rotate(45deg);
}

.faq-answer {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease;
}

.faq-item.active .faq-answer {
    max-height: 200px;
}

.faq-answer p {
    padding: 0 20px 18px;
    color: #374151;
    line-height: 1.6;
}
```

---

## 5. Section Backgrounds

| Section | Background | CSS |
|---------|------------|-----|
| Hero | Video + fallback | `background: #1a1a1a;` |
| Trust Badges | Solid white | `background: white;` |
| AQI Checker | Solid white | `background: white;` |
| Features | Solid white | `background: white;` |
| Filter Strip | Cyan gradient | `background: linear-gradient(135deg, #0891b2, #06b6d4, #22d3ee);` |
| Certification | Solid white | `background: white;` |
| Testimonials | Light gradient | `background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);` |
| Reviews | Dark gradient | `background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);` |
| Blogs | Solid white | `background: white;` |
| FAQ | Light gray | `background: #f9fafb;` |
| Newsletter | Solid white | `background: white;` |
| Footer | Dark gradient | `background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%);` |

---

## 6. Effects & Animations

### Glassmorphism

**Light Variant (on dark backgrounds)**
```css
.glass-light {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Stronger variant */
.glass-light-strong {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.4);
}
```

**Dark Variant (on light backgrounds)**
```css
.glass-dark {
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**Header Glassmorphism**
```css
.header.scrolled {
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}
```

**Sticky Bar Glassmorphism**
```css
.sticky-buy-bar {
    background: rgba(30, 30, 30, 0.7);
    backdrop-filter: blur(20px) saturate(180%);
    -webkit-backdrop-filter: blur(20px) saturate(180%);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Transitions

```css
/* Quick interactions (buttons, icons) */
transition: all 0.2s ease;

/* Standard animations */
transition: all 0.3s ease;

/* Smooth state changes */
transition: all 0.4s ease;

/* Slow fades (video, images) */
transition: opacity 1s ease;

/* Transform specific */
transition: transform 0.3s ease;

/* Multiple properties */
transition: background 0.2s ease, transform 0.3s ease, box-shadow 0.3s ease;
```

### Hover Effects

**Scale Up**
```css
/* Subtle scale */
transform: scale(1.02);

/* Medium scale */
transform: scale(1.05);
```

**Lift Effect**
```css
/* Subtle lift */
transform: translateY(-1px);

/* Medium lift */
transform: translateY(-2px);

/* With shadow */
transform: translateY(-2px);
box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);
```

### Box Shadows

```css
/* Subtle (cards at rest) */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);

/* Light */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);

/* Medium (card hover) */
box-shadow: 0 8px 30px rgba(0, 0, 0, 0.08);

/* Strong (modals) */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);

/* Extra strong (modals on dark) */
box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);

/* Blue glow (buy button) */
box-shadow: 0 2px 12px rgba(14, 165, 233, 0.5);

/* Inset highlight (glass effect) */
box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);

/* Combined */
box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
```

### Focus States

```css
/* Standard focus ring */
:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.1);
}

/* Blue focus ring */
:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
}
```

---

## 7. Responsive Breakpoints

```css
/* Mobile first approach */

/* Small phones to phones */
@media (min-width: 480px) { }

/* Phones to tablets */
@media (min-width: 640px) { }

/* Tablets to small desktop */
@media (min-width: 768px) { }

/* Desktop */
@media (min-width: 1024px) { }

/* Large desktop */
@media (min-width: 1280px) { }
```

### Common Responsive Patterns

**Font Size Scaling**
```css
.title {
    font-size: 1.5rem;    /* Mobile */
}

@media (min-width: 768px) {
    .title {
        font-size: 2.25rem; /* Desktop */
    }
}
```

**Card Width Scaling**
```css
.card {
    flex: 0 0 280px;      /* Mobile */
}

@media (min-width: 768px) {
    .card {
        flex: 0 0 320px;  /* Desktop */
    }
}
```

**Section Padding Scaling**
```css
.section {
    padding: 50px 16px;   /* Mobile */
}

@media (min-width: 768px) {
    .section {
        padding: 60px 24px; /* Desktop */
    }
}
```

---

## 8. Icons

### Icon Style
- **Type:** Stroke-based SVGs
- **Stroke Width:** 1.5px - 2px
- **Color:** `currentColor` (inherits from parent)
- **Line Cap/Join:** `round`

### Icon Sizes
| Size | Pixels | Usage |
|------|--------|-------|
| XS | 14px | Tags, inline icons |
| SM | 16px | Buttons, small UI |
| MD | 18px | Navigation, inputs |
| LG | 20px | Slider arrows |
| XL | 24px | Header, large UI |
| 2XL | 28px | Feature icons |

### Common Icon Template
```html
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <!-- Path data here -->
</svg>
```

---

## 9. Images & Media

### File Formats
| Type | Format | Usage |
|------|--------|-------|
| Photos | `.webp` | All images |
| Videos | `.webm` | All videos |
| Icons | Inline SVG | UI icons |
| Favicon | `.ico` | Browser tab |

### Image Sizing
```css
/* Background images */
background-size: cover;
background-position: center;

/* Responsive images */
width: 100%;
height: auto;
object-fit: cover;
```

### Video Attributes
```html
<video
    autoplay
    muted
    playsinline
    loop
    poster="path/to/poster.webp"
>
    <source src="path/to/video.webm" type="video/webm">
</video>
```

### Image Aspect Ratios
| Component | Aspect Ratio | Dimensions |
|-----------|--------------|------------|
| Feature cards | ~3:4 | 320 x 420px |
| Blog cards | ~4:3 | Variable |
| Testimonial video | 9:16 | Portrait |
| Certification preview | ~16:10 | Variable |

---

## 10. Brand Voice

### Headlines
- **Tone:** Confident, benefit-focused, clean
- **Pattern:** Statement + italic emphasis
- **Examples:**
  - "Built for accuracy, designed for *your every day*"
  - "A trusted brand, built on real outcomes"
  - "We don't run on promises. We *certify.*"

### Subtitles
- **Style:** ALL CAPS, letter-spaced
- **Color:** Muted gray (`#6b7280`)
- **Examples:**
  - "WHY CUSTOMERS CHOOSE HAWAA"
  - "FORM MEETS FUNCTION"
  - "BREATHE THEIR WORDS"

### Call-to-Actions
- **Style:** Action verbs, concise
- **Examples:**
  - "Order Now"
  - "Explore Edge"
  - "Check Air Impact"
  - "Read guide"
  - "Learn More"

### Body Copy
- **Tone:** Technical but accessible, premium but approachable
- **Length:** Concise, scannable
- **Focus:** Benefits over features

---

## Quick Reference: CSS Variables (Recommended)

```css
:root {
    /* Colors */
    --color-black: #111827;
    --color-white: #ffffff;
    --color-gray-50: #f9fafb;
    --color-gray-100: #f3f4f6;
    --color-gray-200: #e5e7eb;
    --color-gray-400: #9ca3af;
    --color-gray-500: #6b7280;
    --color-gray-600: #374151;
    --color-slate-800: #1e293b;
    --color-slate-900: #0f172a;
    --color-cyan-500: #06b6d4;
    --color-cyan-600: #0891b2;
    --color-sky-400: #38bdf8;
    --color-sky-500: #0ea5e9;
    --color-blue-500: #3b82f6;
    --color-blue-600: #2563eb;
    --color-yellow-400: #FACC15;

    /* Typography */
    --font-primary: 'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    --font-accent: 'Playfair Display', Georgia, serif;

    /* Spacing */
    --spacing-xs: 4px;
    --spacing-sm: 8px;
    --spacing-md: 16px;
    --spacing-lg: 24px;
    --spacing-xl: 32px;
    --spacing-2xl: 48px;

    /* Border Radius */
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 16px;
    --radius-xl: 20px;
    --radius-full: 9999px;

    /* Shadows */
    --shadow-sm: 0 4px 20px rgba(0, 0, 0, 0.04);
    --shadow-md: 0 8px 30px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.2);

    /* Transitions */
    --transition-fast: 0.2s ease;
    --transition-normal: 0.3s ease;
    --transition-slow: 0.4s ease;
}
```

---

## File Structure Reference

```
/Hawaa.in/
├── index.html              # Landing page
├── css/
│   └── styles.css          # All styles (~3400 lines)
├── js/
│   └── script.js           # All JavaScript
├── public/
│   ├── images/             # All .webp images
│   │   ├── hero-poster.webp
│   │   ├── feature-*.webp
│   │   ├── testimonial_*_poster.webp
│   │   ├── blog_*.webp
│   │   └── cert-*.webp
│   └── videos/             # All .webm videos
│       ├── hero-video.webm
│       └── testimonial_*.webm
├── DESIGN_SYSTEM.md        # This file
└── MEDIA_LIST.md           # Media assets documentation
```

---

*Last updated: February 2026*
*Version: 1.0*
