# GitHub 説明文・タグ・コピー案

## リポジトリ名案（3案）
- agent-cli-codex-eval: Local-first AI Ops & DX
- local-ai-ops-agent: patch → dry-run → deploy
- codex-vs-claude-eval-with-agent-cli

## 説明文（Description / 140–160字目安）
ローカル完結のAI運用導線。外部生成パッチを安全に取り込み、dry-runで検証→適用→デプロイ/ヘルスチェックまでをCLI/最小UIで一発で回す。

## タグライン（1行の価値訴求）
AIが出した差分を“安全に回す”。パッチ取り込み→ドライラン→適用→デプロイ/チェックを最短導線で。

## GitHub Topics（候補）
local-first, devops, ai, codex, claude, nextjs, strapi, cli, unified-diff, dry-run, automation, patch, revalidate

## ソーシャルプレビュー用コピー（120字前後）
Local-first AI Ops: パッチ取り込み→ドライラン→適用→デプロイ/チェックを最小UIとCLIで一発。証跡は logs/ に全保存。

## README 冒頭（短文）
ローカル完結のAI運用導線。外部生成物（パッチ/ops）を安全に取り込み、dry-run→適用→デプロイ/チェックを最短で繋ぐミニCLIとUI。

## README で目立たせるキーポイント
- ローカル完結（コードは外部送信不要）
- 安全適用（ワークスペース外拒否）
- 一発動線（fix → deploy → check → revalidate）
- 証跡主義（logs/ に保存）

## PR タイトル/説明テンプレ
- Title: docs: 実測と比較表更新（課題A/B、dry-runログ含む）
- Body: PR_TEMPLATE.md を利用。logs/ と README.eval.md の差分を中心にレビュー

## リリースノート雛形
- docs: README 比較表更新、logs 追加
- feat(scripts): metrics_to_md / aggregate_metrics 追加
- chore: タスクリスト進捗反映、報告テンプレ追加

