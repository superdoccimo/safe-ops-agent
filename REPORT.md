# agent-cli 実行レポート

## サマリ
- help/serve: 取得済み
- /apply,/patch パリティ: 取得済み（外部パス拒否を確認）
- deploy/check: dry-run コマンド列を取得済み
- revalidate: 送信プランを保存（実送信なし）

## ログ一覧
- logs/.gitkeep (1 bytes)
- logs/agent-help.txt (871 bytes)
- logs/agent-patch.txt (3 bytes)
- logs/agent-serve-run.txt (1008 bytes)
- logs/agent-serve-startup.txt (1008 bytes)
- logs/api-apply-bad.status (9 bytes)
- logs/api-apply-ok.json (0 bytes)
- logs/api-parity.json (1248 bytes)
- logs/api-parity.txt (270 bytes)
- logs/api-patch-ok.json (0 bytes)
- logs/check-dryrun.txt (574 bytes)
- logs/codex-fix.txt (188 bytes)
- logs/comparison-aggregate.md (199 bytes)
- logs/deploy-dryrun.err (29 bytes)
- logs/deploy-dryrun.txt (341 bytes)
- logs/metrics-nextjs.md (408 bytes)
- logs/revalidate-plan.json (259 bytes)
- logs/revalidate-plan.txt (104 bytes)

## パリティ抜粋
```
[PARITY] apply_ok_dryrun wrote=1 deleted=1 mkdir=1
[PARITY] apply_escape blocked=true msg=Refuse to touch outside workspace: ../../etc/passwd
[PARITY] patch_ok_dryrun ops=1 wrote=1
[PARITY] patch_escape blocked=true msg=Refuse to touch outside workspace: ../../etc/evil
```

## deploy (dry-run) 抜粋
```
[dry-run] ssh -p 22 -i ~/.ssh/id_ed25519 ubuntu@your.server.com 'cd /home/ubuntu/strapi && git pull --ff-only || true'
[dry-run] ssh -p 22 -i ~/.ssh/id_ed25519 ubuntu@your.server.com 'cd /home/ubuntu/strapi && pnpm build'
[dry-run] ssh -p 22 -i ~/.ssh/id_ed25519 ubuntu@your.server.com 'cd /home/ubuntu/strapi && pm2 reload strapi-frontend'
```

## check (dry-run) 抜粋
```
[dry-run] ssh -p 22 -i ~/.ssh/id_ed25519 ubuntu@your.server.com 'cd /home/ubuntu/strapi && bash -lc "code=$(curl -sS -o /dev/null -w '''%{http_code}''' http://127.0.0.1:3000/ || echo 000); echo '''[HC] http://127.0.0.1:3000/ -> '''$code; test $code -ge 200 -a $code -lt 400"'
[dry-run] ssh -p 22 -i ~/.ssh/id_ed25519 ubuntu@your.server.com 'cd /home/ubuntu/strapi && bash -lc "code=$(curl -sS -o /dev/null -w '''%{http_code}''' http://127.0.0.1:3000/sitemap.xml || echo 000); echo '''[HC] http://127.0.0.1:3000/sitemap.xml -> '''$code; test $code -ge 200 -a $code -lt 400"'
```

## 比較表（集計・暫定）
| 指標 | Codex CLI | Claude Code |
| --- | ---:| ---:|
| ターン数(平均) | 5 | 7 |
| 所要時間(分, 平均) | 12 | 16 |
| 成功率(%, 平均) | 100 | 80 |
| 制限遭遇(合計) | 0 | 2 |
