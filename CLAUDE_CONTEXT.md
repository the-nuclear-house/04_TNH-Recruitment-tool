# RecruitHub - Project Context

## Overview
RecruitHub is a recruitment and CRM platform for a nuclear engineering consultancy. It manages the full lifecycle from customer acquisition through candidate placement.

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS with custom brand colours
- **State:** Zustand (auth-store, ui-store)
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **Deployment:** Vercel

## Supabase Project
- Project ID: `pzujhiifupouwstbiedh`
- URL: https://pzujhiifupouwstbiedh.supabase.co

## Project Structure
```
src/
├── components/
│   ├── layout/        # Header, Sidebar, Layout
│   └── ui/            # Button, Card, Modal, Input, Select, Badge, etc.
├── pages/
│   ├── DashboardPage.tsx
│   ├── CandidatesPage.tsx
│   ├── CandidateProfilePage.tsx
│   ├── RequirementsPage.tsx
│   ├── RequirementDetailPage.tsx
│   ├── RequirementFormPage.tsx
│   ├── InterviewsPage.tsx
│   ├── CustomersPage.tsx          # NEW - needs migration run
│   ├── CustomerAssessmentsPage.tsx
│   ├── OrganisationPage.tsx
│   ├── ContractsPage.tsx          # Placeholder
│   ├── SettingsPage.tsx           # Placeholder
│   └── LoginPage.tsx
├── hooks/
│   └── usePermissions.ts          # Role-based permission checking
├── lib/
│   ├── services.ts                # All Supabase CRUD operations
│   ├── supabase.ts                # Supabase client
│   └── stores/
│       ├── auth-store.ts          # User authentication state
│       └── ui-store.ts            # Toast notifications, sidebar state
└── types/
    └── index.ts                   # TypeScript interfaces
```

## Database Schema

### Core Tables
- **users** - Team members with `roles` array (admin, director, manager, recruiter)
- **candidates** - Job candidates with CV, skills, experience, right to work, etc.
- **requirements** - Job requirements/positions from customers
- **interviews** - Scheduled/completed interviews (phone, technical, director stages)
- **applications** - Links candidates to requirements with status tracking
- **candidate_comments** - Comments on candidate profiles

### Customer Module (NEW - migration pending)
- **companies** - Customer companies with parent/child hierarchy
- **contacts** - People at companies
- **customer_meetings** - Meetings/calls with customers

### Other Tables
- **customer_assessments** - Final client meetings before placement

## User Roles & Permissions

Users have a `roles` array - can have multiple roles:

| Role | Permissions |
|------|-------------|
| **Recruiter** | View/add candidates, conduct phone interviews, view requirements (read-only) |
| **Manager** | + Create/edit requirements, conduct technical interviews, schedule client assessments |
| **Director** | + Conduct director interviews, approve contracts |
| **Admin** | Full access, manage users, delete anything |

Permissions are merged from all roles (highest wins).

## Interview Workflow

1. **Phone Qualification** - Recruiter calls candidate, collects admin info (right to work, salary expectations, etc.), rates soft skills
2. **Technical Interview** - Manager assesses technical depth, problem solving
3. **Director Interview** - Final internal interview
4. **Customer Assessment** - Meeting with actual customer (GO/NOGO outcome)

Each interview has:
- Outcome (pass/fail)
- Star ratings (1-5) for soft skills
- Warnings field (red flags)
- General comments
- Salary proposed

## Key Features Implemented

### Candidates
- CV upload with drag & drop
- Skills as tags (comma-separated input)
- Column filters (Excel-style) for skills, location, experience, status
- Assigned recruiter tracking
- Progressive data collection through interview stages

### Requirements
- Linked to customers (company_id)
- Skills required, experience range, security clearance
- Status as clickable tag (draft, open, on_hold, filled, cancelled)
- Linked candidates section with status tracking

### Interviews
- Filter by stage (phone/technical/director) as clickable tags
- Filter by outcome (pending/pass/fail)
- "My Candidates Only" toggle
- Schedule modal filters interviewers by role (recruiters can't do director interviews)

### Organisation
- User management for admins
- Multi-role selection (checkboxes)
- Role permissions reference card

### Customers (NEW)
- Parent company / sub-company hierarchy
- Companies House number
- Contacts linked to companies
- Meeting booking
- Create requirement button (links to requirements module)

## Pending Migrations

Run these in Supabase SQL Editor:

```sql
-- 1. Multi-role support (if not already run)
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['recruiter'];
UPDATE users SET roles = ARRAY[role] WHERE role IS NOT NULL AND (roles IS NULL OR roles = '{}');

-- 2. Interview fields
ALTER TABLE interviews 
ADD COLUMN IF NOT EXISTS warnings TEXT,
ADD COLUMN IF NOT EXISTS contract_preference VARCHAR(50),
ADD COLUMN IF NOT EXISTS salary_proposed DECIMAL(10,2);

-- 3. Customers module (run the full 20250130_customers_module.sql)
```

## UI Patterns

- **Cards** with subtle shadows and rounded corners
- **Modals** for create/edit forms (shake animation on validation error)
- **Toasts** for success/error feedback (top-right)
- **Tags/Badges** for status indicators (colour-coded)
- **Star ratings** for interview scores (visual only, no numbers)
- **Click-outside** closes dropdowns and modals

## Brand Colours (Tailwind)
- `brand-slate-900` - Primary dark text
- `brand-grey-*` - Greys (100-400)
- `brand-cyan` - Accent/links
- `brand-green` - Success
- `brand-orange` - Warning
- `brand-gold` - Highlight

## What's Next (Planned)

1. **Missions Module** - Post-placement tracking
   - Created when customer assessment = GO and candidate accepts
   - Tracks: start date, end date, day rate/salary, margin
   - Mission status (upcoming, active, completed, extended)
   - Manager dashboard for their missions

2. **Finance/Invoicing** - Generate invoices from missions

3. **Microsoft SSO** - Replace email/password with Azure AD

## Development Notes

- All services are in `src/lib/services.ts`
- Use `usePermissions()` hook for role checks
- Use `useToast()` for notifications
- Forms use local state, not form libraries
- Validation shows shake animation + red borders on missing required fields
