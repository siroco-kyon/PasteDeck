import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// TypeScript global definitions are automatically loaded
// import './types/global.d'; // Not needed for .d.ts files

// === React アプリケーションエントリーポイント ===
// 何をする部分か：Reactアプリケーションをブラウザに描画する初期化処理
// なぜ必要か：Electron レンダラープロセスでReactを起動するため

console.log('レンダラープロセスを開始しています...');

// === DOM要素の取得 ===
// 何をする部分か：HTMLの#rootエレメントを取得してReactのマウント先に指定
// なぜ必要か：ReactアプリケーションをDOMにアタッチするため
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root要素が見つかりません。index.htmlを確認してください。');
}

// === React 18の新しいAPIを使用 ===
// 何をする部分か：createRootを使ってReactアプリケーションを初期化
// なぜ必要か：React 18の並行機能とパフォーマンス最適化を活用するため
const root = ReactDOM.createRoot(rootElement);

// === アプリケーションのレンダリング ===
// 何をする部分か：メインのAppコンポーネントを描画
// なぜ必要か：ユーザーインターフェースを表示するため
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// === 開発時の追加ログ ===
// 何をする部分か：開発環境でのデバッグ情報出力
// なぜ必要か：開発時の問題特定を支援するため
if (process.env.NODE_ENV === 'development') {
  console.log('開発モードで動作中');
  console.log('Electron API:', window.electronAPI ? '利用可能' : '利用不可');
}

console.log('レンダラープロセスの初期化が完了しました');