# Design System — StudyBuddyAI (Overseas Education Consultancy)

## Color Palette

The entire project uses a **teal/emerald green** color scheme defined in `globals.css` using CSS custom properties with oklch values. **Do not use arbitrary color values anywhere.** Always reference the theme tokens.

| Token                | Usage                                      |
| -------------------- | ------------------------------------------ |
| `primary`            | Brand green. CTAs, active states, accents. |
| `primary-foreground` | Text on primary backgrounds.               |
| `secondary`          | Subtle backgrounds, secondary actions.     |
| `muted`              | Backgrounds for less prominent areas.      |
| `muted-foreground`   | De-emphasized text.                        |
| `accent`             | Hover states, highlighted surfaces.        |
| `foreground`         | Primary text.                              |
| `background`         | Page background.                           |
| `card`               | Card surfaces.                             |
| `border`             | Dividers, outlines.                        |
| `destructive`        | Error states, danger actions.              |

## Typography

- **Sans (body/headings):** Inter (`--font-sans`)
- **Mono (code):** JetBrains Mono (`--font-mono`)
- **Tracking:** Slightly tighter than default (`-0.01em`)
- **Headings:** Bold weight, tight tracking (`tracking-tight`)
- **Body text:** Regular weight, relaxed line-height for readability

### Heading Sizes (Responsive)

| Element | Mobile     | Tablet     | Desktop                  |
| ------- | ---------- | ---------- | ------------------------ |
| h1      | `text-4xl` | `text-5xl` | `text-6xl` to `text-7xl` |
| h2      | `text-3xl` | `text-4xl` | `text-5xl`               |
| h3      | `text-xl`  | `text-2xl` | `text-3xl`               |

## Spacing & Layout

- Max content width: `max-w-7xl` (1280px)
- Horizontal padding: `px-6`
- Section vertical padding: `py-24 md:py-32`
- Card gaps: `gap-4 md:gap-6`
- Button gaps in groups: `gap-4`

## Components

All UI primitives must come from **shadcn/ui** via the CLI (`bun x --bun shadcn@latest add <component>`). Custom components live in `src/components/<feature>/`.

### Installed shadcn components:

- `button`
- `badge`
- `card`
- `separator`
- `input`
- `scroll-area`

## Border Radius

Base radius: `0.6rem`. All variants derive from this. Use Tailwind's `rounded-*` classes which map to these.

- Buttons (CTA): `rounded-full` for pill shape
- Cards: Default `rounded-lg` (from shadcn)
- Icon containers: `rounded-xl`

## Shadows

Shadows use a teal-tinted hsl in light mode and pure black in dark mode. Let shadcn handle most shadow application. For custom hover effects use `shadow-lg hover:shadow-xl`.

## Animations & Micro-interactions

- **Entrance animations:** Fade-in + translateY with staggered delays (100ms increments)
- **Hover effects:** `hover:-translate-y-1`, `hover:shadow-lg`, `hover:scale-[1.02]`
- **Active feedback:** `active:scale-[0.98]`
- **Gradient orbs:** `animate-pulse` with staggered `animation-delay`
- **Transitions:** Always use `transition-all duration-300`

## Responsiveness

Every UI must be mobile-first responsive:

- Mobile: single column, compact spacing
- Tablet (sm/md): 2-column grids, expanded spacing
- Desktop (lg/xl): full layouts

## Dark Mode

Dark mode is fully supported via the `.dark` class. All components must look correct in both modes. Use only theme tokens — never hardcode light or dark colors.

## File Structure

```
src/
├── app/
│   ├── globals.css          # Theme & design tokens
│   ├── layout.tsx           # Root layout, fonts, metadata
│   ├── page.tsx             # Home page (Hero)
│   └── agent/
│       └── page.tsx         # Voice agent UI
├── components/
│   ├── ui/                  # shadcn primitives
│   ├── navbar/              # Navigation
│   └── hero/                # Hero section
└── lib/
    └── utils.ts             # Utility functions
```
