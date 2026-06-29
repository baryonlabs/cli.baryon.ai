# Changelog — @baryonlabs/cli

## [0.4.0] — 2026-06-29

### Added
- **`pi-dynamic-workflows` as a default extension** — registers a `workflow` tool
  (Claude-Code-style dynamic workflows: the model writes a small JS script that
  fans work out across isolated subagents, then synthesizes). Installed from npm
  (`pi install npm:pi-dynamic-workflows`). Verified to load conflict-free on pi 0.80.
  Great for codebase audits, multi-perspective review, large refactors, fan-out research.

## [0.3.9] — 2026-06-29

### Changed
- `baryon edge` install hint now points at the private enterprise repo
  (`github:baryonlabs/baryon-edge`) — the Edge source moved out of this public
  monorepo into a dedicated private repo (npm package stays unpublished/enterprise).

## [0.3.8] — 2026-06-29

### Added
- **`baryon edge`** (Enterprise) — delegates to `@baryonlabs/edge`, a network-isolated
  read-only data sandbox (Postgres SELECT-only + MinIO/S3 GET-only via MCP, no data
  egress). Prints an install hint if the enterprise package isn't present.

## [0.3.7] — 2026-06-29

### Added
- **다국어(i18n) ko/en** — 모든 CLI 메시지를 `t()` 카탈로그로 외부화(~110키).
  `BARYON_LANG=en` 또는 `baryon config --lang en` 로 전환(기본 ko).
- **룸 표시** — `baryon` 시작 시 연결된 분반·좌석을 `🏫 <프로젝트> · 좌석 <라벨>`
  로 표시(게이트웨이 `/v1/whoami`, best-effort).

## [0.3.6] — 2026-06-29

### Changed
- `baryon update` 가 2단계로: npm(CLI+pi 코어) → `pi update`(pi 패키지)까지 갱신해
  pi 자체 업데이트 알림도 정리.

## [0.3.5] — 2026-06-29

### Fixed
- `pi-parallel-web-search` 제거(pi ≥0.78 내장 `websearch` 로 대체) — `PARALLEL_API_KEY`
  경고 제거. 웹 검색·페치는 내장으로 키 없이 동작.

## [0.3.4] — 2026-06-29

### Fixed
- **pi 0.78 호환** — 프로바이더 헤더를 셸 폴백(`!echo "${VAR:-…}"`)으로 바꿔
  `BARYON_SESSION_ID` 누락 시에도 throw하지 않음(서브에이전트 자식/직접 pi 실행 OK).
- 충돌 확장 자동 정리(self-heal): `pi-subagents`(내장 subagent 충돌)·`pi-web-access`
  (pi-ai `/compat` 제거)를 기본에서 빼고 기존 설치본도 prune.

## [0.3.3] — 2026-06-26

### Added
- **agent-browser 기본 통합** (웹/ERP 브라우저 자동화, vercel-labs/agent-browser):
  - 번들 스킬 `agent-browser`(SKILL.md) 추가 → 기본 스킬 팩에 포함(이제 4종:
    pdf·pptx·xlsx·agent-browser). 패키지 내장이라 네트워크 없이 설치.
  - `baryon setup` 이 `agent-browser` CLI를 전역 설치(`npm i -g agent-browser` +
    `agent-browser install`). best-effort(실패해도 setup은 진행) · `--no-browser` 로 생략.
  - `baryon doctor` 에 agent-browser 설치 상태 표시.
- 스킬 소스 2종 지원: `repo`(anthropics/skills 서브폴더) + `bundled`(패키지 내장).
- 안전 가이드(SKILL.md): 읽기 전용 우선, 쓰기 전 사람 승인, CAPTCHA/인증서 우회 금지,
  사내망 데몬 위치, 프롬프트 인젝션 방지.

## [0.3.2] — 2026-06-24

### Added
- **기본 스킬 팩(P1)** — `baryon setup` 이 Anthropic 공식 Agent Skills 3종을
  `~/.pi/agent/skills/` 에 설치(pi가 자동 발견): `pdf`(PDF 처리),
  `pptx`(슬라이드 초안), `xlsx`(데이터 분석). 한 repo의 서브폴더라 shallow
  clone 1회 후 복사. 멱등(이미 있으면 skip)·재시도·크로스플랫폼(fs 기반).
- `baryon skills` (설치/동기화) · `baryon skills list` (목록) 명령.
- `--no-skills` 플래그 · `baryon doctor` 에 스킬 설치 상태 표시.
- 라이선스: 문서 스킬은 source-available·교육/데모 목적 — 교육/내부용에 한정 사용.

## [0.3.1] — 2026-06-23

### Fixed
- **기본 확장이 충돌해 신규 설치 직후 에이전트가 시작조차 못 하던 문제.**
  `pi-search`와 `pi-web-fetch`가 모두 `web_fetch` 툴을 등록해 매 실행 확장
  로드가 hard-fail 했음. 기본 확장을 충돌 없는 5종으로 정리
  (`pi-subagents · pi-canvas · pi-interactive-shell · pi-web-access ·
  pi-parallel-web-search`). `pi-web-fetch`는 puppeteer 의존 문제도 있어 제거.
- **자가 치유**: `baryon setup` 이 이미 설치된 폐기/충돌 확장을 pi의
  `settings.json` 과 디스크에서 제거 → 기존에 깨진 설치도 재설정만으로 복구
  (Windows 포함, 순수 fs).

### Changed
- 확장 설치 git clone 을 최대 3회 재시도 — GitHub rate-limit/일시 네트워크로
  "0/N" 되는 일 방지 (Windows 호환 동기 백오프).

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
