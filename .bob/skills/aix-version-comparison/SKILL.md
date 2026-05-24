---
name: AIX Version and Configuration Comparison
description: 2つのAIXシステムの構成・バージョン差異を比較したいときにOS・LPAR・tunable・fileset・設定ファイルを収集して差異レポートを生成する
version: 1.0.0
tags: [aix, comparison, configuration]
---

<Steps>
<Step>
**基本情報収集**

両サーバーに対して同時に実行します：

1. `get_aix_system_info`
2. `health_check_aix`
3. `get_lpar_config`
4. `list_aix_devices`
</Step>

<Step>
**OS・tunable・limits比較**

両サーバーに対して同時に実行します：

1. `get_kernel_params` (types: ["vmo", "ioo", "schedo", "no", "nfso"])
2. `get_system_limits`
3. `list_filesets`

> `list_filesets` の出力が多い場合は、`pattern` を指定して重要filesetに絞ってください。例: `bos.mp`, `devices`, `openssl`, `ssh`
</Step>

<Step>
**設定ファイル・ユーザー比較**

両サーバーに対して同時に実行します：

1. `get_standard_config_files`
2. `get_users_and_groups` (target: "all")
3. `get_aix_network_info`
</Step>

<Step>
**コマンドメタ情報比較（任意）**

バイナリ差異やPATH差異が疑われる場合のみ実行します：

1. `get_path_commands`

> `get_path_commands` は時間がかかります。通常比較では任意扱いにしてください。
</Step>

<Step>
**差異分析とレポート生成**

取得結果を比較し、差異を以下の観点で分類します：

- 影響大: OS TL/SP、kernel tunable、limits、device、network、重要fileset
- 影響中: ユーザー/グループ、設定ファイル、PATH
- 影響小: コメント、順序、ホスト固有値

レポートを `Bob-report/aix_version_comparison_report_YYYYMMDD_HHMM.md` に保存します。
</Step>
</Steps>

## When to Use
- 移行元/移行先、本番/待機、DR環境、同一クラスタ内ノードの差異を確認したい場合
- AIXのバージョン差、fileset差、tunable差、設定差による挙動差を調査したい場合

## Assumption
比較対象として2つのAIX MCPサーバーが登録されている前提です。

例:
- `aix-server1`
- `aix-server2`

## Report Structure
- **エグゼクティブサマリー**: 重要差異と推奨判断
- **比較対象**: サーバー名、OSレベル、取得時刻
- **OS/LPAR差異**: TL/SP、CPU、Memory、LPAR属性
- **tunable/limits差異**: 重要パラメータの不一致
- **fileset差異**: バージョン不一致、欠落、追加
- **設定ファイル差異**: network、hosts、environment、security関連
- **ユーザー/グループ差異**: UID/GID、権限、主要ユーザー
- **影響評価**: 運用・性能・障害リスク
- **推奨アクション**: 揃えるべき項目、許容可能な差異、追加確認
