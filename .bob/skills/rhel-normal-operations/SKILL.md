---
name: RHEL ppc64le Normal Operations
description: RHEL ppc64leの日次・週次ヘルスチェックや通常点検を依頼されたときに確認を実施して運用レポートを生成する
version: 1.0.0
tags: [rhel, ppc64le, health-check, operations]
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

前のStepで気になる点があれば、以下を追加実行します：

- journalにwarning/errorがある: `check_rhel_errors` または `analyze_journal`
- failed serviceがある: `get_rhel_services`
- FS使用率が高い: `list_rhel_filesystems`
- 性能が気になる: `get_rhel_performance`
- ネットワークが気になる: `get_rhel_network_info`
- デバイスが気になる: `list_rhel_devices`
- ユーザー確認が必要: `get_rhel_users`
- package確認が必要: `list_packages`
</Step>

<Step>
**通常運用判断とレポート生成**

結果を以下に分類します：

- **正常**: 対応不要
- **注意**: 監視継続、次回点検で再確認
- **要対応**: failed service、容量逼迫、journal error、kdump、性能劣化など

> 通常運用では `collect_sosreport` は原則実行しません。必要な場合は障害解析スキルに切り替えてください。

詳細レポートを `Bob-report/rhel_health_check_report_YYYYMMDD.md` に自動保存します。レポートを生成する際は `references/report_format.md` を読み込み、その構成・フォーマットに従ってください。
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

## Example Workflow
1. ユーザーが「RHELのヘルスチェックをして」と依頼
2. `health_check_rhel` を実行
3. 結果を分析し、異常を検出
4. チャットで要点を簡潔に報告
5. **自動的に**詳細レポートを `Bob-report/rhel_health_check_report_YYYYMMDD.md` に保存
6. レポート保存完了をユーザーに通知
