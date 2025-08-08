import { ipcMain, clipboard, Notification } from 'electron';
import log from 'electron-log';
import { CategoryOperations, SnippetOperations } from '../db/operations';
import { IPC_CHANNELS } from '@/shared/types';
import type {
  IPCResponse,
  CreateSnippetInput,
  UpdateSnippetInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  SearchFilters,
} from '@/shared/types';

// === IPC ハンドラー設定 ===
// 何をする部分か：レンダラープロセスからの要求を処理するハンドラーを登録
// なぜ必要か：UIからデータベース操作やシステム機能へのアクセスを提供するため

/**
 * 全IPCハンドラーのセットアップ
 * アプリ起動時に一度だけ呼び出される初期化処理
 */
export function setupIpcHandlers(): void {
  try {
    log.info('IPCハンドラーを設定中...');

    // === スニペット関連ハンドラー ===
    setupSnippetHandlers();
    
    // === カテゴリ関連ハンドラー ===
    setupCategoryHandlers();
    
    // === システム関連ハンドラー ===
    setupSystemHandlers();
    
    // === アプリ制御ハンドラー ===
    setupAppHandlers();

    log.info('全てのIPCハンドラーを設定しました');

  } catch (error) {
    log.error('IPCハンドラー設定でエラーが発生:', error);
    throw error;
  }
}

/**
 * スニペット関連IPCハンドラーの設定
 */
function setupSnippetHandlers(): void {
  // === 全スニペット取得 ===
  // 何をする部分か：データベースから全スニペットを取得してレンダラーに返す
  // なぜ必要か：UI側でスニペット一覧を表示するため
  ipcMain.handle(IPC_CHANNELS.SNIPPET.GET_ALL, async (): Promise<IPCResponse> => {
    try {
      const snippets = await SnippetOperations.getAll();
      return { success: true, data: snippets };
    } catch (error) {
      log.error('スニペット一覧取得でエラー:', error);
      return { 
        success: false, 
        message: 'スニペット一覧の取得に失敗しました',
        details: error 
      };
    }
  });

  // === ID指定スニペット取得 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.GET_BY_ID, async (_, id: number): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.getById(id);
      return { success: true, data: snippet };
    } catch (error) {
      log.error(`スニペット取得でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: `スニペット取得に失敗しました (ID: ${id})`,
        details: error 
      };
    }
  });

  // === スニペット検索 ===
  // 何をする部分か：検索条件に基づいてスニペットを絞り込む
  // なぜ必要か：大量のスニペットから目的の項目を素早く見つけるため
  ipcMain.handle(IPC_CHANNELS.SNIPPET.SEARCH, async (_, filters: SearchFilters): Promise<IPCResponse> => {
    try {
      const results = await SnippetOperations.search(filters);
      return { success: true, data: results };
    } catch (error) {
      log.error('スニペット検索でエラー:', error);
      return { 
        success: false, 
        message: 'スニペット検索に失敗しました',
        details: error 
      };
    }
  });

  // === スニペット新規作成 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.CREATE, async (_, input: CreateSnippetInput): Promise<IPCResponse> => {
    try {
      // === 入力データの検証 ===
      // 何をする部分か：必須項目と形式をチェック
      // なぜ必要か：不正なデータによるエラーを事前に防ぐため
      if (!input.title?.trim()) {
        return { 
          success: false, 
          message: 'タイトルは必須です',
          code: 'VALIDATION_ERROR' 
        };
      }
      
      if (!input.content?.trim()) {
        return { 
          success: false, 
          message: 'コンテンツは必須です',
          code: 'VALIDATION_ERROR' 
        };
      }

      const snippet = await SnippetOperations.create(input);
      
      // === 成功通知の表示 ===
      // 何をする部分か：スニペット作成成功をユーザーに通知
      // なぜ必要か：操作完了をわかりやすく伝えるため
      showNotification('スニペット作成', `"${snippet.title}" を作成しました`);
      
      return { success: true, data: snippet };
    } catch (error) {
      log.error('スニペット作成でエラー:', error);
      return { 
        success: false, 
        message: 'スニペット作成に失敗しました',
        details: error 
      };
    }
  });

  // === スニペット更新 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.UPDATE, async (_, id: number, input: UpdateSnippetInput): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.update(id, input);
      return { success: true, data: snippet };
    } catch (error) {
      log.error(`スニペット更新でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: 'スニペット更新に失敗しました',
        details: error 
      };
    }
  });

  // === スニペット削除 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.DELETE, async (_, id: number): Promise<IPCResponse> => {
    try {
      const success = await SnippetOperations.delete(id);
      if (success) {
        showNotification('スニペット削除', 'スニペットを削除しました');
      }
      return { success: true, data: success };
    } catch (error) {
      log.error(`スニペット削除でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: 'スニペット削除に失敗しました',
        details: error 
      };
    }
  });

  // === クリップボードコピー ===
  // 何をする部分か：スニペット内容をプレースホルダー処理してクリップボードにコピー
  // なぜ必要か：動的な値（日時、ユーザー名等）を含むスニペットを活用するため
  ipcMain.handle(IPC_CHANNELS.SNIPPET.COPY_TO_CLIPBOARD, async (_, id: number): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.getById(id);
      if (!snippet) {
        return { 
          success: false, 
          message: 'スニペットが見つかりません',
          code: 'NOT_FOUND' 
        };
      }

      // === プレースホルダーの置換 ===
      const processedContent = await replacePlaceholders(snippet.content);
      
      // === クリップボードへのコピー ===
      clipboard.writeText(processedContent);
      
      // === 使用統計の更新 ===
      await SnippetOperations.incrementUseCount(id);
      
      showNotification('コピー完了', `"${snippet.title}" をコピーしました`);
      
      return { success: true, data: { content: processedContent } };
    } catch (error) {
      log.error(`クリップボードコピーでエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: 'クリップボードコピーに失敗しました',
        details: error 
      };
    }
  });

  // === 使用回数インクリメント ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.INCREMENT_USE_COUNT, async (_, id: number): Promise<IPCResponse> => {
    try {
      await SnippetOperations.incrementUseCount(id);
      return { success: true, data: true };
    } catch (error) {
      log.error(`使用回数更新でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: '使用回数更新に失敗しました',
        details: error 
      };
    }
  });
}

/**
 * カテゴリ関連IPCハンドラーの設定
 */
function setupCategoryHandlers(): void {
  // === 全カテゴリ取得 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.GET_ALL, async (): Promise<IPCResponse> => {
    try {
      const categories = await CategoryOperations.getAll();
      return { success: true, data: categories };
    } catch (error) {
      log.error('カテゴリ一覧取得でエラー:', error);
      return { 
        success: false, 
        message: 'カテゴリ一覧の取得に失敗しました',
        details: error 
      };
    }
  });

  // === ID指定カテゴリ取得 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.GET_BY_ID, async (_, id: number): Promise<IPCResponse> => {
    try {
      const category = await CategoryOperations.getById(id);
      return { success: true, data: category };
    } catch (error) {
      log.error(`カテゴリ取得でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: `カテゴリ取得に失敗しました (ID: ${id})`,
        details: error 
      };
    }
  });

  // === カテゴリ新規作成 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.CREATE, async (_, input: CreateCategoryInput): Promise<IPCResponse> => {
    try {
      if (!input.name?.trim()) {
        return { 
          success: false, 
          message: 'カテゴリ名は必須です',
          code: 'VALIDATION_ERROR' 
        };
      }

      const category = await CategoryOperations.create(input);
      showNotification('カテゴリ作成', `"${category.name}" カテゴリを作成しました`);
      
      return { success: true, data: category };
    } catch (error) {
      log.error('カテゴリ作成でエラー:', error);
      return { 
        success: false, 
        message: 'カテゴリ作成に失敗しました',
        details: error 
      };
    }
  });

  // === カテゴリ更新 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.UPDATE, async (_, id: number, input: UpdateCategoryInput): Promise<IPCResponse> => {
    try {
      const category = await CategoryOperations.update(id, input);
      return { success: true, data: category };
    } catch (error) {
      log.error(`カテゴリ更新でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: 'カテゴリ更新に失敗しました',
        details: error 
      };
    }
  });

  // === カテゴリ削除 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.DELETE, async (_, id: number): Promise<IPCResponse> => {
    try {
      const success = await CategoryOperations.delete(id);
      if (success) {
        showNotification('カテゴリ削除', 'カテゴリと関連スニペットを削除しました');
      }
      return { success: true, data: success };
    } catch (error) {
      log.error(`カテゴリ削除でエラー (ID: ${id}):`, error);
      return { 
        success: false, 
        message: 'カテゴリ削除に失敗しました',
        details: error 
      };
    }
  });
}

/**
 * システム関連IPCハンドラーの設定
 */
function setupSystemHandlers(): void {
  // === クリップボード取得 ===
  // 何をする部分か：システムの現在のクリップボード内容を取得
  // なぜ必要か：プレースホルダー {clipboard} の置換やUI表示のため
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_CLIPBOARD, async (): Promise<IPCResponse> => {
    try {
      const text = clipboard.readText();
      return { success: true, data: text };
    } catch (error) {
      log.error('クリップボード取得でエラー:', error);
      return { 
        success: false, 
        message: 'クリップボード取得に失敗しました',
        details: error 
      };
    }
  });

  // === クリップボード設定 ===
  ipcMain.handle(IPC_CHANNELS.SYSTEM.SET_CLIPBOARD, async (_, text: string): Promise<IPCResponse> => {
    try {
      clipboard.writeText(text);
      return { success: true, data: true };
    } catch (error) {
      log.error('クリップボード設定でエラー:', error);
      return { 
        success: false, 
        message: 'クリップボード設定に失敗しました',
        details: error 
      };
    }
  });

  // === 通知表示 ===
  ipcMain.handle(IPC_CHANNELS.SYSTEM.SHOW_NOTIFICATION, async (_, title: string, body: string): Promise<IPCResponse> => {
    try {
      showNotification(title, body);
      return { success: true, data: true };
    } catch (error) {
      log.error('通知表示でエラー:', error);
      return { 
        success: false, 
        message: '通知表示に失敗しました',
        details: error 
      };
    }
  });
}

/**
 * アプリ制御関連IPCハンドラーの設定
 */
function setupAppHandlers(): void {
  const { app, BrowserWindow } = require('electron');
  
  // === アプリバージョン取得 ===
  ipcMain.handle(IPC_CHANNELS.APP.GET_VERSION, async (): Promise<IPCResponse> => {
    try {
      const version = app.getVersion();
      return { success: true, data: version };
    } catch (error) {
      log.error('バージョン取得でエラー:', error);
      return { 
        success: false, 
        message: 'バージョン取得に失敗しました',
        details: error 
      };
    }
  });

  // === ウィンドウ表示切り替え ===
  ipcMain.handle(IPC_CHANNELS.APP.TOGGLE_VISIBILITY, async (): Promise<IPCResponse> => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { 
          success: false, 
          message: 'メインウィンドウが見つかりません' 
        };
      }

      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }

      return { success: true, data: true };
    } catch (error) {
      log.error('ウィンドウ表示切り替えでエラー:', error);
      return { 
        success: false, 
        message: 'ウィンドウ表示切り替えに失敗しました',
        details: error 
      };
    }
  });

  // === アプリ終了 ===
  ipcMain.handle(IPC_CHANNELS.APP.QUIT, async (): Promise<IPCResponse> => {
    try {
      (app as any).isQuiting = true;
      app.quit();
      return { success: true, data: true };
    } catch (error) {
      log.error('アプリ終了でエラー:', error);
      return { 
        success: false, 
        message: 'アプリ終了に失敗しました',
        details: error 
      };
    }
  });
}

/**
 * プレースホルダーの置換処理
 * スニペット内の動的な値を実際の値に変換
 * @param content 置換対象のテキスト
 * @returns Promise<string> 置換後のテキスト
 */
async function replacePlaceholders(content: string): Promise<string> {
  const { os } = require('os');
  const now = new Date();
  
  // === 日時フォーマットの生成 ===
  // 何をする部分か：日本語形式での日時文字列を作成
  // なぜ必要か：ビジネス文書に適した形式でプレースホルダーを置換するため
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  
  const timeStr = now.toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });
  
  const datetimeStr = `${dateStr} ${timeStr}`;
  const currentClipboard = clipboard.readText();
  
  // === プレースホルダー置換マップ ===
  const replacements = {
    '{date}': dateStr,
    '{time}': timeStr,
    '{datetime}': datetimeStr,
    '{username}': os.userInfo().username,
    '{clipboard}': currentClipboard,
  };
  
  // === 置換実行 ===
  let result = content;
  Object.entries(replacements).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });
  
  return result;
}

/**
 * システム通知の表示
 * @param title 通知タイトル
 * @param body 通知本文
 */
function showNotification(title: string, body: string): void {
  try {
    // === 通知権限の確認 ===
    // 何をする部分か：OSの通知権限をチェック
    // なぜ必要か：権限がない場合は通知を表示せずエラーを防ぐため
    if (Notification.isSupported()) {
      new Notification({
        title,
        body,
        silent: false, // 音声通知を有効
        timeoutType: 'default', // OS標準のタイムアウト
      }).show();
    }
  } catch (error) {
    // 通知エラーは重要度が低いため、ログ出力のみ
    log.warn('通知表示でエラー:', error);
  }
}