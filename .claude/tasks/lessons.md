# Project Lessons Learned

> This file captures lessons learned during development to prevent repeating mistakes.
> Update this file after every bug or issue encountered.

---

## 🐛 Common Mistakes & Solutions

### Frontend Lessons

#### Lesson 1: Component Complexity
**Mistake**: Created `role-auth-page.tsx` with 685 lines
**Impact**: Hard to maintain, test, and understand
**Solution**:
- Break components into <300 lines
- Use composition pattern
- Extract reusable logic to custom hooks
**Rule**: Any component >250 lines MUST be split

#### Lesson 2: Missing Loading States
**Mistake**: API calls without loading indicators
**Impact**: Poor UX, users don't know what's happening
**Solution**: Always show loading/skeleton states during async operations
**Rule**: Every async operation MUST have loading state

#### Lesson 3: Hardcoded Chinese Text
**Mistake**: Hardcoded Chinese strings in components
**Impact**: Cannot support internationalization
**Solution**: Use i18n library from the start
**Rule**: All user-facing text MUST use i18n keys

### Backend Lessons

#### Lesson 4: Missing Rate Limiting
**Mistake**: Auth endpoints without rate limiting
**Impact**: Vulnerable to brute force attacks
**Solution**: Add rate limiting to all public endpoints
**Rule**: Public endpoints MUST have rate limiting

#### Lesson 5: Incomplete Error Handling
**Mistake**: Generic error messages
**Impact**: Hard to debug, poor UX
**Solution**: Return specific error messages with error codes
**Rule**: All endpoints MUST return structured errors

#### Lesson 6: Missing Input Validation
**Mistake**: Trusting client-side validation only
**Impact**: Security vulnerabilities
**Solution**: Validate ALL inputs on backend with Pydantic
**Rule**: Never trust client data, always validate server-side

### Integration Lessons

#### Lesson 7: API Contract Drift
**Mistake**: Frontend and backend API contracts got out of sync
**Impact**: Runtime errors, broken features
**Solution**: Update `.claude/memory/api-contract.md` on every API change
**Rule**: API changes MUST update contract document first

#### Lesson 8: Missing Database Migrations
**Mistake**: Changed models without migration
**Impact**: Database schema out of sync with code
**Solution**: Always create migration after model changes
**Rule**: Model changes MUST have corresponding migration

---

## 🎯 Workflow Lessons

### Lesson 9: Skipping Plan Mode
**Mistake**: Jumping into implementation without planning
**Impact**: Wrong approach, wasted time, rework
**Solution**: ALWAYS enter Plan Mode for tasks with 3+ steps
**Rule**: Complex tasks (3+ steps or architectural decisions) MUST use Plan Mode

### Lesson 10: Not Reading Existing Code
**Mistake**: Writing code without understanding existing patterns
**Impact**: Inconsistent code style, duplicated logic
**Solution**: Read existing files before making changes
**Rule**: Read before editing - understand the pattern first

### Lesson 11: Premature Optimization
**Mistake**: Optimizing code that doesn't need it yet
**Impact**: Complex code, harder to maintain
**Solution**: Optimize only after measuring performance
**Rule**: Optimize only when there's a measured performance problem

---

## 🔒 Security Lessons

### Lesson 12: Secrets in Code
**Mistake**: Hardcoded API keys and secrets
**Impact**: Security breach if code is exposed
**Solution**: Use environment variables, never commit secrets
**Rule**: NEVER commit secrets, use .env files (gitignored)

### Lesson 13: Missing CSRF Protection
**Mistake**: Form submissions without CSRF tokens
**Impact**: Cross-site request forgery attacks
**Solution**: Use Next.js CSRF protection or validate headers
**Rule**: State-changing operations MUST have CSRF protection

### Lesson 14: Insufficient Logging
**Mistake**: Not logging security events
**Impact**: Cannot detect or investigate attacks
**Solution**: Log all auth attempts, failures, and suspicious activities
**Rule**: Security events MUST be logged with timestamps

---

## 🧪 Testing Lessons

### Lesson 15: Missing Test Coverage
**Mistake**: Writing code without tests
**Impact**: Bugs in production, fear of refactoring
**Solution**: Write tests alongside code (TDD when possible)
**Rule**: New features MUST have tests

### Lesson 16: Testing Only Happy Path
**Mistake**: Only testing success scenarios
**Impact**: Edge cases break in production
**Solution**: Test error cases, edge cases, and boundary conditions
**Rule**: Tests MUST cover error cases

### Lesson 17: Brittle Tests
**Mistake**: Tests that break on minor changes
**Impact**: Test maintenance burden
**Solution**: Test behavior, not implementation details
**Rule**: Tests should verify outcomes, not internals

---

## 📚 Documentation Lessons

### Lesson 18: Outdated Comments
**Mistake**: Comments that don't match the code
**Impact**: Confusion, misdirection
**Solution**: Update or delete comments when changing code
**Rule**: If code is self-documenting, skip the comment

### Lesson 19: Missing Context
**Mistake**: Code changes without explaining why
**Impact**: Future developers (or future you) confused
**Solution**: Commit messages should explain "why", not just "what"
**Rule**: Commit messages MUST explain the reasoning

---

## 🤖 AI Collaboration Lessons

### Lesson 20: Not Updating CLAUDE.md
**Mistake**: Repeating the same corrections to AI
**Impact**: Wasted time, frustration
**Solution**: Update CLAUDE.md immediately after correction
**Rule**: If correcting same mistake twice, update CLAUDE.md

### Lesson 21: Ignoring AI Warnings
**Mistake**: Dismissing AI concerns about approach
**Impact**: Problems that AI predicted
**Solution**: Listen to AI's concerns, discuss them
**Rule**: Take AI warnings seriously, evaluate them

### Lesson 22: Treating AI as Code Generator Only
**Mistake**: Using AI just to write code without planning
**Impact**: Suboptimal solutions, missing edge cases
**Solution**: Use AI for planning, design, and review, not just code gen
**Rule**: Leverage AI's full capabilities - plan, design, code, review

---

## 🎨 UX/UI Lessons

### Lesson 23: Ignoring Accessibility
**Mistake**: Not adding ARIA labels and keyboard support
**Impact**: Inaccessible to users with disabilities
**Solution**: Use accessibility tools, test with keyboard
**Rule**: All interactive elements MUST be keyboard accessible

### Lesson 24: Poor Error Messages
**Mistake**: Generic "Something went wrong" errors
**Impact**: Users don't know what to do
**Solution**: Specific, actionable error messages
**Rule**: Error messages MUST explain what happened and what to do

### Lesson 25: Inconsistent Design
**Mistake**: Different styles in different parts of app
**Impact**: Confusing UX, unprofessional appearance
**Solution**: Use design system consistently
**Rule**: Use existing components, don't reinvent the wheel

---

## 🔄 Performance Lessons

### Lesson 26: Unnecessary Re-renders
**Mistake**: Components re-rendering when props haven't changed
**Impact**: Slow UI, poor performance
**Solution**: Use React.memo, useMemo, useCallback appropriately
**Rule**: Profile before optimizing, optimize only bottlenecks

### Lesson 27: N+1 Query Problems
**Mistake**: Fetching related data one query at a time
**Impact**: Slow database performance
**Solution**: Use eager loading (joinedload in SQLAlchemy)
**Rule**: Analyze query performance, optimize N+1 issues

### Lesson 28: Large Bundle Sizes
**Mistake**: Importing large libraries for small features
**Impact**: Slow page loads
**Solution**: Use code splitting, dynamic imports
**Rule**: Measure bundle size, optimize imports

---

## 📊 Project-Specific Lessons

### Composition Evaluator Specific

#### Lesson 29: Authentication Complexity
**Mistake**: Multiple auth methods (SMS, WeChat, password) in one component
**Impact**: Hard to maintain, test, and extend
**Solution**: Extract each auth method into separate component/module
**Rule**: One auth method per component, compose as needed

#### Lesson 30: Missing Offline Support
**Mistake**: App doesn't work when offline
**Impact**: Poor UX, especially for mobile users
**Solution**: Add service worker, cache static assets
**Rule**: Consider offline UX from the start

---

## 🎓 How to Use This File

### When Starting a Task
1. Review relevant lessons for your task type
2. Check if similar mistakes were made before
3. Plan to avoid those mistakes

### After Making a Mistake
1. Document what went wrong
2. Explain why it happened
3. Document the solution
4. Create a rule to prevent recurrence

### During Code Review
1. Check if any lessons were violated
2. Update lessons if new patterns emerge
3. Share lessons with team

---

## 📝 Template for Adding New Lessons

```markdown
### Lesson [N]: [Title]
**Mistake**: [What went wrong]
**Impact**: [Consequences of the mistake]
**Solution**: [How to fix or prevent it]
**Rule**: [Specific rule to follow in the future]
```

---

## 🔄 Maintenance

- **Review frequency**: Weekly
- **Update trigger**: After every bug or issue
- **Archive old lessons**: Move to archive after 6 months if no longer relevant
- **Share with team**: Discuss in team meetings

---

**Last Updated**: 2026-02-23
**Total Lessons**: 30
**Categories**: Frontend, Backend, Integration, Security, Testing, Workflow, AI, UX, Performance
