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
| `chart-1` to `chart-5` | Chart/data visualization colors.        |

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

### Dashboard/Admin Page Headers

| Element | Classes |
| ------- | ------- |
| Page title | `text-2xl sm:text-3xl font-bold tracking-tight text-foreground` |
| Page description | `text-muted-foreground` |
| Section titles (card headers) | `text-base font-semibold text-foreground` |

## Spacing & Layout

- Max content width: `max-w-7xl` (1280px)
- Horizontal padding: `px-6`
- Section vertical padding: `py-24 md:py-32`
- Dashboard content padding: `p-4 sm:p-6 lg:p-8`
- Card gaps: `gap-4 md:gap-6`
- Button gaps in groups: `gap-4`
- KPI grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

## Components

All UI primitives must come from **shadcn/ui** via the CLI (`bun x --bun shadcn@latest add <component>`). Custom components live in `src/components/<feature>/`.

### Installed shadcn components:

- `avatar`, `badge`, `button`, `card`, `dialog`, `dropdown-menu`
- `input`, `label`, `progress`, `scroll-area`, `select`, `separator`
- `sheet`, `skeleton`, `slider`, `sonner`, `switch`
- `table`, `tabs`, `textarea`, `tooltip`

### Custom Shared Components (`src/components/shared/`):

| Component | Purpose |
|---|---|
| `StatCard` | Animated KPI card with count-up effect |
| `ScoreGauge` | Circular animated gauge (0-100) |
| `ScoreBar` | Horizontal animated bar for breakdowns |
| `ClassificationBadge` | Hot/Warm/Cold pill badge |
| `EmptyState` | Reusable empty state with icon + CTA |
| `PageHeader` | Title, description, breadcrumbs, actions |

### Layout Components:

| Component | Purpose |
|---|---|
| `DashboardLayout` | Sidebar + content for `/dashboard/*` |
| `AdminLayout` | Sidebar + content for `/admin/*` |
| `Navbar` | Public pages header nav |
| `Footer` | Global site footer |

## Border Radius

Base radius: `0.6rem`. All variants derive from this. Use Tailwind's `rounded-*` classes which map to these.

- Buttons (CTA): `rounded-full` for pill shape
- Cards: Default `rounded-lg` (from shadcn)
- Icon containers: `rounded-xl`
- Badges: `rounded-full` for status pills

## Shadows

Shadows use a teal-tinted hsl in light mode and pure black in dark mode. Let shadcn handle most shadow application. For custom hover effects use `shadow-lg hover:shadow-xl`.

## Animations & Micro-interactions

- **Entrance animations:** Fade-in + translateY with staggered delays (100ms increments)
- **Hover effects:** `hover:-translate-y-1`, `hover:shadow-lg`, `hover:scale-[1.02]`
- **Active feedback:** `active:scale-[0.98]`
- **Gradient orbs:** `animate-pulse` with staggered `animation-delay`
- **Transitions:** Always use `transition-all duration-300`
- **Count-up:** Number values animate from 0 → target on mount (1200ms)
- **Score gauge:** Circular arc fills progressively (1000ms)
- **Score bars:** Width animates with 100ms delay after mount (1000ms ease-out)
- **Data point chips:** Appear one-by-one with 150ms intervals (translate-x + opacity)
- **Table rows:** Staggered entrance (50ms per row)
- **Card grid items:** Staggered entrance (80ms per card)

## Card Styling Patterns

All cards follow this consistent pattern:
```
border-primary/10 bg-card/80 hover:shadow-lg transition-all duration-300 hover:-translate-y-1
```

For overlay glow:
```
<div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
```

## Dashboard Sidebar Pattern

- Width: `w-64`
- Background: `bg-card/50`
- Active link: `bg-primary/10 text-primary`
- Inactive link: `text-muted-foreground hover:text-foreground hover:bg-accent`
- Mobile: Sheet component with same content

## Responsiveness

Every UI must be mobile-first responsive:

- Mobile: single column, compact spacing
- Tablet (sm/md): 2-column grids, expanded spacing
- Desktop (lg/xl): full layouts, sidebars visible
- Tables: Hide less-important columns with `hidden sm:table-cell` / `hidden md:table-cell`

## Dark Mode

Dark mode is fully supported via the `.dark` class. All components must look correct in both modes. Use only theme tokens — never hardcode light or dark colors.

## File Structure

```
src/
├── app/
│   ├── globals.css              # Theme & design tokens
│   ├── layout.tsx               # Root layout, fonts, metadata, Toaster
│   ├── page.tsx                 # Home page (Navbar + Hero + Footer)
│   ├── agent/page.tsx           # Voice agent UI
│   ├── summary/[sessionId]/     # Post-call summary
│   ├── dashboard/
│   │   ├── layout.tsx           # Sidebar layout (counsellor)
│   │   ├── page.tsx             # Dashboard overview
│   │   ├── leads/page.tsx       # Lead list
│   │   ├── leads/[id]/page.tsx  # Lead detail
│   │   ├── appointments/        # Appointments
│   │   └── conversations/       # Live calls
│   └── admin/
│       ├── layout.tsx           # Sidebar layout (admin)
│       ├── page.tsx             # Analytics
│       ├── knowledge/           # Knowledge base manager
│       ├── counsellors/         # Counsellor management
│       └── settings/            # System configuration
├── components/
│   ├── ui/                      # shadcn primitives (21 components)
│   ├── shared/                  # Reusable custom components
│   ├── navbar/                  # Navigation
│   ├── hero/                    # Hero section
│   └── footer/                  # Site footer
└── lib/
    ├── types/database.ts        # Supabase table types
    ├── supabase.ts              # Server-side client
    ├── embeddings.ts            # RAG embeddings
    └── utils.ts                 # Utility functions
```
