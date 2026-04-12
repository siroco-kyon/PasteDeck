// === プリロードビルドスクリプト ===
// 何をする部分か：プリロードスクリプトを esbuild でバンドルして単一ファイルに出力
// なぜ必要か：Electron のサンドボックス環境では相対 require が制限されるため、
//             全依存（shared/types 等）を1ファイルにまとめる必要がある

const esbuild = require('esbuild');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

esbuild.build({
  entryPoints: [path.join(rootDir, 'src/preload/preload.ts')],
  bundle: true,
  // === プラットフォーム設定 ===
  // 何をする部分か：Electron サンドボックス向けの出力形式を選択
  // なぜ必要か：sandbox モードでは module/exports グローバルが存在せず、
  //             CJS 形式の module.exports が ReferenceError になるため
  platform: 'browser',
  target: 'chrome108',  // Electron 27 が使用する Chromium バージョン
  // electron モジュールはバンドルに含めず、実行時に Electron が提供するものを使う
  external: ['electron'],
  outfile: path.join(rootDir, 'dist/preload/preload.js'),
  // IIFE 形式：module/exports に依存しない即時実行関数ラッパー
  format: 'iife',
  sourcemap: true,
  logLevel: 'info',
}).then(() => {
  console.log('プリロードスクリプトのビルドが完了しました');
}).catch((error) => {
  console.error('プリロードスクリプトのビルドに失敗しました:', error);
  process.exit(1);
});
