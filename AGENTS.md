<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Package manager: pnpm

This project uses **pnpm** (v11+), not npm or yarn. The only lockfile is
`pnpm-lock.yaml` — there is no `package-lock.json`.

- Install: `pnpm install` · add deps: `pnpm add <pkg>` / `pnpm add -D <pkg>`
- Scripts: `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm format`
- One-off CLIs: `pnpm dlx <pkg>` (instead of `npx`); local bins: `pnpm exec <bin>`

Never run `npm install` or generate a `package-lock.json`. Do **not** run `build`
and `dev` at the same time — both drive Turbopack over `.next` and it panics.
Native dependency build scripts are pre-approved in `pnpm-workspace.yaml`
(`allowBuilds`); if pnpm warns about ignored builds, add the package there.
