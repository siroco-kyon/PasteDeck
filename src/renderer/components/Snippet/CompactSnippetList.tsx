import React from 'react';
import { Box, List, ListItemButton, ListItemText, Typography, IconButton, Tooltip } from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import type { Snippet } from '@/shared/types';

// === コンパクトモード専用スニペット一覧 ===
// 何をする部分か：スニペットをタイトルのみの縦一列ボタンとして表示する
// なぜ必要か：狭いコンパクトウィンドウでも一目で見渡せる、素早く使うための最小限の一覧を提供するため

interface CompactSnippetListProps {
  snippets: Snippet[];
  onSnippetSelect: (snippet: Snippet) => void; // 左クリック：クリップボードにコピー
  onSnippetEdit: (snippet: Snippet) => void; // 右クリック：編集ダイアログを開く
  onCreateClick: () => void;
}

const CompactSnippetList: React.FC<CompactSnippetListProps> = ({
  snippets,
  onSnippetSelect,
  onSnippetEdit,
  onCreateClick,
}) => {
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
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 1, py: 0.5 }}>
        <Tooltip title="スニペットを作成">
          <IconButton size="small" onClick={onCreateClick}>
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* === 空状態 === */}
      {snippets.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            スニペットがありません
          </Typography>
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
            </ListItemButton>
          ))}
        </List>
      )}
    </Box>
  );
};

export default CompactSnippetList;
