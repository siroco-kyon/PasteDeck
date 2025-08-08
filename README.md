# 📋 Clipboard Manager - スニペット管理アプリケーション

TypeScript + React + Electron で構築された、ローカル完結型のスニペット管理デスクトップアプリケーションです。
よく使う定型文、コードスニペット、画像を効率的に管理し、ワンクリックでクリップボードにコピーできます。

## ✨ 主要機能

### 📁 スニペット管理
- **テキスト・HTML・画像対応**: 様々な形式のコンテンツを保存
- **カテゴリ別整理**: プロジェクトや用途に応じて分類
- **タグ機能**: 柔軟な分類と検索
- **お気に入り機能**: よく使うスニペットの優先表示
- **使用統計**: 利用頻度に基づく自動ソート

### 🔍 高速検索
- **リアルタイム検索**: 入力と同時にフィルタリング
- **全文検索**: タイトル・内容・タグを横断検索
- **複合フィルタ**: カテゴリ・タイプ・お気に入りで絞り込み

### ⚡ グローバルアクセス
- **システムトレイ**: バックグラウンドで常駐
- **グローバルショートカット**: 
  - `Ctrl+Shift+V`: アプリ表示/非表示
  - `Ctrl+Shift+Q`: クイック検索モード
- **ワンクリックコピー**: 選択したスニペットを即座にクリップボードへ

### 🎨 ユーザーエクスペリエンス
- **ダークモード対応**: システム設定に自動追従
- **レスポンシブUI**: ウィンドウサイズに応じた最適表示
- **プレースホルダー機能**: 動的な値の自動置換
  - `{date}` → 現在日付 (2024/01/15)
  - `{time}` → 現在時刻 (14:30)
  - `{username}` → OSユーザー名
  - `{clipboard}` → 現在のクリップボード内容

## 🛠️ 技術スタック

| カテゴリ | 技術 | 用途 |
|---------|------|------|
| **コア** | Electron 27.x | デスクトップアプリ基盤 |
| | React 18.x | ユーザーインターフェース |
| | TypeScript 5.x | 型安全な開発 |
| **UI** | Material-UI v5 | デザインシステム |
| | React Beautiful DnD | ドラッグ&ドロップ |
| **データ** | Better SQLite3 | ローカルデータベース |
| **ビルド** | Vite 5.x | 高速ビルドシステム |
| | Electron Builder | 配布パッケージ生成 |

## 🚀 セットアップ手順

### 前提条件
- Node.js 18.x 以上
- npm または yarn

### インストール

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd clipboard-manager
```

2. **依存関係のインストール**
```bash
npm install
```

3. **開発サーバーの起動**
```bash
npm run dev
```

### ビルドコマンド

| コマンド | 説明 |
|----------|------|
| `npm run dev` | 開発モード起動 |
| `npm run build` | 全体ビルド |
| `npm run build:win` | Windows向けビルド |
| `npm run build:mac` | macOS向けビルド |
| `npm run build:linux` | Linux向けビルド |
| `npm run lint` | ESLint実行 |
| `npm test` | テスト実行 |

## 📂 プロジェクト構成

```
clipboard-manager/
├── src/
│   ├── main/              # Electronメインプロセス
│   │   ├── main.ts         # エントリーポイント
│   │   ├── db/            # SQLiteデータベース
│   │   ├── ipc/           # IPCハンドラー
│   │   ├── shortcuts/     # グローバルショートカット
│   │   └── tray/          # システムトレイ管理
│   ├── preload/           # プリロードスクリプト
│   ├── renderer/          # Reactアプリケーション
│   │   ├── App.tsx        # メインコンポーネント
│   │   ├── components/    # UIコンポーネント
│   │   ├── hooks/         # カスタムフック
│   │   └── utils/         # ユーティリティ
│   └── shared/           # 共通型定義
├── resources/            # アイコン等のリソース
├── electron-builder.yml # ビルド設定
├── vite.config.ts       # Vite設定
└── README.md
```

## 🎯 使用方法

### 初回起動
アプリケーション初回起動時に、以下が自動実行されます：
- SQLiteデータベースの作成
- サンプルカテゴリ・スニペットの挿入
- システムトレイへの登録

### 基本操作

1. **スニペット作成**
   - 「+」ボタンまたは右クリックメニューから新規作成
   - タイトル・内容・カテゴリ・タグを設定

2. **スニペット使用**
   - 一覧からスニペットをクリック
   - システムトレイメニューから選択
   - グローバルショートカットで検索後選択

3. **カテゴリ管理**
   - タブの「+」ボタンから新規作成
   - カテゴリ名・アイコン・色をカスタマイズ

### ショートカットキー

| ショートカット | 機能 |
|---------------|------|
| `Ctrl+Shift+V` | アプリ表示/非表示切り替え |
| `Ctrl+Shift+Q` | クイック検索モード |
| `Enter` | 検索実行 |
| `Esc` | 検索クリア |

## 🔧 カスタマイズ

### プレースホルダーの追加
`src/main/ipc/handlers.ts` の `replacePlaceholders` 関数で、独自のプレースホルダーを追加できます。

```typescript
const replacements = {
  '{date}': dateStr,
  '{time}': timeStr,
  '{custom}': 'your-custom-value',
  // 追加のプレースホルダー
};
```

### テーマカスタマイズ
`src/renderer/App.tsx` の Material-UI テーマ設定で、カラーパレットやコンポーネントスタイルをカスタマイズできます。

## 🔒 セキュリティ

- **Context Isolation**: レンダラープロセスとメインプロセスの分離
- **Node Integration無効化**: ブラウザセキュリティモデルの維持
- **CSP適用**: Content Security Policyによる制限
- **IPC検証**: 全ての通信データの入力値検証

## 🐛 トラブルシューティング

### よくある問題

**Q: アプリが起動しない**
- Node.js 18.x以上がインストールされているか確認
- `npm install` を再実行してください

**Q: データベースエラーが発生する**
- アプリデータフォルダの権限を確認
- ログファイル: `~/.config/clipboard-manager/logs/`

**Q: グローバルショートカットが動作しない**
- 他のアプリケーションとの競合を確認
- 管理者権限で実行してみてください

**Q: システムトレイアイコンが表示されない**
- OS の通知エリア設定を確認
- アプリを再起動してください

### ログファイルの場所
- **Windows**: `%APPDATA%/clipboard-manager/logs/`
- **macOS**: `~/Library/Logs/clipboard-manager/`
- **Linux**: `~/.config/clipboard-manager/logs/`

## 🤝 コントリビューション

プルリクエストやイシュー報告を歓迎します！

1. フォークしてください
2. 機能ブランチを作成: `git checkout -b feature/amazing-feature`
3. 変更をコミット: `git commit -m 'Add amazing feature'`
4. ブランチをプッシュ: `git push origin feature/amazing-feature`
5. プルリクエストを開いてください

## 📄 ライセンス

MIT License - 詳細は [LICENSE](LICENSE) ファイルをご覧ください。

## 🚧 開発ロードマップ

### Phase 1 (完了)
- ✅ 基本的なCRUD操作
- ✅ SQLite連携
- ✅ テキストスニペット対応

### Phase 2 (完了)
- ✅ グローバルショートカット
- ✅ システムトレイ
- ✅ プレースホルダー機能

### Phase 3 (開発中)
- 🔄 画像・HTML対応
- 🔄 ドラッグ&ドロップ
- 🔄 使用統計画面

### Phase 4 (予定)
- 📋 エクスポート/インポート
- 📋 クラウド同期
- 📋 プラグインシステム

---

❤️ **Clipboard Manager** で、あなたのコピペ作業を効率化しましょう！