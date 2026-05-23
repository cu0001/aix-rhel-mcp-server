---
name: AIX Incident Analysis
description: AIXシステムで発生した障害を、読み取り専用の一次確認から必要な診断データ取得まで段階的に解析し、インシデントレポートを生成します。
---

<Steps>
<Step>
**一次切り分け**

最初に `health_check_aix` を実行し、OS、errpt、性能、FS、ネットワークの全体像を確認します。

追加で以下を並行実行します：

1. `analyze_errpt` (severity: "PERM", hours: 48)
2. `analyze_syslog`
3. `check_dump_config`
4. `get_lpar_config`

> dump が存在する場合はクラッシュ系障害として扱い、dump 取得状況と再起動時刻をレポートに明記してください。
</Step>

<Step>
**性能状況確認**

`collect_performance_data` を実行します：

```json
{
  "metrics": ["vmstat", "iostat", "lparstat", "svmon"],
  "interval": 5,
  "count": 12
}
```

> `metrics: ["all"]` は無効です。必ず個別メトリクス名を指定してください。
</Step>

<Step>
**追加診断データ取得**

障害内容に応じて、必要なものだけ取得します。

- 短時間の性能傾向が必要: `collect_nmon` (interval: 10, count: 60, output_dir: "/tmp/mcp-nmon")
- IBM Support 向け性能診断が必要: `collect_perfpmr` (duration: 300, output_dir: "/tmp/mcp-perfpmr")
- OS全体の診断情報が必要: `collect_snap` (output_dir: "/tmp/mcp-snap")

取得後は、生成されたファイル名を確認し、必要に応じて以下でローカルへ取得します：

- `download_nmon_file`
- `download_perfpmr_file`
- `download_snap_file`
</Step>

<Step>
**追加情報補完**

兆候に応じて以下を選択します：

- デバイス/I/O関連: `list_aix_devices`, `list_aix_filesystems`
- ネットワーク関連: `get_aix_network_info`
- プロセス関連: `list_aix_processes` (filter: 問題プロセス名)
- ユーザー/権限関連: `get_aix_users`, `get_users_and_groups`
- tunable関連: `get_kernel_params`
</Step>

<Step>
**レポート生成**

収集結果を統合し、原因仮説、根拠、影響範囲、次アクションを明確にします。

レポートを `Bob-report/aix_incident_report_YYYYMMDD_HHMM.md` に保存します。
</Step>
</Steps>

## When to Use
- AIXで性能劣化、I/O遅延、アプリ停止、ネットワーク異常、OSエラー、予期しない再起動が疑われる場合
- errpt、syslog、dump、nmon、perfpmr、snap を組み合わせて障害解析したい場合

## Report Structure
- **障害概要**: 症状、影響範囲、暫定原因
- **システム環境**: OSレベル、LPAR、CPU/Memory、主要構成
- **タイムライン**: errpt/syslog/dump/再起動の時系列
- **エラーログ分析**: 重要なerrpt/syslog項目と意味
- **性能分析**: CPU、Memory、I/O、Network の観点
- **dump/診断データ状況**: dump、snap、perfpmr、nmon の有無と保存先
- **推定原因**: 根拠付きの原因候補
- **推奨対処**: 即時対応、恒久対応、追加調査