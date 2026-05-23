---
name: RHEL ppc64le Version and Configuration Comparison
description: 2つのRHEL ppc64leシステムのOS、kernel、Power/CPU情報、systemd、sysctl、limits、設定ファイル、ユーザー、RPM package、コマンドメタ情報を比較し、構成差異レポートを生成します。
---

<Steps>
<Step>
**基本情報収集**

両サーバーに対して同時に実行します：

1. `get_rhel_system_info`
2. `health_check_rhel`
3. `get_rhel_power_info`
4. `list_rhel_devices`
</Step>

<Step>
**OS・kernel・limits比較**

両サーバーに対して同時に実行します：

1. `get_kernel_params`
2. `get_system_limits`
3. `list_packages`

> `list_packages` の出力が多い場合は、`pattern` を指定して重要packageに絞ってください。例: `kernel`, `systemd`, `openssh`, `openssl`, `lvm2`
</Step>

<Step>
**設定ファイル・ユーザー・service比較**

両サーバーに対して同時に実行します：

1. `get_standard_config_files`
2. `get_users_and_groups` (target: "all")
3. `get_rhel_network_info`
4. `get_rhel_services`
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

- 影響大: RHEL version、kernel、sysctl、limits、RPM、service状態、network
- 影響中: ユーザー/グループ、設定ファイル、PATH、Power/CPU設定
- 影響小: コメント、順序、ホスト固有値

レポートを `Bob-report/rhel_version_comparison_report_YYYYMMDD_HHMM.md` に保存します。
</Step>
</Steps>

## When to Use
- 移行元/移行先、本番/待機、DR環境、同一クラスタ内ノードの差異を確認したい場合
- RHELのバージョン差、kernel差、RPM差、sysctl差、systemd設定差による挙動差を調査したい場合

## Assumption
比較対象として2つのRHEL MCPサーバーが登録されている前提です。

例:
- `rhel-server1`
- `rhel-server2`

## Report Structure
- **エグゼクティブサマリ**: 重要差異と推奨判断
- **比較対象**: サーバー名、RHEL version、kernel、取得時刻
- **OS/kernel/Power差異**: version、kernel、ppc64le/Power情報
- **sysctl/limits差異**: 重要パラメータの不一致
- **RPM差異**: package version不一致、欠落、追加
- **service差異**: failed/enabled/running 状態の差
- **設定ファイル差異**: network、hosts、resolv、fstab、sysctl関連
- **ユーザー/グループ差異**: UID/GID、権限、主要ユーザー
- **影響評価**: 運用・性能・障害リスク
- **推奨アクション**: 揃えるべき項目、許容可能な差異、追加確認
