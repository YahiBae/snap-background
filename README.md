# Snap Background / AI Background Removal

Snap Background is a frontend web app for background removal with editing, batch processing, and downloadable export workflows. It's built with Vite, React, TypeScript, Tailwind CSS and the shadcn/ui component set.

**Live demo / deploy**: This project is configured for static hosting (Vercel, Netlify, etc.) — see `vercel.json`.

**Quick overview**
- Remove backgrounds from images (upload, preview, download).
- Editing controls (brightness, contrast, blur, color replace) and presets.
- Batch processing, ZIP export and history persistence (optional cloud DB).
- Responsive UI built with shadcn components and Tailwind CSS.

**Tech stack**
- Vite + React + TypeScript
- Tailwind CSS (with `@tailwindcss/typography`)
- shadcn / Radix UI primitives for components
- React Query (`@tanstack/react-query`) for data fetching
- Form handling with `react-hook-form` and validation via `zod`
- Testing with `vitest` and Playwright for E2E

**Getting started**
Prerequisites: Node.js (recommended >= 18) and npm or bun.

Install dependencies:

```bash
# npm
npm install

# or bun
bun install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
npm run preview
```

Run tests:

```bash
npm run test
```

Lint the codebase:

```bash
npm run lint
```

**Project structure**
- `src/` — application source code
	- `components/` — UI components (shadcn + Radix wrappers)
	- `pages/` — route pages: `UploadWorkspace`, `Dashboard`, auth screens
	- `lib/` — small utilities and auth helpers
	- `hooks/` — custom hooks (mobile detection, toasts)
- `public/` — static assets

**Supabase (optional) — Real Database Setup**
This project supports history persistence using Supabase. To enable:

1. Create a Supabase project.
2. Run this SQL in the Supabase SQL editor:

```sql
create table if not exists public.image_history (
	id text primary key,
	owner_email text not null,
	created_at timestamptz not null default now(),
	original_name text not null,
	original_preview text not null,
	result_url text not null
);

create index if not exists image_history_owner_created_idx
	on public.image_history (owner_email, created_at desc);
```

3. Create a `.env` file in the project root with:

```bash
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

4. Restart the dev server. If env vars are not provided, the app falls back to `localStorage` history.

**Scripts** (from `package.json`)
- `dev` — start Vite dev server
- `build` — create production build
- `preview` — locally preview production build
- `test` / `test:watch` — run unit tests with Vitest
- `lint` — run ESLint

Notes: the repository includes Vite, TypeScript, Tailwind and Playwright configs for local dev and testing.





