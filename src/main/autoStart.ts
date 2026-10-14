import { app } from 'electron';
import log from 'electron-log';

// === OS起動時の自動起動（ログイン項目）管理 ===
// 何をする部分か：OSのログイン項目への登録・解除と、自動起動されたかどうかの判定を提供
// なぜ必要か：PC起動後の初回は Electron 本体（約165MB）の読み込みだけで1〜2秒かかり、
//           アプリ側の処理では短縮できない。ログイン時にトレイへ常駐させておけば、
//           使いたい時にショートカットやトレイから待たずにウィンドウを出せるため

/**
 * 自動起動時に付与するコマンドライン引数
 * 何をする部分か：「ウィンドウを出さずにトレイへ常駐する起動」であることの目印
 * なぜ必要か：手動で起動したときは従来どおりウィンドウを表示し、
 *           ログイン時の自動起動だけ画面を出さないよう区別するため
 */
export const HIDDEN_LAUNCH_ARG = '--hidden';

/**
 * ログイン項目の照会・登録に使うオプション
 * 何をする部分か：実行ファイルのパスと引数を固定する
 * なぜ必要か：Windows では登録時と同じ path/args で照会しないと、登録状態を正しく取得できないため
 */
function loginItemOptions(): { path: string; args: string[] } {
  return { path: process.execPath, args: [HIDDEN_LAUNCH_ARG] };
}

/**
 * 自動起動を設定できる環境か
 * 何をする部分か：インストール版（パッケージ済み）かつ Windows / macOS のときだけ true を返す
 * なぜ必要か：開発時（electron.exe を直接起動）に登録すると、ログイン時に中身のない
 *           Electron が起動してしまうため。また Linux は Electron のログイン項目APIに非対応のため
 */
export function isAutoStartSupported(): boolean {
  return app.isPackaged && (process.platform === 'win32' || process.platform === 'darwin');
}

/**
 * 現在OSに自動起動が登録されているか
 * 何をする部分か：DBの保存値ではなく、OS側の実際の登録状態を返す
 * なぜ必要か：タスクマネージャーのスタートアップ設定などでユーザーが外部から
 *           解除した場合でも、設定画面の表示を実態と一致させるため
 */
export function isAutoStartEnabled(): boolean {
  if (!isAutoStartSupported()) return false;
  return app.getLoginItemSettings(loginItemOptions()).openAtLogin;
}

/**
 * 自動起動の登録・解除
 * @param enabled true で登録、false で解除
 * @returns OSへの反映を行った場合は true（非対応環境では false）
 */
export function setAutoStart(enabled: boolean): boolean {
  if (!isAutoStartSupported()) {
    log.warn('この環境ではOS起動時の自動起動を設定できません（開発モードまたは非対応OS）');
    return false;
  }
  app.setLoginItemSettings({
    openAtLogin: enabled,
    openAsHidden: enabled, // macOS 用：ログイン時にウィンドウを出さずに起動する
    ...loginItemOptions(),
  });
  log.info(`OS起動時の自動起動を${enabled ? '有効' : '無効'}にしました`);
  return true;
}

/**
 * 今回の起動がトレイ常駐のための自動起動か
 * 何をする部分か：起動引数（Windows）または OS の隠し起動フラグ（macOS）で判定する
 * なぜ必要か：自動起動時はスプラッシュもメインウィンドウも表示せず、
 *           ログイン直後の画面にいきなりウィンドウが出るのを避けるため
 */
export function wasLaunchedHidden(): boolean {
  if (process.argv.includes(HIDDEN_LAUNCH_ARG)) return true;
  // macOS はログイン項目に引数を渡せないため、OS が隠し起動したかどうかで判定する
  return process.platform === 'darwin' && app.getLoginItemSettings().wasOpenedAsHidden;
}
