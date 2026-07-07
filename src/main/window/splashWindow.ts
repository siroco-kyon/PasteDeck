import { BrowserWindow } from 'electron';
import { join } from 'path';
import { IPC_CHANNELS } from '../../shared/types';

// === スプラッシュ画面管理 ===
// 何をする部分か：起動処理の完了までの間、進捗％を表示する小さなウィンドウを提供
// なぜ必要か：DB初期化やウィンドウ読み込みなど起動処理には時間がかかることがあり、
//           何も表示されない状態が続くと「重い・固まっている」と誤解されるため

/**
 * スプラッシュ画面用の簡易HTML
 * 何をする部分か：ロゴ・プログレスバー・パーセント表示のみを持つ静的ページ
 * なぜ必要か：外部ファイルやネットワークに依存せず即座に表示するため
 *           （data: URLとして読み込むので追加のビルド設定が不要）
 */
const SPLASH_HTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8" />
<style>
  html, body {
    margin: 0; padding: 0; height: 100%;
    background: #1e1e2e;
    color: #ffffff;
    font-family: 'Segoe UI', 'Helvetica', 'Arial', sans-serif;
    -webkit-user-select: none;
    user-select: none;
  }
  .container {
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
  }
  .logo {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  .bar-track {
    width: 220px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.15);
    overflow: hidden;
  }
  .bar-fill {
    height: 100%;
    width: 0%;
    border-radius: 3px;
    background: #2196f3;
    transition: width 0.2s ease-out;
  }
  .percent {
    font-size: 13px;
    color: rgba(255,255,255,0.7);
  }
  .label {
    font-size: 12px;
    color: rgba(255,255,255,0.5);
    height: 16px;
  }
</style>
</head>
<body>
  <div class="container">
    <div class="logo">PasteDeck</div>
    <div class="bar-track"><div class="bar-fill" id="bar"></div></div>
    <div class="percent" id="percent">0%</div>
    <div class="label" id="label"></div>
  </div>
  <script>
    // === 進捗イベントの受信 ===
    // 何をする部分か：メインプロセスから送られる splash:progress イベントでバー・％・文言を更新
    // なぜ必要か：起動処理の各段階をユーザーに視覚的に伝えるため
    window.electronAPI.on.splashProgress(function (_event, data) {
      document.getElementById('bar').style.width = data.percent + '%';
      document.getElementById('percent').textContent = data.percent + '%';
      document.getElementById('label').textContent = data.label || '';
    });
  </script>
</body>
</html>`;

/**
 * スプラッシュウィンドウごとの進捗送信状態
 * 何をする部分か：ページ側の splashProgress リスナー登録が完了する前に送られたメッセージを溜めておく
 * なぜ必要か：data: URLの読み込み（loadURLはawaitしていない）が完了する前に
 *           sendSplashProgress が呼ばれると、リスナー未登録でメッセージが失われるため
 */
const splashReadyState = new WeakMap<BrowserWindow, { ready: boolean; queue: Array<{ percent: number; label: string }> }>();

/**
 * スプラッシュウィンドウの作成
 * 何をする部分か：枠なし・最前面固定の小さなウィンドウを即座に生成して表示
 * なぜ必要か：起動処理と並行して即座にユーザーへフィードバックを返すため
 * @returns BrowserWindow 作成したスプラッシュウィンドウ
 */
export function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 320,
    height: 220,
    frame: false,
    resizable: false,
    movable: true,
    show: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#1e1e2e',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // 既存のプリロードを再利用（splashProgressイベントの受信に使用）
      // dist/main/window/splashWindow.js から見て dist/preload/preload.js までは
      // 2階層上がる必要がある点に注意（main.tsは1階層で済むため混同しやすい）
      preload: join(__dirname, '../../preload/preload.js'),
    },
  });

  // === メインウィンドウ判定用のマーキング ===
  // 何をする部分か：起動中に一時的に共存するスプラッシュウィンドウを識別できるようにする
  // なぜ必要か：IPCハンドラー側で BrowserWindow.getAllWindows() からメインウィンドウを
  //           取得する際、誤ってスプラッシュを掴んでしまわないようにするため
  (splash as unknown as { isSplash: boolean }).isSplash = true;

  splashReadyState.set(splash, { ready: false, queue: [] });
  splash.webContents.once('did-finish-load', () => {
    const state = splashReadyState.get(splash);
    if (!state) return;
    state.ready = true;
    state.queue.forEach(msg => splash.webContents.send(IPC_CHANNELS.SPLASH.PROGRESS, msg));
    state.queue = [];
  });

  splash.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(SPLASH_HTML)}`);
  splash.center();

  return splash;
}

/**
 * スプラッシュ画面への進捗通知
 * 何をする部分か：ページ側の準備が整うまではメッセージをキューに溜め、準備完了後にまとめて送信する
 * なぜ必要か：起動直後の最初の進捗（0%〜）がリスナー未登録で消えてしまうのを防ぐため
 * @param splash スプラッシュウィンドウ
 * @param percent 進捗率（0〜100）
 * @param label 現在の処理内容を表す短い文言
 */
export function sendSplashProgress(splash: BrowserWindow | null, percent: number, label: string): void {
  if (!splash || splash.isDestroyed()) return;
  const state = splashReadyState.get(splash);
  if (state && !state.ready) {
    state.queue.push({ percent, label });
    return;
  }
  splash.webContents.send(IPC_CHANNELS.SPLASH.PROGRESS, { percent, label });
}
