"use strict";
// === 共通型定義ファイル ===
// 何をする部分か：アプリケーション全体で使用する型定義を一元管理
// なぜ必要か：メインプロセスとレンダラープロセス間での型の一貫性を保つため
Object.defineProperty(exports, "__esModule", { value: true });
exports.IPC_CHANNELS = void 0;
/**
 * IPC通信で使用するチャンネル名の定義
 * メインプロセスとレンダラープロセス間の通信チャンネル
 */
exports.IPC_CHANNELS = {
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
    // === アプリケーション制御 ===
    APP: {
        SHOW: 'app:show',
        HIDE: 'app:hide',
        QUIT: 'app:quit',
        GET_VERSION: 'app:get-version',
        TOGGLE_VISIBILITY: 'app:toggle-visibility',
    },
    // === システム関連 ===
    SYSTEM: {
        GET_CLIPBOARD: 'system:get-clipboard',
        SET_CLIPBOARD: 'system:set-clipboard',
        SHOW_NOTIFICATION: 'system:show-notification',
    },
};
//# sourceMappingURL=types.js.map