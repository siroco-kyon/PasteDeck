import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/types';
import type {
  IPCResponse,
  CreateSnippetInput,
  UpdateSnippetInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  SearchFilters,
} from '../shared/types';

// === プリロードスクリプト ===
// 何をする部分か：レンダラープロセスがメインプロセスと安全に通信するためのAPI公開
// なぜ必要か：contextIsolationを有効にした状態でIPCを利用するため

/**
 * Electron API の型定義
 * レンダラープロセスで使用するAPI群
 */
interface ElectronAPI {
  // === スニペット操作API ===
  snippet: {
    getAll(): Promise<IPCResponse>;
    getById(id: number): Promise<IPCResponse>;
    search(filters: SearchFilters): Promise<IPCResponse>;
    create(input: CreateSnippetInput): Promise<IPCResponse>;
    update(id: number, input: UpdateSnippetInput): Promise<IPCResponse>;
    delete(id: number): Promise<IPCResponse>;
    copyToClipboard(id: number): Promise<IPCResponse>;
    incrementUseCount(id: number): Promise<IPCResponse>;
    reorder(items: Array<{ id: number; sortOrder: number }>): Promise<IPCResponse>;
    duplicate(id: number): Promise<IPCResponse>; // 複製
  };

  // === データ管理API ===
  // 何をする部分か：全データのJSON形式でのエクスポートとインポートを提供
  // なぜ必要か：バックアップ・データ移行・復元機能のため
  data: {
    export(): Promise<IPCResponse>;
    import(): Promise<IPCResponse>;
  };

  // === カテゴリ操作API ===
  category: {
    getAll(): Promise<IPCResponse>;
    getById(id: number): Promise<IPCResponse>;
    create(input: CreateCategoryInput): Promise<IPCResponse>;
    update(id: number, input: UpdateCategoryInput): Promise<IPCResponse>;
    delete(id: number): Promise<IPCResponse>;
    reorder(items: Array<{ id: number; sortOrder: number }>): Promise<IPCResponse>;
  };

  // === 設定操作API ===
  // 何をする部分か：アプリ設定の取得・保存・リセットを提供
  // なぜ必要か：テーマや通知設定などのユーザー設定を永続化するため
  settings: {
    get(): Promise<IPCResponse>;
    set(key: string, value: unknown): Promise<IPCResponse>;
    reset(): Promise<IPCResponse>;
  };

  // === システム操作API ===
  system: {
    getClipboard(): Promise<IPCResponse>;
    setClipboard(text: string): Promise<IPCResponse>;
    showNotification(title: string, body: string): Promise<IPCResponse>;
  };

  // === アプリ制御API ===
  app: {
    getVersion(): Promise<IPCResponse>;
    toggleVisibility(): Promise<IPCResponse>;
    quit(): Promise<IPCResponse>;
    setAlwaysOnTop(enabled: boolean): Promise<IPCResponse>;
    setCompactMode(enabled: boolean): Promise<IPCResponse>;
  };

  // === ショートカット制御API ===
  shortcuts: {
    setEnabled(type: 'toggle' | 'search', enabled: boolean): Promise<IPCResponse>;
    getStatus(): Promise<IPCResponse>;
  };

  // === イベントリスナー ===
  on: {
    quickSearch(callback: () => void): void;
    navigateToSettings(callback: () => void): void;
    splashProgress(callback: (event: unknown, data: { percent: number; label: string }) => void): void;
  };

  // === イベントリスナー解除 ===
  off: {
    quickSearch(): void;
    navigateToSettings(): void;
    splashProgress(): void;
  };
}

// === Context Bridge による API 公開 ===
// 何をする部分か：レンダラープロセス側でwindow.electronAPIとしてアクセス可能にする
// なぜ必要か：セキュアなIPCチャンネルを通じてメインプロセスの機能を利用するため

try {
  const electronAPI: ElectronAPI = {
    // === スニペット操作の公開 ===
    snippet: {
      async getAll() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.GET_ALL);
      },
      async getById(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.GET_BY_ID, id);
      },
      async search(filters) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.SEARCH, filters);
      },
      async create(input) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.CREATE, input);
      },
      async update(id, input) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.UPDATE, id, input);
      },
      async delete(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.DELETE, id);
      },
      async copyToClipboard(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.COPY_TO_CLIPBOARD, id);
      },
      async incrementUseCount(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.INCREMENT_USE_COUNT, id);
      },
      async reorder(items) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.REORDER, items);
      },
      async duplicate(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.DUPLICATE, id);
      },
    },

    // === カテゴリ操作の公開 ===
    category: {
      async getAll() {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.GET_ALL);
      },
      async getById(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.GET_BY_ID, id);
      },
      async create(input) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.CREATE, input);
      },
      async update(id, input) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.UPDATE, id, input);
      },
      async delete(id) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.DELETE, id);
      },
      async reorder(items) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.REORDER, items);
      },
    },

    // === データ管理の公開 ===
    // 何をする部分か：インポート/エクスポート機能をレンダラー側に提供
    // なぜ必要か：UIからデータバックアップ操作を可能にするため
    data: {
      async export() {
        return await ipcRenderer.invoke(IPC_CHANNELS.DATA.EXPORT);
      },
      async import() {
        return await ipcRenderer.invoke(IPC_CHANNELS.DATA.IMPORT);
      },
    },

    // === 設定操作の公開 ===
    // 何をする部分か：設定のCRUD操作をレンダラー側に提供
    // なぜ必要か：ユーザー設定の永続化をUIから操作できるようにするため
    settings: {
      async get() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.GET);
      },
      async set(key, value) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.SET, key, value);
      },
      async reset() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SETTINGS.RESET);
      },
    },

    // === システム操作の公開 ===
    system: {
      async getClipboard() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.GET_CLIPBOARD);
      },
      async setClipboard(text) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.SET_CLIPBOARD, text);
      },
      async showNotification(title, body) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.SHOW_NOTIFICATION, title, body);
      },
    },

    // === アプリケーション制御の公開 ===
    app: {
      async getVersion() {
        return await ipcRenderer.invoke(IPC_CHANNELS.APP.GET_VERSION);
      },
      async toggleVisibility() {
        return await ipcRenderer.invoke(IPC_CHANNELS.APP.TOGGLE_VISIBILITY);
      },
      async quit() {
        return await ipcRenderer.invoke(IPC_CHANNELS.APP.QUIT);
      },
      async setAlwaysOnTop(enabled) {
        return await ipcRenderer.invoke(IPC_CHANNELS.APP.SET_ALWAYS_ON_TOP, enabled);
      },
      async setCompactMode(enabled) {
        return await ipcRenderer.invoke(IPC_CHANNELS.APP.SET_COMPACT_MODE, enabled);
      },
    },

    // === ショートカット制御の公開 ===
    // 何をする部分か：ショートカットの有効/無効をレンダラーから制御できるようにする
    // なぜ必要か：設定画面からショートカットをON/OFFするため
    shortcuts: {
      async setEnabled(type, enabled) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SHORTCUTS.SET_ENABLED, type, enabled);
      },
      async getStatus() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SHORTCUTS.GET_STATUS);
      },
    },

    // === イベントリスナーの公開 ===
    // 何をする部分か：メインプロセスからレンダラーへのメッセージ受信機能
    // なぜ必要か：ショートカット等の外部トリガーに対応するため
    on: {
      quickSearch(callback) {
        ipcRenderer.on('shortcut:quick-search', callback);
      },
      navigateToSettings(callback) {
        ipcRenderer.on('navigate-to-settings', callback);
      },
      splashProgress(callback) {
        ipcRenderer.on(IPC_CHANNELS.SPLASH.PROGRESS, callback);
      },
    },

    // === イベントリスナー解除 ===
    // 何をする部分か：コンポーネントアンマウント時のメモリリーク防止
    // なぜ必要か：不要になったリスナーを適切に削除するため
    off: {
      quickSearch() {
        ipcRenderer.removeAllListeners('shortcut:quick-search');
      },
      navigateToSettings() {
        ipcRenderer.removeAllListeners('navigate-to-settings');
      },
      splashProgress() {
        ipcRenderer.removeAllListeners(IPC_CHANNELS.SPLASH.PROGRESS);
      },
    },
  };

  contextBridge.exposeInMainWorld('electronAPI', electronAPI);
  console.log('プリロードスクリプトが正常に初期化されました');

} catch (error) {
  console.error('プリロードスクリプト初期化でエラーが発生:', error);
}

export type { ElectronAPI };
