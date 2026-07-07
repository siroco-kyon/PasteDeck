// === 共通型定義ファイル ===
// 何をする部分か：アプリケーション全体で使用する型定義を一元管理
// なぜ必要か：メインプロセスとレンダラープロセス間での型の一貫性を保つため

/**
 * スニペットのコンテンツタイプ
 * テキスト、HTML、画像の3種類をサポート
 */
export type ContentType = 'text' | 'html' | 'image';

/**
 * スニペットデータの型定義
 * データベースから取得される完全なスニペット情報
 */
export interface Snippet {
  id: number;
  categoryId: number;
  title: string;
  content: string;
  contentType: ContentType;
  thumbnail?: string; // 画像の場合のbase64サムネイル
  tags: string[];
  useCount: number;
  isFavorite: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * カテゴリデータの型定義
 * スニペットをグループ化するためのカテゴリ情報
 */
export interface Category {
  id: number;
  name: string;
  icon?: string; // Material-UIアイコン名
  color?: string; // カラーコード (#ffffff形式)
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 新規スニペット作成用の型定義
 * idや自動生成される項目を除いた入力データ
 */
export interface CreateSnippetInput {
  categoryId: number;
  title: string;
  content: string;
  contentType: ContentType;
  thumbnail?: string;
  tags: string[];
  isFavorite?: boolean;
}

/**
 * スニペット更新用の型定義
 * 部分更新を可能にするため全てオプショナル
 */
export interface UpdateSnippetInput {
  categoryId?: number;
  title?: string;
  content?: string;
  contentType?: ContentType;
  thumbnail?: string;
  tags?: string[];
  isFavorite?: boolean;
  sortOrder?: number;
}

/**
 * 新規カテゴリ作成用の型定義
 */
export interface CreateCategoryInput {
  name: string;
  icon?: string;
  color?: string;
}

/**
 * カテゴリ更新用の型定義
 */
export interface UpdateCategoryInput {
  name?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

/**
 * 検索フィルター条件の型定義
 * スニペットの絞り込み検索に使用
 */
export interface SearchFilters {
  query?: string; // タイトル・コンテンツ・タグでの文字列検索
  categoryId?: number; // 特定カテゴリでの絞り込み
  contentType?: ContentType; // コンテンツタイプでの絞り込み
  isFavorite?: boolean; // お気に入りのみ表示
  tags?: string[]; // 特定タグでの絞り込み
}

/**
 * アプリケーション設定の型定義
 * ユーザーの環境設定を保存
 */
export interface AppSettings {
  // === ショートカット設定 ===
  globalShortcut: string; // アプリ表示/非表示のキー組み合わせ
  quickSearchShortcut: string; // クイック検索のキー組み合わせ
  
  // === UI設定 ===
  theme: 'light' | 'dark' | 'auto'; // テーマ設定
  windowWidth: number; // ウィンドウ幅
  windowHeight: number; // ウィンドウ高さ
  windowX?: number; // ウィンドウX座標
  windowY?: number; // ウィンドウY座標
  isMaximized?: boolean; // 前回終了時にウィンドウが最大化されていたか

  // === 機能設定 ===
  autoStart: boolean; // OS起動時の自動開始
  minimizeToTray: boolean; // トレイへの最小化
  showNotifications: boolean; // 通知表示の有効/無効
  maxRecentItems: number; // 最近使用したスニペットの表示数
  alwaysOnTop: boolean; // 常に最前面に表示するモード
  compactMode: boolean; // コンパクト（小さい画面）モード
}

/**
 * IPC通信で使用するチャンネル名の定義
 * メインプロセスとレンダラープロセス間の通信チャンネル
 */
export const IPC_CHANNELS = {
  // === スニペット関連 ===
  SNIPPET: {
    GET_ALL: 'snippet:get-all',
    GET_BY_ID: 'snippet:get-by-id',
    CREATE: 'snippet:create',
    UPDATE: 'snippet:update',
    DELETE: 'snippet:delete',
    SEARCH: 'snippet:search',
    COPY_TO_CLIPBOARD: 'snippet:copy-to-clipboard',
    INCREMENT_USE_COUNT: 'snippet:increment-use-count',
    REORDER: 'snippet:reorder', // 並び替え（sort_order一括更新）
    DUPLICATE: 'snippet:duplicate', // 複製（コピーを新規作成）
  },
  
  // === カテゴリ関連 ===
  CATEGORY: {
    GET_ALL: 'category:get-all',
    GET_BY_ID: 'category:get-by-id',
    CREATE: 'category:create',
    UPDATE: 'category:update',
    DELETE: 'category:delete',
    REORDER: 'category:reorder',
  },
  
  // === 設定関連 ===
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    RESET: 'settings:reset',
  },
  
  // === データ管理（インポート/エクスポート）===
  DATA: {
    EXPORT: 'data:export', // 全データをJSONファイルに書き出し
    IMPORT: 'data:import', // JSONファイルからデータをマージ
  },

  // === ショートカット制御 ===
  SHORTCUTS: {
    SET_ENABLED: 'shortcuts:set-enabled', // ショートカットの有効/無効切り替え
    GET_STATUS: 'shortcuts:get-status',   // 現在の有効状態を取得
  },

  // === アプリケーション制御 ===
  APP: {
    SHOW: 'app:show',
    HIDE: 'app:hide',
    QUIT: 'app:quit',
    GET_VERSION: 'app:get-version',
    TOGGLE_VISIBILITY: 'app:toggle-visibility',
    SET_ALWAYS_ON_TOP: 'app:set-always-on-top', // 常に最前面固定モードの切り替え
    SET_COMPACT_MODE: 'app:set-compact-mode', // コンパクトモードの切り替え
  },

  // === システム関連 ===
  SYSTEM: {
    GET_CLIPBOARD: 'system:get-clipboard',
    SET_CLIPBOARD: 'system:set-clipboard',
    SHOW_NOTIFICATION: 'system:show-notification',
  },

  // === スプラッシュ画面 ===
  // 何をする部分か：起動中の進捗（％表示）をスプラッシュウィンドウへ通知するチャンネル
  // なぜ必要か：起動処理の体感速度を改善するため
  SPLASH: {
    PROGRESS: 'splash:progress',
  },
} as const;

/**
 * データベース初期化で挿入するサンプルデータの型定義
 */
export interface SampleData {
  categories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[];
  snippets: Omit<Snippet, 'id' | 'createdAt' | 'updatedAt'>[];
}

/**
 * エラーレスポンスの型定義
 * IPC通信でのエラー情報を統一
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  details?: any;
}

/**
 * 成功レスポンスの型定義
 * IPC通信での成功情報を統一
 */
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
}

/**
 * IPC通信の統一レスポンス型
 */
export type IPCResponse<T = any> = SuccessResponse<T> | ErrorResponse;

/**
 * プレースホルダー置換用の型定義
 * スニペット内の動的な値を置換する機能
 */
export interface PlaceholderContext {
  date: string; // YYYY/MM/DD形式の日付
  time: string; // HH:mm形式の時刻
  datetime: string; // YYYY/MM/DD HH:mm形式の日時
  username: string; // OSのユーザー名
  clipboard: string; // 現在のクリップボード内容
}