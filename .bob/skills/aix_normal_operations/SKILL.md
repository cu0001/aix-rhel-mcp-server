---
name: AIX Normal Operations
description: AIXシステムの日常点検、定期ヘルスチェック、軽微な異常の早期検知を行い、通常運用向けの確認結果を簡潔にまとめます。
---

<Steps>
<Step>
**標準ヘルスチェック**

最初に `health_check_aix` を実行します。

確認観点:
- OSレベル
- uptime
- errpt
- filesystem使用率
- CPU/Memory
- network route
</Step>

<Step>
**個別確認**

Phase 1で気になる点があれば、以下を追加実行します：

- エラーがある: `check_aix_errors` (hours: 24) または `analyze_errpt`
- FS使用率が高い: `list_aix_filesystems`
- 性能が気になる: `get_aix_performance`
- ネットワークが気になる: `get_aix_network_info`
- デバイスが気になる: `list_aix_devices`
- ユーザー確認が必要: `get_aix_users`
</Step>

<Step>
**通常運用判断とレポート生成**

結果を以下に分類します：

- **正常**: 対応不要
- **注意**: 監視継続、次回点検で再確認
- **要対応**: 容量逼迫、PERMエラー、dump、性能劣化など

> 通常運用では `collect_snap`, `collect_perfpmr`, `collect_nmon` は原則実行しません。必要な場合は障害解析スキルに切り替えてください。

詳細レポートを `Bob-report/aix_health_check_report_YYYYMMDD.md` に自動保存します。
</Step>
</Steps>

## When to Use
- AIXの日次/週次点検を行う場合
- 障害ではないが、OS状態、errpt、FS使用率、性能、ネットワークを軽く確認したい場合
- 通常運用レポートを作成したい場合

## Automatic Report Generation
ヘルスチェック実行後、**自動的に**詳細レポートを `Bob-report` ディレクトリに保存します。

### レポートファイル名
`Bob-report/aix_health_check_report_YYYYMMDD.md`

例: `Bob-report/aix_health_check_report_20260426.md`

### レポート生成タイミング
- `health_check_aix` 実行後、**必ず**レポートを生成
- ユーザーからの明示的な要求がなくても自動生成
- 結果の要点をチャットで表示した後、詳細レポートを保存

## Report Structure
レポートには以下のセクションを含めます：

### 1. エグゼクティブサマリー
- 実施日時、対象システム、実施者
- 検出された異常の概要（優先度別）
- 総合判定（正常/注意/要対応）

### 2. システム基本情報
- ハードウェア構成（モデル、CPU、メモリ）
- LPAR構成（パーティション情報、Entitled Capacity）
- OS情報（OSレベル、カーネル、稼働時間）

### 3. 検出された異常（優先度別）
各異常について以下を記載：
- **概要**: 問題の簡潔な説明
- **エラー詳細**: エラーID、メッセージ、発生日時
- **影響**: システムへの影響範囲
- **現状**: 現在の状態（リカバリ済み/継続中）
- **推奨アクション**: 具体的な対応手順

優先度分類：
- 🔴 **重要度：高** - 即時対応が必要
- 🟡 **重要度：中** - 1週間以内に対応
- 🟢 **重要度：低** - 監視継続

### 4. 正常項目
- メモリ使用状況（使用率、Pin率）
- ファイルシステム使用状況（表形式）
- ネットワーク構成
- ページング領域

### 5. パフォーマンスメトリクス
- CPU統計（vmstat結果）
- メモリ統計（svmon結果）
- ページサイズ別使用状況

### 6. 推奨アクションサマリー
優先度別に整理：
- **優先度：高**（即時対応推奨）
- **優先度：中**（1週間以内）
- **優先度：低**（監視継続）

### 7. 備考
- システムの全体的な健全性評価
- 次回チェック推奨日
- その他の注意事項

## Report Format
- **形式**: Markdown
- **文字コード**: UTF-8
- **改行コード**: LF
- **スタイル**:
  - 見出しは `#` を使用
  - 表は Markdown テーブル形式
  - コードブロックは ` ``` ` で囲む
  - 優先度は絵文字で視覚化（🔴🟡🟢✅⚠️）

## Example Workflow
1. ユーザーが「AIXのヘルスチェックをして」と依頼
2. `health_check_aix` を実行
3. 結果を分析し、異常を検出
4. チャットで要点を簡潔に報告
5. **自動的に**詳細レポートを `Bob-report/aix_health_check_report_YYYYMMDD.md` に保存
6. レポート保存完了をユーザーに通知
