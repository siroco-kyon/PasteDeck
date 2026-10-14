import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container, Alert, Snackbar } from '@mui/material';
import Header from './components/Header/Header';
import CategoryTabs from './components/Category/CategoryTabs';
import SnippetList from './components/Snippet/SnippetList';
import CompactSnippetList from './components/Snippet/CompactSnippetList';
import SnippetFormDialog from './components/Snippet/SnippetFormDialog';
import CategoryFormDialog from './components/Category/CategoryFormDialog';
import SettingsDialog from './components/Settings/SettingsDialog';
import ConfirmDialog from './components/common/ConfirmDialog';
import { useCategories } from './hooks/useCategories';
import { useSnippets } from './hooks/useSnippets';
import { useTheme } from './hooks/useTheme';
import { useElectronEvents } from './hooks/useElectronEvents';
import type { Snippet, Category, SearchFilters, AppSettings } from '@/shared/types';

// === メインアプリケーションコンポーネント ===
// 何をする部分か：アプリケーション全体のレイアウト・状態管理・ダイアログ制御を統括
// なぜ必要か：UIの全体構成とデータフローの中心となるため

function App() {
  // === 検索・カテゴリフィルター状態 ===
  // 何をする部分か：選択中のタブ、検索欄の入力値、検索・お気に入り条件を管理
  // なぜ必要か：一覧の絞り込み条件を組み立てる元になるため
  // Note: カテゴリの絞り込みは searchFilters に持たせず、selectedCategoryId だけを状態とする。
  //       両方に持つと片方だけ更新されたときにタブと一覧の内容がずれるため（snippetFilters で合成）
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchFilters, setSearchFilters] = useState<Omit<SearchFilters, 'categoryId'>>({});

  // === 前回タブの復元状態 ===
  // 何をする部分か：保存済みの前回タブ（settings の lastCategoryId）と、復元が済んだかを管理
  // なぜ必要か：設定とカテゴリ一覧の両方が揃ってから初期タブを決め、それまでは一覧を
  //           取得しないことで、起動直後に別タブの内容が一瞬表示されるのを防ぐため
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [initialSelectionDone, setInitialSelectionDone] = useState(false);
  const savedCategoryIdRef = useRef<number | null | undefined>(undefined);

  // === 一覧の絞り込み条件 ===
  // 何をする部分か：キーワード・タグで検索中は全カテゴリを対象にし、
  //               それ以外は選択中のタブで絞り込んだ条件を作る
  // なぜ必要か：目的のスニペットが別タブにあっても検索で見つけられるようにするため
  //           （useMemo で参照を安定させ、useSnippets の再取得が無限に走らないようにする）
  const isSearching = !!searchFilters.query || !!searchFilters.tags?.length;
  const snippetFilters = useMemo<SearchFilters>(
    () => ({
      ...searchFilters,
      categoryId: isSearching ? undefined : selectedCategoryId ?? undefined,
    }),
    [searchFilters, selectedCategoryId, isSearching]
  );

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

  // ── 最前面固定・コンパクトモード状態 ──
  // 何をする部分か：メインプロセス側のウィンドウ状態と同期するフラグ
  // なぜ必要か：起動時に保存済みの設定を反映し、ヘッダーのトグルボタンと連動させるため
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  // === コンパクトモードの初期値 ===
  // 何をする部分か：メインプロセスがURLクエリ経由で渡すヒントを同期的に読み取る
  // なぜ必要か：settings.get()（非同期）の解決を待つ間、狭いウィンドウなのに
  //           通常レイアウトのままUIがはみ出して見える一瞬のちらつきを防ぐため
  const [compactMode, setCompactMode] = useState(
    () => new URLSearchParams(window.location.search).get('compact') === '1'
  );

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
  const {
    snippets,
    loading: snippetsLoading,
    error: snippetsError,
    refetch: refetchSnippets,
    copyToClipboard: copySnippetToClipboard,
  } = useSnippets(snippetFilters, { enabled: initialSelectionDone });
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

  // === 保存済み設定の読み込み ===
  // 何をする部分か：起動時に保存済み設定を取得し、トグルボタンの初期状態と前回タブを読み込む
  // なぜ必要か：前回終了時のモードとタブを次回起動時にも維持するため
  useEffect(() => {
    (async () => {
      try {
        const res = await window.electronAPI.settings.get();
        if (res.success) {
          const s = res.data as Partial<AppSettings>;
          setAlwaysOnTop(!!s.alwaysOnTop);
          setCompactMode(!!s.compactMode);
          // 数値か null（「すべて」）以外は壊れた値とみなし、未保存扱いにする
          savedCategoryIdRef.current =
            typeof s.lastCategoryId === 'number' || s.lastCategoryId === null
              ? s.lastCategoryId
              : undefined;
        }
      } catch (err) {
        console.error('起動時モード設定の読み込みに失敗:', err);
      } finally {
        // 失敗しても初期タブの決定に進めるよう、読み込み完了扱いにする
        setSettingsLoaded(true);
      }
    })();
  }, []);

  // === 初期タブの決定（前回タブの復元） ===
  // 何をする部分か：設定とカテゴリ一覧が揃った時点で一度だけ初期タブを決める
  //   - 前回タブが保存されていて、まだ存在する → そのタブ
  //   - 前回が「すべて」、または前回のカテゴリが削除済み → 「すべて」
  //   - 一度も保存されていない（初回起動） → 先頭カテゴリ
  // なぜ必要か：起動のたびに先頭タブへ戻されず、前回の続きから使えるようにするため
  useEffect(() => {
    if (initialSelectionDone || categoriesLoading || !settingsLoaded) return;

    const saved = savedCategoryIdRef.current;
    let initialCategoryId: number | null;
    if (saved === undefined) {
      initialCategoryId = categories[0]?.id ?? null;
    } else if (saved !== null && categories.some(c => c.id === saved)) {
      initialCategoryId = saved;
    } else {
      initialCategoryId = null;
    }

    setSelectedCategoryId(initialCategoryId);
    setInitialSelectionDone(true);
  }, [categories, categoriesLoading, settingsLoaded, initialSelectionDone]);

  // === 選択中カテゴリの存在チェック ===
  // 何をする部分か：選択中のカテゴリが一覧から消えたら「すべて」に切り替える
  // なぜ必要か：カテゴリ削除やデータインポートの後、存在しないタブで絞り込んだまま
  //           空の一覧が表示され続けるのを防ぐため
  useEffect(() => {
    if (!initialSelectionDone || categoriesLoading) return;
    if (selectedCategoryId !== null && !categories.some(c => c.id === selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
  }, [categories, categoriesLoading, selectedCategoryId, initialSelectionDone]);

  // === 選択中タブの保存 ===
  // 何をする部分か：タブが変わるたびに lastCategoryId として設定に保存する
  // なぜ必要か：次回起動時に同じタブを復元するため
  useEffect(() => {
    if (!initialSelectionDone) return;
    window.electronAPI.settings.set('lastCategoryId', selectedCategoryId).catch(err => {
      console.error('選択中タブの保存に失敗:', err);
    });
  }, [selectedCategoryId, initialSelectionDone]);

  // === 常に最前面固定モードの切り替え ===
  const handleToggleAlwaysOnTop = useCallback(async () => {
    const next = !alwaysOnTop;
    setAlwaysOnTop(next);
    try {
      await window.electronAPI.app.setAlwaysOnTop(next);
    } catch (err) {
      console.error('最前面固定モード切り替えに失敗:', err);
      setAlwaysOnTop(!next);
    }
  }, [alwaysOnTop]);

  // === コンパクトモードの切り替え ===
  const handleToggleCompactMode = useCallback(async () => {
    const next = !compactMode;
    setCompactMode(next);
    try {
      await window.electronAPI.app.setCompactMode(next);
    } catch (err) {
      console.error('コンパクトモード切り替えに失敗:', err);
      setCompactMode(!next);
    }
  }, [compactMode]);

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
    setSearchText(query);
    const trimmed = query.trim();
    setSearchFilters(prev => ({
      ...prev,
      query: trimmed || undefined,
      // Escキーでクリア時はタグフィルタも同時解除
      tags: trimmed ? prev.tags : undefined,
    }));
  };

  // === タブ選択 ===
  // 何をする部分か：選択タブを切り替え、検索中だった場合は検索も解除する
  // なぜ必要か：検索中は全カテゴリが対象でタブの選択が効かないため、タブを押したら
  //           そのタブの一覧に戻るのが自然な動きになるため
  const handleCategorySelect = (categoryId: number | null) => {
    setSelectedCategoryId(categoryId);
    if (isSearching) {
      setSearchText('');
      setSearchFilters(prev => ({ ...prev, query: undefined, tags: undefined }));
    }
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
  // 何をする部分か：クリップボードへコピーし、使用回数は手元の一覧だけ更新する
  // なぜ必要か：コピーのたびに全件を取り直すと一覧が描き直され、点滅したり
  //           スクロール位置が先頭に戻ったりするため
  const handleSnippetSelect = async (snippet: Snippet) => {
    const copied = await copySnippetToClipboard(snippet.id);
    if (copied) {
      showNotification(`"${snippet.title}" をコピーしました`, 'success');
    } else {
      showNotification('コピーに失敗しました', 'error');
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
          // 削除したカテゴリが選択中だった場合は「すべて」へ移動
          if (selectedCategoryId === category.id) {
            setSelectedCategoryId(null);
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
          searchQuery={searchText}
          onSearch={handleSearch}
          onFavoriteToggle={handleFavoriteToggle}
          onThemeToggle={toggleDarkMode}
          onRefresh={handleDataRefresh}
          onSettingsOpen={() => setSettingsDialogOpen(true)}
          darkMode={darkMode}
          isLoading={isLoading}
          alwaysOnTop={alwaysOnTop}
          onToggleAlwaysOnTop={handleToggleAlwaysOnTop}
          compactMode={compactMode}
          onToggleCompactMode={handleToggleCompactMode}
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
            compact={compactMode}
            hideSelection={isSearching || !initialSelectionDone}
          />

          {/* === スニペット一覧 === */}
          {/* 何をする部分か：コンパクトモード時はタイトルのみの縦リスト、通常時は従来のグリッド/リスト表示 */}
          {/* なぜ必要か：コンパクトモードは密度調整ではなくレイアウト自体を差し替える仕様のため */}
          {compactMode ? (
            <Box sx={{ flex: 1, overflow: 'hidden' }}>
              <CompactSnippetList
                snippets={snippets}
                loading={snippetsLoading}
                onSnippetSelect={handleSnippetSelect}
                onSnippetEdit={handleOpenEditSnippet}
                onCreateClick={handleOpenCreateSnippet}
                searchActive={isSearching}
                categories={categories}
              />
            </Box>
          ) : (
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
                searchActive={isSearching}
                categories={categories}
              />
            </Container>
          )}
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
