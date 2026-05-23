#### IBM Bob AIアシスタント アーキテクチャ図 : 主要技術要素

```mermaid
%%{init: {'theme':'base', 'themeVariables': { 'fontSize':'18px', 'fontFamily':'Arial, sans-serif'}}}%%
graph LR
    User["<b>👤 ユーザー</b><br/>━━━━━━━━<br/><b>自然言語での指示</b>"]
    
    Bob["<b>🤖 IBM Bob</b><br/><b>AIアシスタント</b><br/>━━━━━━━━━━━━<br/>自然言語での指示を解釈<br/>最適なツールや手順を<br/>自動選択して実行<br/>━━━━━━━━━━━━<br/>複雑な運用作業を<br/>シンプルな指示で実現"]
    
    Skills["<b>📚 IBM Bob</b><br/><b>Skills 設計</b><br/>━━━━━━━━━━━━<br/><b>AIX Skills:</b><br/>・通常運用点検<br/>・障害解析<br/>・バージョン比較<br/>━━━━━━━━━━━━<br/><b>RHEL Skills:</b><br/>・通常運用点検<br/>・障害解析<br/>・バージョン比較<br/>━━━━━━━━━━━━<br/>運用ノウハウを<br/>標準化・再利用"]
    
    MCPServer["<b>⚙️ MCPサーバー</b><br/><b>Node.js</b><br/>━━━━━━━━━━━━<br/>MCPプロトコルで<br/>AIと外部システムを連携<br/>━━━━━━━━━━━━<br/>AIXやRHELサーバーに<br/>対する操作を標準化<br/>━━━━━━━━━━━━<br/>異なる環境でも<br/>一貫した方法で<br/>安全にコマンド実行"]
    
    AIXTools["<b>🛠️ AIX向け</b><br/><b>ツール群</b><br/>━━━━━━━━<br/><b>25以上のツール</b><br/>━━━━━━━━<br/>・情報取得<br/>・ログ分析<br/>・診断データ収集<br/>・コマンド実行"]
    
    RHELTools["<b>🛠️ RHEL ppc64le</b><br/><b>向けツール群</b><br/>━━━━━━━━<br/><b>25以上のツール</b><br/>━━━━━━━━<br/>・情報取得<br/>・ログ分析<br/>・診断データ収集<br/>・コマンド実行"]
    
    JumpServer["<b>🔐 Jumpサーバー</b><br/>━━━━━━━━<br/>SSH踏み台サーバー"]
    
    subgraph RHEL["<b>RHEL環境</b>"]
        RHELServer1["<b>💻 RHELサーバー1</b><br/><b>ppc64le</b>"]
        RHELServer2["<b>💻 RHELサーバー2</b><br/><b>ppc64le</b>"]
    end
    
    subgraph AIX["<b>AIX環境</b>"]
        AIXServer1["<b>💻 AIXサーバー1</b>"]
        AIXServer2["<b>💻 AIXサーバー2</b>"]
    end
    
    User -->|"<b>1. 指示</b>"| Bob
    Bob <-->|"<b>2. 参照</b>"| Skills
    Bob -->|"<b>3. 実行</b>"| MCPServer
    MCPServer -->|"<b>4. 選択</b>"| AIXTools
    MCPServer -->|"<b>4. 選択</b>"| RHELTools
    AIXTools -->|"<b>5a. SSH接続</b>"| JumpServer
    RHELTools -->|"<b>5a. SSH接続</b>"| JumpServer
    JumpServer <-->|"<b>5b. SSH接続<br/>(Jump経由)</b>"| RHELServer1
    JumpServer <-->|"<b>5b. SSH接続<br/>(Jump経由)</b>"| RHELServer2
    JumpServer <-->|"<b>5b. SSH接続<br/>(Jump経由)</b>"| AIXServer1
    JumpServer <-->|"<b>5b. SSH接続<br/>(Jump経由)</b>"| AIXServer2
    MCPServer -.->|"<b>6. 結果</b>"| Bob
    Bob -.->|"<b>7. 報告</b>"| User
    
    style Bob fill:#e1f5ff,stroke:#01579b,stroke-width:4px
    style Skills fill:#fff3e0,stroke:#e65100,stroke-width:3px
    style MCPServer fill:#e8f5e9,stroke:#1b5e20,stroke-width:4px
    style JumpServer fill:#f3e5f5,stroke:#4a148c,stroke-width:4px
    style AIXTools fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style RHELTools fill:#fff9c4,stroke:#f57f17,stroke-width:3px
    style RHELServer1 fill:#ffebee,stroke:#b71c1c,stroke-width:3px
    style RHELServer2 fill:#ffebee,stroke:#b71c1c,stroke-width:3px
    style AIXServer1 fill:#ffebee,stroke:#b71c1c,stroke-width:3px
    style AIXServer2 fill:#ffebee,stroke:#b71c1c,stroke-width:3px
    style User fill:#e0f2f1,stroke:#004d40,stroke-width:3px
    style RHEL fill:#fff,stroke:#f57f17,stroke-width:3px,stroke-dasharray: 5 5
    style AIX fill:#fff,stroke:#f57f17,stroke-width:3px,stroke-dasharray: 5 5
```

## 図の説明

### データフロー（左から右へ）
1. **ユーザー → IBM Bob**: 自然言語で指示
2. **IBM Bob ⇄ Skills**: 運用手順・調査フローを参照
3. **IBM Bob → MCPサーバー**: 標準化されたプロトコルで接続
4. **MCPサーバー → ツール群**: AIXまたはRHEL向けツールを選択
5. **ツール群 ⇄ サーバー**: Jumpサーバー経由でSSH接続し、コマンド実行・結果取得
   - 5a. ツール群からJumpサーバーへSSH接続
   - 5b. JumpサーバーからAIX/RHELサーバーへSSH接続（踏み台経由）
6. **MCPサーバー → IBM Bob**: 結果を返却（点線）
7. **IBM Bob → ユーザー**: 最終結果を報告（点線）

### コンポーネント
- **青色**: AIアシスタント（中核）
- **オレンジ色**: Skills設計（ノウハウ管理）
- **緑色**: MCPサーバー（実行エンジン）
- **紫色**: Jumpサーバー（SSH踏み台）
- **黄色**: ツール群（具体的なアクション）
- **赤色**: 対象サーバー（AIX/RHEL）
- **水色**: ユーザー

### 表示方法
- **VS Code**: Markdown Preview Enhanced拡張機能をインストール
- **GitHub**: このファイルをプッシュすると自動的に図が表示されます
- **オンラインツール**: https://mermaid.live/ にコードを貼り付けて表示・エクスポート可能

### 文字サイズについて
- フォントサイズを18pxに設定
- 重要な部分を太字（`<b>`タグ）で強調
- 線の太さも増加（3-4px）して視認性を向上
