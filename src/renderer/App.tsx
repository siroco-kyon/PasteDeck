import { useEffect, useState, useCallback } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Snackbar } from '@mui/material';
import Header from './components/Header/Header';
import CategoryTabs from './components/Category/CategoryTabs';
import SnippetList from './components/Snippet/SnippetList';
import SnippetFormDialog from './components/Snippet/SnippetFormDialog';
import CategoryFormDialog from './components/Category/CategoryFormDialog';
import SettingsDialog from './components/Settings/SettingsDialog';
import ConfirmDialog from './components/common/ConfirmDialog';
import { useCategories } from './hooks/useCategories';
import { useSnippets } from './hooks/useSnippets';
import { useTheme } from './hooks/useTheme';
import { useElectronEvents } from './hooks/useElectronEvents';
import type { Snippet, Category, SearchFilters } from '@/shared/types';

// === メインアプリケーションコンポーネント ===
// 何をする部分か：アプリケーション全体のレイアウト・状態管理・ダイアログ制御を統括
// なぜ必要か：UIの全体構成とデータフローの中心となるため

function App() {
  // === 検索・カテゴリフィルター状態 ===
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  // === 通知スナックバー状態 ===
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'info' });

  // ── スニペットダイアログ状態 ──
  // 何をする部分か：作成・編集ダイアログの開閉とeditingSnippetを管理
  // なぜ必要か：同一ダイアログを作成/編集の両モードで使い回すため
  const [snippetDialogOpen, setSnippetDialogOpen] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<Snippet | null>(null);

  // ── カテゴリダイアログ状態 ──
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // ── 設定ダイアログ状態 ──
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  // ── 削除確認ダイアログ状態 ──
  // 何をする部分か：スニペット・カテゴリの削除前確認を統一管理
  // なぜ必要か：破壊的操作の前に必ずユーザー確認を取るため
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    title: string;
    message: string;
    detail?: string;
    severity: 'error' | 'warning';
    onConfirm: () => Promise<void>;
  } | null>(null);

  // === カスタムフック ===
  const { categories, loading: categoriesLoading, error: categoriesError, refetch: refetchCategories } =
    useCategories();
  const { snippets, loading: snippetsLoading, error: snippetsError, refetch: refetchSnippets } =
    useSnippets(searchFilters);
  const { theme, darkMode, toggleDarkMode, setTheme } = useTheme();

  // === Electronイベントハンドラー ===
  // 何をする部分か：useCallback でメモ化してリスナーの無限再登録を防ぐ
  // なぜ必要か：インライン関数は毎レンダーで参照が変わりuseEffectが無限ループするため
  const handleQuickSearch = useCallback(() => {
    setTimeout(() => {
      const input = document.querySelector('input[placeholder*="検索"]') as HTMLInputElement;
      if (input) { input.focus(); input.select(); }
    }, 100);
  }, []);

  const handleNavigateToSettings = useCallback(() => {
    setSettingsDialogOpen(true);
  }, []);

  // === Electronイベント監視 ===
  // 何をする部分か：グローバルショートカットや設定遷移イベントを受信
  // なぜ必要か：メインプロセスからのイベントに対応するため
  useElectronEvents({
    onQuickSearch: handleQuickSearch,
    onNavigateToSettings: handleNavigateToSettings,
  });

  // === 初期カテゴリ自動選択 ===
  // 何をする部分か：カテゴリ読み込み後、未選択状態なら先頭カテゴリを自動選択
  // なぜ必要か：起動直後にスニペットが表示される状態にするため
  // selectedCategoryId を依存配列に含めないことで、手動選択後の再実行を防ぐ
  useEffect(() => {
    if (categories.length > 0 && selectedCategoryId === null) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories]); // eslint-disable-line react-hooks/exhaustive-deps

  // === Material-UI テーマ生成 ===
  const muiTheme = createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: { main: '#2196f3' },
      secondary: { main: '#f50057' },
    },
    components: {
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    },
  });

  // ─────────────────────────────────
  // 通知ヘルパー
  // ─────────────────────────────────
  const showNotification = useCallback(
    (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'info') => {
      setNotification({ open: true, message, severity });
    },
    []
  );

  // ─────────────────────────────────
  // 検索・フィルター
  // ─────────────────────────────────
  const handleSearch = (query: string) => {
    const trimmed = query.trim();
    setSearchFilters(prev => ({
      ...prev,
      query: trimmed || undefined,
      // Escキーでクリア時はタグフィルタも同時解除
      tags: trimmed ? prev.tags : undefined,
    }));
  };

  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    setSearchFilters(prev => ({ ...prev, categoryId: categoryId ?? undefined }));
  };

  const handleFavoriteToggle = (showFavorites: boolean) => {
    setSearchFilters(prev => ({ ...prev, isFavorite: showFavorites || undefined }));
  };

  const handleDataRefresh = useCallback(async () => {
    try {
      await Promise.all([refetchCategories(), refetchSnippets()]);
    } catch {
      showNotification('データ更新に失敗しました', 'error');
    }
  }, [refetchCategories, refetchSnippets, showNotification]);

  // ─────────────────────────────────
  // スニペット操作
  // ─────────────────────────────────

  // コピー
  const handleSnippetSelect = async (snippet: Snippet) => {
    try {
      const result = await window.electronAPI.snippet.copyToClipboard(snippet.id);
      if (result.success) {
        showNotification(`"${snippet.title}" をコピーしました`, 'success');
        await refetchSnippets();
      } else {
        showNotification('コピーに失敗しました', 'error');
      }
    } catch {
      showNotification('コピー中にエラーが発生しました', 'error');
    }
  };

  // 新規作成ダイアログを開く
  const handleOpenCreateSnippet = () => {
    setEditingSnippet(null);
    setSnippetDialogOpen(true);
  };

  // 編集ダイアログを開く
  const handleOpenEditSnippet = (snippet: Snippet) => {
    setEditingSnippet(snippet);
    setSnippetDialogOpen(true);
  };

  // 削除確認
  const handleSnippetDeleteRequest = (snippet: Snippet) => {
    setConfirmConfig({
      title: 'スニペットを削除',
      message: `"${snippet.title}" を削除しますか？`,
      detail: 'この操作は取り消せません。',
      severity: 'error',
      onConfirm: async () => {
        const result = await window.electronAPI.snippet.delete(snippet.id);
        if (result.success) {
          showNotification('スニペットを削除しました', 'success');
          await refetchSnippets();
        } else {
          showNotification('削除に失敗しました', 'error');
        }
      },
    });
    setConfirmOpen(true);
  };

  // 並び替え
  const handleSnippetReorder = async (items: Array<{ id: number; sortOrder: number }>) => {
    try {
      await window.electronAPI.snippet.reorder(items);
    } catch {
      showNotification('並び替えの保存に失敗しました', 'error');
    }
  };

  // 複製
  // 何をする部分か：選択スニペットのコピーを "(コピー)" 付きタイトルで作成
  // なぜ必要か：似たスニペットを素早く量産できるようにするため
  const handleSnippetDuplicate = useCallback(async (snippet: Snippet) => {
    try {
      const result = await window.electronAPI.snippet.duplicate(snippet.id);
      if (result.success) {
        showNotification(`"${snippet.title}" を複製しました`, 'success');
        await refetchSnippets();
      } else {
        showNotification('複製に失敗しました', 'error');
      }
    } catch {
      showNotification('複製中にエラーが発生しました', 'error');
    }
  }, [refetchSnippets, showNotification]);

  // タグクリックフィルタリング
  // 何をする部分か：タグChipクリック時にそのタグで絞り込みを発動
  // なぜ必要か：タグから直感的に横断検索できるようにするため
  const handleTagClick = useCallback((tag: string) => {
    setSearchFilters(prev => ({ ...prev, tags: [tag] }));
  }, []);

  // タグフィルター解除
  // 何をする部分か：アクティブなタグフィルターをクリア
  // なぜ必要か：バッジの×ボタンから直接解除できるようにするため
  const handleClearTagFilter = useCallback(() => {
    setSearchFilters(prev => ({ ...prev, tags: undefined }));
  }, []);

  // ─────────────────────────────────
  // カテゴリ操作
  // ─────────────────────────────────

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleOpenEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleCategoryDeleteRequest = (category: Category) => {
    setConfirmConfig({
      title: 'カテゴリを削除',
      message: `"${category.name}" カテゴリを削除しますか？`,
      detail: 'このカテゴリに含まれる全スニペットも削除されます。この操作は取り消せません。',
      severity: 'error',
      onConfirm: async () => {
        const result = await window.electronAPI.category.delete(category.id);
        if (result.success) {
          // 削除したカテゴリが選択中だった場合は先頭カテゴリへ移動
          if (selectedCategoryId === category.id) {
            setSelectedCategoryId(null);
            setSearchFilters(prev => ({ ...prev, categoryId: undefined }));
          }
          showNotification('カテゴリを削除しました', 'success');
          await handleDataRefresh();
        } else {
          showNotification('カテゴリの削除に失敗しました', 'error');
        }
      },
    });
    setConfirmOpen(true);
  };

  // ─────────────────────────────────
  // 削除確認ダイアログ処理
  // ─────────────────────────────────
  const handleConfirmAction = async () => {
    if (!confirmConfig) return;
    setConfirmOpen(false);
    try {
      await confirmConfig.onConfirm();
    } catch {
      showNotification('操作に失敗しました', 'error');
    }
    setConfirmConfig(null);
  };

  const handleConfirmCancel = () => {
    setConfirmOpen(false);
    setConfirmConfig(null);
  };

  const isLoading = categoriesLoading || snippetsLoading;

  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>

        {/* === ヘッダー === */}
        <Header
          onSearch={handleSearch}
          onFavoriteToggle={handleFavoriteToggle}
          onThemeToggle={toggleDarkMode}
          onRefresh={handleDataRefresh}
          onSettingsOpen={() => setSettingsDialogOpen(true)}
          darkMode={darkMode}
          isLoading={isLoading}
        />

        {/* === エラー表示 === */}
        {categoriesError && <Alert severity="error" sx={{ m: 2 }}>{categoriesError}</Alert>}
        {snippetsError && <Alert severity="error" sx={{ m: 2 }}>{snippetsError}</Alert>}

        {/* === メインコンテンツ === */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* === カテゴリタブ === */}
          <CategoryTabs
            categories={categories}
            selectedCategoryId={selectedCategoryId}
            onCategorySelect={handleCategorySelect}
            onCategoryCreate={handleOpenCreateCategory}
            onCategoryEdit={handleOpenEditCategory}
            onCategoryDelete={handleCategoryDeleteRequest}
            onCategoryUpdate={handleDataRefresh}
          />

          {/* === スニペット一覧 === */}
          <Container maxWidth="lg" sx={{ flex: 1, py: 2, overflow: 'auto' }}>
            <SnippetList
              snippets={snippets}
              loading={snippetsLoading}
              onSnippetSelect={handleSnippetSelect}
              onSnippetEdit={handleOpenEditSnippet}
              onSnippetDelete={handleSnippetDeleteRequest}
              onSnippetDuplicate={handleSnippetDuplicate}
              onDataChange={refetchSnippets}
              onCreateClick={handleOpenCreateSnippet}
              onReorder={handleSnippetReorder}
              onTagClick={handleTagClick}
              activeTagFilter={searchFilters.tags?.[0]}
              onClearTagFilter={handleClearTagFilter}
            />
          </Container>
        </Box>

        {/* ─── ダイアログ群 ─── */}

        {/* スニペット作成・編集ダイアログ */}
        <SnippetFormDialog
          open={snippetDialogOpen}
          snippet={editingSnippet}
          categories={categories}
          defaultCategoryId={selectedCategoryId}
          onClose={() => setSnippetDialogOpen(false)}
          onSaved={async () => {
            await refetchSnippets();
            showNotification(
              editingSnippet ? 'スニペットを更新しました' : 'スニペットを作成しました',
              'success'
            );
          }}
        />

        {/* カテゴリ作成・編集ダイアログ */}
        <CategoryFormDialog
          open={categoryDialogOpen}
          category={editingCategory}
          onClose={() => setCategoryDialogOpen(false)}
          onSaved={async () => {
            await handleDataRefresh();
            showNotification(
              editingCategory ? 'カテゴリを更新しました' : 'カテゴリを作成しました',
              'success'
            );
          }}
        />

        {/* 設定ダイアログ */}
        <SettingsDialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          theme={theme}
          onThemeChange={setTheme}
          onDataImported={handleDataRefresh}
        />

        {/* 削除確認ダイアログ */}
        <ConfirmDialog
          open={confirmOpen}
          title={confirmConfig?.title ?? ''}
          message={confirmConfig?.message ?? ''}
          detail={confirmConfig?.detail}
          severity={confirmConfig?.severity ?? 'warning'}
          confirmLabel="削除する"
          onConfirm={handleConfirmAction}
          onCancel={handleConfirmCancel}
        />

        {/* === 通知スナックバー === */}
        <Snackbar
          open={notification.open}
          autoHideDuration={3500}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setNotification(prev => ({ ...prev, open: false }))}
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
