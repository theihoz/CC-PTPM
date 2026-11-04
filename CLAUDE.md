# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

FoodieGo is a student project ("Đề tài 2"): a food-ordering SPA built with Vue 3, Vue Router and Pinia, with an AI menu recommender. It ships to production on Vercel.

- **Language:** the UI, user-facing copy, SQL comments and issue text are Vietnamese. Keep new UI strings in Vietnamese.
- **Spec:** GitHub issue theihoz/CC-PTPM#1. Its implementation tickets are sub-issues #3–#15, linked by native "blocked by" dependencies.
- **Deadline:** tight. Prefer finishing the current ticket's vertical slice over gold-plating.

## Commands

The project needs Node 22 (`.nvmrc`). Vercel is pinned to `22.x` through `engines`.

```bash
npm run dev            # Vite dev server
npm run build          # production build → dist/
npm run lint           # ESLint (flat config, eslint-plugin-vue)
npm run format:check   # Prettier check (CI fails on unformatted files; run `npm run format` to fix)
npm test               # Vitest, single run
npx vitest run tests/format.test.js        # one test file
npx vitest run -t "miễn phí ship"          # tests whose name matches
npm run db:seed        # regenerate supabase/seed.sql from src/data/menuSeed.js
```

CI runs lint, then format check, then test, then build. Run all four before pushing.

## Workflow rules

- **One branch per ticket:** use a branch named like `feat/<issue#>-<slug>`. Push it and open a PR into `main` with `Closes #<n>`. Never commit ticket work straight to `main`.
- **Deploys come only from GitHub Actions** (`.github/workflows/ci.yml`):
  - A push to `main` deploys production (https://cc-ptpm.vercel.app).
  - A same-repo PR gets a preview deploy, and the workflow comments the link on the PR.
  - Vercel's own Git auto-deploy is turned off by `git.deploymentEnabled: false` in `vercel.json`.
  - If the `VERCEL_*` secrets are missing, the deploy job skips its steps instead of failing.
- **`main` is protected:** the repo is public. The **Lint · Test · Build** check must pass and the branch must be up to date before a PR merges; force-push and deletion are blocked. Admins are not enforced.
- **Auto-merge:** enabled on the repo. After opening a ticket PR, run `gh pr merge <n> --auto --squash --delete-branch` so it merges itself once CI is green.
- **Secrets are the user's to paste.** These include `VERCEL_TOKEN`, `GEMINI_API_KEY` and the Supabase keys. Never write them for the user.

## Architecture

### Frontend

- **`src/router/index.js`:** every route is lazy-loaded and has `meta.title`. An `afterEach` hook sets `document.title` through `pageTitle()`. The route list is exported as `routes` so tests can build a memory-history router.
- **`vercel.json`:** rewrites everything except `/api/*` to `index.html`, so SPA deep links and the in-app 404 page work in production.
- **`src/lib/constants.js`:** the single source of business rules:
  - shipping fee 15 000₫, free from a subtotal of 200 000₫;
  - minimum order 50 000₫;
  - spice levels 0–4.
    The `place_order` RPC must apply the same numbers, so change both together.
- **`src/lib/format.js`:** `formatVND()` uses `Intl` vi-VN. Its output contains a non-breaking space, and the tests normalize whitespace before comparing.
- **Tailwind CSS v4:** configured CSS-first through `@tailwindcss/vite`. Theme tokens such as the `brand-*` colors live in `src/assets/main.css` under `@theme`. There is no `tailwind.config.js`.

### Data (Supabase)

- **SQL files:** they live in `supabase/migrations/` and `supabase/seed.sql`. Apply them to the production database through the Supabase MCP (`apply_migration`, `execute_sql`) only after the user approves each one, or the user pastes them into the Supabase SQL Editor. There is no Supabase CLI, no local database and no branch, so every migration hits production.
- **Money:** amounts are integer VND.
- **RLS:** enabled on every table. Menu tables are read-only to `anon` and `authenticated`, and table write grants are revoked.
- **`src/data/menuSeed.js`:** the single source of sample menu data. Rows are in database shape (snake_case, fixed ids). It feeds three things:
  1. `scripts/generate-seed.js`, which produces `seed.sql`;
  2. the dev fallback when `VITE_SUPABASE_*` is unset;
  3. test fixtures.
     `nestedMenuRows()` reproduces the nested shape Supabase returns. Food ids follow array order, so only append new foods.

### Design notes (from the spec)

- **Cart line identity:** `foodId + sizeId + sorted toppingIds + spiceLevel`. `remainingStock(foodId)` equals stock minus the quantity of every cart line for that food. It is a computed value, never a counter.
- **Cart persistence:** the cart store receives an injected repository. Guests use LocalStorage. Signed-in users use the Supabase `cart_items` table, and the guest cart is merged into it on login.
- **Orders:** they go only through the `place_order` and `cancel_order` RPCs, which run in a transaction. The server recalculates every price, and clients never send prices.
- **Order status:** derived from `created_at` by the pure function `orderStatus(order, now)`.
- **AI:** the Vercel Function `/api/suggest` calls Gemini, and the key stays on the server. The client falls back to a rule-based Mock AI.

### Test seams

- The Pinia stores' public API, with injected fakes.
- Pure functions in `src/lib`.
- The AI service, with an injected transport.

Component and E2E tests are out of scope.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for theihoz/CC-PTPM, using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

The five default triage labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `GLOSSARY.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
