---
description: ConardLi Garden Skills — audit UI code for common amateur mistakes, AI slop defaults, and layout failure patterns.
argument-hint: "[file, component, or screen]"
---

Audit the current codebase or target screen against ConardLi's Failure Patterns:

1. **Read Reference**:
   - Inspect `.agents/skills/web-design-engineer/references/failure-patterns.md`.
2. **Audit Checklist**:
   - Generic AI slop gradients (purple-to-blue glow, blurry centered cards).
   - Inconsistent border radius or padding collision.
   - Undifferentiated typography and missing weight contrast.
   - Low-contrast light gray text on white or dark grey on black.
   - Over-animated elements distracting from content comprehension.
3. **Remediation**:
   - Flag every violation with line numbers and provide exact refactored CSS/JSX replacements.
