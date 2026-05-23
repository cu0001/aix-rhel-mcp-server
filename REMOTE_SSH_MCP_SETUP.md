# SSH 経由でリモート MCP サーバーを起動する構成

このドキュメントは、IBM Bob を動かしている PC とは別の ppc64le サーバー上で MCP サーバー本体を実行する場合の設定例です。

このプロジェクトの `aix-server` / `rhel-server` は標準入出力 (stdio) transport の MCP サーバーです。HTTP サーバーへ接続する構成ではなく、Bob がローカルで起動したプロセスの stdin/stdout を使って MCP 通信します。

リモートの ppc64le 上で動かす場合は、Bob 側で `ssh` プロセスを起動し、その SSH 接続の先で `node build/index.js` を起動します。

## 構成イメージ

```text
Bob を動かしている PC
  IBM Bob
    |
    | stdio MCP
    v
  ssh プロセス
    |
    | SSH
    v
ppc64le MCP 実行サーバー
  run-rhel-mcp.sh / run-aix-mcp.sh
    |
    v
  node build/index.js
    |
    | SSH
    v
操作対象 RHEL / AIX サーバー
```

ポイント:

- `ssh` プロセスは Bob を動かしている PC 上で起動します。
- MCP サーバー本体の `node build/index.js` は ppc64le サーバー上で起動します。
- MCP サーバー本体から操作対象 RHEL / AIX へ SSH 接続します。
- ppc64le MCP 実行サーバーと操作対象サーバーが同一の場合、`RHEL_HOST` / `AIX_HOST` は `localhost` にできます。

## 前提条件

Bob を動かしている PC:

- IBM Bob から `ssh` コマンドを実行できること
- Bob PC から ppc64le MCP 実行サーバーへ SSH 接続できること
- 初回接続時の `known_hosts` 確認を事前に済ませておくこと

ppc64le MCP 実行サーバー:

- Node.js 18 以上（本番ビルド・実行のみの場合）
- Node.js 22.12 以上（vitest によるテストも実行する場合）
- npm
- このリポジトリを配置済みであること
- `npm ci` または `npm install` 済みであること
- `npm run build` 済みであること
- 操作対象 RHEL / AIX へ SSH 接続できること

## ppc64le 側の配置例

例として、ppc64le サーバー上に次のように配置します。

```bash
/opt/aix-mcp-server/
  aix-server/
  rhel-server/
```

RHEL MCP サーバーを使う場合:

```bash
cd /opt/aix-mcp-server/rhel-server
# 本番ビルドのみの場合（推奨）
npm ci --omit=dev
npm run build

# テストも実行する場合
# npm ci
# npm run build
```

AIX MCP サーバーを使う場合:

```bash
cd /opt/aix-mcp-server/aix-server
# 本番ビルドのみの場合（推奨）
npm ci --omit=dev
npm run build

# テストも実行する場合
# npm ci
# npm run build
```

## RHEL 用起動スクリプト

ppc64le MCP 実行サーバー上に `/opt/aix-mcp-server/rhel-server/run-rhel-mcp.sh` を作成します。

```sh
#!/bin/sh
set -eu

export RHEL_HOST="target-rhel-host-or-localhost"
export RHEL_PORT="22"
export RHEL_USERNAME="target-rhel-user"
export RHEL_PRIVATE_KEY="/home/mcpuser/.ssh/target_rhel_key"

# Optional proxy / bastion settings
# export PROXY_HOST="proxy-host"
# export PROXY_PORT="22"
# export PROXY_USERNAME="proxy-user"
# export PROXY_PRIVATE_KEY="/home/mcpuser/.ssh/proxy_key"

cd /opt/aix-mcp-server/rhel-server
# node のパスは環境に合わせて修正してください（確認方法: which node）
exec node build/index.js
```

実行権限を付与します。

```bash
chmod 700 /opt/aix-mcp-server/rhel-server/run-rhel-mcp.sh
```

パスワード認証を使う場合は、`RHEL_PRIVATE_KEY` の代わりに `RHEL_PASSWORD` を設定します。ただし、本番運用では SSH 鍵認証を推奨します。

## AIX 用起動スクリプト

ppc64le MCP 実行サーバー上に `/opt/aix-mcp-server/aix-server/run-aix-mcp.sh` を作成します。

```sh
#!/bin/sh
set -eu

export AIX_HOST="target-aix-host-or-localhost"
export AIX_PORT="22"
export AIX_USERNAME="target-aix-user"
export AIX_PRIVATE_KEY="/home/mcpuser/.ssh/target_aix_key"

# Optional proxy / bastion settings
# export PROXY_HOST="proxy-host"
# export PROXY_PORT="22"
# export PROXY_USERNAME="proxy-user"
# export PROXY_PRIVATE_KEY="/home/mcpuser/.ssh/proxy_key"

cd /opt/aix-mcp-server/aix-server
# node のパスは環境に合わせて修正してください（確認方法: which node）
exec node build/index.js
```

実行権限を付与します。

```bash
chmod 700 /opt/aix-mcp-server/aix-server/run-aix-mcp.sh
```

パスワード認証を使う場合は、`AIX_PRIVATE_KEY` の代わりに `AIX_PASSWORD` を設定します。ただし、本番運用では SSH 鍵認証を推奨します。

## Bob 側の mcp.json 設定例

Bob を動かしている PC 側の `mcp.json` では、`command` に `ssh` を指定します。

RHEL MCP サーバーを ppc64le 上で起動する例:

```json
{
  "mcpServers": {
    "rhel-ppc64le": {
      "command": "ssh",
      "args": [
        "-T",
        "-o",
        "BatchMode=yes",
        "mcpuser@ppc64le-mcp-host",
        "/opt/aix-mcp-server/rhel-server/run-rhel-mcp.sh"
      ],
      "disabled": false,
      "alwaysAllow": [],
      "disabledTools": []
    }
  }
}
```

AIX MCP サーバーを ppc64le 上で起動する例:

```json
{
  "mcpServers": {
    "aix-remote": {
      "command": "ssh",
      "args": [
        "-T",
        "-o",
        "BatchMode=yes",
        "mcpuser@ppc64le-mcp-host",
        "/opt/aix-mcp-server/aix-server/run-aix-mcp.sh"
      ],
      "disabled": false,
      "alwaysAllow": [],
      "disabledTools": []
    }
  }
}
```

SSH 秘密鍵を明示する場合:

```json
{
  "mcpServers": {
    "rhel-ppc64le": {
      "command": "ssh",
      "args": [
        "-T",
        "-i",
        "/Users/your-user/.ssh/ppc64le_mcp_key",
        "-o",
        "BatchMode=yes",
        "mcpuser@ppc64le-mcp-host",
        "/opt/aix-mcp-server/rhel-server/run-rhel-mcp.sh"
      ],
      "disabled": false,
      "alwaysAllow": [],
      "disabledTools": []
    }
  }
}
```

## env の扱い

`mcp.json` の `env` は、Bob PC 上で起動される `ssh` プロセスに渡される環境変数です。通常、その値は SSH 接続先の `node build/index.js` には自動では渡りません。

そのため、`RHEL_HOST`、`RHEL_USERNAME`、`AIX_HOST`、`AIX_USERNAME` などの MCP サーバー用環境変数は、ppc64le 側の起動スクリプトで設定するのが確実です。

推奨:

- `mcp.json` には ppc64le MCP 実行サーバーへの SSH 接続情報だけを書く
- 操作対象サーバーへの接続情報は ppc64le 側の起動スクリプト、または ppc64le 側の安全な環境変数管理に置く
- 秘密鍵ファイルは `chmod 600` にする
- 起動スクリプトは `chmod 700` にする

## stdio MCP の注意点

stdio transport では stdout が MCP プロトコル本体です。SSH 接続時や起動スクリプト実行時に stdout へ余計な文字列が出ると、MCP 通信が壊れます。

避けるもの:

- 起動スクリプト内の `echo`
- `.bashrc`、`.profile`、`.ssh/rc` などからの標準出力
- ログイン時の motd や banner
- 対話プロンプト
- パスワード入力待ち

推奨設定:

- `ssh -T` で pseudo-tty を割り当てない
- `BatchMode=yes` でパスワード入力待ちを避ける
- SSH 鍵認証を使う
- 初回接続時の host key 確認は事前に済ませる
- ログを出す場合は stderr に出す

このプロジェクトの logger は stderr にログを出すため、MCP の stdout プロトコルを壊しにくい実装になっています。

## 動作確認

Bob に設定する前に、Bob PC から手動で SSH 経由の起動確認をします。

```bash
ssh -T -o BatchMode=yes mcpuser@ppc64le-mcp-host /opt/aix-mcp-server/rhel-server/run-rhel-mcp.sh
```

このコマンドは MCP サーバーを起動して待機します。stdout には何も出力されず、stderr に起動ログ（JSON 形式）が表示されるのが正常です。stdout にメッセージが出る場合は MCP 通信が壊れるため、その出力を止めてください。

終了する場合は `Ctrl-C` で停止します。

Node.js や build の確認は ppc64le 側で実行します。

```bash
ssh mcpuser@ppc64le-mcp-host
cd /opt/aix-mcp-server/rhel-server
node -v
npm run build
```

## トラブルシューティング

### Bob から MCP サーバーが起動しない

- Bob PC から `ssh mcpuser@ppc64le-mcp-host` できるか確認します。
- `known_hosts` の初回確認が残っていないか確認します。
- `mcp.json` の `args` に指定した起動スクリプトのパスが正しいか確認します。
- 起動スクリプトに実行権限があるか確認します。
- ppc64le 側の Node.js パスが `/usr/bin/node` で正しいか確認します。

### MCP 通信エラーになる

- SSH 接続時に stdout へ余計な文字列が出ていないか確認します。
- 起動スクリプト内に `echo` がないか確認します。
- `.bashrc` や `.profile` が非対話 SSH でも出力していないか確認します。
- `ssh -T` を付けているか確認します。

### 操作対象 RHEL / AIX へ接続できない

- ppc64le MCP 実行サーバーから操作対象サーバーへ SSH 接続できるか確認します。
- 起動スクリプト内の `RHEL_*` / `AIX_*` 環境変数を確認します。
- 秘密鍵ファイルのパスと権限を確認します。
- Proxy / 踏み台を使う場合は `PROXY_*` 環境変数を確認します。

### `mcp.json` の env に設定した値が効かない

`env` は Bob PC 上の `ssh` プロセスに渡されます。SSH 接続先の Node.js プロセスへ自動転送されるとは限りません。

MCP サーバー用の環境変数は、ppc64le 側の起動スクリプトに書くか、ppc64le 側で systemd などを使って管理してください。

