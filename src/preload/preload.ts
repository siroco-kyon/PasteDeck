import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '@/shared/types';
import type {
  IPCResponse,
  CreateSnippetInput,
  UpdateSnippetInput,
  CreateCategoryInput,
  UpdateCategoryInput,
  SearchFilters,
} from '@/shared/types';

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
  };

  // === カテゴリ操作API ===
  category: {
    getAll(): Promise<IPCResponse>;
    getById(id: number): Promise<IPCResponse>;
    create(input: CreateCategoryInput): Promise<IPCResponse>;
    update(id: number, input: UpdateCategoryInput): Promise<IPCResponse>;
    delete(id: number): Promise<IPCResponse>;
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
  };

  // === イベントリスナー ===
  on: {
    quickSearch(callback: () => void): void;
    navigateToSettings(callback: () => void): void;
  };

  // === イベントリスナー解除 ===
  off: {
    quickSearch(): void;
    navigateToSettings(): void;
  };
}

// === Context Bridge による API 公開 ===
// 何をする部分か：レンダラープロセス側でwindow.electronAPIとしてアクセス可能にする
// なぜ必要か：セキュアなIPCチャンネルを通じてメインプロセスの機能を利用するため

try {
  const electronAPI: ElectronAPI = {
    // === スニペット操作の公開 ===
    // 何をする部分か：スニペットのCRUD操作をレンダラー側に提供
    // なぜ必要か：UI層からデータベース操作を行えるようにするため
    snippet: {
      async getAll() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.GET_ALL);
      },

      async getById(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.GET_BY_ID, id);
      },

      async search(filters: SearchFilters) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.SEARCH, filters);
      },

      async create(input: CreateSnippetInput) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.CREATE, input);
      },

      async update(id: number, input: UpdateSnippetInput) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.UPDATE, id, input);
      },

      async delete(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.DELETE, id);
      },

      async copyToClipboard(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.COPY_TO_CLIPBOARD, id);
      },

      async incrementUseCount(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SNIPPET.INCREMENT_USE_COUNT, id);
      },
    },

    // === カテゴリ操作の公開 ===
    category: {
      async getAll() {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.GET_ALL);
      },

      async getById(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.GET_BY_ID, id);
      },

      async create(input: CreateCategoryInput) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.CREATE, input);
      },

      async update(id: number, input: UpdateCategoryInput) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.UPDATE, id, input);
      },

      async delete(id: number) {
        return await ipcRenderer.invoke(IPC_CHANNELS.CATEGORY.DELETE, id);
      },
    },

    // === システム操作の公開 ===
    // 何をする部分か：クリップボードや通知などのシステム機能にアクセス
    // なぜ必要か：ブラウザでは直接アクセスできないOS機能を利用するため
    system: {
      async getClipboard() {
        return await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.GET_CLIPBOARD);
      },

      async setClipboard(text: string) {
        return await ipcRenderer.invoke(IPC_CHANNELS.SYSTEM.SET_CLIPBOARD, text);
      },

      async showNotification(title: string, body: string) {
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
    },

    // === イベントリスナーの公開 ===
    // 何をする部分か：メインプロセスからレンダラーへのメッセージ受信機能
    // なぜ必要か：ショートカット等の外部トリガーに対応するため
    on: {
      quickSearch(callback: () => void) {
        // === グローバルショートカット受信 ===
        // 何をする部分か：Ctrl+Shift+Q 押下時の検索フォーカス処理
        // なぜ必要か：ショートカットでの検索モード起動を実現するため
        ipcRenderer.on('shortcut:quick-search', callback);
      },

      navigateToSettings(callback: () => void) {
        // === トレイメニューからの設定画面遷移 ===
        // 何をする部分か：システムトレイの設定メニュー選択時の処理
        // なぜ必要か：UI側で適切な画面遷移を行うため
        ipcRenderer.on('navigate-to-settings', callback);
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
    },
  };

  // === API の公開実行 ===
  // 何をする部分か：electronAPI オブジェクトをレンダラーのwindowオブジェクトに追加
  // なぜ必要か：React コンポーネントから window.electronAPI でアクセスできるようにするため
  contextBridge.exposeInMainWorld('electronAPI', electronAPI);

  console.log('プリロードスクリプトが正常に初期化されました');

} catch (error) {
  // === エラーハンドリング ===
  // 何をする部分か：プリロード初期化失敗時のエラー記録
  // なぜ必要か：API が利用できない原因を把握するため
  console.error('プリロードスクリプト初期化でエラーが発生:', error);
}

// === 型定義のエクスポート ===
// 何をする部分か：TypeScript での型チェックを可能にする
// なぜ必要か：レンダラー側でのコンパイルエラーを防ぐため
export type { ElectronAPI };