# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

<!-- SETU-LIVE-FRONTEND-STATE:START -->
## Current SETU Frontend State

**Updated:** 2026-09-28 19:47 IST

- Current branch: `feat/T-110-polish`
- Current HEAD: `e427bc5`
- The demo path uses live backend application data rather than active frontend fixture data.
- Citizen, Officer and Admin surfaces share the current SETU shell and visual treatment.
- Status and source-format semantics are centralized under `frontend/src/ui/`.
- Loading, empty and error handling is present across the audited demo surfaces.
- Navigation and primary actions use English and Marathi labels.
- Demo footer is standardized to: `Conceptual prototype · synthetic data · not affiliated with Government of Maharashtra`
- T-110 manual visual QA has been completed at 1366x768 and 1920x1080.
- Frontend build passes. Lint has 0 errors and the known OfficerApplication hook-dependency warning.
- No new frontend dependency was introduced by T-110/T-111.
<!-- SETU-LIVE-FRONTEND-STATE:END -->
