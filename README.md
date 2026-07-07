# PasteDeck

TypeScript + React + Electron で構築した、ローカル完結型のスニペット管理デスクトップアプリケーションです。
よく使う定型文・コードスニペットをカテゴリで整理し、ワンクリックでクリップボードにコピーできます。

- データはすべて手元のPCに保存されます（外部サーバーへの送信なし）
- システムトレイに常駐し、いつでもショートカットキーで呼び出せます

---

## 使い方

### 1. 起動する

開発者から実行ファイルをもらった場合はインストーラーを実行するだけです。
ソースコードから動かす場合は [セットアップ](#セットアップ) を参照してください。

起動すると、まずロゴと進捗％の入ったスプラッシュ画面が一瞬表示され、準備が整うとメインウィンドウに切り替わります。
2回目以降の起動では、**前回終了時と同じ位置・サイズ**でウィンドウが開きます。

### 2. 画面の見方

```
┌─────────────────────────────────────────────┐
│ [検索欄]  ★ ⟳ ☀/☾ ⚙ 📌 ▢               │ ← ヘッダー
├─────────────────────────────────────────────┤
│ [すべて] [開発用] [メール定型文] [その他] + ⇅ │ ← カテゴリタブ
├─────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐             │
│  │スニペット│ │スニペット│ │スニペット│  ...       │ ← スニペット一覧
│  └──────┘ └──────┘ └──────┘             │
│                                         (+) │ ← 新規作成ボタン
└─────────────────────────────────────────────┘
```

**ヘッダーのボタン（左から）**

| アイコン | 機能 |
|---|---|
| 検索欄 | タイトル・コンテンツ・タグをリアルタイム検索（`Esc`でクリア） |
| ★ | お気に入りのみ表示に切り替え |
| ⟳ | データを再取得（他プロセスからの変更を反映） |
| ☀/☾ | ライト/ダークテーマ切り替え |
| ⚙ | 設定ダイアログを開く |
| 📌 | **常に最前面固定**モードの切り替え（他アプリの上に常時表示） |
| ▢ | **コンパクトモード**の切り替え（ウィンドウを小さくし、UIを詰めて表示） |

### 3. スニペットを使う

- **コピーする**：カードをクリックするだけでクリップボードにコピーされます（右下にコピー用アイコンでも可）
- **作成する**：右下の `+` ボタンから、タイトル・内容・タグ・お気に入りを設定して保存
- **編集・削除・複製する**：カードにマウスを乗せると表示される鉛筆／ゴミ箱／複製アイコンから操作
- **並び替える**：一覧右上のボタンで「リスト表示」に切り替えるとドラッグ&ドロップで並び替え可能
- **よく使う順に表示**：一覧右上の ↗ アイコンで使用回数の多い順に並び替え
- **タグで絞り込む**：カード内のタグをクリックすると、そのタグだけで一覧を絞り込み（× で解除）

### 4. カテゴリを整理する

タブの `+` から新規カテゴリを作成（名前・アイコン・カラーを設定）できます。選択中のタブには鉛筆（編集）・ゴミ箱（削除）アイコンが表示されます。カテゴリが2件以上あるときは ⇅ ボタンでタブの並び替えができます。

### 5. プレースホルダー（動的な値の自動置換）

スニペットの内容に以下を書いておくと、**コピーする瞬間**に実際の値へ自動的に置き換わります。

| プレースホルダー | 置換される値 |
|---|---|
| `{date}` | 現在日付（例: 2026/07/07） |
| `{time}` | 現在時刻（例: 20:30） |
| `{datetime}` | 日時（例: 2026/07/07 20:30） |
| `{username}` | OSのユーザー名 |
| `{clipboard}` | コピー時点のクリップボードの内容 |

例：「お疲れ様です。\n{date}\n{username}」というスニペットを作っておけば、貼り付けるたびに今日の日付と自分の名前入りの文章がコピーされます。

### 6. ウィンドウを閉じてもアプリは終了しません

× ボタンでウィンドウを閉じると、アプリはシステムトレイに常駐し続けます（バックグラウンドで動作）。完全に終了したい場合は、トレイアイコンを右クリックして「終了」を選んでください。

**グローバルショートカット**（他のアプリを使っている最中でも動作します）

| キー | 動作 |
|---|---|
| `Ctrl+Shift+V` | ウィンドウの表示/非表示を切り替え |
| `Ctrl+Shift+Q` | ウィンドウを表示し、検索欄にフォーカス |

トレイアイコンをクリック（またはダブルクリック）してもウィンドウの表示/非表示を切り替えられます。トレイメニューからは、よく使う・お気に入りのスニペットへ直接アクセスすることもできます。

### 7. 設定画面（⚙ アイコン）

- テーマ（ライト/ダーク/自動）
- 通知の表示 ON/OFF
- × ボタンでのトレイ最小化 ON/OFF（OFFにすると×で完全終了）
- グローバルショートカットの有効/無効切り替え
- **データのエクスポート/インポート**：全カテゴリ・スニペットをJSONファイルへバックアップ、または復元
- 設定のリセット

### 8. 常に最前面固定モード / コンパクトモード

- 📌（ピン留め）ボタンをONにすると、他のウィンドウの手前に常に表示され続けます。他の作業をしながらスニペットを参照したいときに便利です。
- ▢（コンパクト）ボタンをONにすると、ウィンドウが小さくなり、カテゴリタブはアイコンのみ・カードの余白も詰まった省スペース表示になります。もう一度押すと元のサイズ・レイアウトに戻ります。
- どちらのモードも設定として保存され、次回起動時にも維持されます。

---

## 機能一覧（要約）

| 分類 | 内容 |
|---|---|
| スニペット | 作成・編集・削除・複製、グリッド/リスト表示、DnD並び替え、タグ絞り込み、使用回数カウント |
| カテゴリ | 作成・編集・削除、アイコン・カラー設定、DnD並び替え |
| 検索 | リアルタイム全文検索、カテゴリ/お気に入り絞り込み |
| グローバルアクセス | システムトレイ常駐、ショートカットキー、トレイメニュー |
| プレースホルダー | `{date}` `{time}` `{datetime}` `{username}` `{clipboard}` |
| ウィンドウ | 前回位置・サイズの復元、常に最前面固定、コンパクトモード、起動時スプラッシュ画面 |
| 設定/データ | テーマ・通知・ショートカットON/OFF、JSONエクスポート/インポート |

---

## 開発者向け情報

### 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | Electron 27 |
| UI | React 18 + Material-UI v5 |
| 言語 | TypeScript 5 |
| データベース | Better SQLite3（JSON フォールバック付き） |
| ビルド | Vite 5 / esbuild / electron-builder |
| DnD | @hello-pangea/dnd |

### セットアップ

前提条件: Node.js 18 以上

```bash
git clone https://github.com/siroco-kyon/PasteDeck.git
cd PasteDeck
npm install
```

better-sqlite3 は Electron 向けにリビルドが必要な場合があります（Windows で特に発生しやすい）。

```bash
node -e "require('@electron/rebuild').rebuild({ electronVersion: '27.3.11', force: true })"
```

開発サーバー起動（Vite + Electron）:

```bash
npm run dev
```

### ビルドコマンド

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発モード（Vite + Electron） |
| `npm run build` | 全体ビルド |
| `npm run build:main` | メインプロセスのみビルド |
| `npm run build:preload` | プリロードスクリプトのみビルド（esbuild） |
| `npm run build:renderer` | レンダラーのみビルド |
| `npm run build:win` | Windows インストーラー生成（`release/`配下に出力） |
| `npm run build:mac` | macOS DMG 生成 |
| `npm run build:linux` | Linux AppImage 生成 |
| `npm run test:startup` | 起動スモークテスト（3 秒で自動終了） |
| `npm run lint` | ESLint |
| `npm test` | Vitest ユニットテスト |
| `npx tsc --noEmit` | レンダラーの型チェック |
| `npx tsc -p tsconfig.main.json` | メインプロセスの型チェック |

### プロジェクト構成

```
PasteDeck/
├── src/
│   ├── main/                  # Electron メインプロセス（Node.js）
│   │   ├── main.ts            # エントリーポイント（起動フロー・ウィンドウ管理）
│   │   ├── db/
│   │   │   ├── schema.ts      # SQLite スキーマ・初期化・設定値の読み書きヘルパー
│   │   │   ├── operations.ts  # SQLite CRUD
│   │   │   └── jsonStorage.ts # JSON フォールバックストレージ
│   │   ├── ipc/
│   │   │   └── handlers.ts    # IPC ハンドラー（プレースホルダー置換含む）
│   │   ├── window/
│   │   │   ├── splashWindow.ts     # 起動時スプラッシュ画面
│   │   │   └── windowConstants.ts  # ウィンドウサイズの共有定数
│   │   ├── shortcuts/         # グローバルショートカット
│   │   └── tray/              # システムトレイ管理
│   ├── preload/
│   │   └── preload.ts         # contextBridge API 定義
│   ├── renderer/              # React アプリ（ブラウザ環境）
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── Category/      # CategoryTabs, CategoryFormDialog, CategoryReorderDialog
│   │   │   ├── Header/        # 検索バー・ツールバー
│   │   │   ├── Settings/      # SettingsDialog
│   │   │   ├── Snippet/       # SnippetList, SnippetCard, SnippetFormDialog
│   │   │   └── common/        # ConfirmDialog
│   │   └── hooks/
│   │       ├── useCategories.ts
│   │       ├── useSnippets.ts
│   │       ├── useTheme.ts
│   │       └── useElectronEvents.ts
│   └── shared/
│       └── types.ts           # IPC チャンネル名・共通型定義
├── scripts/
│   └── build-preload.js       # esbuild でプリロードをバンドル
├── tsconfig.json              # レンダラー用（ESM / ブラウザ）
├── tsconfig.main.json         # メインプロセス用（CJS / Node.js）
└── vite.config.ts
```

### アーキテクチャ

```
レンダラープロセス (React)
    ↕ window.electronAPI.*
プリロードスクリプト (contextBridge)
    ↕ ipcRenderer.invoke / ipcMain.handle
メインプロセス (Node.js)
    ↕
SQLite / JSON ストレージ
```

- `contextIsolation: true` / `nodeIntegration: false` でセキュリティを確保
- プリロードは **esbuild でバンドル**し、Electron サンドボックス内の `require` 制限を回避
- 起動時はスプラッシュ画面を即座に表示しつつ、DB初期化とメインウィンドウの生成・読み込みを並行実行して体感起動速度を改善

**ストレージ**
- **SQLite（primary）**: Better SQLite3 によるローカル DB
- **JSON（fallback）**: SQLite が利用できない環境（WSL など）でも動作

### トラブルシューティング

**better-sqlite3 が起動しない（Windows）**

Electron 向けのリビルドが必要です。

```bash
node -e "require('@electron/rebuild').rebuild({ electronVersion: '27.3.11', force: true })"
```

失敗した場合でも、アプリは JSON ストレージにフォールバックして動作します（この場合、ウィンドウ位置・サイズ・常に最前面固定・コンパクトモードの記憶機能は保存されません）。

**依存関係を完全リセット**

```bash
rm -rf node_modules package-lock.json
npm install
```

**ログファイルの場所**

| OS | パス |
|---|---|
| Windows | `%APPDATA%\clipboard-manager\logs\` |
| macOS | `~/Library/Logs/clipboard-manager/` |
| Linux | `~/.config/clipboard-manager/logs/` |

**データベース・設定のリセット**

| OS | パス |
|---|---|
| Windows | `%APPDATA%\clipboard-manager\` を削除 |
| Linux | `~/.config/clipboard-manager/` を削除 |

## ライセンス

MIT
