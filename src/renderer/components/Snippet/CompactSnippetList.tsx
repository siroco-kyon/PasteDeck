import React, { useMemo } from 'react';
import { Box, List, ListItemButton, ListItemText, Typography, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Snippet, Category } from '@/shared/types';

// === コンパクトモード専用スニペット一覧 ===
// 何をする部分か：スニペットをタイトルのみの縦一列ボタンとして表示する
// なぜ必要か：狭いコンパクトウィンドウでも一目で見渡せる、素早く使うための最小限の一覧を提供するため

interface CompactSnippetListProps {
  snippets: Snippet[];
  loading?: boolean; // 初回読み込み中（空状態の文言を出さない）
  onSnippetSelect: (snippet: Snippet) => void; // 左クリック：クリップボードにコピー
  onSnippetEdit: (snippet: Snippet) => void; // 右クリック：編集ダイアログを開く
  onCreateClick: () => void;
  searchActive?: boolean; // 全カテゴリ検索中か（行の右端にカテゴリ名を出す）
  categories?: Category[]; // カテゴリ名を引くための一覧
}

const CompactSnippetList: React.FC<CompactSnippetListProps> = ({
  snippets,
  loading = false,
  onSnippetSelect,
  onSnippetEdit,
  onCreateClick,
  searchActive = false,
  categories = [],
}) => {
  // === カテゴリID → カテゴリ名の対応表 ===
  // 何をする部分か：全カテゴリ検索中だけ、各行に表示するカテゴリ名を引けるようにする
  // なぜ必要か：通常時はタイトルだけの一覧を保ち、検索中だけ所属が分かるようにするため
  const categoryNameById = useMemo(
    () => (searchActive ? new Map(categories.map(c => [c.id, c.name])) : null),
    [searchActive, categories]
  );

  // === 右クリックによる編集 ===
  // 何をする部分か：ブラウザ標準の右クリックメニューを抑止し、編集ダイアログを開く
  // なぜ必要か：左クリック＝コピー、右クリック＝編集という操作を両立させるため
  const handleContextMenu = (event: React.MouseEvent, snippet: Snippet) => {
    event.preventDefault();
    onSnippetEdit(snippet);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* === 新規作成ボタン === */}
      {/* 何をする部分か：タイトルのみの一覧には作成導線がないため、小さなボタンを一つ設置 */}
      {/* なぜ必要か：コンパクトモード中でもスニペットを追加できるようにするため */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', px: 1, py: 0.5 }}>
        {/* 何をする部分か：検索中は左側に検索範囲と件数を表示 */}
        {/* なぜ必要か：どのタブも選択されていない理由（全カテゴリ検索中）を示すため */}
        {searchActive && (
          <Typography variant="caption" color="text.secondary" noWrap sx={{ flex: 1, pl: 0.5 }}>
            全カテゴリから {snippets.length} 件
          </Typography>
        )}
        <Tooltip title="スニペットを作成">
          <IconButton size="small" onClick={onCreateClick}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* === 空状態 === */}
      {/* 何をする部分か：初回読み込み中は何も出さず、読み込み後に0件なら案内を出す */}
      {/* なぜ必要か：起動直後に「スニペットがありません」が一瞬表示されるのを防ぐため */}
      {snippets.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!loading && (
            <Typography variant="body2" color="text.secondary">
              {searchActive ? '一致するスニペットはありません' : 'スニペットがありません'}
            </Typography>
          )}
        </Box>
      ) : (
        // === タイトルのみの縦リスト ===
        // 何をする部分か：各スニペットをタイトルだけの1行ボタンとして表示
        // なぜ必要か：ユーザー要望どおり「箇条書きのようなボタンの縦並び」にするため
        <List dense disablePadding sx={{ overflow: 'auto', flex: 1 }}>
          {snippets.map(snippet => (
            <ListItemButton
              key={snippet.id}
              onClick={() => onSnippetSelect(snippet)}
              onContextMenu={event => handleContextMenu(event, snippet)}
              sx={{ py: 0.5, px: 1.5 }}
            >
              <ListItemText
                primary={snippet.title}
                primaryTypographyProps={{ noWrap: true, fontSize: '0.85rem' }}
              />
              {categoryNameById && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ ml: 1, flexShrink: 0, maxWidth: '40%' }}
                >
                  {categoryNameById.get(snippet.categoryId)}
                </Typography>
              )}
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

export default CompactSnippetList;
