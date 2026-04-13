# ShipWatch Live

A full-stack GitHub monitoring and AI code review platform. Connect your GitHub account via a GitHub App installation, receive real-time webhook events from selected repositories, and run AI-powered commit analysis with one-click auto-fix.

## What It Does

- Receives GitHub push events via webhooks with HMAC-SHA256 signature verification
- Displays a real-time activity feed of commits across all monitored repositories
- Flags suspicious commits (bug fixes, hotfixes, crashes) and large pushes (10+ commits)
- Detects repository inactivity (no pushes in 7 days)
- On-demand AI commit review: fetches full diffs and file contents, sends them through an n8n workflow connected to Claude, returns structured analysis with per-file fix suggestions
- One-click auto-fix: AI generates corrected code and commits it directly to the repository via the GitHub Contents API

## Tech Stack

- **Frontend:** Next.js (App Router), React Server Components, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Supabase (Auth, PostgreSQL, Storage, Row Level Security)
- **AI Pipeline:** n8n workflow automation, Claude API
- **GitHub Integration:** GitHub App (JWT auth, installation tokens, webhook events, Contents API)

## Architecture

**Auth:** Supabase Auth with email/password and Google OAuth. Middleware refreshes sessions on every request and protects dashboard routes while allowing webhook endpoints through unauthenticated.

**Webhook Pipeline:** GitHub sends push, installation, and installation_repositories events to `/api/github/webhook`. The route verifies the signature, parses the event, and writes to a `webhook_events` table. Installation lifecycle events trigger cleanup of the `github_installations` table.

**AI Review Pipeline:** `/api/review-commit` authenticates the user, fetches an installation access token, pulls the commit diff and full file contents (up to 15 files, sorted by change volume), and forwards everything to an n8n webhook. The response is normalized across multiple envelope shapes to extract the structured analysis.

**Auto-Fix Pipeline:** `/api/apply-fix` fetches the target file and its SHA, sends it through a second n8n workflow for AI correction, parses the corrected content, and commits it back to the repository with proper SHA tracking to prevent conflicts.

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GITHUB_APP_ID=
GITHUB_APP_PRIVATE_KEY=
GITHUB_APP_SLUG=
GITHUB_WEBHOOK_SECRET=
N8N_WEBHOOK_URL=
N8N_FIX_WEBHOOK_URL=
```

## Getting Started

```bash
npm install
npm run dev
```

Requires a configured GitHub App, Supabase project, and n8n instance with review and fix workflows.
