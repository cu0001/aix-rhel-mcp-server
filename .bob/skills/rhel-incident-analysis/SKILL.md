---
name: RHEL ppc64le Incident Analysis
description: RHEL ppc64leで障害・性能劣化・service停止・kernel errorが疑われるときに段階的に解析してインシデントレポートを生成する
version: 1.0.0
tags: [rhel, ppc64le, incident, analysis]
---

<Steps>
<Step>
**一次切り分け**

最初に `health_check_rhel` を実行し、OS、failed service、journal、性能、FS、network概要を確認します。

追加で以下を並行実行します：

1. `analyze_journal` (priority: "warning", hours: 24)
2. `check_dump_config`
3. `get_rhel_power_info`
4. `get_rhel_services`
</Step>

<Step>
**性能状況確認**

`collect_performance_data` を実行します：

```json
{
  "metrics": ["vmstat", "iostat", "mpstat", "memory", "netstat"],
  "interval": 5,
  "count": 12
}
```

> `metrics: ["all"]` は無効です。必ず個別メトリクス名を指定してください。
</Step>

<Step>
**追加診断データ取得**

より深い調査が必要な場合のみ `collect_sosreport` を実行します。

推奨:

```json
{
  "options": "--batch",
  "output_dir": "/var/tmp"
}
```

取得後、生成されたファイル名を確認し、必要に応じて `download_sos_file` でローカルへ取得します。
</Step>

<Step>
**追加情報補完**

兆候に応じて以下を選択します：

- service関連: `get_rhel_services`
- network関連: `get_rhel_network_info`
- process関連: `list_rhel_processes` (filter: 問題プロセス名)
- filesystem/storage関連: `list_rhel_filesystems`, `list_rhel_devices`
- ユーザー/権限関連: `get_rhel_users`, `get_users_and_groups`
- package/kernel差異: `list_packages`, `get_kernel_params`
</Step>

<Step>
**レポート生成**

収集結果を統合し、原因仮説、根拠、影響範囲、次アクションを明確にします。

レポートを `Bob-report/rhel_incident_report_YYYYMMDD_HHMM.md` に保存します。
</Step>
</Steps>

## When to Use
- RHEL ppc64leで性能劣化、service停止、kernel error、ネットワーク異常、OSクラッシュが疑われる場合
- journal、kdump、sosreport、性能情報を組み合わせて障害解析したい場合

## Report Structure
- **障害概要**: 症状、影響範囲、暫定原因
- **システム環境**: RHEL version、kernel、ppc64le/Power情報
- **タイムライン**: journal、service停止、kdump、再起動の時系列
- **ログ分析**: journal/syslog の重要項目
- **性能分析**: CPU、Memory、I/O、Network の観点
- **kdump/sosreport状況**: 取得有無と保存先
- **推定原因**: 根拠付きの原因候補
- **推奨対処**: 即時対応、恒久対応、追加調査
