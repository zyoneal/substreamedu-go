---
description: Build animation from scratch using Emil Kowalski's animation rules, exact curves, and spring physics.
argument-hint: "[element, transition, or interaction to animate]"
---

Build an animation from scratch using Emil Kowalski's motion standards:

1. **Read & Activate Skill**:
   - Consult `.agents/skills/animate/SKILL.md` and `.agents/skills/animate/RECIPES.md`.
2. **Animation Decision Gate**:
   - Does this element truly need animation? If unnecessary, recommend zero motion.
   - Match purpose: entrance, exit, state change, feedback, or gesture.
3. **Parameter Selection**:
   - Strictly select exact curves and spring parameters from the tables in `SKILL.md`. Never invent arbitrary cubic-beziers.
4. **Implementation**:
   - Write clean CSS transitions or Framer Motion variants. Handle interruptions and exit states cleanly.
