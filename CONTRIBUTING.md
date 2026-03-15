# Contributing to LibreInk

Thanks for your interest in improving LibreInk. This file gives a short guide to running, testing, and contributing.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 (or the **Network** URL Vite prints if you want to test from another device). See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full setup and project structure.

## Before submitting changes

1. **Tests** – Run `npm test`. Add or update tests if you change core or app logic.
2. **Lint** – Run `npm run lint` and fix any reported issues.
3. **Build** – Run `npm run build` and fix any TypeScript or build errors.
4. **Style** – Follow existing patterns: TypeScript strict, Preact functional components, semantic CSS classes and design tokens in `src/index.css`. No Tailwind; no `any`. See [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for code style and conventions.

## Version and testing branch

Before committing or pushing to the **GitHub testing branch**, bump the project version in `package.json` so each test deployment is identifiable (e.g. `0.1.1` → `0.1.2`). Bump → run tests/build → then commit and push to testing.

## Where to look

- **New app** – [docs/plugins.md](docs/plugins.md) and `src/apps/` (e.g. `dictionary`, `comics`).
- **Shell / core** – `src/core/kernel/`, `src/core/plugins/`, `src/core/services/`, `src/core/ui/`.
- **Types** – `src/types/plugin.ts`, `src/types/settings.ts`, `src/types/services.ts`.
- **Security** – [docs/SECURITY.md](docs/SECURITY.md). Don’t add secrets; sanitize external content; use `isSafeUrl` / `sanitizeUrl` from `@core/utils/url` for links and images, and `isSafeLegacySvg` for any SVG injected in the shell (e.g. app tiles).

## Reporting issues

Open a GitHub issue with steps to reproduce and your environment (browser, OS, device type if e-ink). For security issues, prefer a private report to the maintainer.

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT).
