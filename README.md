# PasteDeck

TypeScript + React + Electron で構築した、ローカル完結型のスニペット管理デスクトップアプリケーションです。
よく使う定型文・コードスニペットをカテゴリで整理し、ワンクリックでクリップボードにコピーできます。

## 機能一覧

### スニペット管理
- 作成・編集・削除・複製
- タイトル / コンテンツ / タグ / お気に入り設定
- グリッド表示とリスト表示の切り替え
- ドラッグ&ドロップによる並び替え（リスト表示時）
- タグクリックによる絞り込み
- 使用回数の自動カウント

### カテゴリ管理
- 作成・編集・削除
- アイコン・カラー設定
- ドラッグ&ドロップによる並び替え

### 検索・フィルタ
- リアルタイム全文検索（タイトル / コンテンツ / タグ）
- カテゴリ・お気に入りでの絞り込み
- `Esc` キーで検索クリア

### グローバルアクセス
- システムトレイ常駐
- `Ctrl+Shift+V`: アプリ表示 / 非表示
- `Ctrl+Shift+Q`: クイック検索フォーカス
- トレイメニューから最近使用・お気に入りスニペットに直接アクセス

### プレースホルダー置換
コピー時に動的な値へ自動展開されます。

| プレースホルダー | 展開値 |
|---|---|
| `{date}` | 現在日付（2025/04/12） |
| `{time}` | 現在時刻（20:30） |
| `{datetime}` | 日時（2025/04/12 20:30） |
| `{username}` | OS ユーザー名 |
| `{clipboard}` | 現在のクリップボード内容 |

### 設定
- ライト / ダーク / 自動テーマ
- 通知表示の ON/OFF
- × ボタンでトレイ最小化の ON/OFF
- 全データの JSON エクスポート / インポート（バックアップ・移行）
- 設定のリセット

## 技術スタック

| カテゴリ | 採用技術 |
|---|---|
| フレームワーク | Electron 27 |
| UI | React 18 + Material-UI v5 |
| 言語 | TypeScript 5 |
| データベース | Better SQLite3（JSON フォールバック付き） |
| ビルド | Vite 5 / esbuild / electron-builder |
| DnD | react-beautiful-dnd |

## セットアップ

### 前提条件
- Node.js 18 以上

### インストール

```bash
git clone https://github.com/siroco-kyon/PasteDeck.git
cd PasteDeck
npm install
```

### ネイティブモジュールのリビルド（Windows 必須）

better-sqlite3 は Electron 向けにリビルドが必要です。

```bash
node -e "require('@electron/rebuild').rebuild({ electronVersion: '27.3.11', force: true })"
```

### 開発サーバー起動

```bash
npm run dev
```

## ビルドコマンド

| コマンド | 説明 |
|---|---|
| `npm run dev` | 開発モード（Vite + Electron） |
| `npm run build` | 全体ビルド |
| `npm run build:main` | メインプロセスのみビルド |
| `npm run build:preload` | プリロードスクリプトのみビルド（esbuild） |
| `npm run build:renderer` | レンダラーのみビルド |
| `npm run build:win` | Windows インストーラー生成 |
| `npm run build:mac` | macOS DMG 生成 |
| `npm run build:linux` | Linux AppImage 生成 |
| `npm run test:startup` | 起動スモークテスト（3 秒で自動終了） |
| `npx tsc --noEmit` | レンダラーの型チェック |

## プロジェクト構成

```
PasteDeck/
├── src/
│   ├── main/                  # Electron メインプロセス（Node.js）
│   │   ├── main.ts            # エントリーポイント
│   │   ├── db/
│   │   │   ├── schema.ts      # SQLite スキーマ・初期化
│   │   │   ├── operations.ts  # SQLite CRUD
│   │   │   └── jsonStorage.ts # JSON フォールバックストレージ
│   │   ├── ipc/
│   │   │   └── handlers.ts    # IPC ハンドラー（プレースホルダー置換含む）
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
├── tsconfig.preload.json      # プリロード型チェック用
└── vite.config.ts
```

## アーキテクチャ

### Electron マルチプロセス構成

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

### ストレージ

- **SQLite（primary）**: Better SQLite3 によるローカル DB
- **JSON（fallback）**: SQLite が利用できない環境（WSL など）でも動作

## トラブルシューティング

### better-sqlite3 が起動しない（Windows）

Electron 向けのリビルドが必要です。

```bash
node -e "require('@electron/rebuild').rebuild({ electronVersion: '27.3.11', force: true })"
```

失敗した場合でも、アプリは JSON ストレージにフォールバックして動作します。

### 依存関係を完全リセット

```bash
rm -rf node_modules package-lock.json
npm install
```

### ログファイルの場所

| OS | パス |
|---|---|
| Windows | `%APPDATA%\clipboard-manager\logs\` |
| macOS | `~/Library/Logs/clipboard-manager/` |
| Linux | `~/.config/clipboard-manager/logs/` |

### データベースのリセット

| OS | パス |
|---|---|
| Windows | `%APPDATA%\clipboard-manager\` を削除 |
| Linux | `~/.config/clipboard-manager/` を削除 |

## ライセンス

MIT
