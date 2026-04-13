import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from '@hello-pangea/dnd';
import {
  DragIndicator as DragIcon,
  Folder as FolderIcon,
  Code as CodeIcon,
  Email as EmailIcon,
  Work as WorkIcon,
  Home as HomeIcon,
  Star as StarIcon,
  Bookmark as BookmarkIcon,
  Build as BuildIcon,
  Cloud as CloudIcon,
  Description as DescriptionIcon,
  Tag as TagIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import type { Category } from '@/shared/types';

// === カテゴリ並び替えダイアログ ===
// 何をする部分か：ドラッグ&ドロップでカテゴリの表示順を変更するダイアログ
// なぜ必要か：カテゴリタブの順序をユーザーが自由にカスタマイズできるようにするため

// === アイコン名 → コンポーネントのマップ ===
const ICON_MAP: Record<string, React.ElementType> = {
  Folder: FolderIcon,
  Code: CodeIcon,
  Email: EmailIcon,
  Work: WorkIcon,
  Home: HomeIcon,
  Star: StarIcon,
  Bookmark: BookmarkIcon,
  Build: BuildIcon,
  Cloud: CloudIcon,
  Description: DescriptionIcon,
  Tag: TagIcon,
  Person: PersonIcon,
};

interface CategoryReorderDialogProps {
  open: boolean;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void; // 保存後のカテゴリ再取得コールバック
}

const CategoryReorderDialog: React.FC<CategoryReorderDialogProps> = ({
  open,
  categories,
  onClose,
  onSaved,
}) => {
  // === ローカル順序状態 ===
  // 何をする部分か：ドラッグ中のUI更新用にカテゴリのローカルコピーを管理
  // なぜ必要か：保存前にプレビューとして並び順を確認できるようにするため
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setLocalCategories([...categories]);
    }
  }, [open, categories]);

  // === ドラッグ&ドロップ完了処理 ===
  // 何をする部分か：ドロップ先インデックスに移動した結果をローカル状態に反映
  // なぜ必要か：保存ボタン押下前にUI上で並び順を確認できるようにするため
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;

    const items = Array.from(localCategories);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    setLocalCategories(items);
  };

  // === 並び順保存処理 ===
  // 何をする部分か：現在のローカル順序をDBに一括保存
  // なぜ必要か：ドラッグで変更した並び順を永続化するため
  const handleSave = async () => {
    setSaving(true);
    try {
      const items = localCategories.map((cat, index) => ({
        id: cat.id,
        sortOrder: index,
      }));
      const result = await window.electronAPI.category.reorder(items);
      if (result.success) {
        onSaved();
        onClose();
      }
    } catch (error) {
      console.error('カテゴリ並び替え保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const getCategoryIcon = (category: Category) => {
    const IconComponent = category.icon ? ICON_MAP[category.icon] : null;
    return IconComponent
      ? <IconComponent fontSize="small" />
      : <FolderIcon fontSize="small" />;
  };

  return (
    <Dialog open={open} onClose={() => !saving && onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>カテゴリの並び替え</DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
          ドラッグして順序を変更できます
        </Typography>

        {/* === DnD並び替えリスト === */}
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="category-reorder-list">
            {provided => (
              <Box
                ref={provided.innerRef}
                {...provided.droppableProps}
                sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
              >
                {localCategories.map((category, index) => (
                  <Draggable
                    key={category.id}
                    draggableId={String(category.id)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <Paper
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        elevation={snapshot.isDragging ? 4 : 1}
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.5,
                          py: 1,
                          cursor: 'default',
                          border: '1px solid',
                          borderColor: snapshot.isDragging ? 'primary.main' : 'divider',
                          opacity: snapshot.isDragging ? 0.9 : 1,
                          bgcolor: 'background.paper',
                        }}
                      >
                        {/* ドラッグハンドル */}
                        <Box
                          {...provided.dragHandleProps}
                          sx={{
                            color: 'text.disabled',
                            cursor: 'grab',
                            display: 'flex',
                            '&:hover': { color: 'text.secondary' },
                            '&:active': { cursor: 'grabbing' },
                          }}
                        >
                          <DragIcon fontSize="small" />
                        </Box>

                        {/* 順序番号 */}
                        <Typography
                          variant="caption"
                          sx={{
                            width: 20,
                            textAlign: 'center',
                            color: 'text.disabled',
                            fontFamily: 'monospace',
                          }}
                        >
                          {index + 1}
                        </Typography>

                        {/* カテゴリアイコン */}
                        <Box sx={{ color: category.color || 'text.secondary', flexShrink: 0 }}>
                          {getCategoryIcon(category)}
                        </Box>

                        {/* カテゴリ名 */}
                        <Typography
                          variant="body2"
                          sx={{
                            flexGrow: 1,
                            fontWeight: 500,
                            color: category.color || 'text.primary',
                          }}
                        >
                          {category.name}
                        </Typography>
                      </Paper>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </Box>
            )}
          </Droppable>
        </DragDropContext>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? '保存中...' : '順序を保存'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryReorderDialog;
