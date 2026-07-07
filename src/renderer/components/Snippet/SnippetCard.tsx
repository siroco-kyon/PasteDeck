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
  DragIndicator as DragIcon,
  FileCopy as DuplicateIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import type { Snippet } from '@/shared/types';

// === スニペットカードコンポーネント ===
// 何をする部分か：個々のスニペットを表示・操作するカードUI
// なぜ必要か：スニペットの内容確認とワンクリック操作を提供するため

interface SnippetCardProps {
  snippet: Snippet;
  onSelect: () => void;              // クリップボードコピー（親で実装）
  onEdit: () => void;                // 編集ダイアログを開く（親で実装）
  onDelete: () => void;              // 削除意図を通知（確認は親で実装）
  onDuplicate: () => void;           // 複製（親で実装）
  onFavoriteToggle: () => void;      // お気に入り変更後のデータ再取得
  onTagClick?: (tag: string) => void; // タグクリックでフィルタリング
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>; // DnD用ドラッグハンドル
  isDragging?: boolean;              // DnD中のスタイル制御
  compact?: boolean;                 // コンパクトモード時は余白・フォントを詰める
}

const SnippetCard: React.FC<SnippetCardProps> = ({
  snippet,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onFavoriteToggle,
  onTagClick,
  dragHandleProps,
  isDragging,
  compact = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // === コンテンツ展開状態 ===
  // 何をする部分か：長いコンテンツの展開/折りたたみ状態を管理
  // なぜ必要か：詳細を確認したい場合はコピー前に展開できるようにするため
  const [expanded, setExpanded] = useState(false);
  const isLongContent = snippet.content.length > 120;

  // === コンテンツタイプ別アイコン取得 ===
  // 何をする部分か：スニペットの種類に応じたアイコンを表示
  // なぜ必要か：視覚的な識別性を向上させるため
  const getContentTypeIcon = () => {
    switch (snippet.contentType) {
      case 'html':
        return <HtmlIcon fontSize="small" color="secondary" />;
      case 'image':
        return <ImageIcon fontSize="small" color="success" />;
      default:
        return <CodeIcon fontSize="small" color="primary" />;
    }
  };

  // === お気に入り切り替え処理 ===
  // 何をする部分か：IPC経由でお気に入り状態を更新しコールバックで親に通知
  // なぜ必要か：確認不要の操作なのでカード内で完結させるため
  const handleFavoriteToggle = async (event: React.MouseEvent) => {
    event.stopPropagation();
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

  const handleEdit = (event: React.MouseEvent) => {
    event.stopPropagation();
    onEdit();
  };

  const handleDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDelete();
  };

  const handleDuplicate = (event: React.MouseEvent) => {
    event.stopPropagation();
    onDuplicate();
  };

  // === コンテンツ展開トグル ===
  // 何をする部分か：カード全体のクリック（コピー）と分離して展開のみ実行
  // なぜ必要か：コピーせずに内容確認だけしたい場合に対応するため
  const handleExpandToggle = (event: React.MouseEvent) => {
    event.stopPropagation();
    setExpanded(v => !v);
  };

  // === タグクリック処理 ===
  // 何をする部分か：タグChipクリック時にそのタグでフィルタリング
  // なぜ必要か：タグから直感的に絞り込みをかけられるようにするため
  const handleTagClick = (event: React.MouseEvent, tag: string) => {
    event.stopPropagation();
    onTagClick?.(tag);
  };

  // === 使用回数の視覚的表現 ===
  // 何をする部分か：使用回数に応じて色を変えて頻繁に使うスニペットを強調
  // なぜ必要か：よく使うスニペットを一目で判別できるようにするため
  const getUseCountColor = () => {
    if (snippet.useCount >= 10) return 'warning.main';
    if (snippet.useCount > 0) return 'primary.main';
    return 'text.disabled';
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
        opacity: isDragging ? 0.85 : 1,
        boxShadow: isDragging ? 8 : undefined,
        '&:hover': {
          transform: isDragging ? 'none' : 'translateY(-2px)',
          boxShadow: isDragging ? 8 : 4,
          borderColor: snippet.isFavorite ? 'secondary.main' : 'primary.main',
        },
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      {/* === ドラッグハンドル（リストビュー時のみ表示） === */}
      {/* 何をする部分か：DnD並び替え用のハンドルを左端に表示 */}
      {/* なぜ必要か：カード全体のクリック操作とDnDを競合させないため */}
      {dragHandleProps && (
        <Box
          {...dragHandleProps}
          onClick={e => e.stopPropagation()}
          sx={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'grab',
            color: 'text.disabled',
            '&:hover': { color: 'text.secondary' },
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIcon fontSize="small" />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, pb: compact ? 0.5 : 1, pl: dragHandleProps ? 4 : (compact ? 1.5 : 2), pt: compact ? 1 : undefined }}>
        {/* === タイトル行 === */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: compact ? 0.5 : 1 }}>
          <Box sx={{ mr: 1, mt: 0.5, flexShrink: 0 }}>
            {getContentTypeIcon()}
          </Box>
          <Typography
            variant={compact ? 'body2' : 'subtitle1'}
            component="h3"
            sx={{
              flexGrow: 1,
              fontWeight: 600,
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: compact ? 1 : 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {snippet.title}
          </Typography>
          {snippet.isFavorite && (
            <StarIcon fontSize="small" color="secondary" sx={{ ml: 1, flexShrink: 0 }} />
          )}
        </Box>

        {/* === コンテンツプレビュー（展開/折りたたみ対応） === */}
        {/* 何をする部分か：デフォルト3行、展開時は全文を表示 */}
        {/* なぜ必要か：長いスニペットの内容確認をコピーなしで行えるようにするため */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: isLongContent ? 0.5 : (compact ? 0.75 : 1.5),
            fontFamily: 'monospace',
            fontSize: compact ? '0.68rem' : '0.75rem',
            backgroundColor: 'action.hover',
            padding: compact ? 0.5 : 1,
            borderRadius: 1,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            ...(!expanded && {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: compact ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              minHeight: compact ? '2.4em' : '3.6em',
            }),
          }}
        >
          {snippet.content}
        </Typography>

        {/* === 展開/折りたたみボタン === */}
        {isLongContent && (
          <Box sx={{ textAlign: 'right', mb: 1 }}>
            <Typography
              component="span"
              variant="caption"
              color="primary.main"
              onClick={handleExpandToggle}
              sx={{
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.25,
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {expanded ? (
                <><ExpandLessIcon sx={{ fontSize: 14 }} />閉じる</>
              ) : (
                <><ExpandMoreIcon sx={{ fontSize: 14 }} />もっと見る</>
              )}
            </Typography>
          </Box>
        )}

        {/* === タグ表示（クリックでフィルタリング） === */}
        {/* 何をする部分か：タグChipをクリックするとそのタグで絞り込みが発動 */}
        {/* なぜ必要か：タグベースの素早いフィルタリングを可能にするため */}
        {snippet.tags.length > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {snippet.tags.slice(0, compact ? 1 : 3).map(tag => (
              <Chip
                key={tag}
                label={tag}
                size="small"
                variant="outlined"
                onClick={onTagClick ? e => handleTagClick(e, tag) : undefined}
                sx={{
                  fontSize: '0.7rem',
                  height: compact ? 18 : 20,
                  cursor: onTagClick ? 'pointer' : 'default',
                  '&:hover': onTagClick ? { bgcolor: 'primary.light', borderColor: 'primary.main' } : {},
                }}
              />
            ))}
            {snippet.tags.length > (compact ? 1 : 3) && (
              <Chip
                label={`+${snippet.tags.length - (compact ? 1 : 3)}`}
                size="small"
                variant="outlined"
                sx={{ fontSize: '0.7rem', height: compact ? 18 : 20, opacity: 0.7 }}
              />
            )}
          </Box>
        )}
      </CardContent>

      {/* === フッター操作ボタン群 === */}
      <CardActions sx={{ px: compact ? 1 : 2, pb: compact ? 0.75 : 1.5, pt: 0, justifyContent: 'space-between' }}>
        {/* === 使用回数表示（頻度により色分け） === */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {snippet.useCount > 0 && (
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: getUseCountColor(),
                flexShrink: 0,
              }}
            />
          )}
          <Typography variant="caption" color={getUseCountColor()}>
            {snippet.useCount > 0 ? `${snippet.useCount}回使用` : '未使用'}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', opacity: isHovered ? 1 : 0.4, transition: 'opacity 0.2s' }}>
          {/* コピーボタン */}
          <Tooltip title="クリップボードにコピー">
            <IconButton size="small" onClick={e => { e.stopPropagation(); onSelect(); }}>
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
              {snippet.isFavorite
                ? <StarIcon fontSize="small" />
                : <StarBorderIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {/* 複製ボタン */}
          {/* 何をする部分か：このスニペットのコピーを "(コピー)" 付きタイトルで作成 */}
          {/* なぜ必要か：似たスニペットをゼロから作る手間を省くため */}
          <Tooltip title="複製">
            <IconButton size="small" onClick={handleDuplicate}>
              <DuplicateIcon fontSize="small" />
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
