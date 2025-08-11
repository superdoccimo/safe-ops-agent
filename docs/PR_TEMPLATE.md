## 目的
- Codex CLI × agent-cli の比較実測と、ローカル運用導線の提示（dry-run/証跡込み）

## 変更概要
- README.md: 比較表（初期案）、bundle-browser(UI)の用途、差別化ポイント、キーワード
- README.eval.md: 実測ログの反映、疑似ログの記載、計測枠（2課題分）
- scripts: 実測メトリクスからMarkdown生成（`metrics_to_md.js`）
- docs: 計測データのJSONスキーマ（`eval.schema.json`）

## 実測/証跡
- fix(dry-run): logs/codex-fix.txt（ops要約）
- serve起動: logs/agent-serve-startup.txt
- /apply,/patch パリティ: logs/api-parity.txt / .json（外部パス拒否の挙動含む）
- deploy/check dry-run: logs/deploy-dryrun.txt, logs/check-dryrun.txt
- revalidate送信プラン: logs/revalidate-plan.txt / .json（実送信なし）

## 確認観点
- [ ] dry-run/安全ガード（ワークスペース外拒否）が明記されている
- [ ] 比較表が実測で更新可能（README.eval.md → README.md）
- [ ] 生成スクリプトで記録整形が再現可能

## 影響範囲
- ドキュメントのみ。アプリ本体への破壊的変更なし。

## スクショ/ログ
（必要に応じて `logs/` から添付）

