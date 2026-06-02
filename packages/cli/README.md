# @baryonlabs/cli

> Baryon CLI — **AI 코딩·학습 에이전트**. `baryon.ai` API에 기본 연결된 [pi](https://www.npmjs.com/package/@earendil-works/pi-coding-agent) 코딩 에이전트 래퍼.

한 줄 설치, 별도 키 설정 없이 시작, 상용·로컬 모델 무중단 전환. 교육기관 및 기업 사내 AI 인프라(온프레미스) 구축용으로 설계되었습니다.

```bash
npm install -g @baryonlabs/cli   # 또는 pnpm / yarn / bun
baryon setup                     # baryon.ai API 키 등록 (1회)
baryon                           # 코딩 에이전트 시작
```

`curl` 한 줄 설치:

```bash
curl -fsSL https://cli.baryon.ai/install.sh | sh
```

## 무엇을 하나요

`@baryonlabs/cli` 는 pi 코딩 에이전트를 **baryon.ai (OpenAI 호환) API** 에 연결합니다. `baryon setup` 은:

1. `~/.baryon/config.json` 에 API 키·엔드포인트를 저장하고 (권한 `600`),
2. `${BARYON_BASE_URL}/models` 로 모델 목록을 조회해 (오프라인이면 기본값 사용),
3. pi 의 `~/.pi/agent/models.json` 에 `baryon` 프로바이더를 **다른 프로바이더를 보존하며** 병합합니다.

이후 `baryon` 은 `--provider baryon` 을 자동 주입해 pi 를 실행합니다. `--provider`/`--model`/`--api-key` 를 직접 주면 그 선택을 그대로 따르므로 **모델 비교**가 자유롭습니다.

## 명령어

| 명령 | 설명 |
|------|------|
| `baryon` | 대화형 코딩 에이전트 시작 (baryon.ai 기본) |
| `baryon setup` | API 키 등록 + pi 프로바이더 구성 |
| `baryon config` | 현재 설정 보기 (`--key`, `--base-url`, `--model` 로 변경) |
| `baryon models` | 사용 가능한 모델 목록 (`pi --list-models` 패스스루) |
| `baryon extensions` | 기본 확장 설치(서브에이전트·캔버스·셸·웹), `list` 로 목록 |
| `baryon doctor` | 설치·연결 진단 |
| `baryon update` | CLI + pi 에이전트 업데이트 |
| `baryon help` | 도움말 |

그 외 모든 인자(`-p`, `@file`, `--mode json`, `--continue` 등)는 pi 로 그대로 전달됩니다.

```bash
baryon -p "이 CSV를 분석해 차트를 만들어줘"   # 단발 실행
baryon @report.md "요약해줘"                  # 파일 첨부
baryon --provider openai                       # 다른 모델로 전환·비교
```

## 기본 탑재 확장

`baryon setup` 시 아래 pi 확장이 자동 설치되어 바로 쓸 수 있습니다(`--no-extensions` 로 건너뛰기, `baryon extensions` 로 재설치):

- **서브에이전트** — 작업 분해·위임·통합 ([pi-subagents](https://github.com/nicobailon/pi-subagents))
- **캔버스** ([pi-canvas](https://github.com/jyaunches/pi-canvas))
- **인터랙티브 셸** ([pi-interactive-shell](https://github.com/nicobailon/pi-interactive-shell))
- **웹 액세스** ([pi-web-access](https://github.com/nicobailon/pi-web-access))
- **웹 페치** ([pi-web-fetch](https://github.com/georgebashi/pi-web-fetch))

## 설정

| 항목 | 기본값 | 재정의 |
|------|--------|--------|
| base URL | `https://api.baryon.ai/v1` | `BARYON_BASE_URL` 환경변수 또는 `baryon config --base-url` |
| API key | — | `BARYON_API_KEY` 환경변수 또는 `baryon setup` |
| 기본 모델 | 조회된 첫 모델 | `baryon config --model <id>` |

> 정확한 엔드포인트·모델 ID 는 기관의 baryon.ai 플랜에 따릅니다.

## 오프라인 / 폐쇄망

인터넷 없이도 동작합니다. 로컬 LLM(Ollama·LM Studio·vLLM)을 쓰려면:

```bash
baryon config --base-url http://localhost:11434/v1 --key ollama
baryon setup --base-url http://localhost:11434/v1
```

## 프로그래밍 사용

```js
import { configure, run } from "@baryonlabs/cli";

await configure({ apiKey: process.env.BARYON_API_KEY });
const code = await run(["-p", "Summarize README.md"]);
```

## 요구사항

- Node.js ≥ 22.19
- Docker 불필요, 빌드 과정 없음

---

문서: <https://cli.baryon.ai> · 문의: support@baryon.ai · © Baryon Labs
