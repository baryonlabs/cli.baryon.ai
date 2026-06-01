#!/usr/bin/env sh
# Baryon CLI installer — https://cli.baryon.ai
# Usage:  curl -fsSL https://cli.baryon.ai/install.sh | sh
set -e

LIME='\033[38;5;191m'; TEAL='\033[38;5;43m'; DIM='\033[2m'; B='\033[1m'; R='\033[0m'

printf "${LIME}${B}"
cat <<'BANNER'
   ___                          ___ _    ___
  / _ )___ _______ _____  ___  / __| |  |_ _|
 / _  / _ `/ __/ // / _ \/ _ \ (__| |__ | |
/____/\_,_/_/  \_, /\___/_//_/\___|____|___|
              /___/   AI coding & learning agent
BANNER
printf "${R}\n"

# --- Node.js check -----------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
  printf "${B}Node.js를 찾을 수 없습니다.${R}\n"
  printf "  Node.js 22 이상을 먼저 설치하세요: ${TEAL}https://nodejs.org${R}\n"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]" 2>/dev/null || echo 0)
if [ "$NODE_MAJOR" -lt 22 ]; then
  printf "${B}Node.js 22 이상이 필요합니다${R} (현재: $(node -v))\n"
  printf "  업그레이드: ${TEAL}https://nodejs.org${R}\n"
  exit 1
fi

# --- pick a package manager --------------------------------------------------
if command -v pnpm >/dev/null 2>&1; then PM="pnpm add -g";
elif command -v bun >/dev/null 2>&1; then PM="bun add -g";
elif command -v yarn >/dev/null 2>&1; then PM="yarn global add";
else PM="npm install -g"; fi

printf "${DIM}→ Node $(node -v) · 설치 명령: ${PM} @baryonlabs/cli${R}\n\n"
# shellcheck disable=SC2086
$PM @baryonlabs/cli

printf "\n${TEAL}${B}✔ 설치 완료${R}\n"
printf "  다음 단계:\n"
printf "    ${LIME}baryon setup${R}   # baryon.ai API 키 등록\n"
printf "    ${LIME}baryon${R}         # 코딩 에이전트 시작\n\n"
printf "  문서: ${TEAL}https://cli.baryon.ai${R}\n"
