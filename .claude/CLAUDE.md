# Composition Evaluator - Project Management

## 🎯 Project Overview
AI-powered composition evaluation system with role-based authentication (teacher/student), WeChat OAuth, and intelligent feedback.

**Tech Stack**:
- Frontend: Next.js 15 + TypeScript + Tailwind CSS
- Backend: FastAPI + Python + SQLAlchemy
- AI: Multi-AI collaboration (Claude Code orchestrator)

---

## 📁 Core Directory Map

```
composition-evaluator/
├── frontend/              # Next.js app (app router)
│   ├── app/              # Pages and layouts
│   ├── components/       # Reusable components
│   ├── lib/              # Utilities and API client
│   └── tests/            # Frontend tests
│
├── backend/              # FastAPI application
│   ├── app/
│   │   ├── api/         # API endpoints
│   │   ├── models/      # SQLAlchemy models
│   │   ├── schemas/     # Pydantic schemas
│   │   ├── services/    # Business logic
│   │   └── core/        # Config & deps
│   ├── tests/           # Backend tests
│   └── alembic/         # Database migrations
│
├── .claude/              # Claude Code project memory
│   ├── specs/           # Feature specifications
│   ├── tasks/           # Task tracking & lessons
│   └── memory/          # Shared context
│
├── _bmad/               # BMAD-METHOD framework
├── docs/                # Project documentation
└── infra/               # Infrastructure (Docker, etc.)
```

---

## 🚀 Common Commands

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm test                # Run tests
npm run lint            # ESLint check
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload  # Start dev server (localhost:8000)
pytest tests/ -v               # Run tests
ruff check .                   # Linting
alembic upgrade head           # Run migrations
alembic revision --autogenerate -m "message"  # Create migration
```

### Infrastructure
```bash
docker-compose up -d      # Start all services
docker-compose down       # Stop all services
```

---

## 🎨 Code Style & Conventions

### Frontend (TypeScript/React)
- **TypeScript strict mode** - No `any` types without explicit justification
- **Naming**: camelCase for variables, PascalCase for components
- **File structure**: One component per file, co-locate tests
- **Imports**: Absolute imports from `@/` alias
- **Formatting**: Prettier (runs on save)

### Backend (Python)
- **Style**: Ruff formatter and linter
- **Type hints**: Required for all functions
- **Docstrings**: Google style for public functions
- **Error handling**: Explicit exception handling, never swallow errors

### Git Commits
```
feat(scope): description
fix(scope): description
docs(scope): description
refactor(scope): description
test(scope): description
chore(scope): description

Examples:
feat(auth): add WeChat OAuth login flow
fix(backend): rate limit on auth endpoints
docs(readme): update setup instructions
```

---

## 🚫 Prohibited Actions

**NEVER modify these files**:
- `package-lock.json`, `pnpm-lock.yaml` - Generated lock files
- `node_modules/`, `__pycache__/`, `.next/` - Build artifacts
- `.env` - Contains secrets (use `.env.example` as template)
- `alembic/versions/*.py` - Only append new migrations, never edit existing ones
- `backend/.venv/` - Virtual environment

**ALWAYS use relative imports** within the project:
```typescript
// ❌ Bad
import { Button } from '../../../../components/ui/button'

// ✅ Good
import { Button } from '@/components/ui/button'
```

---

## ✅ Definition of Done

A task is **complete** when:
1. ✅ All tests pass (`pytest` for backend, `npm test` for frontend)
2. ✅ Linting passes (ruff, eslint)
3. ✅ No TypeScript/Python type errors
4. ✅ Code reviewed (self-review or peer review)
5. ✅ Documentation updated (if needed)
6. ✅ Manual testing completed (for UI changes)

**For bug fixes**: Demonstrate the fix working (screenshot or output)

**For features**: Include basic test coverage

---

## 🧠 Working Patterns

### Plan Mode (Essential)
**Enter Plan Mode when**:
- Task involves 3+ steps OR architectural decisions
- You're unsure about the approach
- User requests "think about this first"

**Workflow**:
1. Discuss requirements with user
2. Propose approach with alternatives
3. Get approval before coding
4. Exit plan mode and implement

**If implementation deviates**: Stop, return to plan mode, re-plan

### Subagent Strategy
**Use subagents for**:
- Codebase exploration (Task tool with Explore agent)
- Complex refactors (Plan agent for architecture)
- Parallel tasks (spawn multiple agents)
- Research (general-purpose agent)

**Why**: Keeps main context clean, allows parallel work

### Verification Before Done
**Before marking task complete**:
1. Run tests
2. Check logs/error output
3. Demonstrate working feature
4. Ask: "Would a senior engineer approve this?"

### Self-Improvement Loop
**After every correction**:
1. Update `.claude/tasks/lessons.md`
2. Write rule to prevent recurrence
3. Review lessons at session start

---

## 🤖 Multi-AI Collaboration

### Claude Code (Orchestrator)
- **Role**: Project management, code review, integration
- **Tasks**: Break down features, assign work, resolve conflicts

### Gemini (Frontend via AI Studio)
- **Role**: Frontend implementation
- **Domain**: `frontend/` directory

### OpenAI Codex (Backend)
- **Role**: Backend implementation
- **Domain**: `backend/` directory

### Communication Protocol
- **Specs**: `.claude/specs/feature-{name}.md`
- **API Contracts**: `.claude/memory/api-contract.md`
- **Decisions**: `.claude/memory/decisions.md`

---

## ⚠️ Common Pitfalls (Don't Make These Mistakes)

### Frontend
1. **Missing accessibility**: Always add ARIA labels and keyboard support
2. **Hardcoded strings**: Use i18n from the start (Chinese/English)
3. **Ignoring loading states**: Always show loading/skeleton screens
4. **Over-engineering**: Keep components <300 lines, split complex ones

### Backend
1. **Missing validation**: Validate ALL inputs (Pydantic models)
2. **SQL injection**: Always use SQLAlchemy ORM, never raw SQL
3. **Unhandled exceptions**: Add try-catch blocks, return proper error responses
4. **Missing rate limiting**: Add rate limits to all public endpoints

### Integration
1. **API contract drift**: Always update `.claude/memory/api-contract.md` when changing APIs
2. **Secrets in code**: Never hardcode secrets, use environment variables
3. **Migration conflicts**: One person working on migrations at a time

---

## 🎯 Current Focus

### Active Work
- 🔄 **Login page refactoring** - Breaking down 685-line component
- 🔄 **Security hardening** - Rate limiting, input validation
- 🔄 **Accessibility audit** - WCAG AA compliance

### Known Issues
- High complexity in `role-auth-page.tsx` (needs refactor)
- Missing rate limiting on `/api/v1/auth/*` endpoints
- Password complexity requirements not enforced
- Missing ARIA labels in several components

---

## 📚 Quick References

### BMAD Framework
- **Quick Start**: `docs/bmad-quick-start.md`
- **UX Design**: `docs/bmad-frontend-review-guide.md`
- **Agents**: Run `/bmad-help` for available agents

### Project Docs
- **API Docs**: `docs/api/`
- **Architecture**: `.claude/memory/decisions.md`
- **Task Tracking**: `.claude/tasks/`

### GitHub
- **Repository**: [Private repo URL]
- **CI/CD**: GitHub Actions (auto-runs on push)
- **Issue Tracker**: GitHub Issues

---

## 🔐 Security Reminders

1. **Never commit secrets** (.env files, API keys)
2. **Validate all inputs** (frontend and backend)
3. **Use parameterized queries** (SQLAlchemy ORM)
4. **Sanitize user content** (XSS prevention)
5. **Rate limit public endpoints**
6. **Log security events** (login attempts, failures)
7. **Keep dependencies updated** (npm audit, pip audit)

---

## 🎓 Learning Resources

- **BMAD Method**: docs/bmad-quick-start.md
- **Frontend**: React docs, Next.js docs
- **Backend**: FastAPI docs, SQLAlchemy docs
- **Testing**: pytest docs, Jest docs

---

## 📝 Session Start Checklist

When starting a new session:
1. ✅ Read `.claude/tasks/lessons.md` (learn from past mistakes)
2. ✅ Check `CURRENT_FOCUS` in this file
3. ✅ Review known issues section
4. ✅ Ask user: "What should we work on today?"

---

## 🔄 Last Updated

**Date**: 2026-02-23
**Updated by**: Claude Code
**Changes**: Added BMAD integration, improved structure, added best practices

**To update this file**: Use `#` command in Claude Code to edit, or modify directly and run `/memory` to sync.
