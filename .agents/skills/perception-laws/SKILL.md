---
name: perception-laws
description: "Master reference for cognitive psychology and Gestalt visual perception laws in UI/UX design: Fitts's Law, Hick's Law, Miller's Law, Jakob's Law, Tesler's Law, Doherty Threshold (<400ms), Peak-End Rule, Zeigarnik Effect, Serial Position Effect, Gestalt Laws (Proximity, Similarity, Continuity, Closure, Common Region, Figure-Ground, Von Restorff), and Aesthetic-Usability Effect. Use when evaluating UX flows, decision architecture, interaction latency, spatial layout, or cognitive load."
---

# Perception & Cognitive UX Laws

A rigorous, actionable guide to the perceptual and cognitive laws governing human-computer interaction and visual interface design.

---

## 1. Interaction & Spatial Laws

### Fitts's Law
> *The time to acquire a target is a function of the distance to and width of the target.*
- **Formula**: $MT = a + b \log_2(2D / W)$
- **UI Rules**:
  - Make primary actions large ($W$) and close ($D$).
  - Pin high-frequency actions to screen boundaries or corners (infinite target width due to viewport edges).
  - Minimum touch target: 44×44px (mobile), 36×36px (desktop).
  - Dangerous actions (Delete, Cancel) should have increased distance ($D$) or require deliberate confirmation to prevent accidental clicks.

### Hick's Law (Hick-Hyman)
> *The time required to make a decision increases logarithmically with the number and complexity of choices.*
- **Formula**: $RT = b \cdot \log_2(n + 1)$
- **UI Rules**:
  - Break complex multi-choice workflows into progressive disclosure steps.
  - Limit top-level navigation to 5–7 items maximum.
  - Provide a clear, highlighted recommended choice (e.g., default plan on pricing tables) to eliminate choice paralysis.

### Miller's Law
> *The average human working memory can hold approximately $7 \pm 2$ chunks of information at one time.*
- **UI Rules**:
  - Chunk data into meaningful semantic units (e.g., phone numbers `(555) 123-4567`, card numbers `4444 1111 2222 3333`).
  - Cap dashboard metrics at 5–7 primary KPIs before nesting.
  - Avoid requiring users to remember information across different screens or modal dialogues.

### Tesler's Law (Conservation of Complexity)
> *Every system has an inherent amount of irreducible complexity. The only choice is who bears the burden: the user or the software.*
- **UI Rules**:
  - Automate defaults: infer timezone, currency, language, and device settings.
  - Smart presets: pre-fill sane defaults rather than demanding manual configuration on initial onboarding.

---

## 2. Performance & Temporal Laws

### Doherty Threshold
> *Productivity soars when a computer and its users interact at a pace that ensures neither has to wait on the other ($< 400\text{ ms}$).*
- **Thresholds**:
  - **$< 100\text{ ms}$**: Perceived as instantaneous (UI feedback, button press, hover state).
  - **$100 - 300\text{ ms}$**: Optimal animation/transition duration.
  - **$< 400\text{ ms}$**: The Doherty Threshold. System responses feel fluid and continuous.
  - **$> 1000\text{ ms}$**: User loses focus; skeleton loaders or progress indicators are mandatory.
- **UI Rules**:
  - Use optimistic UI updates for instant feedback on ratings, saves, and likes.
  - Show tactile feedback (spinners, press states) within 16ms of interaction.

### Zeigarnik Effect
> *People remember uncompleted or interrupted tasks better than completed tasks.*
- **UI Rules**:
  - Use progress bars with visible remaining milestones (e.g., "Step 2 of 4", "Profile 75% complete").
  - Gamify learning streaks with visual cues for unreviewed daily cards.

### Peak-End Rule
> *People judge an experience largely based on how they felt at its peak (most intense point) and at its end, rather than the total sum of every moment.*
- **UI Rules**:
  - Design memorable celebration moments for milestone completions (e.g., confetti on deck completion, streak milestones).
  - Never end a session with a cold dead end or error message; always provide a positive concluding touchpoint.

### Serial Position Effect
> *Users have a propensity to best remember the first (Primacy) and last (Recency) items in a series.*
- **UI Rules**:
  - Place the most critical features or navigation items at the very beginning and very end of menus or taskbars.
  - In comparison tables, put the core differentiator in the first column and the CTA in the final position.

---

## 3. Gestalt Laws of Visual Perception

### Law of Proximity
> *Objects that are close to each other are perceived as a unified group.*
- **UI Rules**:
  - Internal element padding ($8\text{–}12\text{px}$) must be strictly smaller than inter-card margins ($24\text{–}32\text{px}$).
  - Form labels must be positioned closer to their corresponding input field than to the preceding field.

### Law of Similarity
> *Elements that share visual characteristics (color, shape, size, orientation) are perceived to belong together or share the same function.*
- **UI Rules**:
  - Reserve one distinct accent color exclusively for clickable interactive elements.
  - Consistent iconography: keep stroke weight, radius, and style identical across the system.

### Law of Common Region
> *Elements located within the same closed boundary are perceived as belonging together.*
- **UI Rules**:
  - Use subtle background cards (`var(--color-surface)`), card borders, or elevation to define distinct content modules without visual clutter.

### Law of Continuity & Closure
> *The eye naturally follows continuous lines and curves, and mentally completes incomplete shapes.*
- **UI Rules**:
  - Horizontal carousels should intentionally reveal a sliver ($20\text{–}40\text{px}$) of the next off-screen card to cue horizontal scrollability.
  - Timeline indicators should connect sequential steps with continuous vertical or horizontal lines.

### Von Restorff Effect (Isolation Effect)
> *When multiple similar objects are present, the one that differs from the rest is most likely to be remembered.*
- **UI Rules**:
  - Limit visual contrast isolation to the single most important action (Primary CTA vs Secondary/Ghost buttons).
  - If everything is highlighted, nothing is highlighted.

### Aesthetic-Usability Effect
> *Users often perceive aesthetically pleasing design as design that is more usable, forgiving minor friction.*
- **UI Rules**:
  - Micro-details matter: typography leading, optical alignment, concentric border radii (`$R_{outer} = R_{inner} + \text{padding}$`), and smooth spring transitions directly affect perceived software reliability.
