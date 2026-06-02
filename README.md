<p align="center">
  <img alt="Baryon CLI" src="https://cli.baryon.ai/og.svg" width="96" onerror="this.style.display='none'" />
</p>

<h1 align="center">cli.baryon.ai</h1>

<p align="center">
  <b>Baryon CLI</b> — AI 코딩·학습 에이전트. 한 줄 설치 · baryon.ai API 기본 연결 · 상용/로컬 모델 전환<br>
  교육기관 · 기업 사내 AI 인프라(온프레미스) 구축용 · <a href="https://cli.baryon.ai">cli.baryon.ai</a>
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@baryonlabs/cli"><img alt="npm" src="https://img.shields.io/npm/v/@baryonlabs/cli?style=flat-square&color=c6f24e"></a>
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A522-43e0c8?style=flat-square">
</p>

---

```bash
npm install -g @baryonlabs/cli   # 또는 pnpm / yarn / bun
baryon setup                     # baryon.ai API 키 등록 (1회)
baryon                           # 코딩 에이전트 시작
```

또는 한 줄 설치: `curl -fsSL https://cli.baryon.ai/install.sh | sh`

## 이 저장소

| 경로 | 내용 | 배포 대상 |
|------|------|-----------|
| [`docs/`](docs) | 설치 안내 홈페이지 | GitHub Pages → **cli.baryon.ai** |
| [`packages/cli/`](packages/cli) | `@baryonlabs/cli` npm 패키지 (pi 래퍼) | npm (public) |

> 실제 코딩 에이전트 `pi`(`@earendil-works/pi-coding-agent`) 의 소스는 비공개이며,
> `@baryonlabs/cli` 는 이를 baryon.ai API 에 연결하는 얇은 래퍼입니다.
> 본 저장소(homepage + 래퍼)는 공개, 에이전트 본체는 비공개로 유지됩니다.

## 구성

```
사용자(브라우저) → Web UI(chat.baryon.ai) → 코딩 에이전트(pi) → baryon.ai API(또는 로컬 LLM) → 결과
```

| 계층 | 구성 | 비고 |
|------|------|------|
| ① Web UI | `chat.baryon.ai` (pi-web-ui) | 모델 비교·세션·도구 호출·문서 생성·miri.dev 배포 |
| ② 코딩 에이전트 | `@baryonlabs/cli` → `pi` | 대화형/JSON/RPC/SDK, 세션 분기·재개, 서브에이전트 |
| ③ LLM 백엔드 | `baryon.ai API` (OpenAI 호환) | 키 내장 제공, 로컬 LLM/기관 키로 전환 |

## 개발

```bash
npm install          # 워크스페이스 의존성 설치
npm test             # @baryonlabs/cli 테스트
npm run cli -- help  # 로컬에서 CLI 실행
npm run serve        # docs/ 홈페이지 미리보기 → http://localhost:8080
```

### 배포

- **홈페이지**: `docs/**` 변경을 main 에 push → GitHub Actions(`.github/workflows/pages.yml`)가 GitHub Pages 로 배포. 커스텀 도메인은 `docs/CNAME`(`cli.baryon.ai`).
- **npm**: `cd packages/cli && npm publish --access public` (npm 2FA 필요할 수 있음).

자세한 절차는 [`DEPLOY.md`](DEPLOY.md) 참고.

---

© 2026 Baryon Labs · baryon.ai · support@baryon.ai
