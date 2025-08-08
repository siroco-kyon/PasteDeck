import { globalShortcut, BrowserWindow } from 'electron';
import log from 'electron-log';

// === グローバルショートカット管理 ===
// 何をする部分か：システム全体で有効なキーボードショートカットを管理
// なぜ必要か：どのアプリが前面にあってもクリップボードマネージャーを呼び出せるようにするため

/**
 * デフォルトのショートカットキー設定
 * ユーザー設定で上書き可能な初期値
 */
const DEFAULT_SHORTCUTS = {
  TOGGLE_WINDOW: 'Ctrl+Shift+V', // アプリ表示/非表示
  QUICK_SEARCH: 'Ctrl+Shift+Q',  // クイック検索モード
} as const;

/**
 * グローバルショートカットのセットアップ
 * アプリ起動時に呼び出される初期化処理
 * @param mainWindow メインウィンドウのインスタンス
 */
export function setupGlobalShortcuts(mainWindow: BrowserWindow): void {
  try {
    log.info('グローバルショートカットを設定中...');

    // === アプリ表示/非表示ショートカット ===
    // 何をする部分か：Ctrl+Shift+V でアプリウィンドウを切り替え
    // なぜ必要か：素早くスニペット選択画面にアクセスするため
    const toggleResult = globalShortcut.register(DEFAULT_SHORTCUTS.TOGGLE_WINDOW, () => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) {
          log.warn('メインウィンドウが無効な状態です');
          return;
        }

        if (mainWindow.isVisible()) {
          // === ウィンドウが表示中の場合 ===
          // 何をする部分か：ウィンドウを非表示にしてトレイに格納
          // なぜ必要か：作業中のアプリに素早く戻れるようにするため
          mainWindow.hide();
          log.info('ショートカットによりアプリを非表示にしました');
        } else {
          // === ウィンドウが非表示の場合 ===
          // 何をする部分か：ウィンドウを前面に表示してフォーカス
          // なぜ必要か：即座にスニペット操作を開始できるようにするため
          mainWindow.show();
          mainWindow.focus();
          
          // === 画面中央に移動 ===
          // 何をする部分か：ウィンドウを現在のスクリーン中央に配置
          // なぜ必要か：マルチディスプレイ環境でのアクセシビリティ向上のため
          mainWindow.center();
          
          log.info('ショートカットによりアプリを表示しました');
        }
      } catch (error) {
        log.error('ウィンドウ表示/非表示でエラーが発生:', error);
      }
    });

    if (!toggleResult) {
      log.error(`ショートカット '${DEFAULT_SHORTCUTS.TOGGLE_WINDOW}' の登録に失敗しました`);
    } else {
      log.info(`ウィンドウ切り替えショートカットを登録: ${DEFAULT_SHORTCUTS.TOGGLE_WINDOW}`);
    }

    // === クイック検索ショートカット ===
    // 何をする部分か：Ctrl+Shift+Q で検索フォーカス状態でアプリを表示
    // なぜ必要か：キーワードでスニペットを素早く絞り込めるようにするため
    const quickSearchResult = globalShortcut.register(DEFAULT_SHORTCUTS.QUICK_SEARCH, () => {
      try {
        if (!mainWindow || mainWindow.isDestroyed()) {
          log.warn('メインウィンドウが無効な状態です');
          return;
        }

        // ウィンドウを表示
        if (!mainWindow.isVisible()) {
          mainWindow.show();
          mainWindow.center();
        }
        mainWindow.focus();

        // === レンダラープロセスに検索モードを通知 ===
        // 何をする部分か：UIの検索入力フィールドにフォーカスを設定
        // なぜ必要か：ショートカット押下後すぐに検索入力を開始できるようにするため
        mainWindow.webContents.send('shortcut:quick-search');
        
        log.info('クイック検索ショートカットが実行されました');
        
      } catch (error) {
        log.error('クイック検索でエラーが発生:', error);
      }
    });

    if (!quickSearchResult) {
      log.error(`ショートカット '${DEFAULT_SHORTCUTS.QUICK_SEARCH}' の登録に失敗しました`);
    } else {
      log.info(`クイック検索ショートカットを登録: ${DEFAULT_SHORTCUTS.QUICK_SEARCH}`);
    }

    // === ショートカット競合チェック ===
    // 何をする部分か：他のアプリとのショートカット重複を検出
    // なぜ必要か：ユーザーに設定問題を通知するため
    checkShortcutConflicts();

    log.info('グローバルショートカットの設定が完了しました');

  } catch (error) {
    log.error('グローバルショートカット設定でエラーが発生:', error);
  }
}

/**
 * カスタムショートカットキーの登録
 * ユーザー設定に基づいてショートカットを更新
 * @param shortcutType ショートカットの種類
 * @param keyCombination キーの組み合わせ（例: 'Ctrl+Alt+C'）
 * @param mainWindow メインウィンドウのインスタンス
 * @returns boolean 登録成功の可否
 */
export function registerCustomShortcut(
  shortcutType: 'TOGGLE_WINDOW' | 'QUICK_SEARCH',
  keyCombination: string,
  mainWindow: BrowserWindow
): boolean {
  try {
    // === 既存ショートカットの解除 ===
    // 何をする部分か：同じ種類のショートカットがあれば削除
    // なぜ必要か：重複登録を防ぎ、リソースリークを避けるため
    const currentKey = getCurrentShortcutKey(shortcutType);
    if (currentKey && globalShortcut.isRegistered(currentKey)) {
      globalShortcut.unregister(currentKey);
      log.info(`既存のショートカットを解除: ${currentKey}`);
    }

    // === 新しいショートカットの検証 ===
    // 何をする部分か：キーの組み合わせが有効かチェック
    // なぜ必要か：無効なキー設定によるエラーを事前に防ぐため
    if (!isValidKeyCombination(keyCombination)) {
      log.error(`無効なキーの組み合わせです: ${keyCombination}`);
      return false;
    }

    // === 新しいショートカットの登録 ===
    let success = false;
    
    if (shortcutType === 'TOGGLE_WINDOW') {
      success = globalShortcut.register(keyCombination, () => {
        toggleWindowVisibility(mainWindow);
      });
    } else if (shortcutType === 'QUICK_SEARCH') {
      success = globalShortcut.register(keyCombination, () => {
        activateQuickSearch(mainWindow);
      });
    }

    if (success) {
      log.info(`カスタムショートカットを登録: ${shortcutType} = ${keyCombination}`);
    } else {
      log.error(`カスタムショートカットの登録に失敗: ${keyCombination}`);
    }

    return success;

  } catch (error) {
    log.error('カスタムショートカット登録でエラーが発生:', error);
    return false;
  }
}

/**
 * 全ショートカットの解除
 * アプリ終了時に呼び出されるクリーンアップ処理
 */
export function unregisterAllShortcuts(): void {
  try {
    globalShortcut.unregisterAll();
    log.info('全てのグローバルショートカットを解除しました');
  } catch (error) {
    log.error('ショートカット解除でエラーが発生:', error);
  }
}

/**
 * 現在登録されているショートカットキーの取得
 * UI での設定表示用
 * @param shortcutType ショートカットの種類
 * @returns string | null 現在のキーの組み合わせ
 */
export function getCurrentShortcutKey(shortcutType: 'TOGGLE_WINDOW' | 'QUICK_SEARCH'): string | null {
  // 本来はユーザー設定から取得するが、現在はデフォルト値を返す
  // TODO: ユーザー設定データベースからの取得機能を実装
  switch (shortcutType) {
    case 'TOGGLE_WINDOW':
      return DEFAULT_SHORTCUTS.TOGGLE_WINDOW;
    case 'QUICK_SEARCH':
      return DEFAULT_SHORTCUTS.QUICK_SEARCH;
    default:
      return null;
  }
}

/**
 * ウィンドウ表示切り替え処理
 * ショートカットアクションの共通化
 * @param mainWindow メインウィンドウのインスタンス
 */
function toggleWindowVisibility(mainWindow: BrowserWindow): void {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.center();
    }
  } catch (error) {
    log.error('ウィンドウ表示切り替えでエラーが発生:', error);
  }
}

/**
 * クイック検索アクティベーション
 * 検索モード専用の表示処理
 * @param mainWindow メインウィンドウのインスタンス
 */
function activateQuickSearch(mainWindow: BrowserWindow): void {
  try {
    if (!mainWindow || mainWindow.isDestroyed()) {
      return;
    }

    if (!mainWindow.isVisible()) {
      mainWindow.show();
      mainWindow.center();
    }
    mainWindow.focus();
    
    // レンダラープロセスに検索フォーカス指示
    mainWindow.webContents.send('shortcut:quick-search');
    
  } catch (error) {
    log.error('クイック検索アクティベーションでエラーが発生:', error);
  }
}

/**
 * キーの組み合わせの妥当性チェック
 * @param keyCombination チェック対象のキー組み合わせ
 * @returns boolean 有効な組み合わせかどうか
 */
function isValidKeyCombination(keyCombination: string): boolean {
  // === 基本的なバリデーション ===
  // 何をする部分か：キー文字列の形式をチェック
  // なぜ必要か：Electronが受け付けない形式を事前に除外するため
  
  if (!keyCombination || keyCombination.trim().length === 0) {
    return false;
  }

  // 一般的な修飾キーと文字キーの組み合わせかチェック
  const validPattern = /^(Ctrl|Alt|Shift|Cmd|Super)(\+(Ctrl|Alt|Shift|Cmd|Super))*\+[A-Za-z0-9]$/;
  return validPattern.test(keyCombination);
}

/**
 * ショートカット競合チェック
 * 他のアプリケーションとの競合を検出
 */
function checkShortcutConflicts(): void {
  // === システム標準ショートカットとの競合チェック ===
  // 何をする部分か：OSの標準ショートカットとの重複を警告
  // なぜ必要か：ユーザーに設定変更の必要性を通知するため
  
  const systemShortcuts = [
    'Ctrl+C',      // コピー
    'Ctrl+V',      // ペースト
    'Ctrl+X',      // カット
    'Ctrl+Z',      // アンドゥ
    'Ctrl+Y',      // リドゥ
    'Alt+Tab',     // アプリ切り替え
    'Ctrl+Alt+Del', // システム制御
  ];

  const currentShortcuts = [
    DEFAULT_SHORTCUTS.TOGGLE_WINDOW,
    DEFAULT_SHORTCUTS.QUICK_SEARCH,
  ];

  currentShortcuts.forEach(shortcut => {
    if (systemShortcuts.includes(shortcut)) {
      log.warn(`システム標準ショートカットと競合している可能性があります: ${shortcut}`);
    }
  });

  // === 登録可能性チェック ===
  // 何をする部分か：Electronでショートカットが登録可能かテスト
  // なぜ必要か：運用前に設定問題を検出するため
  currentShortcuts.forEach(shortcut => {
    if (!globalShortcut.isRegistered(shortcut)) {
      log.warn(`ショートカットが正常に登録されていません: ${shortcut}`);
    }
  });
}