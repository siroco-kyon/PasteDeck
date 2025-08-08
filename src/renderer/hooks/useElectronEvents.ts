import { useEffect } from 'react';

// === Electronイベント管理フック ===
// 何をする部分か：メインプロセスからのイベントを受信してReactコンポーネントに伝達
// なぜ必要か：ショートカットキーやシステムトレイからの操作に対応するため

interface UseElectronEventsOptions {
  onQuickSearch?: () => void;
  onNavigateToSettings?: () => void;
}

/**
 * Electronイベント監視カスタムフック
 * @param options イベントハンドラーのオプション
 */
export function useElectronEvents(options: UseElectronEventsOptions): void {
  const { onQuickSearch, onNavigateToSettings } = options;

  useEffect(() => {
    // === Electron API の存在確認 ===
    // 何をする部分か：プリロードスクリプトが正常に読み込まれているかチェック
    // なぜ必要か：開発環境やビルドエラーでAPIが利用できない場合の対処のため
    if (!window.electronAPI) {
      console.warn('Electron APIが利用できません。プリロードスクリプトを確認してください。');
      return;
    }

    // === クイック検索イベントの登録 ===
    // 何をする部分か：Ctrl+Shift+Q ショートカットの受信処理
    // なぜ必要か：グローバルショートカットからの検索開始を実現するため
    if (onQuickSearch) {
      window.electronAPI.on.quickSearch(onQuickSearch);
      console.log('クイック検索イベントリスナーを登録しました');
    }

    // === 設定画面遷移イベントの登録 ===
    // 何をする部分か：システムトレイの設定メニュー選択の受信処理
    // なぜ必要か：トレイからの設定画面アクセスを実現するため
    if (onNavigateToSettings) {
      window.electronAPI.on.navigateToSettings(onNavigateToSettings);
      console.log('設定画面遷移イベントリスナーを登録しました');
    }

    // === クリーンアップ関数 ===
    // 何をする部分か：コンポーネント削除時にイベントリスナーを解除
    // なぜ必要か：メモリリークと重複リスナーを防ぐため
    return () => {
      if (window.electronAPI) {
        if (onQuickSearch) {
          window.electronAPI.off.quickSearch();
          console.log('クイック検索イベントリスナーを解除しました');
        }

        if (onNavigateToSettings) {
          window.electronAPI.off.navigateToSettings();
          console.log('設定画面遷移イベントリスナーを解除しました');
        }
      }
    };
  }, [onQuickSearch, onNavigateToSettings]);
}