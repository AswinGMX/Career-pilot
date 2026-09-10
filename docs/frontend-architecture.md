# Career Pilot Frontend Architecture

## Purpose

This document defines the production frontend architecture for Career Pilot.

It is the source of truth for rebuilding the web app into a stable, scalable, testable frontend.

## Frontend Goals

- predictable data flow
- clear route boundaries
- server-rendered first load where it helps
- strong form handling and validation
- accessible, reusable design system
- role-aware workspaces
- minimal business logic in components
- testable page and feature boundaries

## Recommended Technology Stack

- Next.js App Router
- TypeScript
- React
- TanStack Query
- React Hook Form
- Zod
- Tailwind CSS
- Storybook
- Playwright
- Vitest and Testing Library

## App Structure

Recommended directory layout:

```text
apps/web/
  src/
    app/
      (public)/
      (auth)/
      (student)/
      (school)/
      (admin)/
      api/
      layout.tsx
      providers.tsx
    features/
      auth/
      student-profile/
      assessments/
      careers/
      recommendations/
      reports/
      school-admin/
      settings/
    components/
      ui/
      layout/
      feedback/
    lib/
      api/
      auth/
      env/
      query/
      utils/
    hooks/
    store/
    styles/
    types/
```

## Route Architecture

Use route groups by audience:

- `(public)` for landing and marketing
- `(auth)` for login, register, forgot/reset
- `(student)` for student workspace
- `(school)` for school admin workspace
- `(admin)` for internal platform admin

Suggested route map:

- `/`
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/student/dashboard`
- `/student/profile`
- `/student/assessments`
- `/student/careers`
- `/student/careers/[careerSlug]`
- `/student/reports`
- `/school/dashboard`
- `/school/students`
- `/school/students/[studentId]`
- `/school/reports`
- `/settings/profile`
- `/settings/security`

## Rendering Strategy

Use the App Router intentionally.

### Server Components

Use for:

- route shells
- initial data fetch for read-heavy pages
- SEO and public pages
- auth-aware redirects

### Client Components

Use for:

- forms
- interactive filters
- assessment answering
- local UI state
- optimistic updates where needed

Rule:

- fetch on the server for first paint when it reduces loading churn
- use TanStack Query in client components for mutations, refresh, and cache consistency

## State Management

Do not use a global app store for server data.

Use:

- TanStack Query for server state
- React Hook Form for form state
- local component state for ephemeral UI state
- a very small client store only for UI concerns like toasts or modal coordination

Avoid:

- duplicating API data into Zustand or Redux
- route data hidden in singleton stores

## Frontend Domain Modules

### `features/auth`

- auth forms
- auth mutations
- session hooks
- route protection helpers

### `features/student-profile`

- profile forms
- profile summary
- submission state

### `features/assessments`

- question set viewer
- answer form
- progress tracking
- result display

### `features/careers`

- catalog list
- filters
- detail view

### `features/recommendations`

- recommendation cards
- ranking views
- explanation panels

### `features/reports`

- report viewer
- parent share flow
- export status

### `features/school-admin`

- dashboard
- roster
- student report access

## API Client Layer

The frontend should call the backend through a typed API layer.

Recommended pattern:

- `lib/api/client.ts` for fetch wrapper
- one file per domain for query and mutation functions
- generated API types if OpenAPI generation is adopted

Rules:

- never call `fetch` directly inside page components
- centralize auth, error parsing, and request headers
- normalize pagination and error handling

## Query Strategy

Example query ownership:

- careers list query in `features/careers/api.ts`
- student dashboard query in `features/reports/api.ts` or `features/recommendations/api.ts`
- profile mutations in `features/student-profile/api.ts`

Query keys must be standardized:

- `['session']`
- `['student-profile']`
- `['career-list', filters]`
- `['career-detail', id]`
- `['recommendations', userId]`
- `['proof-sessions']`
- `['school-students', tenantId, page]`

## Form Architecture

All forms should use:

- React Hook Form
- Zod schemas
- shared field primitives

Forms to treat as first-class modules:

- registration
- login
- forgot/reset password
- student profile
- assessment answer submission
- school student creation
- settings updates

## Design System

The rebuild should introduce a real design system instead of ad hoc inline styles.

Required layers:

- design tokens
- base primitives
- composed patterns
- page templates

Suggested component inventory:

- Button
- Input
- Textarea
- Select
- Checkbox
- Radio Group
- Card
- Badge
- Dialog
- Drawer
- Tabs
- Table
- Pagination
- Toast
- Empty State
- Skeleton
- Banner
- Breadcrumb

Rules:

- components must be accessible
- tokens must drive spacing, color, type, radius, and shadows
- dark mode is optional, not required for v1
- visual consistency beats novelty in the app workspace

## Layout System

Define separate shells:

- Public shell
- Auth shell
- Student shell
- School shell
- Settings shell
- Platform admin shell

Each shell owns:

- navigation
- breadcrumbs
- page header pattern
- content width
- empty and loading states

## Access Control in Frontend

Frontend guards improve UX but do not enforce security.

Responsibilities:

- route redirects based on session and role
- hide unavailable navigation
- surface expired session state clearly

Do not:

- trust role checks in frontend for authorization
- expose tenant data based on client state alone

## Error Handling

Global requirements:

- route-level error boundaries
- mutation error toasts
- empty states
- retry affordances for recoverable failures
- explicit unauthorized and forbidden screens

## Loading Strategy

Use:

- skeletons for page sections
- optimistic updates selectively
- suspense only where it helps composition

Avoid:

- blocking the whole app on one bootstrap call
- spinners without layout preservation

## Accessibility

Required baseline:

- keyboard navigation
- semantic headings
- form labels and descriptions
- visible focus states
- color contrast compliance
- screen-reader friendly errors and status messages

## Analytics and Telemetry

Track:

- registration funnel
- profile completion
- assessment completion
- recommendation engagement
- report generation and sharing

Do not log raw sensitive answers unnecessarily.

## Testing Strategy

### Unit Tests

- formatters
- hooks
- UI primitives
- API adapters

### Component Tests

- form flows
- assessment question rendering
- career filters
- report displays

### E2E Tests

- login
- register
- complete profile
- start and submit proof session
- school admin reviews student

## Frontend Build Order

1. app shell and providers
2. auth flows
3. student dashboard and profile
4. career catalog and detail
5. assessment and proof workflows
6. school admin area
7. reports and settings
8. analytics, tests, and hardening

## Migration Guidance From Current Prototype

The current frontend should not be refactored in place.

Recommended approach:

1. create new frontend app in monorepo
2. port only validated product flows
3. rebuild UI with design system primitives
4. consume the new backend contracts only
5. retire the prototype routes after parity

## Definition of Done

The frontend is production-ready when:

- all core flows are implemented against stable APIs
- the route structure reflects user roles cleanly
- forms are validated and reusable
- server and client state boundaries are explicit
- design tokens and shared components replace inline styling
- automated tests cover critical journeys
