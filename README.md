# agent-cli × Codex 評価と運用導線（概要）
ローカル完結のAI運用導線。パッチ取り込み→ドライラン→適用→デプロイ/チェックを最短で結ぶ。

このリポジトリは、Next.js + Strapi 運用を一発で回す極小CLI（agent-cli）と、Codex CLI など外部生成物（パッチ）を取り込む導線を提供します。比較評価の手順は `README.eval.md` を参照してください。

## クイックスタート
- CLIインストール: `npm i -g ./agent-cli`
- 設定例: `agent-cli/agent.config.json`
- 代表コマンド:
  - `agent serve --port 8787` ローカルUI(API): Apply/Patch/Deploy/Check/Revalidate/Logs
  - `agent patch --input patch.diff --apply [--dry-run]` パッチ適用
  - `agent ingest --cmd "codex-cli …" --apply [--dry-run]` 外部生成物の取り込み
  - `agent ingest --file patch.diff --apply [--dry-run]` ファイル経由の取り込み

## 評価手順と結果
- 手順テンプレ: `README.eval.md`
- ログ/スクショ格納先: `logs/` （例: `logs/codex-fix.txt`, `logs/claude-fix.txt`）
- まとめの抜粋（例）:
  - 速度/品質: Codexは手数・妥当性で優位（実測を記載）
  - 運用導線: 自作CLI×Codexで「適用→デプロイ→検証」を1ターミナル完結
  - セキュリティ: ローカル完結（共有しない限りコード外部送信なし）

## クイックデモ（30秒）
```
# 1) help / serve 起動ログ
node agent-cli/bin/agent --help | tee logs/agent-help.txt >/dev/null
node agent-cli/bin/agent serve --port 8787 > logs/agent-serve-startup.txt 2>&1 & sleep 1; kill %1

# 2) fix(dry-run) の要約
printf '[{"op":"write","path":"tmp/demo.txt","content":"hi"}]' > tmp/diff.json
node agent-cli/bin/agent fix --input tmp/diff.json --dry-run | tee logs/codex-fix.txt >/dev/null

# 3) /apply,/patch のパリティ検証（ネットワーク不要）
node scripts/local_api_parity_test.js && sed -n '1,4p' logs/api-parity.txt
```

## 比較表（初期案・暫定）
- 指標: 速度（ターン/時間）、精度（そのまま動く割合）、統合しやすさ（CLI/API化）、コスト/制限、セキュリティ観点
- 記入先: 実測は `README.eval.md` に記録し、要約をここに反映

| 項目 | Codex CLI | Claude Code |
| --- | --- | --- |
| ターン数 | 未計測 | 未計測 |
| 所要時間 | 未計測 | 未計測 |
| 成功率 | 未計測 | 未計測 |
| 統合しやすさ | 高（`agent fix/serve/ingest` 連携） | 中〜高（要検証） |
| コスト/制限 | 要実測 | 要実測 |
| ローカル完結/セキュリティ | ローカル適用可（外部送信なし運用可） | 要設計（運用方針次第） |

注記: 初期案（暫定）。実測が得られ次第、上表を更新します。

### 比較表の更新手順（自動整形）
- 実測JSONを用意: `tmp/metrics-*.json`（スキーマ: `docs/eval.schema.json`）
- 各課題の表生成: `node scripts/metrics_to_md.js --input tmp/metrics-nextjs.json --output logs/metrics-nextjs.md`
- 集計（平均/合算）表生成: `node scripts/aggregate_metrics.js --inputs tmp/metrics-nextjs.json,tmp/metrics-strapi.json --output logs/comparison-aggregate.md`
- README反映: `logs/*.md` の内容を `README.eval.md` と本比較表に転記

## bundle-browser（ローカルUI）の用途
- `agent serve --port 8787` で最小ブラウザUIを提供（/apply, /patch, /deploy, /check, /revalidate, /logs）
- 生成物（パッチやops）をUIで確認→dry-run→適用までの導線を可視化
- 公開時は内部情報を含まないスクリーンショット/ログのみ共有（秘匿値は除外）

## 注意事項
- `fix`/`serve` の適用範囲はカレントディレクトリ配下のみ（外部パス拒否）。
- パッチのrename検出は write+delete で再現（mode変更等は未対応）。

## 次の一手
- 実測値を `README.eval.md` に記録し、上記「まとめの抜粋」を実数で更新。
- 必要なら `agent.config.json` に `{"ingest": {"cmd": "codex-cli …"}}` を設定して無引数実行に対応。

## 差別化ポイント（Why us）
- ローカル完結: コードを外部に送らず、生成物のみを取り込み可能
- 安全適用: ワークスペース外の書き込みを拒否（/apply とパッチ変換にガード）
- 一発動線: fix → deploy → check → revalidate をCLI/最小UIで可視化
- 証跡重視: 全操作を `logs/` にテキストで保存、後追い検証が容易

## キーワード（SEO / GitHub 検索向け）
- Local-first DevOps, AI patch ingest, Codex CLI, Claude Code, Next.js, Strapi, dry-run, unified diff, CLI automation, minimal UI
