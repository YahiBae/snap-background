# Snap Background

Snap Background is a frontend web app that helps users remove image backgrounds quickly and download results with transparent backgrounds. It's built with Vite, React, TypeScript, Tailwind CSS and the shadcn/ui component set.

**Live demo / deploy**: This project is configured for static hosting (Vercel, Netlify, etc.) — see `vercel.json`.

**Quick overview**
- Remove backgrounds from images (upload, preview, download).
- Responsive UI built with shadcn components and Tailwind CSS.
- Uses `react-router` pages for app flow: upload, dashboard, auth pages.

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

**Scripts** (from `package.json`)
- `dev` — start Vite dev server
- `build` — create production build
- `preview` — locally preview production build
- `test` / `test:watch` — run unit tests with Vitest
- `lint` — run ESLint

Notes: the repository includes Vite, TypeScript, Tailwind and Playwright configs for local dev and testing.

**Deployment**
This is a static frontend app; deploy the `dist/` output (Vite build) to any static host. Vercel is recommended (project already has `vercel.json`).

**Contributing**
PRs are welcome. For changes:
1. Fork the repo and create a feature branch.
2. Run tests and linting locally.
3. Open a PR with a clear description.

**License**
MIT

---
If you'd like, I can also:
- Add a short usage guide showing sample screenshots or GIFs
- Add required environment variable docs (if you plan to call an API/service for background removal)
- Create a minimal CONTRIBUTING.md and CODE_OF_CONDUCT.md

Updated `README.md` with the above content.
