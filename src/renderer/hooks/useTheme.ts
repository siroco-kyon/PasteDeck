import { useState, useEffect } from 'react';

// === テーマ管理フック ===
// 何をする部分か：ダークモード/ライトモードの切り替えと保存を管理
// なぜ必要か：ユーザー設定の永続化とシステム設定との連携のため

interface UseThemeReturn {
  theme: 'light' | 'dark' | 'auto';
  darkMode: boolean;
  toggleDarkMode: () => void;
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
}

/**
 * テーマ管理カスタムフック
 * @returns UseThemeReturn テーマ制御に必要な状態と関数群
 */
export function useTheme(): UseThemeReturn {
  // === 状態管理 ===
  // 何をする部分か：現在のテーマ設定と実際の表示モードを管理
  // なぜ必要か：ユーザー設定とシステム連携の両方に対応するため
  const [theme, setThemeState] = useState<'light' | 'dark' | 'auto'>('auto');
  const [darkMode, setDarkMode] = useState<boolean>(false);

  // === システムテーマ検出 ===
  // 何をする部分か：OSのダークモード設定を取得
  // なぜ必要か：'auto'設定時にシステム設定に従うため
  const getSystemDarkMode = (): boolean => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  };

  // === 実際の表示モード計算 ===
  // 何をする部分か：テーマ設定値から実際のdarkMode状態を決定
  // なぜ必要か：'auto'設定時の動的な表示モード切り替えのため
  const calculateDarkMode = (themeValue: 'light' | 'dark' | 'auto'): boolean => {
    switch (themeValue) {
      case 'light':
        return false;
      case 'dark':
        return true;
      case 'auto':
        return getSystemDarkMode();
      default:
        return false;
    }
  };

  // === ローカルストレージからの設定読み込み ===
  // 何をする部分か：前回の設定を復元
  // なぜ必要か：アプリ再起動時にユーザー設定を維持するため
  const loadThemeFromStorage = (): 'light' | 'dark' | 'auto' => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('clipboard-manager-theme');
        if (stored && ['light', 'dark', 'auto'].includes(stored)) {
          return stored as 'light' | 'dark' | 'auto';
        }
      }
    } catch (error) {
      console.warn('テーマ設定の読み込みに失敗:', error);
    }
    return 'auto'; // デフォルト値
  };

  // === ローカルストレージへの設定保存 ===
  // 何をする部分か：現在の設定をブラウザストレージに保存
  // なぜ必要か：設定の永続化のため
  const saveThemeToStorage = (themeValue: 'light' | 'dark' | 'auto'): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('clipboard-manager-theme', themeValue);
      }
    } catch (error) {
      console.warn('テーマ設定の保存に失敗:', error);
    }
  };

  // === テーマ設定更新処理 ===
  // 何をする部分か：新しいテーマ値の設定と保存を実行
  // なぜ必要か：UI操作からのテーマ変更を処理するため
  const setTheme = (newTheme: 'light' | 'dark' | 'auto'): void => {
    setThemeState(newTheme);
    setDarkMode(calculateDarkMode(newTheme));
    saveThemeToStorage(newTheme);
    
    console.log(`テーマを変更しました: ${newTheme} (ダークモード: ${calculateDarkMode(newTheme)})`);
  };

  // === ダークモード切り替え処理 ===
  // 何をする部分か：現在のモードを反転させる簡易操作
  // なぜ必要か：ワンクリックでの切り替えUIのため
  const toggleDarkMode = (): void => {
    const currentDarkMode = calculateDarkMode(theme);
    const newTheme = currentDarkMode ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // === システムテーマ変更の監視 ===
  // 何をする部分か：OS設定変更時の自動追従処理
  // なぜ必要か：'auto'設定時にシステム変更に即座に対応するため
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // === システム設定変更ハンドラー ===
    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      if (theme === 'auto') {
        setDarkMode(event.matches);
        console.log(`システムテーマが変更されました: ${event.matches ? 'ダーク' : 'ライト'}`);
      }
    };

    // イベントリスナーの登録
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemThemeChange);
    } else {
      // 古いブラウザ対応
      mediaQuery.addListener(handleSystemThemeChange);
    }

    // === クリーンアップ関数 ===
    // 何をする部分か：コンポーネント削除時にリスナーを解除
    // なぜ必要か：メモリリークを防ぐため
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemThemeChange);
      } else {
        mediaQuery.removeListener(handleSystemThemeChange);
      }
    };
  }, [theme]);

  // === 初期化処理 ===
  // 何をする部分か：コンポーネント最初の表示時に保存された設定を適用
  // なぜ必要か：アプリ起動時の設定復元のため
  useEffect(() => {
    const savedTheme = loadThemeFromStorage();
    setThemeState(savedTheme);
    setDarkMode(calculateDarkMode(savedTheme));
    
    console.log(`初期テーマ設定: ${savedTheme} (ダークモード: ${calculateDarkMode(savedTheme)})`);
  }, []);

  return {
    theme,
    darkMode,
    toggleDarkMode,
    setTheme,
  };
}