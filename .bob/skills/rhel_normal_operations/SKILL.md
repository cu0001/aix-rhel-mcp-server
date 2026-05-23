---
name: RHEL ppc64le Normal Operations
description: RHEL ppc64leシステムの日常点検、定期ヘルスチェック、軽微な異常の早期検知を行い、通常運用向けの確認結果を簡潔にまとめます。
---

<Steps>
<Step>
**標準ヘルスチェック**

最初に `health_check_rhel` を実行します。

確認観点:
- RHEL version / kernel
- uptime
- failed systemd services
- journal warning以上
- filesystem使用率
- CPU/Memory
- socket/network概要
</Step>

<Step>
**個別確認**

Phase 1で気になる点があれば、以下を追加実行します：

- journalにwarning/errorがある: `check_rhel_errors` または `analyze_journal`
- failed serviceがある: `get_rhel_services`
- FS使用率が高い: `list_rhel_filesystems`
- 性能が気になる: `get_rhel_performance`
- ネットワークが気になる: `get_rhel_network_info`
- package確認が必要: `list_packages`
</Step>

<Step>
**通常運用判断とレポート生成**

結果を以下に分類します：

- **正常**: 対応不要
- **注意**: 監視継続、次回点検で再確認
- **要対応**: failed service、容量逼迫、journal error、kdump、性能劣化など

> 通常運用では `collect_sosreport` は原則実行しません。必要な場合は障害解析スキルに切り替えてください。

詳細レポートを `Bob-report/rhel_health_check_report_YYYYMMDD.md` に自動保存します。
</Step>
</Steps>

## When to Use
- RHEL ppc64leの日次/週次点検を行う場合
- 障害ではないが、failed service、journal、FS使用率、性能、networkを確認したい場合
- 通常運用レポートを作成したい場合

## Automatic Report Generation
ヘルスチェック実行後、**自動的に**詳細レポートを `Bob-report` ディレクトリに保存します。

### レポートファイル名
`Bob-report/rhel_health_check_report_YYYYMMDD.md`

例: `Bob-report/rhel_health_check_report_20260426.md`

### レポート生成タイミング
- `health_check_rhel` 実行後、**必ず**レポートを生成
- ユーザーからの明示的な要求がなくても自動生成
- 結果の要点をチャットで表示した後、詳細レポートを保存

## Report Structure
レポートには以下のセクションを含めます：

### 1. エグゼクティブサマリー
- 実施日時、対象システム、実施者
- 検出された異常の概要（優先度別）
- 総合判定（正常/注意/要対応）

### 2. システム基本情報
- ハードウェア構成（CPU、メモリ、アーキテクチャ）
- RHEL情報（バージョン、カーネル、稼働時間）
- 仮想化情報（該当する場合）

### 3. 検出された異常（優先度別）
各異常について以下を記載：
- **概要**: 問題の簡潔な説明
- **詳細**: エラーメッセージ、発生日時、影響範囲
- **影響**: システムへの影響
- **現状**: 現在の状態（解決済み/継続中）
- **推奨アクション**: 具体的な対応手順

優先度分類：
- 🔴 **重要度：高** - 即時対応が必要（failed service、critical journal error等）
- 🟡 **重要度：中** - 1週間以内に対応（warning、容量逼迫等）
- 🟢 **重要度：低** - 監視継続（軽微な警告等）

### 4. 正常項目
- メモリ使用状況（使用率、スワップ）
- ファイルシステム使用状況（表形式、LVM情報含む）
- ネットワーク構成（インターフェース、ルーティング）
- systemdサービス状態

### 5. パフォーマンスメトリクス
- CPU統計（使用率、ロードアベレージ）
- メモリ統計（使用量、キャッシュ、バッファ）
- ディスクI/O統計
- ネットワーク統計

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
1. ユーザーが「RHELのヘルスチェックをして」と依頼
2. `health_check_rhel` を実行
3. 結果を分析し、異常を検出
4. チャットで要点を簡潔に報告
5. **自動的に**詳細レポートを `Bob-report/rhel_health_check_report_YYYYMMDD.md` に保存
6. レポート保存完了をユーザーに通知