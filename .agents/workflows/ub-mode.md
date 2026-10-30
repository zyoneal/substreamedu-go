# /ub-mode Workflow

Enforce Uncle Bob's disciplined software engineering protocol:
1. **First Make it Work**:
   - Laziness Protocol (one decision in one place, smallest edit)
   - TDD (failing test first, see it fail, smallest change to pass)
   - Boundary & Type System Discipline (pure functions, validate boundaries)
   - Subtract before adding complexity
2. **Then Make it Right**:
   - Fix root causes (not just defensive guards)
   - Pin behavior with characterization tests
   - Dryer: eliminate structural duplication (rank >= 0.8)
   - Crapper: reduce cyclomatic complexity (CRAP < 10)
   - Prove behavior unchanged after refactoring
3. **Practice**:
   - Maintain action log
   - Verify DoD with `./verify.sh`
   - Keep commits structured and verifiable
