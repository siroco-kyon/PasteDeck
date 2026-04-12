import { ipcMain, clipboard, Notification } from 'electron';
import log from 'electron-log';
import { CategoryOperations, SnippetOperations } from '../db/operations';
import { JsonCategoryOperations, JsonSnippetOperations } from '../db/jsonStorage';
import { getDatabase } from '../db/schema';
import { IPC_CHANNELS } from '../../shared/types';
import type {
  IPCResponse,
  CreateSnippetInput,
  UpdateSnippetInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  SearchFilters,
} from '../../shared/types';

// === IPC ハンドラー設定 ===
// 何をする部分か：レンダラープロセスからの要求を処理するハンドラーを登録
// なぜ必要か：UIからデータベース操作やシステム機能へのアクセスを提供するため

// === デフォルト設定値 ===
// 何をする部分か：設定が保存されていない場合に使用するデフォルト値を定義
// なぜ必要か：初回起動時や設定リセット時に安全なデフォルトを提供するため
const DEFAULT_SETTINGS = {
  globalShortcut: 'Ctrl+Shift+V',
  quickSearchShortcut: 'Ctrl+Shift+Q',
  theme: 'auto' as const,
  autoStart: false,
  minimizeToTray: true,
  showNotifications: true,
  maxRecentItems: 10,
};

/**
 * 全IPCハンドラーのセットアップ
 * アプリ起動時に一度だけ呼び出される初期化処理
 */
export function setupIpcHandlers(): void {
  try {
    log.info('IPCハンドラーを設定中...');

    setupSnippetHandlers();
    setupCategoryHandlers();
    setupSystemHandlers();
    setupAppHandlers();
    setupSettingsHandlers();
    setupDataHandlers();

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
  ipcMain.handle(IPC_CHANNELS.SNIPPET.GET_ALL, async (): Promise<IPCResponse> => {
    try {
      let snippets;
      try {
        snippets = await SnippetOperations.getAll();
      } catch (sqliteError) {
        log.warn('SQLite使用不可、JSONストレージを使用します');
        snippets = await JsonSnippetOperations.getAll();
      }
      return { success: true, data: snippets };
    } catch (error) {
      log.error('スニペット一覧取得でエラー:', error);
      return { success: false, message: 'スニペット一覧の取得に失敗しました', details: error };
    }
  });

  // === ID指定スニペット取得 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.GET_BY_ID, async (_, id: number): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.getById(id);
      return { success: true, data: snippet };
    } catch (error) {
      log.error(`スニペット取得でエラー (ID: ${id}):`, error);
      return { success: false, message: `スニペット取得に失敗しました (ID: ${id})`, details: error };
    }
  });

  // === スニペット検索 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.SEARCH, async (_, filters: SearchFilters): Promise<IPCResponse> => {
    try {
      const results = await SnippetOperations.search(filters);
      return { success: true, data: results };
    } catch (error) {
      log.error('スニペット検索でエラー:', error);
      return { success: false, message: 'スニペット検索に失敗しました', details: error };
    }
  });

  // === スニペット新規作成 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.CREATE, async (_, input: CreateSnippetInput): Promise<IPCResponse> => {
    try {
      if (!input.title?.trim()) {
        return { success: false, message: 'タイトルは必須です', code: 'VALIDATION_ERROR' };
      }
      if (!input.content?.trim()) {
        return { success: false, message: 'コンテンツは必須です', code: 'VALIDATION_ERROR' };
      }

      const snippet = await SnippetOperations.create(input);
      showNotification('スニペット作成', `"${snippet.title}" を作成しました`);
      return { success: true, data: snippet };
    } catch (error) {
      log.error('スニペット作成でエラー:', error);
      return { success: false, message: 'スニペット作成に失敗しました', details: error };
    }
  });

  // === スニペット更新 ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.UPDATE, async (_, id: number, input: UpdateSnippetInput): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.update(id, input);
      return { success: true, data: snippet };
    } catch (error) {
      log.error(`スニペット更新でエラー (ID: ${id}):`, error);
      return { success: false, message: 'スニペット更新に失敗しました', details: error };
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
      return { success: false, message: 'スニペット削除に失敗しました', details: error };
    }
  });

  // === クリップボードコピー ===
  // 何をする部分か：スニペット内容をプレースホルダー処理してクリップボードにコピー
  // なぜ必要か：動的な値（日時、ユーザー名等）を含むスニペットを活用するため
  ipcMain.handle(IPC_CHANNELS.SNIPPET.COPY_TO_CLIPBOARD, async (_, id: number): Promise<IPCResponse> => {
    try {
      const snippet = await SnippetOperations.getById(id);
      if (!snippet) {
        return { success: false, message: 'スニペットが見つかりません', code: 'NOT_FOUND' };
      }

      const processedContent = await replacePlaceholders(snippet.content);
      clipboard.writeText(processedContent);
      await SnippetOperations.incrementUseCount(id);
      showNotification('コピー完了', `"${snippet.title}" をコピーしました`);

      return { success: true, data: { content: processedContent } };
    } catch (error) {
      log.error(`クリップボードコピーでエラー (ID: ${id}):`, error);
      return { success: false, message: 'クリップボードコピーに失敗しました', details: error };
    }
  });

  // === 使用回数インクリメント ===
  ipcMain.handle(IPC_CHANNELS.SNIPPET.INCREMENT_USE_COUNT, async (_, id: number): Promise<IPCResponse> => {
    try {
      await SnippetOperations.incrementUseCount(id);
      return { success: true, data: true };
    } catch (error) {
      log.error(`使用回数更新でエラー (ID: ${id}):`, error);
      return { success: false, message: '使用回数更新に失敗しました', details: error };
    }
  });

  // === スニペット複製 ===
  // 何をする部分か：既存スニペットのコピーをタイトルに "(コピー)" を付けて作成
  // なぜ必要か：似たスニペットを新規作成する手間を省くため
  ipcMain.handle(IPC_CHANNELS.SNIPPET.DUPLICATE, async (_, id: number): Promise<IPCResponse> => {
    try {
      const original = await SnippetOperations.getById(id);
      if (!original) {
        return { success: false, message: 'スニペットが見つかりません', code: 'NOT_FOUND' };
      }

      const duplicated = await SnippetOperations.create({
        categoryId: original.categoryId,
        title: `${original.title} (コピー)`,
        content: original.content,
        contentType: original.contentType,
        thumbnail: original.thumbnail,
        tags: [...original.tags],
        isFavorite: false,
      });

      return { success: true, data: duplicated };
    } catch (error) {
      log.error(`スニペット複製でエラー (ID: ${id}):`, error);
      return { success: false, message: 'スニペット複製に失敗しました', details: error };
    }
  });

  // === スニペット並び替え ===
  // 何をする部分か：DnD操作後の新しい順序をDBに一括保存
  // なぜ必要か：ドラッグ&ドロップで変更した順序を永続化するため
  ipcMain.handle(
    IPC_CHANNELS.SNIPPET.REORDER,
    async (_, items: Array<{ id: number; sortOrder: number }>): Promise<IPCResponse> => {
      try {
        const db = getDatabase();
        const updateStmt = db.prepare('UPDATE snippets SET sort_order = ? WHERE id = ?');

        // === トランザクションで一括更新 ===
        // 何をする部分か：全スニペットのsort_orderを原子的に更新
        // なぜ必要か：部分的な更新によるデータ不整合を防ぐため
        const updateAll = db.transaction((rows: typeof items) => {
          rows.forEach(item => updateStmt.run(item.sortOrder, item.id));
        });
        updateAll(items);

        return { success: true, data: true };
      } catch (error) {
        log.error('スニペット並び替えでエラー:', error);
        return { success: false, message: 'スニペット並び替えに失敗しました', details: error };
      }
    }
  );
}

/**
 * カテゴリ関連IPCハンドラーの設定
 */
function setupCategoryHandlers(): void {
  // === 全カテゴリ取得 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.GET_ALL, async (): Promise<IPCResponse> => {
    try {
      let categories;
      try {
        categories = await CategoryOperations.getAll();
      } catch (sqliteError) {
        log.warn('SQLite使用不可、JSONストレージを使用します');
        categories = await JsonCategoryOperations.getAll();
      }
      return { success: true, data: categories };
    } catch (error) {
      log.error('カテゴリ一覧取得でエラー:', error);
      return { success: false, message: 'カテゴリ一覧の取得に失敗しました', details: error };
    }
  });

  // === ID指定カテゴリ取得 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.GET_BY_ID, async (_, id: number): Promise<IPCResponse> => {
    try {
      const category = await CategoryOperations.getById(id);
      return { success: true, data: category };
    } catch (error) {
      log.error(`カテゴリ取得でエラー (ID: ${id}):`, error);
      return { success: false, message: `カテゴリ取得に失敗しました (ID: ${id})`, details: error };
    }
  });

  // === カテゴリ新規作成 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.CREATE, async (_, input: CreateCategoryInput): Promise<IPCResponse> => {
    try {
      if (!input.name?.trim()) {
        return { success: false, message: 'カテゴリ名は必須です', code: 'VALIDATION_ERROR' };
      }
      const category = await CategoryOperations.create(input);
      showNotification('カテゴリ作成', `"${category.name}" カテゴリを作成しました`);
      return { success: true, data: category };
    } catch (error) {
      log.error('カテゴリ作成でエラー:', error);
      return { success: false, message: 'カテゴリ作成に失敗しました', details: error };
    }
  });

  // === カテゴリ更新 ===
  ipcMain.handle(IPC_CHANNELS.CATEGORY.UPDATE, async (_, id: number, input: UpdateCategoryInput): Promise<IPCResponse> => {
    try {
      const category = await CategoryOperations.update(id, input);
      return { success: true, data: category };
    } catch (error) {
      log.error(`カテゴリ更新でエラー (ID: ${id}):`, error);
      return { success: false, message: 'カテゴリ更新に失敗しました', details: error };
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
      return { success: false, message: 'カテゴリ削除に失敗しました', details: error };
    }
  });

  // === カテゴリ並び替え ===
  // 何をする部分か：カテゴリタブの並び順をDBに一括保存
  // なぜ必要か：カテゴリの表示順を永続化するため
  ipcMain.handle(
    IPC_CHANNELS.CATEGORY.REORDER,
    async (_, items: Array<{ id: number; sortOrder: number }>): Promise<IPCResponse> => {
      try {
        const db = getDatabase();
        const updateStmt = db.prepare('UPDATE categories SET sort_order = ? WHERE id = ?');
        const updateAll = db.transaction((rows: typeof items) => {
          rows.forEach(item => updateStmt.run(item.sortOrder, item.id));
        });
        updateAll(items);
        return { success: true, data: true };
      } catch (error) {
        log.error('カテゴリ並び替えでエラー:', error);
        return { success: false, message: 'カテゴリ並び替えに失敗しました', details: error };
      }
    }
  );
}

/**
 * システム関連IPCハンドラーの設定
 */
function setupSystemHandlers(): void {
  // === クリップボード取得 ===
  ipcMain.handle(IPC_CHANNELS.SYSTEM.GET_CLIPBOARD, async (): Promise<IPCResponse> => {
    try {
      const text = clipboard.readText();
      return { success: true, data: text };
    } catch (error) {
      log.error('クリップボード取得でエラー:', error);
      return { success: false, message: 'クリップボード取得に失敗しました', details: error };
    }
  });

  // === クリップボード設定 ===
  ipcMain.handle(IPC_CHANNELS.SYSTEM.SET_CLIPBOARD, async (_, text: string): Promise<IPCResponse> => {
    try {
      clipboard.writeText(text);
      return { success: true, data: true };
    } catch (error) {
      log.error('クリップボード設定でエラー:', error);
      return { success: false, message: 'クリップボード設定に失敗しました', details: error };
    }
  });

  // === 通知表示 ===
  ipcMain.handle(IPC_CHANNELS.SYSTEM.SHOW_NOTIFICATION, async (_, title: string, body: string): Promise<IPCResponse> => {
    try {
      showNotification(title, body);
      return { success: true, data: true };
    } catch (error) {
      log.error('通知表示でエラー:', error);
      return { success: false, message: '通知表示に失敗しました', details: error };
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
      return { success: false, message: 'バージョン取得に失敗しました', details: error };
    }
  });

  // === ウィンドウ表示切り替え ===
  ipcMain.handle(IPC_CHANNELS.APP.TOGGLE_VISIBILITY, async (): Promise<IPCResponse> => {
    try {
      const mainWindow = BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0];
      if (!mainWindow) {
        return { success: false, message: 'メインウィンドウが見つかりません' };
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
      return { success: false, message: 'ウィンドウ表示切り替えに失敗しました', details: error };
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
      return { success: false, message: 'アプリ終了に失敗しました', details: error };
    }
  });
}

/**
 * 設定関連IPCハンドラーの設定
 * 何をする部分か：アプリ設定のCRUD操作を提供
 * なぜ必要か：テーマ・通知設定等のユーザー設定を永続化するため
 */
function setupSettingsHandlers(): void {
  // === 設定取得 ===
  // 何をする部分か：DB から全設定を取得し、未設定キーにはデフォルト値を適用
  // なぜ必要か：常に有効な設定値を返すため
  ipcMain.handle(IPC_CHANNELS.SETTINGS.GET, async (): Promise<IPCResponse> => {
    try {
      let db;
      try {
        db = getDatabase();
      } catch {
        // DB未初期化の場合はデフォルト設定を返す
        return { success: true, data: DEFAULT_SETTINGS };
      }

      const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{
        key: string;
        value: string;
      }>;

      const settings = { ...DEFAULT_SETTINGS } as Record<string, unknown>;
      rows.forEach(row => {
        try {
          settings[row.key] = JSON.parse(row.value);
        } catch {
          settings[row.key] = row.value;
        }
      });

      return { success: true, data: settings };
    } catch (error) {
      log.error('設定取得でエラー:', error);
      return { success: false, message: '設定取得に失敗しました', details: error };
    }
  });

  // === 設定保存 ===
  // 何をする部分か：キーと値のペアをDBにUPSERT（存在すれば更新、なければ挿入）
  // なぜ必要か：設定を永続化するため
  ipcMain.handle(IPC_CHANNELS.SETTINGS.SET, async (_, key: string, value: unknown): Promise<IPCResponse> => {
    try {
      const db = getDatabase();
      db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
        key,
        JSON.stringify(value)
      );
      log.info(`設定を保存しました: ${key}`);
      return { success: true, data: true };
    } catch (error) {
      log.error('設定保存でエラー:', error);
      return { success: false, message: '設定保存に失敗しました', details: error };
    }
  });

  // === 設定リセット ===
  // 何をする部分か：全設定を削除してデフォルト値を返す
  // なぜ必要か：設定をデフォルトに戻す機能を提供するため
  ipcMain.handle(IPC_CHANNELS.SETTINGS.RESET, async (): Promise<IPCResponse> => {
    try {
      const db = getDatabase();
      db.prepare('DELETE FROM settings').run();
      log.info('設定をリセットしました');
      return { success: true, data: DEFAULT_SETTINGS };
    } catch (error) {
      log.error('設定リセットでエラー:', error);
      return { success: false, message: '設定リセットに失敗しました', details: error };
    }
  });
}

/**
 * データ管理IPCハンドラーの設定
 * 何をする部分か：全データのJSONエクスポートとJSONインポート（マージ）を提供
 * なぜ必要か：データバックアップ・PC移行・復元手段を提供するため
 */
function setupDataHandlers(): void {
  const { app, dialog } = require('electron');
  const fs = require('fs');
  const nodePath = require('path');

  // === データエクスポート ===
  // 何をする部分か：全カテゴリとスニペットをJSONファイルに書き出す
  // なぜ必要か：バックアップとデータポータビリティのため
  ipcMain.handle(IPC_CHANNELS.DATA.EXPORT, async (): Promise<IPCResponse> => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const result = await dialog.showSaveDialog({
        defaultPath: nodePath.join(app.getPath('documents'), `pasteDeck-backup-${timestamp}.json`),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });

      if (result.canceled) {
        return { success: true, data: { canceled: true } };
      }

      const [categories, snippets] = await Promise.all([
        CategoryOperations.getAll(),
        SnippetOperations.getAll(),
      ]);

      const exportData = {
        version: '1.0',
        appName: 'PasteDeck',
        exportedAt: new Date().toISOString(),
        categories,
        snippets,
      };

      fs.writeFileSync(result.filePath!, JSON.stringify(exportData, null, 2), 'utf-8');
      log.info(`データをエクスポートしました: ${result.filePath} (カテゴリ${categories.length}件、スニペット${snippets.length}件)`);

      return { success: true, data: { filePath: result.filePath, categoriesCount: categories.length, snippetsCount: snippets.length } };
    } catch (error) {
      log.error('データエクスポートでエラー:', error);
      return { success: false, message: 'データエクスポートに失敗しました', details: error };
    }
  });

  // === データインポート ===
  // 何をする部分か：JSONファイルから既存データへマージ（同名カテゴリは既存を再利用）
  // なぜ必要か：バックアップからのデータ復元とデータ移行のため
  ipcMain.handle(IPC_CHANNELS.DATA.IMPORT, async (): Promise<IPCResponse> => {
    try {
      const openResult = await dialog.showOpenDialog({
        filters: [{ name: 'JSON', extensions: ['json'] }],
        properties: ['openFile'],
      });

      if (openResult.canceled) {
        return { success: true, data: { canceled: true } };
      }

      const content = fs.readFileSync(openResult.filePaths[0], 'utf-8');
      const importData = JSON.parse(content);

      if (!Array.isArray(importData.categories) || !Array.isArray(importData.snippets)) {
        return { success: false, message: 'インポートファイルの形式が無効です（PasteDecke形式のJSONのみ対応）', code: 'INVALID_FORMAT' };
      }

      // === カテゴリのマージ処理 ===
      // 何をする部分か：同名カテゴリは既存IDを使用、新規カテゴリは作成する
      // なぜ必要か：重複カテゴリを作らずにスニペットを正しく紐付けるため
      const existingCategories = await CategoryOperations.getAll();
      const categoryIdMap = new Map<number, number>(); // 旧ID → 新ID のマッピング

      for (const cat of importData.categories) {
        const existing = existingCategories.find(c => c.name === cat.name);
        if (existing) {
          categoryIdMap.set(cat.id, existing.id);
        } else {
          const created = await CategoryOperations.create({
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
          });
          categoryIdMap.set(cat.id, created.id);
        }
      }

      // === スニペットのインポート処理 ===
      // 何をする部分か：カテゴリIDをマッピング後に全スニペットを作成
      // なぜ必要か：インポートしたスニペットを正しいカテゴリに紐付けるため
      let importedCount = 0;
      for (const snippet of importData.snippets) {
        const newCategoryId = categoryIdMap.get(snippet.categoryId);
        if (!newCategoryId) continue;

        await SnippetOperations.create({
          categoryId: newCategoryId,
          title: snippet.title,
          content: snippet.content,
          contentType: snippet.contentType || 'text',
          thumbnail: snippet.thumbnail,
          tags: snippet.tags || [],
          isFavorite: snippet.isFavorite || false,
        });
        importedCount++;
      }

      log.info(`データをインポートしました: カテゴリ${importData.categories.length}件処理、スニペット${importedCount}件追加`);
      return {
        success: true,
        data: {
          categoriesCount: importData.categories.length,
          snippetsCount: importedCount,
        },
      };
    } catch (error) {
      log.error('データインポートでエラー:', error);
      return { success: false, message: 'データインポートに失敗しました', details: error };
    }
  });
}

/**
 * プレースホルダーの置換処理
 * スニペット内の動的な値を実際の値に変換
 */
async function replacePlaceholders(content: string): Promise<string> {
  const os = require('os');
  const now = new Date();

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

  const replacements: Record<string, string> = {
    '{date}': dateStr,
    '{time}': timeStr,
    '{datetime}': datetimeStr,
    '{username}': os.userInfo().username,
    '{clipboard}': currentClipboard,
  };

  let result = content;
  Object.entries(replacements).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g'), value);
  });

  return result;
}

/**
 * システム通知の表示
 */
function showNotification(title: string, body: string): void {
  try {
    if (Notification.isSupported()) {
      new Notification({ title, body, silent: false, timeoutType: 'default' }).show();
    }
  } catch (error) {
    log.warn('通知表示でエラー:', error);
  }
}
