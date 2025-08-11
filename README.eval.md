# Codex CLI × agent-cli 評価メモ（ドラフト）

このドキュメントは、Codex CLI（GPT-5）と Claude Code の比較検証、および自作の運用特化CLI（agent-cli）との統合度を短時間で記録するための雛形です。結果はそのままGitHubに公開可能な体裁にしています。

## 1. 対象・前提
- 対象タスク: Next.jsのバグ修正1件、StrapiとのAPI整合1件
- 環境: Node >= 18、Codex CLI（またはChatGPT/Codex互換CLI）、Claude Code（Pro/Max）
- 比較観点: 速度、応答品質、運用統合度、コスト/制限、セキュリティ

## 2. 手順（30–60分）
1) 同一課題を両者で実施
- 手数（提案→修正→動作確認までの操作回数）
- 提案の妥当性（差分の正確さ、隣接コードへの配慮）
- 実行ログの分かりやすさ（スクショ or ログ抜粋）

2) 運用統合の検証（agent-cli 併用）
- agent-cli の `fix`（差分適用）→ `deploy` → `check` → `revalidate` を 1 ターミナルで完結
- `agent serve` により最小ブラウザUIで同操作が再現できるか

3) コスト/制限の肌感
- 連続利用・大きめ差分でのレスポンス安定性
- Claude Code のレート制限への遭遇有無

4) セキュリティ/持ち出し
- ローカルで完結（共有しなければコードを外部に送らない）設計の明記

## 3. 記録テンプレート

【記録フォーマット(JSON)と整形スクリプト】
- スキーマ: `docs/eval.schema.json`
- 例: `tmp/metrics-nextjs.json` を作成し、整形を実行
  - 実行例: `node scripts/metrics_to_md.js --input tmp/metrics-nextjs.json --output logs/metrics-nextjs.md`
  - 生成物は本ドキュメントに貼り付けてOK

### 3.1 速度/応答品質
- 課題A: Next.js バグ修正（例: ISRリンク不整合）
- ツール: Codex CLI / Claude Code
- 手数（ターン数）: Codex: __手 / Claude: __手
- 所要時間: Codex: __分 / Claude: __分
- 成功率（そのまま動く割合）: Codex: __% / Claude: __%
- 修正内容の妥当性メモ: 例) 周辺型定義・隣接コードへの配慮の有無
- 制限遭遇回数: Codex: __ / Claude: __
- ログ/スクショ: `logs/codex-fix.txt`, `logs/claude-fix.txt`

—

- 課題B: Strapi API 仕様変更への追随
- ツール: Codex CLI / Claude Code
- 手数（ターン数）: Codex: __手 / Claude: __手
- 所要時間: Codex: __分 / Claude: __分
- 成功率（そのまま動く割合）: Codex: __% / Claude: __%
- 修正内容の妥当性メモ: 例) 型/エラー処理/バックワード互換の配慮
- 制限遭遇回数: Codex: __ / Claude: __
- ログ/スクショ: `logs/codex-strapi.txt`, `logs/claude-strapi.txt`

### 3.2 運用統合度（agent-cli）
- CLI 一発動線（OK/NG）: OK
- `agent fix` → `agent deploy` → `agent check` → `agent revalidate` の可用性: 例) 成功（prod）
- `agent serve`（ローカルUI）の可用性: OK（/apply, /patch, /deploy, /check, /revalidate, /logs）

【今回の実測（ローカル検証）】
- 実測: `agent fix --input tmp/diff.json --dry-run` 実行、OK（ログ: `logs/codex-fix.txt`）
- 実測: `agent serve --port 8787` 起動確認、OK（ログ: `logs/agent-serve-startup.txt`）
- 参考: `agent --help` 出力を保存（ログ: `logs/agent-help.txt`）
- 備考: 環境のネットワーク制限により HTTP 直叩きは不可のため、/apply と /patch の挙動は内部関数レベルでパリティ検証（ログ: `logs/api-parity.txt`, `logs/api-parity.json`）。
- 結果: write/mkdir/delete の dry-run 要約取得、ならびにワークスペース外パスは拒否（"Refuse to touch outside workspace"）を確認。

【疑似ログ（ネットワーク無でも確認可能）】
- deploy: `agent deploy --target prod --dry-run`（ログ: `logs/deploy-dryrun.txt`）
- check: `agent check --target prod --dry-run`（ログ: `logs/check-dryrun.txt`）
- revalidate: 実行はせず、送信プランのみ保存（ログ: `logs/revalidate-plan.txt`, `logs/revalidate-plan.json`）

### 3.3 コスト/制限
- 実行回数/時間: 例) 14回/45分
- 制限遭遇: 例）Claude Code 429（有）/ Codex（無）

### 3.4 セキュリティ
- ローカル完結・外部送信なし（OK/NG）: OK（`agent serve` はローカルHTTP、コード持ち出し無し）

## 4. agent-cli クイックリファレンス

```
agent deploy --target prod
agent check --target prod
agent revalidate --slug hello-strapi
agent logs --target prod
agent fix --input diff.json [--dry-run] [--deploy --target prod]
agent serve --port 8787
agent patch --input patch.diff --apply [--dry-run]
agent ingest --cmd "codex-cli generate-patch ..." --apply [--dry-run]

## 6. 公開手順（ドラフト）
- ブランチ作成: `git checkout -b feat/eval-codex-vs-claude`
- 記録反映: 本ドキュメントのテンプレを実測で埋める（スクショ/ログ添付）
- README抜粋: 勝ち筋サマリをトップREADMEに1章として抜粋
- PR作成: スクショ付きで比較観点と結果を明記（運用導線の動画/GIFがあると良）
```

### diff.json 例（ローカル差分適用）
```
[
  { "op": "write", "path": "src/example.txt", "content": "Hello" },
  { "op": "delete", "path": "src/old.tmp" },
  { "op": "mkdir", "path": "src/newdir" }
]
```

## 5. 所感/まとめ（下書き）
- OpenAI は価格・入手性・CLI導線で開発者体験を明確に取りに来ている
- 自作CLI × Codex で「適用→デプロイ→検証」の一発動線が成立し、Claude Codeに対する差別化点になりうる
