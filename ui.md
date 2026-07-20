# UI Design System Reference

> Copy this file to any new project to replicate the same visual identity.
> This system is opinionated, dark-first, and built around a deep navy-black
> base with an indigo/violet primary accent and multi-color semantic states.

---

## 1. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript + TSX |
| Styling | Tailwind CSS v4 + custom CSS in `globals.css` |
| Icons — UI | `lucide-react` |
| Icons — Semantic | Google Material Symbols Outlined (via `<link>` tag) |
| Font | **Plus Jakarta Sans** — loaded via `next/font/google` |

```ts
// layout.tsx
import { Plus_Jakarta_Sans } from 'next/font/google';
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-plus-jakarta',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700', '800'],
});
```

The `<html>` element always carries `class="dark font-sans antialiased h-full"`.
Dark mode is forced — there is no light mode toggle.

---

## 2. Color Palette

### Base Backgrounds (darkest → lightest layer)
| Token | Value | Usage |
|---|---|---|
| `--background` | `#06070a` | Page root background |
| `#08090e` | — | Ambient background layer |
| `#0d1018` | — | Navbar / glass surfaces |
| `#0f121a` / `--slate-850` | `#0f121a` | Card backgrounds (12% luminance) |
| `#141824` | — | Elevated card / gradient-border fills |
| `#181d2f` | — | Secondary button background |
| `#22283f` | — | Secondary button hover |

### Primary Accent — Indigo/Violet
| Token | Value |
|---|---|
| `--primary` | `#5c36f5` |
| `--primary-hover` | `#7351f7` |
| `--primary-light` | `rgba(92, 54, 245, 0.14)` |
| Tailwind alias | `bg-indigo-500`, `text-indigo-400`, `border-indigo-400` |

### Semantic States
| State | Text / Border | Background |
|---|---|---|
| Success / Income | `#10b981` | `rgba(16,185,129,0.12)` |
| Warning | `#f59e0b` | `rgba(245,158,11,0.12)` |
| Danger / Expense | `#ef4444` | `rgba(239,68,68,0.12)` |
| Info / Saving | `#3b82f6` | `rgba(59,130,246,0.12)` |
| Saving (alt) | `#a855f7` | `rgba(168,85,247,0.12)` |

### Text
| Role | Value |
|---|---|
| Primary text | `#f8fafc` (`text-slate-50`) |
| Muted text | `#94a3b8` (`text-slate-400`) |
| Disabled / metadata | `text-slate-500` |

---

## 3. Typography Scale

All text is **Plus Jakarta Sans**. Use `font-feature-settings: "cv02","cv03","cv04","cv11"` on `body`.

| Role | Classes |
|---|---|
| Section header / badge label | `text-[10px] font-black uppercase tracking-widest text-slate-500` |
| Card label / nav item | `text-xs font-bold uppercase tracking-wider` |
| Body / list item | `text-xs font-semibold` or `text-sm font-semibold` |
| KPI number (large) | `text-2xl` or `text-3xl font-black` |
| Modal title | `text-sm font-black uppercase tracking-wider` |
| Brand name | `text-[17px] font-black tracking-wide uppercase` |
| Brand subtitle | `text-[11px] font-black tracking-[0.2em] uppercase` |

**Rule**: almost never use `font-normal` or `font-medium`. The system skews heavy —
`font-bold`, `font-extrabold`, and `font-black` dominate.

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `rounded-sm` override | `8px` | Small chips, badges |
| `rounded-md` override | `14px` | Inputs, small cards |
| `rounded-lg` override | `20px` | Standard cards |
| `rounded-xl` | `12–14px` (Tailwind default) | Buttons, nav items, dropdowns |
| `rounded-2xl` | `16px` | Modal containers, KPI cards |
| `22px` custom | hard-coded | KPI editorial cards, gradient-border cards |
| `rounded-full` / `99px` | — | Scrollbar thumbs, pill badges |

---

## 5. Signature Visual Effects

### 5.1 Ambient Background
Apply `.ambient-bg-dark` to the main page wrapper:
```css
.ambient-bg-dark {
  background-color: #08090e;
  background-image:
    radial-gradient(ellipse 65% 40% at 20% 0%,   rgba(92,54,245,0.22), transparent 75%),
    radial-gradient(ellipse 55% 45% at 85% 15%,  rgba(236,72,153,0.16), transparent 70%),
    radial-gradient(ellipse 60% 45% at 50% 90%,  rgba(6,182,212,0.16),  transparent 75%),
    radial-gradient(ellipse 40% 30% at 80% 85%,  rgba(147,51,234,0.12), transparent 60%);
  background-attachment: fixed;
}
```
Four fixed radial gradient orbs: indigo top-left, pink top-right, cyan bottom-center, purple bottom-right.

### 5.2 Gradient-Border Card (Signature Style)
Used for primary content panels, KPI editorial cards, calendar containers.
```css
.gradient-border-card {
  border: 1.5px solid transparent !important;
  background-clip: padding-box, border-box !important;
  background-origin: padding-box, border-box !important;
  background-image:
    linear-gradient(#141824, #141824),
    linear-gradient(135deg,
      rgba(92,54,245,0.85)   0%,
      rgba(168,85,247,0.65) 50%,
      rgba(6,182,212,0.85)  100%) !important;
  box-shadow: 0 16px 45px rgba(0,0,0,0.6), 0 0 25px rgba(92,54,245,0.2);
}
```
The border gradient runs: **indigo → purple → cyan** at 135°.

### 5.3 Colour-Tinted KPI Cards
Each status colour gets its own tinted card variant (green, red, blue, purple):
```css
/* Pattern — swap the rgba colour for each variant */
border: 1.5px solid transparent !important;
background-image:
  linear-gradient(rgba(10,13,22,0.75), rgba(10,13,22,0.75)),
  linear-gradient(135deg, rgba(COLOR,0.45) 0%, rgba(COLOR,0.15) 100%) !important;
backdrop-filter: blur(16px);
box-shadow:
  inset 0 0 15px rgba(COLOR,0.35),
  0 12px 30px rgba(0,0,0,0.45),
  0 0 25px rgba(COLOR,0.15) !important;
```

### 5.4 Glassmorphism (Sidebar, Navbar, Dropdowns)
```css
.sidebar-glass-glow {
  background: rgba(10,13,22,0.85);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.04);
  box-shadow:
    inset 0 0 72px rgba(92,54,245,0.28),
    0 0 12px rgba(92,54,245,0.35),
    0 16px 40px rgba(0,0,0,0.6);
}
.macos-toolbar {
  background: rgba(13,16,24,0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: 0 16px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08);
}
```

### 5.5 Active Nav Item Glow
```css
/* Active state for sidebar nav buttons */
bg-indigo-500/20 border-2 border-indigo-400 text-white
shadow-[0_0_20px_rgba(92,54,245,0.55),0_0_10px_rgba(129,140,248,0.45),inset_0_0_12px_rgba(92,54,245,0.3)]
```

### 5.6 Icon Glow (Active State)
```css
drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]
```

### 5.7 Text Glow Utilities
```css
.text-glow-green  { text-shadow: 0 0 10px rgba(16,185,129,0.5); }
.text-glow-red    { text-shadow: 0 0 10px rgba(239,68,68,0.5); }
.text-glow-blue   { text-shadow: 0 0 10px rgba(59,130,246,0.5); }
.text-glow-purple { text-shadow: 0 0 10px rgba(168,85,247,0.5); }
```

### 5.8 Brand Logo Glow (Very Strong)
```css
/* Logo icon container */
bg-indigo-500/25 border-2 border-indigo-400/80 rounded-2xl
shadow-[0_0_30px_rgba(92,54,245,0.8),0_0_15px_rgba(129,140,248,0.6),inset_0_0_12px_rgba(92,54,245,0.4)]
/* Icon inside */
drop-shadow-[0_0_12px_rgba(255,255,255,1)]
```

---

## 6. Animations

All animations use `cubic-bezier(0.16, 1, 0.3, 1)` — an **ease-out spring** curve.

```css
/* Dropdown open */
@keyframes macDropdownOpen {
  0%   { opacity: 0; transform: scale(0.95) translateY(-8px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}
.animate-mac-dropdown { animation: macDropdownOpen 0.18s cubic-bezier(0.16,1,0.3,1) forwards; }

/* Modal backdrop */
@keyframes macModalBackdropOpen {
  0%   { opacity: 0; }
  100% { opacity: 1; }
}
.animate-mac-backdrop { animation: macModalBackdropOpen 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }

/* Modal content */
@keyframes macModalContentOpen {
  0%   { opacity: 0; transform: scale(0.92) translateY(16px); }
  100% { opacity: 1; transform: scale(1)    translateY(0); }
}
.animate-mac-modal { animation: macModalContentOpen 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
```

### Interactive Element Transitions
```css
/* Applied to cards and interactive buttons */
.kpi-editorial-card, .event-float, .btn-interactive {
  transition: background-color 150ms ease, border-color 150ms ease,
              box-shadow 150ms ease, transform 150ms ease;
}
/* Hover lift on event cards */
.event-float:hover { transform: translateY(-2px) scale(1.02); }
/* Standard smooth all */
.transition-all-ease { transition: all 200ms cubic-bezier(0.16, 1, 0.3, 1); }
```

---

## 7. Custom Scrollbar

```css
::-webkit-scrollbar       { width: 8px; height: 8px; }
::-webkit-scrollbar-track { background: rgba(13,16,24,0.3); border-radius: 99px; }
::-webkit-scrollbar-thumb { background: rgba(92,54,245,0.25); border-radius: 99px; border: 2px solid #06070a; }
::-webkit-scrollbar-thumb:hover { background: rgba(92,54,245,0.55); }
/* Firefox */
* { scrollbar-width: thin; scrollbar-color: rgba(92,54,245,0.25) rgba(13,16,24,0.3); }
```

---

## 8. Component Patterns

### 8.1 Primary Button
```tsx
className="bg-[#5c36f5] hover:bg-[#7351f7] text-white font-extrabold rounded-xl
           shadow-[0_4px_12px_rgba(92,54,245,0.3)] hover:shadow-[0_0_15px_rgba(92,54,245,0.5)]
           hover:scale-[1.01] transition-all border border-white/10
           py-3 px-4 text-xs uppercase tracking-wider"
```

### 8.2 Secondary / Ghost Button
```tsx
className="bg-[#181d2f] hover:bg-[#22283f] text-slate-300 font-bold text-xs
           uppercase tracking-wider rounded-xl border border-white/5 transition-all
           py-2.5 px-4 cursor-pointer active:scale-95"
```

### 8.3 Danger Button
```tsx
className="bg-rose-500 hover:bg-rose-600 text-white font-black text-xs uppercase
           tracking-wider rounded-xl shadow-[0_0_15px_rgba(239,68,68,0.4)]
           border border-rose-400/30 transition-all cursor-pointer active:scale-95"
```

### 8.4 Input Field
```tsx
className="w-full bg-[#0d1018] border border-white/[0.06] hover:border-indigo-500/40
           focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-500/20
           text-white placeholder-slate-600 rounded-[14px] px-4 py-2.5
           text-xs font-semibold transition-all outline-none"
```

### 8.5 Section Label / Pill Badge
```tsx
className="text-[10px] font-black uppercase tracking-widest text-slate-500"
// Coloured badge
className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider
           bg-emerald-500/15 text-emerald-400 border border-emerald-500/25"
```

### 8.6 Modal Container
```tsx
// Backdrop
className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999999]
           flex items-center justify-center p-4 animate-mac-backdrop"
// Panel
className="bg-[#0f1320] border border-white/15 rounded-2xl w-full max-w-sm p-6
           shadow-[0_25px_60px_rgba(0,0,0,0.9)] animate-mac-modal"
```
Always rendered via `createPortal(…, document.body)`.

### 8.7 Dropdown Menu
```tsx
className="bg-[#0d1018]/95 border border-white/10 rounded-[14px]
           shadow-[0_12px_40px_rgba(0,0,0,0.85)] p-1.5 backdrop-blur-xl
           animate-mac-dropdown"
// Menu item
className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-300
           hover:bg-white/[0.05] hover:text-white rounded-xl transition-all cursor-pointer"
```

### 8.8 Glowing Timeline / Divider Bar
```css
.glowing-timeline-bar {
  height: 2px;
  background: linear-gradient(90deg,
    transparent 0%,
    rgba(92,54,245,0.9) 35%,
    rgba(6,182,212,1)   65%,
    transparent 100%);
  box-shadow: 0 0 14px rgba(92,54,245,0.8);
}
```

---

## 9. Layout Structure

```
<html class="dark font-sans antialiased h-full">
  <body class="min-h-full flex flex-col">
    ┌─────────────────────────────────────────────┐
    │  ambient-bg-dark (full page)                 │
    │  ┌──────────────┐  ┌───────────────────────┐│
    │  │  Sidebar      │  │  Main content area    ││
    │  │  sidebar-     │  │  macos-toolbar (top)  ││
    │  │  glass-glow   │  │  Tab panels           ││
    │  │  collapsible  │  │  gradient-border-card ││
    │  └──────────────┘  └───────────────────────┘│
    └─────────────────────────────────────────────┘
  </body>
</html>
```

- Sidebar is **collapsible** — label text animates out via `w-0 opacity-0 max-w-0` → `w-auto opacity-100`
- Sidebar uses `sidebar-glass-glow`, main areas use `ambient-bg-dark`
- Top navbar uses `macos-toolbar` (floating glass bar)
- Content cards use `gradient-border-card` or coloured KPI card variants

---

## 10. globals.css Boilerplate

Copy this exact block as the start of every new project's `globals.css`:

```css
@import "tailwindcss";

@variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: dark;
  --background: #06070a;
  --foreground: #f8fafc;
  --primary: #5c36f5;
  --primary-hover: #7351f7;
  --primary-light: rgba(92, 54, 245, 0.14);
  --success: #10b981;
  --success-bg: rgba(16, 185, 129, 0.12);
  --warning: #f59e0b;
  --warning-bg: rgba(245, 158, 11, 0.12);
  --danger: #ef4444;
  --danger-bg: rgba(239, 68, 68, 0.12);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --border-color: rgba(255, 255, 255, 0.04);
  --slate-250: rgba(255, 255, 255, 0.05);
  --slate-850: #0f121a;
}

@theme {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-hover: var(--primary-hover);
  --color-primary-light: var(--primary-light);
  --color-success: var(--success);
  --color-success-bg: var(--success-bg);
  --color-warning: var(--warning);
  --color-warning-bg: var(--warning-bg);
  --color-danger: var(--danger);
  --color-danger-bg: var(--danger-bg);
  --color-text-main: var(--text-main);
  --color-text-muted: var(--text-muted);
  --color-border-color: var(--border-color);
  --color-slate-250: var(--slate-250);
  --color-slate-850: var(--slate-850);

  --font-sans: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;

  --radius-xl: 24px;
  --radius-lg: 20px;
  --radius-md: 14px;
  --radius-sm: 8px;
}

body {
  background-color: #06070a;
  color: #f8fafc;
  font-feature-settings: "cv02", "cv03", "cv04", "cv11";
  min-height: 100vh;
  overflow-x: hidden;
}
```

Then append the full effect classes from Section 5 and animations from Section 6.

---

## 11. Do's and Don'ts

| ✅ Do | ❌ Don't |
|---|---|
| Always use `font-bold` / `font-extrabold` / `font-black` | Use `font-normal` or `font-medium` on UI labels |
| Use `rounded-xl` or `rounded-2xl` on all interactive elements | Use `rounded` (too small) |
| Add `backdrop-filter: blur()` to overlapping glass panels | Use solid backgrounds on panels that float over content |
| Use `active:scale-95` on all clickable buttons | Skip press feedback |
| Render modals with `createPortal` | Render modals inline in component tree |
| Apply `animate-mac-dropdown` to dropdowns, `animate-mac-modal` to modals | Hard-show elements without animation |
| Use `box-shadow` glow to reinforce semantic colour (green = income, red = expense) | Use flat unstyled borders only |
| Use `text-[10px] font-black uppercase tracking-widest` for section labels | Use large font for metadata labels |
