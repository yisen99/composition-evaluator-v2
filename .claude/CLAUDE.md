# Composition Evaluator - Multi-AI Collaboration Project

## Project Overview
An intelligent composition evaluation system with role-based authentication (teacher/student), WeChat OAuth integration, and AI-powered feedback.

## Architecture
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: FastAPI + Python + SQLAlchemy
- **AI**: Multiple AI models coordination via Claude Code

## Multi-AI Collaboration Strategy

### Claude Code (Project Manager)
**Role**: Orchestration, code review, integration, quality control
- Breaks down complex tasks into sub-tasks
- Assigns tasks to specialized AI agents
- Reviews and integrates code from multiple sources
- Maintains project coherence and standards
- Resolves conflicts between different AI implementations

### Gemini (Frontend Specialist via AI Studio)
**Role**: Frontend implementation
- UI component development
- React/Next.js patterns
- Styling and responsive design
- State management
- Client-side logic

### OpenAI Codex (Backend Specialist)
**Role**: Backend implementation
- FastAPI endpoints
- Database models and migrations
- Business logic
- Authentication and authorization
- API design

## Shared Knowledge Base

### Project Structure
```
composition-evaluator/
├── frontend/           # Gemini domain
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── styles/
├── backend/            # OpenAI domain
│   ├── app/
│   │   ├── api/
│   │   ├── models/
│   │   ├── services/
│   │   └── core/
│   ├── tests/
│   └── alembic/
├── .claude/            # Claude Code domain
│   ├── specs/          # Shared specifications
│   ├── tasks/          # Task tracking
│   └── memory/         # Shared context
└── docs/               # Shared documentation
```

### Communication Protocol

1. **Specification Files** (.claude/specs/)
   - Feature requirements
   - API contracts
   - Data models
   - UI wireframes

2. **Task Tracking** (.claude/tasks/)
   - Frontend tasks (assigned to Gemini)
   - Backend tasks (assigned to OpenAI)
   - Integration tasks (Claude Code)

3. **Shared Context** (.claude/memory/)
   - Architecture decisions
   - Code conventions
   - API contracts
   - Database schemas
   - Authentication flows

## Workflow

### 1. Feature Development
```
User Request
    ↓
Claude Code breaks down into specs
    ↓
┌───────────────┬───────────────┐
│               │               │
Frontend Spec   Backend Spec   Integration
(Gemini)        (OpenAI)        (Claude)
│               │               │
└───────────────┴───────────────┘
    ↓
Claude Code reviews & integrates
    ↓
Testing & Validation
```

### 2. Code Review Process
- Claude Code performs final review
- Checks for consistency across frontend/backend
- Validates against specifications
- Ensures security and performance standards

### 3. Conflict Resolution
- API contract mismatches
- Data model inconsistencies
- Authentication flow conflicts
- Claude Code arbitrates and decides

## Current Status

### Completed Features
- ✅ Role-based authentication (teacher/student)
- ✅ SMS verification login
- ✅ WeChat OAuth integration
- ✅ Password-based authentication
- ✅ Basic UI/UX with Chinese design system

### In Progress
- 🔄 Login/registration page evaluation (current task)
- 🔄 Security improvements
- 🔄 Accessibility enhancements

### Known Issues
- High component complexity (role-auth-page.tsx: 685 lines)
- Missing rate limiting on auth endpoints
- Accessibility improvements needed
- Password complexity requirements

## Development Guidelines

### Frontend (Gemini)
- Use TypeScript strict mode
- Follow React best practices
- Implement proper error boundaries
- Ensure accessibility (WCAG AA)
- Use existing design system

### Backend (OpenAI)
- Follow FastAPI best practices
- Implement proper error handling
- Add rate limiting
- Log security events
- Validate all inputs

### Integration (Claude Code)
- Maintain API contract consistency
- Review all code before integration
- Run tests and linting
- Update documentation
- Track technical debt

## Communication Tools

### Shared Files
- `.claude/specs/feature-{name}.md` - Feature specifications
- `.claude/memory/api-contract.md` - API contracts
- `.claude/memory/decisions.md` - Architecture decisions
- `docs/api/` - API documentation

### Commit Convention
- `feat(frontend):` - Frontend changes
- `feat(backend):` - Backend changes
- `feat(integration):` - Integration changes
- `fix(security):` - Security fixes
- `refactor(cross):` - Cross-cutting refactors

## Next Steps

1. Complete current evaluation task
2. Create improvement specifications
3. Assign tasks to specialized AIs
4. Implement improvements iteratively
5. Continuous integration and review
