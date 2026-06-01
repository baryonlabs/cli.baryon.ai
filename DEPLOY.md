# 배포 가이드 (Go-Live)

이 저장소는 두 가지 산출물을 배포합니다: **홈페이지**(cli.baryon.ai)와 **npm 패키지**(`@baryonlabs/cli`).

## 1. 홈페이지 → GitHub Pages (cli.baryon.ai)

1. 저장소 **Settings → Pages → Build and deployment → Source: GitHub Actions** 로 설정.
2. main 에 push 하면 `.github/workflows/pages.yml` 가 `docs/` 를 배포합니다.
   ```bash
   gh workflow run "Deploy homepage to GitHub Pages"   # 수동 트리거(선택)
   ```
3. **커스텀 도메인**: `docs/CNAME` 에 `cli.baryon.ai` 가 포함되어 있습니다.
   DNS 에서 `cli.baryon.ai` 의 CNAME 을 `baryonlabs.github.io` 로 지정하세요.
   Settings → Pages → Custom domain 에 `cli.baryon.ai` 입력 후 **Enforce HTTPS** 체크.

   미리보기 URL: `https://baryonlabs.github.io/cli.baryon.ai/`

## 2. npm 패키지 → @baryonlabs/cli

> `@baryonlabs` 스코프에 publish 권한이 있는 npm 계정으로 로그인되어 있어야 합니다.

```bash
cd packages/cli
npm whoami                      # 로그인 확인 (없으면 npm login)
npm publish --access public     # 2FA OTP 입력이 필요할 수 있음
```

설치 검증:

```bash
npm install -g @baryonlabs/cli
baryon doctor
```

### 버전 올리기

```bash
cd packages/cli
npm version patch   # 0.1.0 → 0.1.1
npm publish --access public
git push --follow-tags
```

## 3. 체크리스트

- [ ] Settings → Pages → Source = GitHub Actions
- [ ] DNS: `cli.baryon.ai` CNAME → `baryonlabs.github.io`
- [ ] Pages custom domain = `cli.baryon.ai`, HTTPS 강제
- [ ] `npm publish --access public` (packages/cli)
- [ ] `install.sh` 의 설치 명령이 publish 된 패키지와 일치하는지 확인
- [ ] baryon.ai API 의 실제 base URL/모델 ID 를 `src/constants.js` 기본값과 대조
