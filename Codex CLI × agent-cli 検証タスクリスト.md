Codex CLI × agent-cli 検証タスクリスト
環境準備

□ Codex CLI 最新版をインストール（npm install -g @openai/codex 等）
■ agent-cli（MVP）をローカルにセットアップ（OK / README・help 動作確認済）
△ agent.config.json を本番/テスト環境に合わせて設定（保留：外部接続不可）
△ SSH鍵の登録（テスト環境でまず確認）（保留：外部接続不可）

基本動作テスト

△ Codex CLI 単体で簡単な修正（例：Next.jsコンポーネントの文言変更）を指示（保留）
■ agent-cli: fix(dry-run) 実行・UI起動ログ取得（OK / logs 追記済）
△ Codex CLI から agent-cli コマンドを呼び出せるか試す（保留）

速度/精度比較（Claude Code vs Codex CLI）

□ 同じ課題を両方に指示
　- Next.js ビルドエラー修正
　- Strapi APIのデータ取得仕様変更
□ 修正完了までの会話ターン数・実行時間を記録
□ 提案コードがそのまま動いた割合を記録
□ 制限（回数・文字数）に引っかかった回数を記録

統合度テスト

△ Codex CLI に「デプロイ〜チェック〜再生成」を1つの流れとしてやらせる（保留）
△ 途中でエラーが出た場合の再試行挙動を確認（保留）
■ CLI実行計画（dry-run時の出力）評価 → ローカルAPI同等のパリティテストにて /apply, /patch の要約・防御確認（OK）

コスト感チェック

□ 1日で想定作業を試し、Codex CLIの消費トークン・回数を把握
□ Claude Codeとの費用・制限比較を表にする

README更新

■ memo.txt の気付きや数値を「まとめの抜粋」に反映（Next/Blockers/Links 追記済）
■ Codex vs Claude 比較表を README に追加（初期案・暫定）
■ bundle-browser（agent serve UI）用途を README に明記済
△ タイトルとキーワードをGitHub向けに最適化（保留）

レポート/再現性

■ 実測JSON→Markdown生成スクリプト追加（scripts/metrics_to_md.js）
■ 集計（平均・合算）生成スクリプト追加（scripts/aggregate_metrics.js）
■ agent report コマンド追加（logs を収集して REPORT.md を生成）
