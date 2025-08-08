import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// === Vite設定ファイル ===
// 何をする部分か：React アプリケーションのビルド・開発環境を設定
// なぜ必要か：Electronレンダラープロセス用のReactアプリをバンドルするため

/**
 * Vite設定
 * Electronのレンダラープロセス（React）用の設定
 */
export default defineConfig({
  // === プラグイン設定 ===
  // 何をする部分か：Reactの高速リフレッシュとJSX変換を有効化
  // なぜ必要か：開発時の生産性向上とReactコンポーネントの処理のため
  plugins: [react()],

  // === 開発サーバー設定 ===
  // 何をする部分か：開発時のローカルサーバー動作を定義
  // なぜ必要か：Electronからアクセス可能なURLでReactアプリを提供するため
  server: {
    port: 3000,
    host: true,
  },

  // === パス解決設定 ===
  // 何をする部分か：import文でのパスエイリアスを定義
  // なぜ必要か：相対パスの煩雑さを解消し、コードの可読性を向上させるため
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/shared': resolve(__dirname, 'src/shared'),
      '@/renderer': resolve(__dirname, 'src/renderer'),
    },
  },

  // === ビルド設定 ===
  // 何をする部分か：プロダクションビルドの出力先と最適化を設定
  // なぜ必要か：Electronが読み込める形式でReactアプリを出力するため
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
    // === Electron用最適化 ===
    // 何をする部分か：Electronレンダラープロセス向けの設定
    // なぜ必要か：Node.js統合とCSPを考慮した安全なビルドのため
    rollupOptions: {
      external: ['electron'],
    },
  },

  // === 公開URL設定 ===
  // 何をする部分か：本番環境でのベースURLを設定
  // なぜ必要か：Electronアプリ内でのリソース読み込みを正常化するため
  base: './',
})