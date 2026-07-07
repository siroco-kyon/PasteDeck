import { app, BrowserWindow, globalShortcut, Tray, screen } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { initializeDatabase, closeDatabase, getSettingValue, setSettingValue } from './db/schema';
import { initializeJsonStorage } from './db/jsonStorage';
import { setupIpcHandlers } from './ipc/handlers';
import { createTray } from './tray/trayManager';
import { setupGlobalShortcuts } from './shortcuts/shortcutManager';
import { createSplashWindow, sendSplashProgress } from './window/splashWindow';
import { NORMAL_WINDOW_SIZE, NORMAL_WINDOW_MIN_SIZE, COMPACT_WINDOW_SIZE } from './window/windowConstants';

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
 * スプラッシュウィンドウのインスタンス
 * 起動処理が完了するまでの間だけ表示する
 */
let splashWindow: BrowserWindow | null = null;

/**
 * 開発環境判定フラグ
 * ビルドモードに応じてリソースパスを切り替え
 */
const isDev = !app.isPackaged;

/**
 * ウィンドウ位置・サイズ保存用のデバウンスタイマー
 * 何をする部分か：resize/moveイベント発生のたびに即書き込みせず一定時間後にまとめて保存
 * なぜ必要か：ドラッグ中に大量のディスクI/Oが発生するのを防ぐため
 */
let saveBoundsTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * ウィンドウの位置・サイズを保存
 * 最大化中は現在の「通常時サイズ」を上書きしないようスキップする
 * @param window 保存対象のウィンドウ
 */
function saveWindowBounds(window: BrowserWindow): void {
  // 保留中のデバウンス書き込みがあれば取り消す
  // （unmaximize/close時の即時保存とのバッティングで古い値が後から上書きするのを防ぐ）
  if (saveBoundsTimer) {
    clearTimeout(saveBoundsTimer);
    saveBoundsTimer = null;
  }
  if (window.isDestroyed() || window.isMaximized()) return;
  const bounds = window.getBounds();
  setSettingValue('windowWidth', bounds.width);
  setSettingValue('windowHeight', bounds.height);
  setSettingValue('windowX', bounds.x);
  setSettingValue('windowY', bounds.y);
}

/**
 * デバウンス付きのウィンドウ状態保存
 * @param window 保存対象のウィンドウ
 */
function scheduleSaveWindowBounds(window: BrowserWindow): void {
  if (saveBoundsTimer) clearTimeout(saveBoundsTimer);
  saveBoundsTimer = setTimeout(() => saveWindowBounds(window), 250);
}

/**
 * 保存されていたウィンドウ座標が現在のディスプレイ構成に収まるか検証
 * 何をする部分か：モニタの接続構成が変わった場合に画面外へ消えるのを防ぐ
 * なぜ必要か：外部モニタを外した後に前回座標のままだと操作不能なウィンドウになるため
 * @param x 保存されていたX座標
 * @param y 保存されていたY座標
 * @param width 保存されていた幅
 * @param height 保存されていた高さ
 */
function isBoundsVisibleOnAnyDisplay(x: number, y: number, width: number, height: number): boolean {
  return screen.getAllDisplays().some(display => {
    const area = display.workArea;
    return (
      x < area.x + area.width &&
      x + width > area.x &&
      y < area.y + area.height &&
      y + height > area.y
    );
  });
}

/**
 * メインウィンドウ作成
 * アプリケーションのUIウィンドウを生成・設定
 * 何をする部分か：前回のウィンドウ位置・サイズ・最前面固定・コンパクトモード設定を復元しつつウィンドウを生成
 * なぜ必要か：起動のたびに同じ場所・サイズにリセットされる挙動を解消するため
 * @returns BrowserWindow 作成されたウィンドウインスタンス（コンテンツ読み込みは非同期で継続）
 */
function createMainWindow(): BrowserWindow {
  // === 前回状態の復元 ===
  // 何をする部分か：DBに保存された前回のウィンドウ位置・サイズ・モード設定を取得
  // なぜ必要か：「最後に開いたところ」を再現するため
  const compactMode = getSettingValue('compactMode', false);
  const alwaysOnTop = getSettingValue('alwaysOnTop', false);
  const isMaximized = getSettingValue('isMaximized', false);

  const defaultWidth = compactMode ? COMPACT_WINDOW_SIZE.width : NORMAL_WINDOW_SIZE.width;
  const defaultHeight = compactMode ? COMPACT_WINDOW_SIZE.height : NORMAL_WINDOW_SIZE.height;
  const minWidth = compactMode ? COMPACT_WINDOW_SIZE.minWidth : NORMAL_WINDOW_MIN_SIZE.minWidth;
  const minHeight = compactMode ? COMPACT_WINDOW_SIZE.minHeight : NORMAL_WINDOW_MIN_SIZE.minHeight;

  const savedWidth = getSettingValue('windowWidth', defaultWidth);
  const savedHeight = getSettingValue('windowHeight', defaultHeight);
  const savedX = getSettingValue<number | undefined>('windowX', undefined);
  const savedY = getSettingValue<number | undefined>('windowY', undefined);

  // 保存座標がどの画面にも収まらない場合は無視して中央表示にフォールバック
  const useSavedPosition =
    typeof savedX === 'number' &&
    typeof savedY === 'number' &&
    isBoundsVisibleOnAnyDisplay(savedX, savedY, savedWidth, savedHeight);

  // === ウィンドウ設定の定義 ===
  // 何をする部分か：ウィンドウのサイズ、動作、セキュリティを設定
  // なぜ必要か：ユーザビリティとセキュリティを両立するため
  const window = new BrowserWindow({
    width: savedWidth,
    height: savedHeight,
    ...(useSavedPosition ? { x: savedX, y: savedY } : {}),
    minWidth,
    minHeight,
    alwaysOnTop,

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

  if (!useSavedPosition) {
    window.center();
  }
  if (isMaximized) {
    window.maximize();
  }

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

  // === ウィンドウ位置・サイズの永続化 ===
  // 何をする部分か：リサイズ・移動・最大化状態の変化をデバウンスして保存
  // なぜ必要か：次回起動時に前回の状態を復元するため
  window.on('resize', () => scheduleSaveWindowBounds(window));
  window.on('move', () => scheduleSaveWindowBounds(window));
  window.on('maximize', () => setSettingValue('isMaximized', true));
  window.on('unmaximize', () => {
    setSettingValue('isMaximized', false);
    saveWindowBounds(window);
  });

  // ウィンドウを閉じる際の動作（トレイに最小化）
  window.on('close', (event) => {
    // 終了理由を問わず、閉じる直前の状態を保存しておく
    setSettingValue('isMaximized', window.isMaximized());
    saveWindowBounds(window);

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
  // 何をする部分か：開発・本番環境に応じたHTMLの読み込みを開始（完了を待たずに返す）
  // なぜ必要か：トレイ・グローバルショートカットの準備をページ読み込みと並行して
  //           進めるため（ウィンドウ自体は ready-to-show で独立して表示される）
  //
  // compactModeをクエリパラメータとして渡すのは、レンダラー側がIPCで設定を
  // 取得し終えるまでの一瞬、コンパクトモードなのに通常レイアウトで描画されて
  // しまう（狭いウィンドウにUIがはみ出す）のを防ぐため
  const compactQuery = compactMode ? 'compact=1' : '';
  const loadPromise = isDev
    ? window.loadURL(`http://localhost:3000${compactQuery ? `?${compactQuery}` : ''}`)
    : window.loadFile(join(__dirname, '../renderer/index.html'), { search: compactQuery });

  loadPromise.catch(error => {
    log.error('メインウィンドウのコンテンツ読み込みでエラーが発生:', error);
  });

  log.info('メインウィンドウを作成しました');
  return window;
}

/**
 * アプリケーション初期化
 * 起動時に必要な全ての初期設定を実行
 * 何をする部分か：スプラッシュ画面を即座に表示しつつ、DB初期化・ウィンドウ生成・
 *               トレイ/ショートカット設定を行い、完了したらメインウィンドウへ切り替える
 * なぜ必要か：起動処理中も進捗をユーザーに見せ、体感速度を改善するため
 */
async function initializeApp(): Promise<void> {
  // === スプラッシュ画面を即座に表示 ===
  // 何をする部分か：他の初期化処理より先にスプラッシュを表示し、進捗を通知開始
  // なぜ必要か：DB初期化等に時間がかかっても「何も起きていない」状態を見せないため
  splashWindow = createSplashWindow();
  sendSplashProgress(splashWindow, 10, '起動中...');

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
    sendSplashProgress(splashWindow, 40, 'データを準備中...');

    // === IPC ハンドラー設定 ===
    // 何をする部分か：レンダラープロセスとの通信チャンネル確立
    // なぜ必要か：UIからデータベース操作を可能にするため
    setupIpcHandlers();
    sendSplashProgress(splashWindow, 55, '画面を準備中...');

    // === メインウィンドウ作成 ===
    // 何をする部分か：ウィンドウ生成とコンテンツ読み込み開始(読み込み完了は待たない)
    // なぜ必要か：トレイ・ショートカット準備をページ読み込みと並行させるため
    mainWindow = createMainWindow();
    sendSplashProgress(splashWindow, 75, 'トレイを準備中...');

    // === コンテンツ読み込み失敗時のフェイルセーフ ===
    // 何をする部分か：初回読み込みが失敗した場合、ready-to-showが永遠に来ないため
    //               スプラッシュを閉じてアプリを終了する
    // なぜ必要か：読み込み失敗時にスプラッシュが画面に残り続けたまま
    //           アプリが動いているように見えてしまう（無限ハング）のを防ぐため
    const splashOnLoadFailure = splashWindow;
    mainWindow.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      if (errorCode === -3) return; // ERR_ABORTED（ホットリロード等の正常な中断）は無視
      log.error(`メインウィンドウの読み込みに失敗しました (${errorCode}): ${errorDescription}`);
      if (splashOnLoadFailure && !splashOnLoadFailure.isDestroyed()) {
        splashOnLoadFailure.close();
      }
      app.quit();
    });

    // === システムトレイ作成 ===
    // 何をする部分か：バックグラウンド動作用のトレイアイコン設定
    // なぜ必要か：ウィンドウを閉じてもアプリを使い続けられるようにするため
    tray = createTray(mainWindow);

    // === グローバルショートカット設定 ===
    // 何をする部分か：システム全体で有効なキーボードショートカット登録
    // なぜ必要か：どのアプリが前面にあってもクリップボードマネージャーを呼び出せるようにするため
    setupGlobalShortcuts(mainWindow);
    sendSplashProgress(splashWindow, 100, '完了');

    // === スプラッシュからメインウィンドウへの切り替え ===
    // 何をする部分か：メインウィンドウの初回描画準備が整った時点でスプラッシュを閉じる
    // なぜ必要か：真っ白な画面が一瞬でも見えることを防ぐため
    const splashToClose = splashWindow;
    mainWindow.once('ready-to-show', () => {
      setTimeout(() => {
        if (splashToClose && !splashToClose.isDestroyed()) {
          splashToClose.close();
        }
      }, 150);
    });

    log.info('アプリケーション初期化が完了しました');

  } catch (error) {
    log.error('アプリケーション初期化でエラーが発生:', error);

    // === 初期化失敗時の処理 ===
    // 何をする部分か：起動に失敗した場合のクリーンアップ
    // なぜ必要か：不正な状態でのアプリ継続を防ぐため
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
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
    mainWindow = createMainWindow();
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
