import { app, BrowserWindow, globalShortcut, Tray } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { initializeDatabase, closeDatabase } from './db/schema';
import { initializeJsonStorage } from './db/jsonStorage';
import { setupIpcHandlers } from './ipc/handlers';
import { createTray } from './tray/trayManager';
import { setupGlobalShortcuts } from './shortcuts/shortcutManager';

// === Electronメインプロセス ===
// 何をする部分か：アプリケーションのライフサイクルとウィンドウ管理を制御
// なぜ必要か：デスクトップアプリとしての基盤機能を提供するため

/**
 * メインウィンドウのインスタンス
 * アプリケーション全体で共有される単一のウィンドウ
 */
let mainWindow: BrowserWindow | null = null;

/**
 * システムトレイのインスタンス
 * アプリがバックグラウンドで動作する際のUI
 */
let tray: Tray | null = null;

/**
 * 開発環境判定フラグ
 * ビルドモードに応じてリソースパスを切り替え
 */
const isDev = !app.isPackaged;

/**
 * メインウィンドウ作成
 * アプリケーションのUIウィンドウを生成・設定
 * @returns Promise<BrowserWindow> 作成されたウィンドウインスタンス
 */
async function createMainWindow(): Promise<BrowserWindow> {
  // === ウィンドウ設定の定義 ===
  // 何をする部分か：ウィンドウのサイズ、動作、セキュリティを設定
  // なぜ必要か：ユーザビリティとセキュリティを両立するため
  const window = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 800,
    minHeight: 600,
    
    // === UI設定 ===
    // 何をする部分か：ウィンドウの外観と動作を定義
    // なぜ必要か：デスクトップアプリとしての自然な操作感を提供するため
    titleBarStyle: 'default',
    show: false, // 初期化完了後に表示
    autoHideMenuBar: true, // メニューバーを自動非表示
    
    // === アイコン設定 ===
    // 何をする部分か：タスクバーとウィンドウのアイコンを設定
    // なぜ必要か：アプリの識別性を向上させるため
    icon: isDev ? undefined : join(__dirname, '../../resources/icon.png'),
    
    // === セキュリティ設定 ===
    // 何をする部分か：レンダラープロセスのセキュリティ制約を定義
    // なぜ必要か：XSSやコード注入攻撃を防ぐため
    webPreferences: {
      nodeIntegration: false, // Node.js APIの直接アクセスを無効化
      contextIsolation: true, // レンダラーとメインプロセスの分離
      // remoteモジュールはElectron 14以降では削除済み
      preload: join(__dirname, '../preload/preload.js'), // プリロードスクリプト
      webSecurity: true, // Webセキュリティを有効化
      allowRunningInsecureContent: false, // 非HTTPS コンテンツの実行を禁止
    },
  });

  // === ウィンドウイベント設定 ===
  // 何をする部分か：ウィンドウの表示・非表示・終了時の動作を定義
  // なぜ必要か：システムトレイ連携とアプリの適切なライフサイクル管理のため
  
  // ウィンドウ準備完了後の表示
  window.once('ready-to-show', () => {
    if (window) {
      window.show();
      if (isDev) {
        window.webContents.openDevTools(); // 開発時のみDevToolsを開く
      }
    }
  });

  // ウィンドウを閉じる際の動作（トレイに最小化）
  window.on('close', (event) => {
    if ((app as any).isQuiting) {
      return; // アプリ終了時は通常通り閉じる
    }
    
    event.preventDefault(); // ウィンドウ閉じを中断
    window.hide(); // システムトレイに隠す
    
    // 初回のトレイ最小化時に通知
    if (process.platform !== 'darwin') { // macOS以外
      // TODO: 通知機能の実装
      log.info('アプリケーションはシステムトレイで動作を続けています');
    }
  });

  // ウィンドウフォーカス時のグローバルショートカット一時無効化
  window.on('focus', () => {
    // ウィンドウがアクティブな間はグローバルショートカットを無効化
    // アプリ内での通常のキーボード操作を優先するため
  });

  window.on('blur', () => {
    // ウィンドウが非アクティブになったらショートカットを再有効化
  });

  // === コンテンツ読み込み ===
  // 何をする部分か：開発・本番環境に応じたHTMLの読み込み
  // なぜ必要か：開発時のホットリロードと本番時の最適化を両立するため
  if (isDev) {
    // 開発環境：Vite開発サーバーから読み込み
    await window.loadURL('http://localhost:3000');
  } else {
    // 本番環境：ビルド済みファイルから読み込み
    await window.loadFile(join(__dirname, '../renderer/index.html'));
  }

  log.info('メインウィンドウを作成しました');
  return window;
}

/**
 * アプリケーション初期化
 * 起動時に必要な全ての初期設定を実行
 */
async function initializeApp(): Promise<void> {
  try {
    log.info(`アプリケーションを初期化中... (開発モード: ${isDev})`);

    // === データベース初期化 ===
    // 何をする部分か：SQLiteデータベースのセットアップ
    // なぜ必要か：スニペットデータの永続化基盤を準備するため
    try {
      await initializeDatabase();
      log.info('データベース初期化が成功しました');
    } catch (error) {
      log.error('SQLiteデータベース初期化でエラーが発生、JSONストレージに切り替えます:', error);
      try {
        await initializeJsonStorage();
        log.info('JSONストレージで初期化が成功しました');
      } catch (jsonError) {
        log.error('JSONストレージ初期化でもエラーが発生:', jsonError);
        throw new Error('すべてのストレージ方式で初期化に失敗しました');
      }
    }

    // === IPC ハンドラー設定 ===
    // 何をする部分か：レンダラープロセスとの通信チャンネル確立
    // なぜ必要か：UIからデータベース操作を可能にするため
    setupIpcHandlers();

    // === メインウィンドウ作成 ===
    mainWindow = await createMainWindow();

    // === システムトレイ作成 ===
    // 何をする部分か：バックグラウンド動作用のトレイアイコン設定
    // なぜ必要か：ウィンドウを閉じてもアプリを使い続けられるようにするため
    tray = createTray(mainWindow);

    // === グローバルショートカット設定 ===
    // 何をする部分か：システム全体で有効なキーボードショートカット登録
    // なぜ必要か：どのアプリが前面にあってもクリップボードマネージャーを呼び出せるようにするため
    setupGlobalShortcuts(mainWindow);

    log.info('アプリケーション初期化が完了しました');

  } catch (error) {
    log.error('アプリケーション初期化でエラーが発生:', error);
    
    // === 初期化失敗時の処理 ===
    // 何をする部分か：起動に失敗した場合のクリーンアップ
    // なぜ必要か：不正な状態でのアプリ継続を防ぐため
    app.quit();
  }
}

/**
 * アプリケーション終了処理
 * リソースの適切な解放とクリーンアップ
 */
async function cleanupApp(): Promise<void> {
  try {
    log.info('アプリケーションを終了中...');

    // === グローバルショートカットの解除 ===
    // 何をする部分か：登録されたシステムショートカットをクリア
    // なぜ必要か：他のアプリケーションとの競合を防ぐため
    globalShortcut.unregisterAll();

    // === データベース接続の終了 ===
    // 何をする部分か：SQLite接続の適切なクローズ
    // なぜ必要か：データの整合性とリソースリークを防ぐため
    closeDatabase();

    // === システムトレイの削除 ===
    // 何をする部分か：トレイアイコンをシステムから除去
    // なぜ必要か：アプリ終了後にゴーストアイコンが残るのを防ぐため
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
    }

    log.info('アプリケーションが正常に終了しました');

  } catch (error) {
    log.error('アプリケーション終了処理でエラーが発生:', error);
  }
}

// === Electronアプリケーションイベント処理 ===

// === シングルインスタンス制御 ===
// 何をする部分か：アプリが既に起動中の場合、2つ目のプロセスを即終了し既存ウィンドウを前面に出す
// なぜ必要か：タスクバーや起動ショートカットをクリックするたびに多重起動されるのを防ぐため
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  // 既にインスタンスが存在するので即終了
  app.quit();
} else {
  // 2つ目の起動が試みられた時のイベント（既存インスタンス側で発火）
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  /**
   * app.whenReady イベント
   * Electronの初期化完了後に呼び出される
   */
  app.whenReady().then(initializeApp).catch((error) => {
    log.error('アプリケーション起動でエラーが発生:', error);
    process.exit(1);
  });
}

/**
 * すべてのウィンドウが閉じられた時の処理
 * macOSでは通常、アプリを終了しない
 */
app.on('window-all-closed', () => {
  // === プラットフォーム固有の動作 ===
  // 何をする部分か：OS別のウィンドウクローズ処理を分岐
  // なぜ必要か：各OSのUXに合わせた自然な動作を提供するため
  if (process.platform !== 'darwin') {
    // Windows/Linuxでは全ウィンドウが閉じたらアプリ終了
    app.quit();
  } else {
    // macOSではDockに残し、ウィンドウだけを閉じる
    // ユーザーがDockアイコンをクリックしたら再度ウィンドウを表示
  }
});

/**
 * アプリがアクティブになった時の処理（macOS用）
 */
app.on('activate', async () => {
  // === macOS特有の動作 ===
  // 何をする部分か：Dockアイコンクリック時のウィンドウ復帰処理
  // なぜ必要か：macOSユーザーが期待する標準的な動作を提供するため
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow = await createMainWindow();
  } else if (mainWindow) {
    mainWindow.show();
  }
});

/**
 * アプリケーション終了前の処理
 */
app.on('before-quit', (_event) => {
  // === 終了フラグの設定 ===
  // 何をする部分か：通常の終了処理であることをマーク
  // なぜ必要か：ウィンドウクローズ時とアプリ終了時の動作を区別するため
  (app as any).isQuiting = true;
});

/**
 * アプリケーション終了時の処理
 */
app.on('will-quit', (event) => {
  event.preventDefault(); // 一時的に終了を防ぐ
  
  cleanupApp().then(() => {
    process.exit(0); // クリーンアップ完了後に終了
  }).catch((error) => {
    log.error('終了処理でエラーが発生:', error);
    process.exit(1);
  });
});

// === 未処理例外のキャッチ ===
// 何をする部分か：予期しないエラーを補足してログに記録
// なぜ必要か：アプリクラッシュの原因を把握し、安全に終了するため
process.on('uncaughtException', (error) => {
  log.error('未処理の例外が発生:', error);
  app.quit();
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('未処理のPromise拒否が発生:', reason);
  log.error('Promise:', promise);
});

// === 開発時のホットリロード対応 ===
// 何をする部分か：開発環境でのコードリロード時の処理
// なぜ必要か：開発効率を向上させるため
if (isDev) {
  // 開発時の追加設定があればここに記述
  log.info('開発モードで動作中');
}