import { Tray, Menu, BrowserWindow, app, nativeImage } from 'electron';
import { join } from 'path';
import log from 'electron-log';
import { SnippetOperations } from '../db/operations';
import { JsonSnippetOperations } from '../db/jsonStorage';

// === システムトレイ管理 ===
// 何をする部分か：バックグラウンド動作時のユーザーインターフェースを提供
// なぜ必要か：ウィンドウが非表示でもアプリへのアクセスを可能にするため

/**
 * システムトレイアイコンの作成
 * アプリ起動時に呼び出される初期化処理
 * @param mainWindow メインウィンドウのインスタンス
 * @returns Tray 作成されたトレイインスタンス
 */
export function createTray(mainWindow: BrowserWindow): Tray {
  try {
    // === トレイアイコンの設定 ===
    // 何をする部分か：OSに応じた適切なアイコン画像を設定
    // なぜ必要か：システムトレイでアプリを識別できるようにするため
    const iconPath = getTrayIconPath();
    const trayIcon = nativeImage.createFromPath(iconPath);
    
    // === アイコンサイズの最適化 ===
    // 何をする部分か：各OSのトレイに最適なサイズに調整
    // なぜ必要か：視認性を向上させ、OS標準の見た目に合わせるため
    if (process.platform === 'darwin') {
      // macOS: テンプレートアイコンとして16x16に調整
      trayIcon.setTemplateImage(true);
      trayIcon.resize({ width: 16, height: 16 });
    } else if (process.platform === 'win32') {
      // Windows: 16x16 または 32x32
      trayIcon.resize({ width: 16, height: 16 });
    }

    const tray = new Tray(trayIcon);

    // === トレイのツールチップ設定 ===
    // 何をする部分か：マウスオーバー時の説明テキストを設定
    // なぜ必要か：ユーザーにアプリの状態を伝えるため
    tray.setToolTip('Clipboard Manager - クリップボード・スニペット管理');

    // === コンテキストメニューの初期設定 ===
    // 何をする部分か：右クリック時のメニュー項目を定義
    // なぜ必要か：トレイからの基本操作を可能にするため
    setupTrayMenu(tray, mainWindow);

    // === トレイクリックイベントの設定 ===
    // 何をする部分か：左クリック時のウィンドウ表示動作を定義
    // なぜ必要か：素早いアクセス方法を提供するため
    tray.on('click', () => {
      try {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.center();
        }
        log.info('トレイクリックによりウィンドウ表示を切り替えました');
      } catch (error) {
        log.error('トレイクリックでエラーが発生:', error);
      }
    });

    // === ダブルクリックイベント（Windows/Linux用） ===
    // 何をする部分か：ダブルクリック時のウィンドウ表示処理
    // なぜ必要か：Windowsユーザーの標準的な操作に対応するため
    tray.on('double-click', () => {
      try {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.center();
        log.info('トレイダブルクリックによりウィンドウを表示しました');
      } catch (error) {
        log.error('トレイダブルクリックでエラーが発生:', error);
      }
    });

    // === 定期的なメニュー更新スケジュール ===
    // 何をする部分か：最近使用したスニペットを定期的に更新
    // なぜ必要か：トレイメニューの情報を最新に保つため
    setupTrayMenuUpdater(tray, mainWindow);

    log.info('システムトレイを作成しました');
    return tray;

  } catch (error) {
    log.error('システムトレイ作成でエラーが発生:', error);
    throw error;
  }
}

/**
 * トレイコンテキストメニューの設定
 * @param tray トレイインスタンス
 * @param mainWindow メインウィンドウ
 */
async function setupTrayMenu(tray: Tray, mainWindow: BrowserWindow): Promise<void> {
  try {
    // === 最近使用したスニペットの取得 ===
    // 何をする部分か：使用回数順でスニペットを取得し、メニューに表示
    // なぜ必要か：よく使うスニペットへの素早いアクセスを提供するため
    const recentSnippets = await getRecentSnippets(5); // 上位5件を取得
    const favoriteSnippets = await getFavoriteSnippets(3); // お気に入り3件を取得

    // === メニューテンプレートの構築 ===
    // 何をする部分か：動的なメニュー項目を含む完全なメニュー構造を作成
    // なぜ必要か：静的メニューと動的コンテンツを統合するため
    const menuTemplate: any[] = [
      {
        label: '📋 Clipboard Manager を開く',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.center();
        },
      },
      { type: 'separator' },
    ];

    // === お気に入りスニペットセクション ===
    if (favoriteSnippets.length > 0) {
      menuTemplate.push({
        label: '⭐ お気に入り',
        submenu: favoriteSnippets.map(snippet => ({
          label: truncateText(snippet.title, 30),
          click: async () => {
            await copySnippetToClipboard(snippet.id, snippet.content);
            // 使用統計の更新（エラー時は無視）
            try {
              await SnippetOperations.incrementUseCount(snippet.id);
            } catch (error) {
              log.warn('使用統計更新をスキップ:', String(error));
            }
          },
        })),
      });
    }

    // === 最近使用したスニペットセクション ===
    if (recentSnippets.length > 0) {
      menuTemplate.push({
        label: '📌 最近使用',
        submenu: recentSnippets.map(snippet => ({
          label: `${truncateText(snippet.title, 25)} (${snippet.useCount}回)`,
          click: async () => {
            await copySnippetToClipboard(snippet.id, snippet.content);
            try {
              await SnippetOperations.incrementUseCount(snippet.id);
            } catch (error) {
              log.warn('使用統計更新をスキップ:', String(error));
            }
          },
        })),
      });
    }

    // === スニペットが存在しない場合の表示 ===
    if (recentSnippets.length === 0 && favoriteSnippets.length === 0) {
      menuTemplate.push({
        label: '📝 スニペットがありません',
        enabled: false,
      });
      menuTemplate.push({
        label: 'アプリを開いてスニペットを作成',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      });
    }

    // === 区切り線とアプリ制御メニュー ===
    menuTemplate.push(
      { type: 'separator' },
      {
        label: '⚙️ 設定',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
          // 設定画面を開く指示をレンダラープロセスに送信
          mainWindow.webContents.send('navigate-to-settings');
        },
      },
      {
        label: `📖 バージョン ${app.getVersion()}`,
        enabled: false,
      },
      { type: 'separator' },
      {
        label: '🚪 終了',
        click: () => {
          (app as any).isQuiting = true;
          app.quit();
        },
      }
    );

    // === メニューの適用 ===
    const contextMenu = Menu.buildFromTemplate(menuTemplate);
    tray.setContextMenu(contextMenu);

    log.info(`トレイメニューを更新しました (スニペット: ${recentSnippets.length + favoriteSnippets.length}件)`);

  } catch (error) {
    log.error('トレイメニュー設定でエラーが発生:', error);
    
    // === エラー時のフォールバックメニュー ===
    // 何をする部分か：データ取得失敗時の最小限メニューを提供
    // なぜ必要か：エラー状況でも基本操作を可能にするため
    const fallbackMenu = Menu.buildFromTemplate([
      {
        label: 'Clipboard Manager を開く',
        click: () => {
          mainWindow.show();
          mainWindow.focus();
        },
      },
      { type: 'separator' },
      {
        label: '終了',
        click: () => {
          (app as any).isQuiting = true;
          app.quit();
        },
      },
    ]);
    tray.setContextMenu(fallbackMenu);
  }
}

/**
 * トレイメニューの定期更新設定
 * @param tray トレイインスタンス
 * @param mainWindow メインウィンドウ
 */
function setupTrayMenuUpdater(tray: Tray, mainWindow: BrowserWindow): void {
  // === 定期更新タイマーの設定 ===
  // 何をする部分か：30秒ごとにトレイメニューの内容を更新
  // なぜ必要か：最新のスニペット情報をトレイメニューに反映するため
  const updateInterval = setInterval(() => {
    setupTrayMenu(tray, mainWindow);
  }, 30000); // 30秒間隔で更新

  // === アプリ終了時のクリーンアップ ===
  // 何をする部分か：アプリ終了時にタイマーをクリア
  // なぜ必要か：メモリリークとゾンビプロセスを防ぐため
  app.on('before-quit', () => {
    clearInterval(updateInterval);
  });

  log.info('トレイメニューの自動更新を開始しました');
}

/**
 * 最近使用したスニペットの取得
 * @param limit 取得件数の上限
 * @returns Promise<Snippet[]> 使用回数順のスニペット配列
 */
async function getRecentSnippets(limit: number) {
  try {
    // SQLiteが利用できない場合はJSONストレージを使用
    let allSnippets;
    try {
      allSnippets = await SnippetOperations.getAll();
    } catch (sqliteError) {
      log.warn('SQLite使用不可、JSONストレージを使用します');
      allSnippets = await JsonSnippetOperations.getAll();
    }
    
    // === 使用回数順でのソート ===
    // 何をする部分か：useCountが多い順に並び替え
    // なぜ必要か：よく使うスニペットを優先表示するため
    return allSnippets
      .filter(snippet => snippet.useCount > 0) // 一度も使用されていないものは除外
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, limit);
      
  } catch (error) {
    log.error('最近使用したスニペット取得でエラーが発生:', error);
    return [];
  }
}

/**
 * お気に入りスニペットの取得
 * @param limit 取得件数の上限
 * @returns Promise<Snippet[]> お気に入りスニペット配列
 */
async function getFavoriteSnippets(limit: number) {
  try {
    // SQLiteが利用できない場合はJSONストレージを使用
    let searchResult;
    try {
      searchResult = await SnippetOperations.search({ isFavorite: true });
    } catch (sqliteError) {
      log.warn('SQLite使用不可、JSONストレージを使用します');
      searchResult = await JsonSnippetOperations.search({ isFavorite: true });
    }
    return searchResult.slice(0, limit);
    
  } catch (error) {
    log.error('お気に入りスニペット取得でエラーが発生:', error);
    return [];
  }
}

/**
 * スニペット内容をクリップボードにコピー
 * @param snippetId スニペットID
 * @param content スニペット内容
 */
async function copySnippetToClipboard(snippetId: number, content: string): Promise<void> {
  try {
    const { clipboard } = require('electron');
    
    // === プレースホルダーの置換 ===
    // 何をする部分か：{date}、{time}などの動的な値を実際の値に変換
    // なぜ必要か：コピー時点での正確な情報を提供するため
    const processedContent = await replacePlaceholders(content);
    
    // === クリップボードへのコピー実行 ===
    clipboard.writeText(processedContent);
    
    log.info(`スニペットをクリップボードにコピーしました (ID: ${snippetId})`);
    
  } catch (error) {
    log.error('クリップボードコピーでエラーが発生:', error);
  }
}

/**
 * プレースホルダーの置換処理
 * @param content 置換対象のテキスト
 * @returns Promise<string> 置換後のテキスト
 */
async function replacePlaceholders(content: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const os = require('os');
  const now = new Date();
  
  // === 日時フォーマットの準備 ===
  // 何をする部分か：日本語ロケールでの日時文字列を生成
  // なぜ必要か：日本のビジネス文書に適した形式を提供するため
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).replace(/\//g, '/');
  
  const timeStr = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const datetimeStr = `${dateStr} ${timeStr}`;
  
  // === 現在のクリップボード内容取得 ===
  const { clipboard } = require('electron');
  const currentClipboard = clipboard.readText();
  
  // === プレースホルダー置換マップ ===
  const replacements = {
    '{date}': dateStr,
    '{time}': timeStr,
    '{datetime}': datetimeStr,
    '{username}': os.userInfo().username,
    '{clipboard}': currentClipboard,
  };
  
  // === 置換処理の実行 ===
  let result = content;
  Object.entries(replacements).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}

/**
 * テキストの切り詰め処理
 * @param text 対象テキスト
 * @param maxLength 最大文字数
 * @returns string 切り詰め後のテキスト
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * トレイアイコンパスの取得
 * OS別に適切なアイコンファイルを選択
 * @returns string アイコンファイルのパス
 */
function getTrayIconPath(): string {
  const isDev = process.env.NODE_ENV === 'development';
  const resourcesPath = isDev 
    ? join(__dirname, '../../../resources')
    : join(process.resourcesPath, 'resources');

  // === OS別アイコンファイルの選択 ===
  // 何をする部分か：各OSの推奨形式に合わせたアイコンファイルを選択
  // なぜ必要か：OS標準の見た目との整合性を保つため
  switch (process.platform) {
    case 'darwin': // macOS
      return join(resourcesPath, 'tray-icon-mac.png');
    case 'win32': // Windows
      return join(resourcesPath, 'tray-icon-win.ico');
    default: // Linux
      return join(resourcesPath, 'tray-icon-linux.png');
  }
}