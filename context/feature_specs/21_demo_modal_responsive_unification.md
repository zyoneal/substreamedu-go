# Spec 21: Demo Modal Responsive Unification & Viewport Clamping

## Metadata
- **Spec ID**: 21
- **Title**: Demo Modal Responsive Unification & Viewport Clamping
- **Status**: In Progress
- **Priority**: P1 (Bug Fix & Parity)
- **Target Files**:
  - `substreamedu-frontend/src/components/HomePage/HomePage.tsx`
  - `substreamedu-frontend/src/components/HomePage/HomePage.module.css`
  - `substreamedu-frontend/src/components/HomePage/HomePage.test.tsx`
  - `context/progress_tracker.md`

---

## 1. Problem Statement
On the landing page (`HomePage`), clicking the "Watch demo" button triggers a video walkthrough modal. Users reported that the video is so excessively tall and unconstrained that it overflows the browser viewport vertically.
Specifically:
1. The modal is implemented with custom ad-hoc backdrop and container styles instead of the unified `<Modal>` primitive (Spec 19 / ADR-075).
2. The modal window lacks a `max-height` viewport constraint.
3. `.modalVideoWrapper` specifies a fixed `aspect-ratio: 16 / 9` with `width: 100%`, forcing height to $1040 \times \frac{9}{16} = 585\text{px}$. With header (56px) and footer (60px), the total modal height is 701px.
4. When rendered inside a centered flex backdrop (`align-items: center`), screens with viewport heights $\le 750\text{px}$ (e.g. 13" MacBook, laptops with tabs/dock, tablets) center the oversized modal, pushing the header with the close button (`X`) off the top of the screen (`top < 0`), making the modal impossible to close visually.

---

## 2. Architectural Solution
1. **Unify with `<Modal>`**:
   Migrate the custom modal markup in `HomePage.tsx` to `<Modal isOpen={isDemoModalOpen} onClose={handleCloseModal} size="xl">`.
   - Leverage built-in `createPortal` to `document.body`.
   - Leverage automatic `document.body` scroll locking and cleanup.
   - Leverage `closeOnEscape` and `closeOnBackdropClick`.
   - Ensure accessible `role="dialog"` and `aria-label="Video Walkthrough"`.
2. **Viewport Height Clamping (`max-height`)**:
   - Limit the demo video wrapper to `max-height: min(calc(85vh - 130px), 560px)` and `width: auto`.
   - Constrain the video element with `max-height: 100%`, `max-width: 100%`, and `object-fit: contain`.
   - Ensure the modal window never exceeds `calc(100vh - 48px)`.
3. **Always-Visible Header & Close Button**:
   - Provide a persistent, accessible header with title and close button `<button aria-label="Close modal">`.
   - Ensure the header remains pinned/sticky at the top of the modal window so the close button is never scrolled or pushed off-screen.
   - Provide a clean footer with the demo subtitle guidance and "Start free" link.

---

## 3. Verification Checklist
- [ ] Reproducible unit test `HomePage.test.tsx` verifying opening the demo modal and close button visibility/interaction.
- [ ] All 41 frontend test suites pass (`npm test -- --watchAll=false`).
- [ ] Frontend build succeeds (`npm run build`).
- [ ] Go backend tests pass (`go test ./...`).
- [ ] `progress_tracker.md` updated with ADR-077.
