# 続きの会話テンプレート（ブラウザ版用）

【Next Steps（5分で再開）】
- 1) 実測を記入: `tmp/metrics-nextjs.json`, `tmp/metrics-strapi.json`
- 2) 整形生成: `node scripts/metrics_to_md.js --input tmp/metrics-nextjs.json --output logs/metrics-nextjs.md`
                `node scripts/aggregate_metrics.js --inputs=tmp/metrics-nextjs.json,tmp/metrics-strapi.json --output=logs/comparison-aggregate.md`
- 3) レポート更新: `node agent-cli/bin/agent report --output REPORT.md`
- 4) README反映: `logs/*.md` の表を `README.eval.md` と `README.md` の比較表へ転記
- 5) 提出バンドル更新: `tar -czf dist/bundle-submit.tar.gz README.md README.eval.md CONTINUE.md memo.txt memo2.txt 'Codex CLI × agent-cli 検証タスクリスト.md' REPORT.md logs docs tmp/metrics-*.json agent-cli/agent.config.json scripts`

このファイルは、新規スレッドでも前回のコンテキストを最小で復元できる再開テンプレです。以下をコピペして、`bundle-browser.tar.gz` を添付してください。

## 初回/再開メッセージ（雛形）
- 目的: agent-cli × Codex の評価とブラウザUI運用導線の検証を継続
- コンテキスト: 添付の `README.md`, `README.eval.md`, `memo.txt`, `CONTINUE.md` を読み込み
- 実行方針: 要約→計画→実施→成果を diff(パッチ) or ops(JSON) で提示
- 変更適用: 私は `agent patch` / `agent fix` で反映します

例文:
```
添付の bundle を読み込み、README.md/README.eval.md/memo.txt を要約してください。
その上で、README.eval.md のテンプレに実測値を追記する計画を提案→実施ください。
全ての変更は unified diff か ops(JSON) で提示してください。
```

## いつも添付するファイル
- `README.md`
- `README.eval.md`
- `memo.txt`（最新メモを冒頭3行で）
- `memo2.txt`（補足があれば）
- `CONTINUE.md`（このファイル）
- 必要に応じて `agent-cli/agent.config.json`（秘匿値は除外）

## 最新メモの書き方（`memo.txt` の先頭に追記）
- Next: 次にやること（3行以内）
- Blockers: 現在の制約/未解決
- Links: 参照ログ/スクショ（`logs/` 配下のパス）

例:
```
Next: README.eval.md のコスト欄を実測で更新、UI /logs の改善
Blockers: なし
Links: logs/codex-fix.txt, logs/claude-fix.txt
```

## よく使うコマンド
```
# UI/API 起動
agent serve --port 8787

# ops(JSON)適用
agent fix --input diff.json [--dry-run]

# パッチ適用
agent patch --input patch.diff --apply [--dry-run]

# 生成物の取り込み
agent ingest --file patch.diff --apply [--dry-run]
# または（configにデフォルトcmdがある場合）
agent ingest --apply [--dry-run]
```

## 依頼文サンプル（差分前提での作業依頼）
- 「変更は必ず unified diff か ops(JSON) で提示してください。適用は私が行います。」
- 「提案前に、要約（3行）→計画（箇条書き）→実施→成果（diff/ops）→次の提案 の順で出力してください。」

## 注意
- 実リポ/秘匿情報は含めず、必要時のみ `agent.config.json` を共有（秘匿値はダミー）。
- 大きな差分は `patch.diff` に保存して添付→`agent patch --apply` で適用。

## 報告テンプレ（今回の進捗の共有用）
- 目的: agent-cli × Codex の評価を継続。READMEとタスクリストの整備も完了。
- 実施: fix(dry-run)とserveの実測ログ取得、/apply・/patchのパリティ検証、deploy/checkのdry-run、revalidate送信プラン作成
- 変更:
  - README.md: 比較表（初期案）と bundle-browser 用途を追加
  - README.eval.md: 実測反映・疑似ログ追記、速度/品質の記入枠を2課題分に拡張
  - タスクリスト: 実施状況を反映（外部接続を要する項目は保留注記）
- ログ: `logs/agent-help.txt`, `logs/agent-serve-startup.txt`, `logs/codex-fix.txt`, `logs/api-parity.txt`, `logs/deploy-dryrun.txt`, `logs/check-dryrun.txt`, `logs/revalidate-plan.txt`
- 要望: 実測（Codex/Claude）を入れ次第、READMEの比較表へ転記→公開の許可をいただきたいです。

例文:
```
添付の bundle を読み込み、今回の実測ログ（/fix, /serve, /apply, /patch パリティ、deploy/check dry-run、revalidateプラン）を確認してください。
README.md に比較表（初期案）と bundle-browser の用途を追記、README.eval.md に計測枠（2課題分）を追加済みです。
GitHub公開に向けて、この方針で問題ないかご確認ください。問題なければ実測値の反映→READMEの比較表更新→PR作成まで進めます。
```
