# Changelog — @baryonlabs/cli

## [0.3.0] — 2026-06-03

### Added
- Sends `X-Baryon-Client: baryon-cli/<version>` so the gateway can enforce a
  minimum CLI version. Outdated clients are blocked server-side (`426`).
- Outdated-version warning on launch and in `baryon doctor` (best-effort vs the
  npm registry; silent offline / `BARYON_SKIP_UPDATE_CHECK`).

### Changed
- The baryon provider now always forwards a session id (`X-Baryon-Session`) and
  the client version header; older installs self-heal on every run.

## [0.2.2] — 2026-06-02

### Added
- Per-launch session id (`X-Baryon-Session`) injected into the baryon provider
  so each run groups into one session (the gateway requires a session id).

## [0.2.1] — 2026-06-01

- Default sub-agents + pi extensions (7) installed by `baryon setup`
  (subagents, canvas, interactive-shell, web-access, web-fetch, search,
  parallel-web-search). `baryon extensions` to (re)install.

## [0.2.0] — 2026-06-01

- `baryon keys` / key issuance via vibecamp.us surfaced in `setup`.

## [0.1.0] — 2026-06-01

- Initial release: `@baryonlabs/cli` — a pi-coding-agent wrapper pre-wired to
  baryon.ai. `setup` / `config` / `models` / `doctor` / `update`, local model
  fallback for offline/on-prem use.
