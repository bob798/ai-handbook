#!/bin/bash
# 验证 content/ 下所有 shareAI-lab 外链可达（warning-only，不阻塞）
# Usage: bash scripts/check-external-links.sh

set +e
FAIL=0
CHECKED=0

for url in $(grep -rhoE 'https://github\.com/shareAI-lab/learn-claude-code/[^)]*' content/ 2>/dev/null | sort -u); do
  CHECKED=$((CHECKED + 1))
  code=$(curl -sIL -o /dev/null -w "%{http_code}" "$url" --max-time 8 2>/dev/null)
  if [ "$code" != "200" ]; then
    echo "WARN: $url returned HTTP ${code:-timeout}"
    FAIL=$((FAIL + 1))
  fi
done

echo "---"
echo "Checked $CHECKED shareAI-lab external links · $FAIL warnings"
exit 0
