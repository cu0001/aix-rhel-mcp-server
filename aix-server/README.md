# AIX MCP Server

IBM AIXシステムをSSH経由で操作するためのModel Context Protocol (MCP)サーバーです。

## 概要

このMCPサーバーは、AIXシステムに対して以下の操作を実行できるツールを提供します：

- **コマンド実行**: 任意のAIXコマンドを実行
- **通常ヘルスチェック**: 読み取り専用の一次確認
- **システム情報取得**: OSレベル、ハードウェア情報、構成情報の取得
- **デバイス管理**: デバイスの一覧表示とステータス確認
- **エラーログ確認**: AIXエラーログの確認
- **パフォーマンス監視**: CPU、メモリ、ディスク使用状況の取得
- **ファイルシステム管理**: マウントされたファイルシステムの一覧と使用状況
- **ネットワーク情報**: ネットワーク構成とインターフェース情報の取得
- **プロセス管理**: 実行中のプロセスの一覧表示
- **ユーザー管理**: ユーザーとグループ情報の取得
- **ファイル操作**: AIXシステム上のファイルの読み取り

## インストール

このサーバーは既にビルド済みです。

## 設定

MCP設定ファイル（`mcp_settings.json`）に以下の環境変数を設定してください：

```json
{
  "mcpServers": {
    "aix": {
      "command": "node",
      "args": [
        "/Users/aha03640/Documents/Cline/MCP/aix-server/build/index.js"
      ],
      "env": {
        "AIX_HOST": "your-aix-hostname-or-ip",
        "AIX_PORT": "22",
        "AIX_USERNAME": "your-username",
        "AIX_PASSWORD": "your-password"
      }
    }
  }
}
```

### 環境変数

- `AIX_HOST` (必須): AIXサーバーのホスト名またはIPアドレス
- `AIX_PORT` (オプション): SSHポート番号（デフォルト: 22）
- `AIX_USERNAME` (必須): SSH接続用のユーザー名
- `AIX_PASSWORD` (オプション): SSH接続用のパスワード
- `AIX_PRIVATE_KEY` (オプション): SSH秘密鍵（パスワードの代わりに使用可能）

**注意**: `AIX_PASSWORD`または`AIX_PRIVATE_KEY`のいずれかが必要です。

### SSH秘密鍵を使用する場合

パスワードの代わりにSSH秘密鍵を使用する場合は、以下のように設定します：

```json
{
  "env": {
    "AIX_HOST": "your-aix-hostname-or-ip",
    "AIX_USERNAME": "your-username",
    "AIX_PRIVATE_KEY": "-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
  }
}
```

## 利用可能なツール

### health_check_aix
通常運用または障害一次切り分け向けに、読み取り専用の主要確認項目をまとめて取得します。

**パラメータ**: なし

**使用例**:
```
AIXの通常ヘルスチェックをしてください
```

### 1. execute_aix_command
任意のAIXコマンドを実行します。

**パラメータ**:
- `command` (string, 必須): 実行するコマンド

**使用例**:
```
AIXサーバーで "oslevel -s" コマンドを実行してください
```

### 2. get_aix_system_info
AIXシステムの包括的な情報を取得します（OSレベル、ハードウェア詳細、構成など）。

**パラメータ**: なし

**使用例**:
```
AIXシステムの情報を取得してください
```

### 3. list_aix_devices
AIXシステム上のすべてのデバイスをステータスと説明とともに一覧表示します。

**パラメータ**:
- `device_class` (string, オプション): フィルタリングするデバイスクラス（例: disk, adapter, processor）

**使用例**:
```
AIXのディスクデバイスを一覧表示してください
```

### 4. check_aix_errors
AIXエラーログで最近のエラーと警告を確認します。

**パラメータ**:
- `hours` (number, オプション): 遡る時間数（デフォルト: 24）

**使用例**:
```
過去24時間のAIXエラーログを確認してください
```

### 5. get_aix_performance
CPU、メモリ、ディスク使用状況を含むAIXシステムのパフォーマンスメトリクスを取得します。

**パラメータ**: なし

**使用例**:
```
AIXシステムのパフォーマンス情報を取得してください
```

### collect_perfpmr
`perfpmr` を使用して、AIXの性能診断情報を独立して収集します。

**パラメータ**:
- `duration` (number, オプション): 収集時間（秒、デフォルト: 300）
- `output_dir` (string, オプション): 出力先ディレクトリ（デフォルト: `/tmp/perfpmr`）

**使用例**:
```
AIXでperfpmrを300秒取得してください
```

### download_perfpmr_file
perfpmr の出力ファイルをローカルの `perfpmr` ディレクトリへ SFTP で取得します。

**パラメータ**:
- `remote_path` (string, 必須): AIX上のperfpmrファイルのフルパス
- `local_filename` (string, 必須): ローカル保存ファイル名

### collect_nmon
`nmon` を使用して、AIXの性能データを独立して収集します。

**パラメータ**:
- `interval` (number, オプション): サンプリング間隔（秒、デフォルト: 10）
- `count` (number, オプション): サンプル数（デフォルト: 60）
- `output_dir` (string, オプション): 出力先ディレクトリ（デフォルト: `/tmp/nmon`）

**使用例**:
```
AIXでnmonを10秒間隔で60回取得してください
```

### download_nmon_file
nmon の出力ファイルをローカルの `nmon` ディレクトリへ SFTP で取得します。

**パラメータ**:
- `remote_path` (string, 必須): AIX上の `.nmon` ファイルのフルパス
- `local_filename` (string, 必須): ローカル保存ファイル名

## 使い方

### 通常運用

通常運用では `health_check_aix` を最初に使い、異常が見えた領域だけ個別 tool で確認します。

```text
AIXの通常ヘルスチェックをしてください。異常があれば要点だけまとめてください。
```

### 障害調査

障害調査では、まず読み取り専用 tool で状況を確認し、必要に応じて `snap`、`perfpmr`、`nmon` を取得します。

```text
AIXの障害一次調査をしてください。errpt、dump設定、性能状況を確認し、必要な診断取得を提案してください。
```

```text
AIXでnmonを10秒間隔で60回、/tmp/mcp-nmon に取得してください。
```

```text
AIXでperfpmrを300秒、/tmp/mcp-perfpmr に取得してください。
```

### 6. list_aix_filesystems
AIXシステム上のマウントされたすべてのファイルシステムを使用状況情報とともに一覧表示します。

**パラメータ**: なし

**使用例**:
```
AIXのファイルシステムを一覧表示してください
```

### 7. get_aix_network_info
AIXネットワーク構成とインターフェース情報を取得します。

**パラメータ**: なし

**使用例**:
```
AIXのネットワーク情報を取得してください
```

### 8. list_aix_processes
AIXシステム上で実行中のプロセスを一覧表示します。

**パラメータ**:
- `filter` (string, オプション): 特定のプロセスを検索するフィルタ文字列

**使用例**:
```
AIXで実行中のプロセスを一覧表示してください
```

### 9. get_aix_users
AIXシステム上のユーザーとグループに関する情報を取得します。

**パラメータ**: なし

**使用例**:
```
AIXのユーザー情報を取得してください
```

### 10. read_aix_file
AIXシステム上のファイルの内容を読み取ります。

**パラメータ**:
- `path` (string, 必須): 読み取るファイルのフルパス
- `lines` (number, オプション): 読み取る行数（デフォルト: すべて）

**使用例**:
```
AIXの /etc/hosts ファイルを読み取ってください
```

## セキュリティに関する注意事項

- SSH認証情報は安全に保管してください
- 本番環境では、パスワードではなくSSH鍵認証の使用を推奨します
- 必要最小限の権限を持つユーザーアカウントを使用してください
- MCP設定ファイルへのアクセスを制限してください

## トラブルシューティング

### 接続エラー
- AIX_HOST、AIX_USERNAME、認証情報が正しいことを確認してください
- AIXサーバーがSSH接続を受け入れていることを確認してください
- ファイアウォール設定を確認してください

### コマンド実行エラー
- 使用しているユーザーアカウントに必要な権限があることを確認してください
- AIXコマンドの構文が正しいことを確認してください

## ライセンス

ISC

## 作成者

IBM Bob MCP Server
