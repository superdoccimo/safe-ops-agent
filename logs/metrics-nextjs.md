### 実測: Next.js バグ修正（ISRリンク不整合）

| 指標 | Codex CLI | Claude Code |
| --- | ---:| ---:|
| ターン数 | 5 | 7 |
| 所要時間(分) | 12 | 16 |
| 成功率(%) | 100 | 80 |
| 制限遭遇 | 0 | 1 |

- メモ（Codex）: 型まで踏み込み、差分が最小
- メモ（Claude）: 隣接ファイル対応を後追いで提案
- ログ: logs/codex-fix.txt, logs/claude-fix.txt
