---
name: visual-critique
description: "Comprehensive 7-dimension visual critique of any web or mobile screen: visual hierarchy, brand consistency, composition, typography, color, affordance, and information density. Use when critiquing, reviewing, scoring, or auditing any UI design, screenshot, Figma frame, or page layout to produce an actionable, prioritized fix list (P1 Critical, P2 Important, P3 Polish)."
---

# Visual Critique (7 Dimensions)

Analyse a screen across seven dimensions — hierarchy, brand consistency, composition, typography, colour, affordance, and information density — then compile a prioritised fix list.

## Critique Procedure

When reviewing any UI screen, component, or layout, evaluate all 7 dimensions systematically:

### 1. Visual Hierarchy
- **Entry Point**: The first element that captures the eye. Is it the *most important* thing on the screen? Is there a single dominant element or does attention scatter?
- **Eye Flow**: Path user's eye travels (F-pattern, Z-pattern, or intentional reading order). Are there dead ends or confusing jumps? Does flow lead naturally to the primary CTA?
- **Weight**: Relative visual importance. Are size differentials at least 1.5× between hierarchy levels? Is bold type used sparingly?
- **Emphasis**: Exactly one primary emphasis zone per view. Are accent colors or contrast overused?

### 2. Brand Consistency
- **Visual Voice**: Alignment with brand personality (e.g., warm cinematic espresso, high-end technical, utilitarian).
- **Design Tokens**: Audit against token variables (canvas, surfaces, borders, text, accents). Flag raw hex codes or untokenized styles.
- **Iconography & Graphics**: Consistent icon stroke weight, corner radius, and graphic aesthetic.

### 3. Composition & Gestalt
- **Balance & Rhythm**: Asymmetric or symmetric balance; vertical rhythm and baseline grid alignment.
- **Whitespace / Breathing Room**: Adequate negative space around major cards, containers, and sections.
- **Gestalt Grouping**: Law of Proximity (related items closer together), Law of Common Region (containers cleanly bounding groups).

### 4. Typography
- **Scale Hierarchy**: Clear typographic contrast across Display, H1, H2, H3, Body, and Caption.
- **Readability & Measure**: Line length between 45–75 characters; line height 1.4–1.6 for body, 1.1–1.2 for large titles.
- **Font Pairings**: No more than 2 font families; clear pairing purpose (e.g., geometric sans with monospace numerals).

### 5. Color & Contrast
- **WCAG Accessibility**: Minimum 4.5:1 for normal text, 3:1 for large text and UI components.
- **Semantic Palette**: Purposeful mapping for success, warning, error, and interactive states.
- **Color Temperature**: Harmonious color temperature without conflicting harsh saturated tones.

### 6. Affordance & Interactivity
- **Clickability Signals**: Do interactive cards, buttons, and links look clickable?
- **State Feedback**: Explicit hover, active, focus-visible, and disabled states.
- **Hit Targets**: Minimum 44×44px touch targets on mobile / 36×36px on desktop.

### 7. Information Density
- **Cognitive Load**: Is the screen overwhelming? Can information be progressively disclosed?
- **Visual Noise**: Avoid superfluous borders inside borders or stacked divider lines.
- **Scanning Patterns**: Scannable bullet lists, bold leading keywords, and chunked cards.

---

## Prioritized Output Format

Collect all flagged findings into a single prioritized fix list:

### P1 — Critical (Usability / Accessibility / Conversion Blockers)
- **[Dimension]**: Exact issue, file/component, and concrete CSS/layout fix.

### P2 — Important (Inconsistency / Degraded Experience)
- **[Dimension]**: Exact issue and recommended adjustment.

### P3 — Polish (Subtle Craft / Micro-Refinements)
- **[Dimension]**: Fine-tuning spacing, transition curves, optical alignment.

**Overall Verdict**: One-paragraph summary highlighting the strongest visual attribute and the highest-leverage improvement.
