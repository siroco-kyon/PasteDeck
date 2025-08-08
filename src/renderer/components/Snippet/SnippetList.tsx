import React from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Grid,
} from '@mui/material';
import SnippetCard from './SnippetCard';
import type { Snippet } from '@/shared/types';

// === スニペット一覧コンポーネント ===
// 何をする部分か：スニペットをカード形式で一覧表示するレイアウト
// なぜ必要か：ユーザーがスニペットを選択・管理できるUIを提供するため

interface SnippetListProps {
  snippets: Snippet[];
  loading: boolean;
  onSnippetSelect: (snippet: Snippet) => void;
  onSnippetUpdate: () => void;
  onSnippetCreate: () => void;
}

const SnippetList: React.FC<SnippetListProps> = ({
  snippets,
  loading,
  onSnippetSelect,
  onSnippetUpdate,
  onSnippetCreate,
}) => {
  // === ローディング状態の表示 ===
  // 何をする部分か：データ取得中のプログレス表示
  // なぜ必要か：ユーザーに処理中であることを伝えるため
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 200,
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // === 空状態の表示 ===
  // 何をする部分か：スニペットが存在しない場合のメッセージ表示
  // なぜ必要か：ユーザーに現在の状況を説明し、次のアクションを案内するため
  if (snippets.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 200,
          textAlign: 'center',
          py: 4,
        }}
      >
        <Typography variant="h6" color="text.secondary" gutterBottom>
          スニペットがありません
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          新しいスニペットを作成して、よく使うテキストを保存しましょう
        </Typography>
        
        {/* === 作成促進UI === */}
        {/* 何をする部分か：空状態から最初のスニペット作成へ誘導 */}
        {/* なぜ必要か：ユーザーが迷わず機能を使い始められるようにするため */}
        <Alert severity="info" sx={{ mt: 2, maxWidth: 400 }}>
          ヒント: ヘッダーの「+」ボタンをクリックするか、
          右クリックメニューから新しいスニペットを作成できます
        </Alert>
      </Box>
    );
  }

  // === スニペット一覧の描画 ===
  // 何をする部分か：取得したスニペットをカード形式でグリッド表示
  // なぜ必要か：多数のスニペットを効率的に表示・選択できるようにするため
  return (
    <Box sx={{ width: '100%', pt: 2 }}>
      {/* === 一覧ヘッダー情報 === */}
      <Box sx={{ mb: 2, px: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {snippets.length} 件のスニペット
        </Typography>
      </Box>

      {/* === レスポンシブグリッドレイアウト === */}
      {/* 何をする部分か：画面サイズに応じてカードの列数を自動調整 */}
      {/* なぜ必要か：様々なウィンドウサイズで最適な表示を提供するため */}
      <Grid container spacing={2}>
        {snippets.map((snippet) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={snippet.id}>
            <SnippetCard
              snippet={snippet}
              onSelect={() => onSnippetSelect(snippet)}
              onUpdate={onSnippetUpdate}
              onDelete={onSnippetUpdate} // 削除後も再読み込みが必要
              onFavoriteToggle={onSnippetUpdate}
            />
          </Grid>
        ))}
      </Grid>

      {/* === 追加情報表示 === */}
      {/* 何をする部分か：スニペット数に応じた補助情報表示 */}
      {/* なぜ必要か：大量データ時のユーザー体験向上のため */}
      {snippets.length > 20 && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {snippets.length} 件のスニペットを表示中
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            検索機能を使って目的のスニペットを素早く見つけられます
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default SnippetList;