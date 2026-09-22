# Vendor Reconciliation Engine — Windows EXE

This version packages the existing React + TypeScript + Tailwind/Vite application as a Windows desktop application using Electron.

## GitHub one-click build

1. Upload this project to a GitHub repository.
2. Go to **Actions**.
3. Select **Build Windows EXE**.
4. Click **Run workflow**.
5. Download the `Vendor-Reconciliation-Engine-Windows` artifact.

The artifact contains:
- NSIS installer EXE
- Portable EXE

## Important
The workflow intentionally uses `npm install` rather than `npm ci` and does not enable `setup-node` dependency caching. This project ships with `bun.lock` but not `package-lock.json`, so `npm ci` would fail.

The React application code remains the base application. Electron is only the Windows desktop shell.


Build fix in V5: package.json now explicitly points Electron to electron/main.cjs, and Vite uses a relative asset base for file:// loading. CI disables electron-builder implicit publishing.
