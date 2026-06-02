#!/usr/bin/env sh
# 클립보드의 이미지를 docs/assets/<name>.png 로 저장 (macOS).
# 사용법:  ./scripts/save-clipboard-image.sh subagents-fibonacci
# 먼저 캡처를 "클립보드로": ⌘⇧⌃4 로 영역 캡처(클립보드), 또는 이미지 복사(⌘C).
set -e
NAME="${1:-clipboard-$(date +%Y%m%d-%H%M%S)}"
DIR="docs/assets"
OUT="$DIR/${NAME}.png"
mkdir -p "$DIR"

if command -v pngpaste >/dev/null 2>&1; then
  pngpaste "$OUT"
else
  # 설치 없이: AppleScript 로 클립보드 PNG 추출
  osascript <<OSA
set outFile to POSIX file "$PWD/$OUT"
try
  set pngData to (the clipboard as «class PNGf»)
on error
  return "ERR:NO_IMAGE"
end try
set fh to open for access outFile with write permission
set eof fh to 0
write pngData to fh
close access fh
OSA
fi

if [ -s "$OUT" ]; then
  echo "✔ 저장됨: $OUT"
  echo "  사이트에 넣으려면 docs/index.html 에:  <img src=\"/assets/${NAME}.png\" alt=\"...\" />"
else
  echo "✖ 클립보드에 이미지가 없습니다. 먼저 ⌘⇧⌃4 로 캡처하거나 이미지를 복사(⌘C)하세요."
  rm -f "$OUT"
  exit 1
fi
