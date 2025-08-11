Safe local ops agent: patch→deploy→health→invalidate, all dry-run first.

# agent-cli (v0.1.0 draft)
安全な差分適用＋宣言的レシピ＋ローカル完結を重視した、汎用ミニマルCLI。
外部依存ゼロ（Node標準のみ）で、レシピ(run-recipe)とパッチ適用(patch/fix)を中心に、SSH経由の実行にも対応します。

## インストール
```bash
npm i -g .   # このフォルダで実行
```

## 設定ファイル例: agent.config.json（最小）
```json
{
  "targets": {
    "prod": {
      "host": "example.com",
      "user": "ubuntu",
      "port": 22,
      "identity": "~/.ssh/id_ed25519",
      "cwd": "/home/ubuntu/strapi",
      "pm2": "strapi-frontend"
    }
  },
  "healthcheck": { "urls": ["http://127.0.0.1:3000/"] },
  "revalidate": { "endpoint": "http://localhost:3000/api/revalidate", "secret": "change_me" },
  "deploy": { "build": "pnpm build", "start": "pnpm start", "pm2": "strapi-frontend" }
}
```

## 最小の agent.yml（JSONでもOK）
```json
{
  "name": "static-deploy",
  "target": "prod",
  "steps": [
    { "step": "deploy" },
    { "step": "healthcheck" }
  ]
}
```

## 使い方
```bash
node bin/agent help
node bin/agent run-recipe --recipe ../examples/static/agent.yml --dry-run --format=json
node bin/agent patch --input patch.diff --apply --dry-run

# 既存コマンド（中立名を優先）
node bin/agent deploy --target prod --dry-run
node bin/agent health --target prod --dry-run   # (=check)
node bin/agent invalidate --dry-run             # (=revalidate)
node bin/agent logs --target prod --dry-run
node bin/agent report --output REPORT.md        # ログ収集をMarkdown化

# 差分適用（安全なops形式）
node bin/agent fix --input diff.json --dry-run

# unified diff → ops 変換
node bin/agent patch --input patch.diff            # 変換結果(JSON)を出力
node bin/agent patch --input patch.diff --apply --dry-run

# 外部コマンドの出力（unified diff）を直接取り込み
node bin/agent ingest --cmd "echo 'diff --git a/tmp/x b/tmp/x\n--- /dev/null\n+++ b/tmp/x\n@@ -0,0 +1,1 @@\n+hi'" --apply --dry-run
node bin/agent ingest --file patch.diff --apply --dry-run

# ローカルHTTP + 最小ブラウザUI
node bin/agent serve --port 8787
# → http://127.0.0.1:8787 にアクセス
#    Apply: /apply（JSON ops） / Patch: /patch（unified diff）
#    Deploy: /deploy / Check: /check / Revalidate: /revalidate / Logs: /logs
```

### 補足とセキュリティ
- 書き込みはCWD配下のみ。相対/絶対/.. や symlink 経由の外部パスは拒否します。
- 既定で `--dry-run` を尊重（deploy/check/logs/patch/fix/ingest/revalidate に対応）。
- `run-recipe` は `--format=text|json` と logs/YYYYMMDD-HHMM/{plan.json,run-recipe.log[,run.json]} 出力を行います。
- `report` は logs/ を収集して `REPORT.md` を生成します。

優先順位: env > recipe > default（例: revalidate の endpoint/secret/path/slug）

リンク: SECURITY.md / CONTRIBUTING.md

関連: SECURITY.md / CONTRIBUTING.md
