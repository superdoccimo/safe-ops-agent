#!/usr/bin/env bash
set -euo pipefail

# 1) 実測JSONを埋める（手動）
echo "Edit tmp/metrics-nextjs.json and tmp/metrics-strapi.json"

# 2) 整形生成
node scripts/metrics_to_md.js --input tmp/metrics-nextjs.json --output logs/metrics-nextjs.md
node scripts/aggregate_metrics.js --inputs=tmp/metrics-nextjs.json,tmp/metrics-strapi.json --output=logs/comparison-aggregate.md

# 3) レポート更新
node agent-cli/bin/agent report --output REPORT.md
echo "Updated REPORT.md and logs/*.md"

# 4) 提出用バンドル（必要に応じて）
mkdir -p dist
tar -czf dist/bundle-submit.tar.gz README.md README.eval.md CONTINUE.md memo.txt memo2.txt "Codex CLI × agent-cli 検証タスクリスト.md" REPORT.md logs docs tmp/metrics-*.json agent-cli/agent.config.json scripts || true
echo "Wrote dist/bundle-submit.tar.gz"

