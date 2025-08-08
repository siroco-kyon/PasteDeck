// === グローバル型定義 ===
// 何をする部分か：レンダラープロセス全体で使用する型定義を提供
// なぜ必要か：TypeScriptでのコンパイルエラーを防ぎ、型安全性を保つため

import type { ElectronAPI } from '../preload/preload';

/**
 * Window オブジェクトの拡張
 * プリロードスクリプトで公開されるElectron APIの型定義
 */
declare global {
  interface Window {
    // === Electron API の型定義 ===
    // 何をする部分か：window.electronAPI の型情報を提供
    // なぜ必要か：React コンポーネントで型安全にElectron機能を呼び出すため
    electronAPI: ElectronAPI;
  }
}

// === 型のエクスポート ===
// 何をする部分か：他のモジュールでこの型定義を利用可能にする
// なぜ必要か：コンポーネント間で一貫した型定義を共有するため
export {};