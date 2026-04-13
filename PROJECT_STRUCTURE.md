# Shipwatch Live - Project Structure Reference

Generated on 2026-04-11.

This visual includes the full workspace composition, excluding generated/vendor directories: `.git/`, `.next/`, and `node_modules/`.

```text
shipwatch-live/
|-- .env
|-- .env.local.example
|-- .gitignore
|-- AGENTS.md
|-- CLAUDE.md
|-- eslint.config.mjs
|-- next.config.ts
|-- next-env.d.ts
|-- package.json
|-- package-lock.json
|-- postcss.config.mjs
|-- README.md
|-- tsconfig.json
|-- tsconfig.tsbuildinfo
|-- public/
|   |-- file.svg
|   |-- globe.svg
|   |-- next.svg
|   |-- vercel.svg
|   `-- window.svg
|-- src/
|   |-- proxy.ts
|   |-- app/
|   |   |-- favicon.ico
|   |   |-- globals.css
|   |   |-- layout.tsx
|   |   |-- page.tsx
|   |   |-- api/
|   |   |   |-- apply-fix/
|   |   |   |   `-- route.ts
|   |   |   |-- github/
|   |   |   |   |-- callback/
|   |   |   |   |   `-- route.ts
|   |   |   |   `-- webhook/
|   |   |   |       `-- route.ts
|   |   |   `-- review-commit/
|   |   |       `-- route.ts
|   |   |-- auth/
|   |   |   |-- actions.ts
|   |   |   |-- callback/
|   |   |   |   `-- route.ts
|   |   |   |-- forgot-password/
|   |   |   |   `-- page.tsx
|   |   |   |-- reset-password/
|   |   |   |   `-- page.tsx
|   |   |   |-- sign-in/
|   |   |   |   `-- page.tsx
|   |   |   `-- sign-up/
|   |   |       `-- page.tsx
|   |   `-- dashboard/
|   |       |-- activity-feed.tsx
|   |       |-- layout.tsx
|   |       |-- page.tsx
|   |       |-- sidebar.tsx
|   |       |-- account/
|   |       |   |-- account-forms.tsx
|   |       |   |-- actions.ts
|   |       |   `-- page.tsx
|   |       |-- connections/
|   |       |   |-- actions.ts
|   |       |   |-- github-connection.tsx
|   |       |   `-- page.tsx
|   |       `-- settings/
|   |           `-- page.tsx
|   `-- lib/
|       `-- supabase/
|           |-- client.ts
|           `-- server.ts
`-- supabase/
    `-- create_webhook_events.sql
```
