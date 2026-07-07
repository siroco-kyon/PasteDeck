import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Grid,
  Fab,
  Tooltip,
  IconButton,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewModule as GridViewIcon,
  ViewList as ListViewIcon,
  TrendingUp as TrendingUpIcon,
  LocalOffer as TagIcon,
} from '@mui/icons-material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import SnippetCard from './SnippetCard';
import type { Snippet } from '@/shared/types';

// === スニペット一覧コンポーネント ===
// 何をする部分か：スニペットをグリッドまたはリスト形式で表示し、DnD並び替えをサポート
// なぜ必要か：ユーザーがスニペットを選択・管理・並び替えできるUIを提供するため

interface SnippetListProps {
  snippets: Snippet[];
  loading: boolean;
  onSnippetSelect: (snippet: Snippet) => void;
  onSnippetEdit: (snippet: Snippet) => void;
  onSnippetDelete: (snippet: Snippet) => void;
  onSnippetDuplicate: (snippet: Snippet) => void;
  onDataChange: () => void;
  onCreateClick: () => void;
  onReorder: (items: Array<{ id: number; sortOrder: number }>) => void;
  onTagClick?: (tag: string) => void;
  activeTagFilter?: string;   // 現在適用中のタグフィルター
  onClearTagFilter?: () => void; // タグフィルター解除
  compact?: boolean; // コンパクトモード時はカードの余白・フォントを詰める
}

const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  loading,
  onSnippetSelect,
  onSnippetEdit,
  onSnippetDelete,
  onSnippetDuplicate,
  onDataChange,
  onCreateClick,
  onReorder,
  onTagClick,
  activeTagFilter,
  onClearTagFilter,
  compact = false,
}) => {
  // === 表示モード管理 ===
  // 何をする部分か：グリッド表示とDnD対応リスト表示を切り替え
  // なぜ必要か：用途に応じた表示形式とDnD並び替え機能の提供のため
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // === 使用回数順ソートモード ===
  // 何をする部分か：よく使う順（useCount降順）への表示切り替えを管理
  // なぜ必要か：使用頻度の高いスニペットに素早くアクセスできるようにするため
  const [sortByUsage, setSortByUsage] = useState(false);

  // === ローカル並び順状態 ===
  // 何をする部分か：DnD操作中の楽観的更新用にローカルコピーを管理
  // なぜ必要か：DB更新を待たずに即座にUI反映するため
  const [localSnippets, setLocalSnippets] = useState<Snippet[]>([]);

  // === 外部のsnippets変更を同期（DnD順序を保護） ===
  // 何をする部分か：IDセットが変わった場合（追加・削除）のみ完全更新し、
  //               IDが同じ場合はDnDで変更した並び順を維持しつつデータを更新
  // なぜ必要か：DnD後にお気に入り変更等でrefetchが走っても並び順が失われないようにするため
  useEffect(() => {
    setLocalSnippets(prev => {
      // 件数が変わった場合は完全更新（新規作成・削除後）
      if (prev.length !== snippets.length) return [...snippets];

      // IDセットが変わった場合も完全更新
      const prevIds = prev.map(s => s.id).sort().join(',');
      const newIds = snippets.map(s => s.id).sort().join(',');
      if (prevIds !== newIds) return [...snippets];

      // IDが同一の場合：DnD並び順を保ちつつ各スニペットのデータを最新化
      // （タイトル・コンテンツ・お気に入りフラグ等の変更を反映する）
      const snippetMap = new Map(snippets.map(s => [s.id, s]));
      return prev.map(s => snippetMap.get(s.id) ?? s);
    });
  }, [snippets]);

  // === DnD終了処理 ===
  // 何をする部分か：ドラッグ&ドロップ完了時に順序を更新してDBに保存
  // なぜ必要か：並び替えを永続化するため
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    // === 楽観的更新: まずUIを即座に変更 ===
    const items = Array.from(localSnippets);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setLocalSnippets(items);

    // === DB保存: 新しいsort_orderを送信 ===
    const updates = items.map((item, index) => ({ id: item.id, sortOrder: index }));
    onReorder(updates);
  };

  // === 表示用スニペット（ソート適用） ===
  // 何をする部分か：よく使う順モード時は useCount 降順に並び替えて表示
  // なぜ必要か：DnD並び順を壊さずに一時的な使用頻度ソートを提供するため
  const displaySnippets = useMemo(() => {
    if (!sortByUsage) return localSnippets;
    return [...localSnippets].sort((a, b) => b.useCount - a.useCount);
  }, [localSnippets, sortByUsage]);

  // === ローディング表示 ===
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  // === 空状態表示 ===
  // 何をする部分か：スニペットが0件の時にガイダンスを表示
  // なぜ必要か：初回ユーザーやフィルター適用時の次アクションを案内するため
  if (localSnippets.length === 0) {
    return (
      <Box sx={{ position: 'relative', minHeight: 300 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 250,
            textAlign: 'center',
            py: 4,
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            スニペットがありません
          </Typography>
          <Typography variant="body2" color="text.secondary">
            右下の「+」ボタンから新しいスニペットを作成しましょう
          </Typography>
        </Box>

        {/* === FAB ボタン（空状態でも表示） === */}
        <Fab
          color="primary"
          onClick={onCreateClick}
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          <AddIcon />
        </Fab>
      </Box>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%', pt: 1 }}>
      {/* === アクティブフィルターバッジ === */}
      {/* 何をする部分か：タグフィルター適用中であることを明示し、解除ボタンを提供 */}
      {/* なぜ必要か：フィルタリング中であることをユーザーが把握し、いつでも解除できるようにするため */}
      {activeTagFilter && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, px: 1 }}>
          <TagIcon fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="caption" color="text.secondary">フィルター中:</Typography>
          <Chip
            label={`#${activeTagFilter}`}
            size="small"
            color="primary"
            onDelete={onClearTagFilter}
            sx={{ fontWeight: 600 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            — クリックで解除
          </Typography>
        </Box>
      )}

      {/* === ヘッダー: 件数 + ボタン群 === */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {localSnippets.length} 件のスニペット
          {viewMode === 'list' && !sortByUsage && (
            <Typography component="span" variant="caption" color="primary.main" sx={{ ml: 1 }}>
              （ドラッグで並び替え可能）
            </Typography>
          )}
          {sortByUsage && (
            <Typography component="span" variant="caption" color="warning.main" sx={{ ml: 1 }}>
              （使用回数順）
            </Typography>
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* === 使用回数順ソートボタン === */}
          {/* 何をする部分か：よく使う順トグル */}
          {/* なぜ必要か：使用頻度の高いスニペットに素早くアクセスするため */}
          <Tooltip title={sortByUsage ? '通常順に戻す' : 'よく使う順に表示'}>
            <IconButton
              size="small"
              onClick={() => {
                setSortByUsage(v => !v);
                if (!sortByUsage) setViewMode('grid'); // ソート時はDnDを無効化
              }}
              color={sortByUsage ? 'warning' : 'default'}
              sx={{ bgcolor: sortByUsage ? 'warning.light' : 'transparent', opacity: sortByUsage ? 1 : 0.7 }}
            >
              <TrendingUpIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* === 表示モード切り替えボタン === */}
          <Tooltip title={viewMode === 'grid' ? 'リスト表示（並び替え可能）' : 'グリッド表示'}>
            <IconButton
              size="small"
              onClick={() => setViewMode(v => (v === 'grid' ? 'list' : 'grid'))}
              color={viewMode === 'list' ? 'primary' : 'default'}
              disabled={sortByUsage} // 使用回数順中はDnD無効
            >
              {viewMode === 'grid' ? <ListViewIcon /> : <GridViewIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* === グリッド表示 === */}
      {viewMode === 'grid' && (
        <Grid container spacing={compact ? 1 : 2}>
          {displaySnippets.map(snippet => (
            <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 6 : 4} lg={compact ? 6 : 3} key={snippet.id}>
              <SnippetCard
                snippet={snippet}
                onSelect={() => onSnippetSelect(snippet)}
                onEdit={() => onSnippetEdit(snippet)}
                onDelete={() => onSnippetDelete(snippet)}
                onDuplicate={() => onSnippetDuplicate(snippet)}
                onFavoriteToggle={onDataChange}
                onTagClick={onTagClick}
                compact={compact}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* === リスト表示（DnD対応） === */}
      {/* 何をする部分か：react-beautiful-dnd でドラッグ並び替えができる縦リスト */}
      {/* なぜ必要か：スニペットの表示順をカスタマイズできるようにするため */}
      {viewMode === 'list' && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="snippets-list">
            {provided => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ display: 'flex', flexDirection: 'column', gap: compact ? 0.75 : 1.5 }}
              >
                {displaySnippets.map((snippet, index) => (
                  <Draggable
                    key={snippet.id}
                    draggableId={String(snippet.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Box
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                      >
                        <SnippetCard
                          snippet={snippet}
                          onSelect={() => onSnippetSelect(snippet)}
                          onEdit={() => onSnippetEdit(snippet)}
                          onDelete={() => onSnippetDelete(snippet)}
                          onDuplicate={() => onSnippetDuplicate(snippet)}
                          onFavoriteToggle={onDataChange}
                          onTagClick={onTagClick}
                          dragHandleProps={provided.dragHandleProps || undefined}
                          isDragging={snapshot.isDragging}
                          compact={compact}
                        />
                      </Box>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {/* === スクロール補助テキスト（件数が多い場合） === */}
      {localSnippets.length > 20 && (
        <Box sx={{ mt: 3, textAlign: 'center', pb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            検索機能を使って目的のスニペットを素早く見つけられます
          </Typography>
        </Box>
      )}

      {/* === 新規作成 FAB ボタン === */}
      {/* 何をする部分か：画面右下に固定表示される新規作成ボタン */}
      {/* なぜ必要か：どのスクロール位置でも素早くスニペット作成を開始するため */}
      <Tooltip title="スニペットを作成">
        <Fab
          color="primary"
          onClick={onCreateClick}
          sx={{ position: 'fixed', bottom: 32, right: 32 }}
        >
          <AddIcon />
        </Fab>
      </Tooltip>
    </Box>
  );
};

export default SnippetList;
