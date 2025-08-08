import React, { useEffect, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Snackbar } from '@mui/material';
import Header from './components/Header/Header';
import CategoryTabs from './components/Category/CategoryTabs';
import SnippetList from './components/Snippet/SnippetList';
import { useCategories } from './hooks/useCategories';
import { useSnippets } from './hooks/useSnippets';
import { useTheme } from './hooks/useTheme';
import { useElectronEvents } from './hooks/useElectronEvents';
import type { SearchFilters } from '@/shared/types';

// === メインアプリケーションコンポーネント ===
// 何をする部分か：アプリケーション全体のレイアウトと状態管理を統括
// なぜ必要か：UIの全体構成とデータフローの中心となるため

function App() {
  // === 状態管理 ===
  // 何をする部分か：アプリケーション全体で共有される状態を管理
  // なぜ必要か：コンポーネント間でのデータ共有とUI状態の同期のため
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  // === カスタムフックの利用 ===
  // 何をする部分か：データ取得とテーマ管理の機能を活用
  // なぜ必要か：複雑なロジックをコンポーネントから分離し、再利用性を高めるため
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } = useCategories();
  const { snippets, loading: snippetsLoading, error: snippetsError, refetch: refetchSnippets } = useSnippets(searchFilters);
  const { theme, darkMode, toggleDarkMode } = useTheme();
  
  // === Electronイベントの監視 ===
  // 何をする部分か：メインプロセスからのイベントを受信してUI状態を更新
  // なぜ必要か：ショートカットキーやトレイメニューからの操作に対応するため
  useElectronEvents({
    onQuickSearch: handleQuickSearch,
    onNavigateToSettings: () => {
      // TODO: 設定画面への遷移実装
      console.log('設定画面へ遷移');
    },
  });

  // === 初期化処理 ===
  // 何をする部分か：アプリ起動時の初期設定を実行
  // なぜ必要か：最初に表示するカテゴリを決定するため
  useEffect(() => {
    if (categories.length > 0 && selectedCategoryId === null) {
      // === 最初のカテゴリを自動選択 ===
      // 何をする部分か：カテゴリ一覧の先頭を初期選択状態に設定
      // なぜ必要か：ユーザーにスニペット内容を即座に表示するため
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);

  // === Material-UI テーマの作成 ===
  // 何をする部分か：ダークモード対応の統一テーマを生成
  // なぜ必要か：アプリ全体の見た目を一貫させ、ユーザー設定に対応するため
  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
    components: {
      // === カスタムコンポーネントスタイル ===
      // 何をする部分か：Material-UIコンポーネントのデフォルトスタイルを調整
      // なぜ必要か：アプリ固有のデザイン要件に合わせるため
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundImage: 'none', // グラデーション背景を無効化
          },
        },
      },
    },
  });

  // === 検索処理 ===
  // 何をする部分か：検索条件に基づくスニペットフィルタリング
  // なぜ必要か：大量のスニペットから目的のものを素早く見つけるため
  const handleSearch = (query: string) => {
    setSearchFilters(prev => ({
      ...prev,
      query: query.trim() || undefined,
    }));
  };

  // === カテゴリ選択処理 ===
  // 何をする部分か：選択されたカテゴリに応じてスニペット表示を更新
  // なぜ必要か：カテゴリごとのスニペット絞り込み表示を実現するため
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchFilters(prev => ({
      ...prev,
      categoryId: categoryId || undefined,
    }));
  };

  // === お気に入り切り替え処理 ===
  // 何をする部分か：お気に入りスニペットのみの表示切り替え
  // なぜ必要か：頻繁に使用するスニペットへの素早いアクセスを提供するため
  const handleFavoriteToggle = (showFavorites: boolean) => {
    setSearchFilters(prev => ({
      ...prev,
      isFavorite: showFavorites || undefined,
    }));
  };

  // === クイック検索処理 ===
  // 何をする部分か：ショートカットキー（Ctrl+Shift+Q）からの検索開始
  // なぜ必要か：キーボードからの素早い検索開始を可能にするため
  function handleQuickSearch() {
    // 検索入力フィールドにフォーカスを設定
    // DOM操作で直接フォーカスを設定
    setTimeout(() => {
      const searchInput = document.querySelector('input[placeholder*="検索"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select(); // 既存テキストを選択状態に
      }
    }, 100); // レンダリング完了を待つ
  }

  // === 通知表示処理 ===
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // === 通知クローズ処理 ===
  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  // === データ再読み込み処理 ===
  // 何をする部分か：カテゴリ・スニペットデータの最新化
  // なぜ必要か：データ変更後の画面更新を保証するため
  const handleDataRefresh = async () => {
    try {
      await Promise.all([refetchCategories(), refetchSnippets()]);
      showNotification('データを更新しました', 'success');
    } catch (error) {
      console.error('データ更新エラー:', error);
      showNotification('データ更新に失敗しました', 'error');
    }
  };

  // === エラー表示の統一処理 ===
  const renderError = (error: string) => (
    <Alert severity="error" sx={{ m: 2 }}>
      {error}
    </Alert>
  );

  // === ローディング状態の判定 ===
  const isLoading = categoriesLoading || snippetsLoading;

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* === ヘッダー部分 === */}
        {/* 何をする部分か：検索バー、設定ボタン、テーマ切り替えを配置 */}
        <Header
          onSearch={handleSearch}
          onFavoriteToggle={handleFavoriteToggle}
          onThemeToggle={toggleDarkMode}
          onRefresh={handleDataRefresh}
          darkMode={darkMode}
          isLoading={isLoading}
        />

        {/* === エラー表示 === */}
        {categoriesError && renderError(categoriesError)}
        {snippetsError && renderError(snippetsError)}

        {/* === メインコンテンツエリア === */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* === カテゴリタブ === */}
          {/* 何をする部分か：カテゴリ切り替えタブを表示 */}
          <CategoryTabs
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            onCategoryCreate={() => {
              // TODO: カテゴリ作成ダイアログの実装
              showNotification('カテゴリ作成機能は準備中です', 'info');
            }}
            onCategoryUpdate={() => {
              // カテゴリ更新後のデータ再読み込み
              handleDataRefresh();
            }}
          />

          {/* === スニペット一覧 === */}
          {/* 何をする部分か：選択されたカテゴリのスニペットをカード形式で表示 */}
          <Container maxWidth="lg" sx={{ flex: 1, py: 2, overflow: 'auto' }}>
            <SnippetList
              snippets={snippets}
              loading={snippetsLoading}
              onSnippetSelect={(snippet) => {
                // スニペットのクリップボードコピー実行
                window.electronAPI.snippet.copyToClipboard(snippet.id)
                  .then((result) => {
                    if (result.success) {
                      showNotification(`"${snippet.title}" をコピーしました`, 'success');
                    } else {
                      showNotification('コピーに失敗しました', 'error');
                    }
                  })
                  .catch((error) => {
                    console.error('コピーエラー:', error);
                    showNotification('コピー中にエラーが発生しました', 'error');
                  });
              }}
              onSnippetUpdate={() => {
                // スニペット更新後のデータ再読み込み
                handleDataRefresh();
              }}
              onSnippetCreate={() => {
                // スニペット作成後のデータ再読み込み
                handleDataRefresh();
              }}
            />
          </Container>
        </Box>

        {/* === 通知スナックバー === */}
        {/* 何をする部分か：操作結果の通知を一時表示 */}
        {/* なぜ必要か：ユーザーに操作完了や error状況を伝えるため */}
        <Snackbar
          open={notification.open}
          autoHideDuration={4000}
          onClose={handleCloseNotification}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            onClose={handleCloseNotification}
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;