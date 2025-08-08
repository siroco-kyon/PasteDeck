import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Tooltip,
  Chip,
  Badge,
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Code as CodeIcon,
  Web as HtmlIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import type { Snippet } from '@/shared/types';

// === スニペットカードコンポーネント ===
// 何をする部分か：個々のスニペットを表示・操作するカードUI
// なぜ必要か：スニペットの内容確認とワンクリック操作を提供するため

interface SnippetCardProps {
  snippet: Snippet;
  onSelect: () => void;
  onUpdate: () => void;
  onDelete: () => void;
  onFavoriteToggle: () => void;
}

const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  onSelect,
  onUpdate,
  onDelete,
  onFavoriteToggle,
}) => {
  // === 状態管理 ===
  // 何をする部分か：カード操作の状態を管理
  // なぜ必要か：操作中の視覚的フィードバックを提供するため
  const [isHovered, setIsHovered] = useState(false);

  // === コンテンツタイプ別アイコン取得 ===
  // 何をする部分か：スニペットの種類に応じたアイコンを表示
  // なぜ必要か：視覚的な識別性を向上させるため
  const getContentTypeIcon = () => {
    switch (snippet.contentType) {
      case 'html':
        return <HtmlIcon fontSize="small" color="secondary" />;
      case 'image':
        return <ImageIcon fontSize="small" color="success" />;
      case 'text':
      default:
        return <CodeIcon fontSize="small" color="primary" />;
    }
  };

  // === コンテンツプレビュー生成 ===
  // 何をする部分か：スニペット内容の短縮版を表示用に生成
  // なぜ必要か：カード内で内容を把握できるようにするため
  const getPreviewText = (content: string, maxLength: number = 100): string => {
    if (content.length <= maxLength) {
      return content;
    }
    return content.substring(0, maxLength) + '...';
  };

  // === お気に入り切り替え処理 ===
  // 何をする部分か：スニペットのお気に入り状態を切り替え
  // なぜ必要か：頻繁に使用するスニペットをマークするため
  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.stopPropagation(); // カード選択イベントの発生を防ぐ
    
    try {
      const response = await window.electronAPI.snippet.update(snippet.id, {
        isFavorite: !snippet.isFavorite,
      });
      
      if (response.success) {
        onFavoriteToggle();
      }
    } catch (error) {
      console.error('お気に入り切り替えエラー:', error);
    }
  };

  // === 編集処理 ===
  // 何をする部分か：スニペット編集画面への遷移（将来実装）
  // なぜ必要か：スニペット内容の変更を可能にするため
  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    // TODO: 編集ダイアログの実装
    console.log('編集機能は準備中です');
    onUpdate();
  };

  // === 削除処理 ===
  // 何をする部分か：スニペットの削除実行
  // なぜ必要か：不要になったスニペットを管理するため
  const handleDelete = async (event: React.MouseEvent) => {
    event.stopPropagation();
    
    // === 削除確認 ===
    // 何をする部分か：誤削除を防ぐための確認ダイアログ
    // なぜ必要か：重要なデータの意図しない削除を防ぐため
    const confirmed = confirm(`"${snippet.title}" を削除しますか？\nこの操作は取り消せません。`);
    
    if (!confirmed) return;
    
    try {
      const response = await window.electronAPI.snippet.delete(snippet.id);
      
      if (response.success) {
        onDelete();
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  // === カードクリック処理 ===
  // 何をする部分か：スニペット選択（コピー実行）
  // なぜ必要か：メイン機能であるクリップボードコピーを簡単に実行するため
  const handleCardClick = () => {
    onSelect(); // 親コンポーネントでコピー処理を実行
  };

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        position: 'relative',
        border: snippet.isFavorite ? '2px solid' : '1px solid',
        borderColor: snippet.isFavorite ? 'secondary.main' : 'divider',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
          borderColor: snippet.isFavorite ? 'secondary.main' : 'primary.main',
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      {/* === カードヘッダー === */}
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* === タイトル行 === */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
          {/* コンテンツタイプアイコン */}
          <Box sx={{ mr: 1, mt: 0.5 }}>
            {getContentTypeIcon()}
          </Box>
          
          {/* スニペットタイトル */}
          <Typography
            variant="subtitle1"
            component="h3"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {snippet.title}
          </Typography>
          
          {/* === お気に入りアイコン === */}
          {snippet.isFavorite && (
            <StarIcon
              fontSize="small"
              color="secondary"
              sx={{ ml: 1, flexShrink: 0 }}
            />
          )}
        </Box>

        {/* === コンテンツプレビュー === */}
        {/* 何をする部分か：スニペット内容の短縮表示 */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            minHeight: '3.6em',
            fontFamily: 'monospace',
            fontSize: '0.75rem',
            backgroundColor: 'action.hover',
            padding: 1,
            borderRadius: 1,
          }}
        >
          {getPreviewText(snippet.content)}
        </Typography>

        {/* === タグ表示 === */}
        {/* 何をする部分か：スニペットに付けられたタグの表示 */}
        {/* なぜ必要か：分類情報の視覚的表示と検索の手がかり提供のため */}
        {snippet.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
            {snippet.tags.slice(0, 3).map((tag) => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                }}
              />
            ))}
            {snippet.tags.length > 3 && (
              <Chip
                label={`+${snippet.tags.length - 3}`}
                size="small"
                variant="outlined"
                sx={{
                  fontSize: '0.7rem',
                  height: 20,
                  opacity: 0.7,
                }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {/* === カードフッター（操作ボタン群） === */}
      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: 'space-between' }}>
        {/* === 使用統計表示 === */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary">
            使用: {snippet.useCount}回
          </Typography>
        </Box>

        {/* === 操作ボタン群 === */}
        {/* 何をする部分か：ホバー時に表示される操作ボタン */}
        {/* なぜ必要か：カードを見やすく保ちながら必要時に操作を提供するため */}
        <Box
          sx={{
            display: 'flex',
            opacity: isHovered ? 1 : 0.5,
            transition: 'opacity 0.2s',
          }}
        >
          {/* コピーボタン */}
          <Tooltip title="クリップボードにコピー">
            <IconButton size="small" onClick={handleCardClick}>
              <CopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* お気に入りボタン */}
          <Tooltip title={snippet.isFavorite ? 'お気に入り解除' : 'お気に入り登録'}>
            <IconButton
              size="small"
              onClick={handleFavoriteToggle}
              color={snippet.isFavorite ? 'secondary' : 'default'}
            >
              {snippet.isFavorite ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* 編集ボタン */}
          <Tooltip title="編集">
            <IconButton size="small" onClick={handleEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {/* 削除ボタン */}
          <Tooltip title="削除">
            <IconButton size="small" onClick={handleDelete} color="error">
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </CardActions>
    </Card>
  );
};

export default SnippetCard;