# Design System: SubStreamEdu

## 1. Visual Theme & Atmosphere
A stark, cinematic, and immersive dark-mode interface designed for deep focus and learning. The atmosphere is dense yet spacious ("Cockpit Dense" elements within "Art Gallery Airy" containers) — like a high-end screening room or a modern code editor. Variance is asymmetric (6/10), avoiding repetitive boxy grids in favor of intentional whitespace. Motion is "Cinematic Choreography" (8/10), featuring smooth 3D glassmorphism reveals, delayed waterfalls, and silky smooth transitions that respect user focus without being jarring.

## 2. Color Palette & Roles
- **Canvas Dark** (`#09090B`) — Primary background surface (Zinc-950). Replaces all pure black.
- **Surface Elevated** (`#18181B`) — Cards, popovers, and elevated containers (Zinc-900).
- **Ink White** (`#FFFFFF`) — Primary stark text.
- **Muted Steel** (`#A1A1AA`) — Secondary text, metadata, descriptions (Zinc-400).
- **Whisper Border** (`rgba(255, 255, 255, 0.05)`) — Card borders, 1px structural lines, delicate dividers.
- **Electric Blue** (`#0045E6`) — Single accent color for primary actions, active navigation states, and focus rings. (Strictly no neon purples or oversaturated gradients).
- **Warning Red** (`#EF4444` at 10% opacity for bg) — Error states and destructive actions.

## 3. Typography Rules
- **Display/Headlines:** `e-Ukraine` (Medium/500) — Track-tight (`letter-spacing: -0.02em`), controlled scale (`line-height: 1.1`). Not screaming. Hierarchy through weight and color, not just massive size. Text-wrap is always balanced.
- **Body:** `e-Ukraine` (Light/300) — Relaxed leading (`line-height: 1.6`), max 65 characters per line (`max-width: 65ch`), neutral secondary color (`#A1A1AA`).
- **Mono:** `JetBrains Mono` — For transcription brackets, timecodes, and high-density metrics.
- **Banned:** `Inter`, `Roboto`, and generic system fonts are banned for premium contexts. Serif fonts are strictly banned across this software UI.

## 4. Component Stylings
* **Buttons:** Flat, solid colors. No outer glow. Tactile `-1px` transform on active/hover. Accent fill (`#0045E6`) for primary, ghost/translucent white (`rgba(255,255,255,0.05)`) for secondary.
* **Cards (Bento Grid):** Deeply rounded corners (`12px` to `16px`). Diffused `backdrop-blur-xl` with a `rgba(255,255,255,0.05)` border. Used only when elevation serves hierarchy. 
* **Inputs:** Immersive translucent fields (`bg-white/5` with `backdrop-blur`). Focus ring in subtle white (`rgba(255,255,255,0.2)`). No heavy outlines.
* **Loaders:** Skeletal shimmer matching exact layout dimensions or minimalist pure CSS text-fade loops.
* **Empty States:** Composed, typography-led compositions with high negative space. Never just a centered generic icon.
* **Popovers (Dictionary):** Fixed or absolute positioned with heavy blur (`backdrop-blur-2xl`), deep shadow, and solid borders to lift them aggressively off the canvas.

## 5. Layout Principles
- **Spatial Separation:** No overlapping elements — every element occupies its own clear spatial zone.
- **Hero & Headers:** No centered Hero sections if variance exceeds 4. The header is an ultra-slim glassmorphic strip (`backdrop-blur-md bg-zinc-950/70 border-b border-white/5`) that sticks to the top without dominating.
- **Grid Systems:** CSS Grid over Flexbox math. Max-width containment (`max-w-3xl` for reading zones, `max-w-5xl` for galleries). 
- **Responsive:** Strict single-column collapse below 768px. No horizontal scroll. Touch targets are a minimum of `44px`.

## 6. Motion & Interaction
- **Selection:** Stark, high-contrast text highlighting (`bg-white text-zinc-950`).
- **Hover States:** Smooth transform elevations (`-translate-y-0.5`) and background color transitions (`duration-300`).
- **Micro-Interactions:** Typewriter reveals for hero text, soft opacity fades for mounting components.
- **Performance:** Hardware-accelerated transforms only (`transform` and `opacity`). Never animate width, height, top, or left dynamically.

## 7. Anti-Patterns (Banned AI Tells)
- **NO** emojis anywhere in the UI.
- **NO** `Inter` or generic serif fonts (`Times New Roman`, `Georgia`).
- **NO** pure black (`#000000`).
- **NO** neon/outer glow shadows, purple/blue AI gradients, or glowing background meshes.
- **NO** 3-column equal grids for feature layouts (use bento box asymmetry or zig-zags).
- **NO** overlapping text over images without heavy scrims.
- **NO** AI copywriting clichés ("Elevate", "Seamless", "Unleash", "Next-Gen").
- **NO** generic placeholder names or broken Unsplash links.
