# MCP Server ツールコマンドリファレンス

各 MCP サーバー（`aix-server` / `rhel-server`）のツールが SSH 経由で実行するコマンドをカテゴリ別にまとめたリファレンスです。

---

## aix-server

### 🔧 system.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `execute_aix_command` | `<任意のコマンド>` | 任意のコマンドを SSH 経由で実行 |
| `get_aix_system_info` | `oslevel -s` | OS レベル確認 |
| | `uname -a` | カーネル・ホスト情報 |
| | `prtconf \| head -20` | ハードウェア構成情報 |
| | `lsattr -El sys0 -a realmem` | 実メモリ量 |
| | `bootinfo -s hdisk0` | ディスクサイズ |
| `health_check_aix` | `oslevel -s` | OS レベル確認 |
| | `uptime` | 稼働時間・負荷 |
| | `prtconf \| head -20` | ハードウェア情報 |
| | `lparstat -i \| head -40` | LPAR 情報 |
| | `errpt \| head -50` | エラーログ先頭 50 件 |
| | `df -g` | ファイルシステム使用状況 |
| | `vmstat 1 2 \| tail -1` | 仮想メモリ統計 |
| | `svmon -G \| head -30` | メモリ監視 |
| | `netstat -rn` | ルーティングテーブル |
| `get_lpar_config` | `lparstat -i` | LPAR 詳細設定 |
| `get_kernel_params` | `vmo -a` | 仮想メモリ最適化パラメータ |
| | `ioo -a` | I/O 最適化パラメータ |
| | `schedo -a` | スケジューラパラメータ |
| | `no -a` | ネットワークオプション |
| | `nfso -a` | NFS オプション |
| `get_path_commands` | `echo $PATH` | PATH 取得 |
| | `find <dir> -maxdepth 1 -type f -perm -111 -print \| head -n 50` | 実行ファイル一覧 |
| | `file <f>` | ファイル種別 |
| | `what <f> \| head -n 2` | バージョン情報（AIX `what` コマンド）|
| `get_system_limits` | `ulimit -a` | シェルリソース制限 |
| | `cat /etc/security/limits` | システム制限設定ファイル |
| `list_filesets` | `lslpp -L` *(全件)* | インストール済みフィルセット一覧 |
| | `lslpp -L \| grep -i "<pattern>"` *(パターン指定時)* | フィルタリング |

---

### 🩺 diagnostics.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `check_aix_errors` | `errpt -a -s <date> 2>/dev/null \|\| errpt -a \| head -100` | エラーログ確認（時刻フィルタ付き） |
| `collect_snap` | `snap -ac -d <output_dir> && ls -la <output_dir>/*.pax.Z` | snap 診断データ収集 |
| `collect_perfpmr` | `mkdir -p <output_dir> && cd <output_dir> && /usr/lpp/perfagent/tools/perfpmr <duration>` | perfpmr パフォーマンス診断収集 |
| `collect_nmon` | `mkdir -p <output_dir> && cd <output_dir> && nmon -f -s <interval> -c <count> -m <output_dir> && ls -la <output_dir>/*.nmon` | nmon データ収集 |
| `download_perfpmr_file` | *(SFTP ダウンロード)* | perfpmr ファイルをローカルへ転送 |
| `download_nmon_file` | *(SFTP ダウンロード)* | nmon ファイルをローカルへ転送 |
| `analyze_errpt` | `errpt [-T <severity>] [-N <resource>] [-a] \| head -n 100` | エラーログ分析（重要度・リソース絞り込み）|
| `analyze_syslog` | `grep -Ei "<pattern>" "<path>" \| tail -n 50` | syslog エラーパターン検索（デフォルト: `/var/adm/ras/syslog.out`）|
| `check_dump_config` | `sysdumpdev -l && ls -la /var/adm/ras/ \| grep -i dump` | ダンプ設定・ダンプファイル確認 |

---

### 📊 performance.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `get_aix_performance` | `vmstat 1 2 \| tail -1` | CPU・メモリ統計 |
| | `iostat -d 1 2 \| tail -n +3` | ディスク I/O 統計 |
| | `svmon -G` | メモリ使用状況 |
| | `topas -n 1 2>/dev/null \|\| echo 'topas not available'` | システム監視（topas）|
| `collect_performance_data` | `vmstat <interval> <count>` | 仮想メモリ統計（継続収集）|
| | `iostat -d <interval> <count>` | I/O 統計（継続収集）|
| | `sar -u <interval> <count>` | CPU 使用率（sar）|
| | `lparstat <interval> <count>` | LPAR パフォーマンス |
| | `mpstat <interval> <count>` | CPU ごとの統計 |
| | `netstat -s` | ネットワーク統計 |
| | `svmon -G` | メモリ監視 |

---

### 🌐 network.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `get_aix_network_info` | `ifconfig -a` | インターフェース一覧 |
| | `netstat -rn` | ルーティングテーブル |
| | `lsattr -El inet0` | TCP/IP 属性設定 |

---

### 📁 files.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_aix_filesystems` | `df -g` | ファイルシステム使用量（GB 表示）|
| `read_aix_file` | `cat "<path>"` *(全行)* | ファイル内容表示 |
| | `head -n <lines> "<path>"` *(行数指定時)* | 先頭 N 行表示 |
| `download_snap_file` | *(SFTP ダウンロード)* | snap ファイルをローカルへ転送 |
| `get_standard_config_files` | `cat "<file>"` × 複数ファイル | 設定ファイル一括取得（デフォルト: `/etc/profile`, `/etc/environment`, `/etc/resolv.conf`, `/etc/hosts`, `/etc/netsvc.conf`）|

---

### 💾 devices.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_aix_devices` | `lsdev` *(全デバイス)* | デバイス一覧 |
| | `lsdev -Cc <device_class>` *(クラス指定時)* | クラス別フィルタ（例: disk, adapter）|

---

### 👤 users.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_aix_processes` | `ps -ef` *(全プロセス)* | プロセス一覧 |
| | `ps -ef \| grep "<filter>" \| grep -v grep` *(フィルタ時)* | プロセス絞り込み |
| `get_aix_users` | `lsuser ALL` | ユーザー一覧 |
| | `lsgroup ALL` | グループ一覧 |
| | `who` | ログインセッション |
| `get_users_and_groups` | `lsuser -a id ALL \| head -n 200` *(users/all)* | ユーザー ID 一覧 |
| | `lsgroup -a id ALL \| head -n 200` *(groups/all)* | グループ ID 一覧 |

---
---

## rhel-server

### 🔧 system.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `execute_rhel_command` | `<任意のコマンド>` | 任意のコマンドを SSH 経由で実行 |
| `get_rhel_system_info` | `cat /etc/redhat-release` | OS バージョン |
| | `uname -a` | カーネル・ホスト情報 |
| | `uname -m` | アーキテクチャ |
| | `lscpu` | CPU 情報 |
| | `free -h` | メモリ使用量 |
| | `lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL` | ブロックデバイス一覧 |
| | `systemd-detect-virt 2>/dev/null \|\| true` | 仮想化種別検出 |
| `health_check_rhel` | `cat /etc/redhat-release` | OS バージョン |
| | `uname -a` | カーネル情報 |
| | `uname -m` | アーキテクチャ |
| | `uptime` | 稼働時間・負荷 |
| | `systemctl --failed --no-pager` | 失敗したサービス一覧 |
| | `journalctl --since "24 hours ago" -p warning..alert --no-pager \| tail -n 100` | 警告・アラートログ |
| | `df -hT` | ファイルシステム使用状況 |
| | `free -h` | メモリ使用量 |
| | `vmstat 1 2 \| tail -1` | 仮想メモリ統計 |
| | `ss -s` | ソケット統計 |
| `get_rhel_power_info` | `uname -m` | アーキテクチャ (ppc64le) |
| | `lscpu \| egrep 'Architecture\|...'` | CPU 詳細（Power 固有情報）|
| | `cat /proc/cpuinfo \| egrep 'platform\|model\|...' \| head -50` | CPU ファームウェア情報 |
| | `ppc64_cpu --smt 2>/dev/null \|\| true` | SMT スレッド設定 |
| `get_rhel_services` | `systemctl list-units --type=service --all --no-pager \| head -n 200` *(全件)* | サービス一覧 |
| | `systemctl list-units --type=service --all --no-pager \| grep -i "<filter>"` *(フィルタ時)* | サービス絞り込み |
| `get_kernel_params` | `sysctl -a 2>/dev/null \| head -n 300` *(全件)* | カーネルパラメータ |
| | `sysctl -a 2>/dev/null \| grep -i "<pattern>"` *(パターン指定時)* | パラメータ絞り込み |
| `get_path_commands` | `echo $PATH` | PATH 取得 |
| | `find <dir> -maxdepth 1 -type f -perm -111 -print \| head -n 50` | 実行ファイル一覧 |
| | `file <f>` | ファイル種別 |
| | `rpm -qf <f> 2>/dev/null \|\| true` | RPM パッケージ所有者確認 |
| `get_system_limits` | `ulimit -a` | シェルリソース制限 |
| | `cat /etc/security/limits.conf /etc/security/limits.d/*.conf 2>/dev/null` | limits.conf |
| | `systemctl show --property DefaultLimitNOFILE --property DefaultLimitNPROC --property DefaultTasksMax 2>/dev/null \|\| true` | systemd デフォルト制限 |
| `list_packages` | `rpm -qa \| sort \| head -n 300` *(全件)* | RPM パッケージ一覧 |
| | `rpm -qa \| grep -i "<pattern>"` *(パターン指定時)* | パッケージ絞り込み |

---

### 🩺 diagnostics.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `check_rhel_errors` | `journalctl --since "<hours> hours ago" -p warning..alert --no-pager \| tail -n 200` | 警告・アラートログ確認 |
| `collect_sosreport` | `sos report <options> --tmp-dir <output_dir> && ls -la <output_dir>/sosreport-*` | sos レポート収集 |
| `analyze_journal` | `journalctl --since "<hours> hours ago" -p <priority> [-u <unit>] --no-pager \| tail -n 200` | journal 詳細分析 |
| `analyze_syslog` | `grep -Ei "<pattern>" "<path>" \| tail -n 100` | ログファイルパターン検索（デフォルト: `/var/log/messages`）|
| `check_dump_config` | `systemctl status kdump --no-pager 2>/dev/null; kdumpctl status 2>/dev/null; cat /etc/kdump.conf 2>/dev/null; find /var/crash -maxdepth 2 -type f 2>/dev/null \| head -n 100` | kdump 設定・vmcore 確認 |

---

### 📊 performance.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `get_rhel_performance` | `uptime` | 稼働時間・負荷平均 |
| | `vmstat 1 2 \| tail -1` | 仮想メモリ統計 |
| | `free -h` | メモリ使用量 |
| | `iostat -xz 1 2 2>/dev/null \| tail -n +4 \|\| true` | I/O 統計 |
| | `ps -eo pid,ppid,user,stat,pcpu,pmem,comm --sort=-pcpu \| head -20` | CPU 使用率上位プロセス |
| `collect_performance_data` | `vmstat <interval> <count>` | 仮想メモリ統計（継続収集）|
| | `iostat -xz <interval> <count>` | 拡張 I/O 統計（継続収集）|
| | `mpstat <interval> <count>` | CPU ごとの統計 |
| | `pidstat <interval> <count>` | プロセス別統計 |
| | `sar -u <interval> <count>` | CPU 使用率（sar）|
| | `free -h && vmstat -s` | メモリ統計 |
| | `ss -s && ip -s link` | ネットワーク統計 |

---

### 🌐 network.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `get_rhel_network_info` | `ip addr show` | IP アドレス・インターフェース情報 |
| | `ip route show table all` | 全ルーティングテーブル |
| | `ss -tulpen` | ソケット一覧（TCP/UDP/PID）|
| | `nmcli device status 2>/dev/null \|\| true` | NetworkManager デバイス状態 |
| | `cat /etc/resolv.conf` | DNS 設定 |
| | `firewall-cmd --state 2>/dev/null && firewall-cmd --list-all 2>/dev/null \|\| true` | firewalld 状態・ルール |

---

### 📁 files.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_rhel_filesystems` | `df -hT && lsblk -f && pvs 2>/dev/null && vgs 2>/dev/null && lvs 2>/dev/null` | FS / LVM レイアウト確認 |
| `read_rhel_file` | `cat "<path>"` *(全行)* | ファイル内容表示 |
| | `head -n <lines> "<path>"` *(行数指定時)* | 先頭 N 行表示 |
| `download_sos_file` | *(SFTP ダウンロード)* | sos ファイルをローカルへ転送 |
| `get_standard_config_files` | `cat "<file>"` × 複数ファイル | 設定ファイル一括取得（デフォルト: `/etc/redhat-release`, `/etc/os-release`, `/etc/fstab`, `/etc/hosts`, `/etc/resolv.conf`, `/etc/sysctl.conf`）|

---

### 💾 devices.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_rhel_devices` (`block`) | `lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL,SERIAL` | ブロックデバイス詳細 |
| `list_rhel_devices` (`pci`) | `lspci -nn 2>/dev/null \|\| true` | PCI デバイス一覧 |
| `list_rhel_devices` (`cpu`) | `lscpu` | CPU 情報 |
| | `cat /proc/cpuinfo \| head -n 120` | CPU 詳細情報 |
| `list_rhel_devices` (`network`) | `ip -brief link` | ネットワークインターフェース一覧 |
| | `ethtool -i $(ls /sys/class/net \| head -n 1) 2>/dev/null \|\| true` | NIC ドライバ情報 |
| `list_rhel_devices` (`all`) | `lsblk -o NAME,TYPE,SIZE,FSTYPE,MOUNTPOINT,MODEL,SERIAL` | 全デバイス（block）|
| | `lspci -nn 2>/dev/null \|\| true` | 全デバイス（PCI）|
| | `lscpu` | 全デバイス（CPU）|
| | `ip -brief link` | 全デバイス（network）|

---

### 👤 users.ts

| ツール名 | 実行コマンド | 説明 |
|---|---|---|
| `list_rhel_processes` | `ps -ef` *(全プロセス)* | プロセス一覧 |
| | `ps -ef \| grep "<filter>" \| grep -v grep` *(フィルタ時)* | プロセス絞り込み |
| `get_rhel_users` | `getent passwd` | ユーザー一覧 |
| | `getent group` | グループ一覧 |
| | `who` | ログインセッション |
| | `last -n 20` | 直近 20 件のログイン履歴 |
| | `grep -R '^[^#]' /etc/sudoers /etc/sudoers.d 2>/dev/null \|\| true` | sudo 設定確認 |
| `get_users_and_groups` | `getent passwd \| head -n 200` *(users/all)* | ユーザー一覧 |
| | `getent group \| head -n 200` *(groups/all)* | グループ一覧 |

---

## AIX vs RHEL コマンド対応表

| 用途 | aix-server | rhel-server |
|---|---|---|
| OS バージョン確認 | `oslevel -s` | `cat /etc/redhat-release` |
| ハードウェア情報 | `prtconf` | `lscpu`, `lsblk` |
| LPAR/仮想化情報 | `lparstat -i` | `systemd-detect-virt`, `ppc64_cpu` |
| カーネルパラメータ | `vmo / ioo / schedo / no / nfso -a` | `sysctl -a` |
| インストール済みソフト | `lslpp -L` | `rpm -qa` |
| エラーログ | `errpt -a` | `journalctl -p warning..alert` |
| 診断データ収集 | `snap`, `perfpmr`, `nmon` | `sos report` |
| ダンプ設定 | `sysdumpdev -l` | `systemctl status kdump`, `kdumpctl` |
| ユーザー一覧 | `lsuser ALL` | `getent passwd` |
| グループ一覧 | `lsgroup ALL` | `getent group` |
| デバイス一覧 | `lsdev [-Cc <class>]` | `lsblk`, `lspci`, `lscpu` |
| ネットワーク設定 | `ifconfig -a`, `lsattr -El inet0` | `ip addr show`, `nmcli`, `firewall-cmd` |
| ファイルシステム確認 | `df -g` | `df -hT`, `lsblk -f`, `pvs/vgs/lvs` |
| コマンドメタ情報 | `what <file>` | `rpm -qf <file>` |
| ソケット/通信統計 | `netstat -s` | `ss -s`, `ip -s link` |
| パフォーマンス収集 | `vmstat`, `iostat`, `sar`, `lparstat`, `mpstat`, `svmon` | `vmstat`, `iostat`, `mpstat`, `pidstat`, `sar`, `free`, `ss` |
