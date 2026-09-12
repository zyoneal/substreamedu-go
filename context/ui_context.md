# SubStreamEdu: UI Context & Design System

## 1. Visual Theme: Warm Cinematic Espresso
SubStreamEdu uses a stark, cinematic, dark-mode atmosphere designed for deep cognitive focus and immersive language acquisition. The visual feel combines "Cockpit Dense" functional metrics within "Art Gallery Airy" reading containers.

---

## 2. Design Tokens & CSS Variables

### 2.1 Color Palette
All color values must reference CSS variables defined in `src/index.css` and mapped in `tailwind.config.js`:

| Token Name | CSS Variable | Hex / Value | Semantic Role |
| :--- | :--- | :--- | :--- |
| **Canvas** | `--color-canvas` | `#0d0c0b` | Deep warm espresso background (replaces pure `#000000`) |
| **Surface** | `--color-surface` | `#141312` | Base container and card background |
| **Surface Elevated** | `--color-surface-elevated` | `#1a1917` | Modals, dropdowns, popovers, active card states |
| **Primary Accent** | `--color-primary` | `#0045e6` | Electric cobalt for primary CTAs and active tabs |
| **On Primary** | `--color-on-primary` | `#ffffff` | High-contrast text on primary buttons |
| **Ink** | `--color-ink` | `#ede8e0` | Stark parchment white for primary headings and words |
| **Body Text** | `--color-body` | `#9e988f` | Muted warm stone for body sentences and descriptions |
| **Mute** | `--color-mute` | `#666360` | De-emphasized timestamps, inactive icons, subtle labels |
| **Hairline** | `--color-hairline` | `#282522` | Ultra-delicate 1px borders and dividers |
| **Hairline Strong**| `--color-hairline-strong` | `#3d3934` | Hovered card borders and focus outlines |
| **Danger / Error** | `--color-danger` | `#ef4444` | Errors, destructive actions, failed recall states |
| **Success** | `--color-success` | `#22c55e` | Correct reviews, streak confirmations, active status |

### 2.2 Typography
- **Headlines & Display**: `e-Ukraine` / `e-UkraineHead` (Medium 500, Regular 400). Tight tracking (`-0.02em`), compact line-height (`1.1` to `1.25`).
- **Body Content**: `e-Ukraine` (Light 300, Regular 400). Relaxed leading (`1.6`), max line width `65ch` for reading comfort.
- **Metrics & Timecodes**: `JetBrains Mono` (Regular 400, Medium 500). Used for subtitle timestamps, FSRS retention rates, and flashcard counts.
- **Banned Typography**: Inter, Roboto, Times New Roman, and generic browser serif fonts are strictly prohibited in the product UI.

### 2.3 Spacing Rhythm
Base spacing grid operates on a **4px cadence**:
- `xxs`: 2px
- `xs`: 4px
- `sm`: 8px
- `md`: 12px
- `lg`: 16px
- `xl`: 24px
- `xxl`: 32px
- `section`: 88px

### 2.4 Corner Radii
- Buttons & Controls: `rounded-md` (8px)
- Cards & Bento Containers: `rounded-lg` (12px) to `rounded-xl` (16px)
- Pills & Badges: `rounded-full` (9999px)

---

## 3. Layout Principles & Bento Grid Asymmetry
1. **Asymmetric Bento Grids**: Avoid monotonous 3x3 equal grids. Utilize asymmetrical bento layouts (e.g., 2/3 width interactive video stage paired with 1/3 width live subtitle stream).
2. **Spatial Containment**:
   - Reading zones: `max-w-3xl`
   - Interactive media players & bento galleries: `max-w-7xl`
3. **Responsive Breakpoints**:
   - `< 768px` (Mobile): Strict single-column stack, minimum 44px touch targets, sticky bottom review controls.
   - `>= 768px` (Desktop): Side-by-side synchronized subtitle and translation panels.

---

## 4. Motion & Micro-Interactions
- **Libraries**: Framer Motion for React component mount/unmount and layout animations; GSAP for complex timeline choreography.
- **Performance**: Animate **only** GPU-accelerated properties: `transform` and `opacity`. Never animate `top`, `left`, `width`, or `height`.
- **Timing**: Micro-interactions use `150ms` ease-out. Modal/panel transitions use `300ms cubic-bezier(0.4, 0, 0.2, 1)`.

---

## 5. Strict Anti-Patterns (Banned AI Tells)
1. ❌ **NO EMOJIS ANYWHERE IN THE UI**: Use crisp SVG icons from `lucide-react`.
2. ❌ **NO PURE BLACK (`#000000`)**: Always use `--color-canvas` (`#0d0c0b`) or `--color-surface` (`#141312`).
3. ❌ **NO NEON GRADIENTS OR GLOW OVERLAYS**: Avoid oversaturated AI-style purple/cyan glowing meshes.
4. ❌ **NO CLICHÉ AI COPYWRITING**: Ban words like "Elevate", "Seamless", "Unleash", "Next-Gen". Use clean, direct domain terminology ("Practice vocabulary", "Review cards", "Synchronized transcript").
