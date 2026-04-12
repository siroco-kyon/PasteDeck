import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  CircularProgress,
  Stack,
  Tooltip,
  Paper,
} from '@mui/material';
import {
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

// === カテゴリ作成・編集ダイアログ ===
// 何をする部分か：カテゴリの新規作成と編集を行うフォームダイアログ
// なぜ必要か：カテゴリ管理のUI（名前・アイコン・カラー選択）を提供するため

// === プリセットカラーパレット ===
// 何をする部分か：ユーザーが選択できる色のプリセットを定義
// なぜ必要か：色選択のUIを簡素化し、見栄えの良いカラーのみ提供するため
const PRESET_COLORS = [
  '#2196f3', // ブルー
  '#4caf50', // グリーン
  '#ff9800', // オレンジ
  '#f44336', // レッド
  '#9c27b0', // パープル
  '#00bcd4', // シアン
  '#ff5722', // ディープオレンジ
  '#795548', // ブラウン
  '#607d8b', // ブルーグレー
  '#e91e63', // ピンク
  '#3f51b5', // インディゴ
  '#009688', // ティール
];

// === 選択可能アイコン一覧 ===
// 何をする部分か：カテゴリに設定できるアイコンの一覧を定義
// なぜ必要か：カテゴリの用途を視覚的に表すアイコンを選択可能にするため
const ICON_OPTIONS = [
  { name: 'Folder', label: 'フォルダ', component: FolderIcon },
  { name: 'Code', label: 'コード', component: CodeIcon },
  { name: 'Email', label: 'メール', component: EmailIcon },
  { name: 'Work', label: '仕事', component: WorkIcon },
  { name: 'Home', label: 'ホーム', component: HomeIcon },
  { name: 'Star', label: 'スター', component: StarIcon },
  { name: 'Bookmark', label: 'ブックマーク', component: BookmarkIcon },
  { name: 'Build', label: 'ツール', component: BuildIcon },
  { name: 'Cloud', label: 'クラウド', component: CloudIcon },
  { name: 'Description', label: '文書', component: DescriptionIcon },
  { name: 'Tag', label: 'タグ', component: TagIcon },
  { name: 'Person', label: '人物', component: PersonIcon },
];

interface CategoryFormDialogProps {
  open: boolean;
  category?: Category | null; // null/undefined = 新規作成、Category = 編集
  onClose: () => void;
  onSaved: () => void;
}

const CategoryFormDialog: React.FC<CategoryFormDialogProps> = ({
  open,
  category,
  onClose,
  onSaved,
}) => {
  const isEditMode = Boolean(category);

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState<string>(PRESET_COLORS[0]);
  const [selectedIcon, setSelectedIcon] = useState<string>('Folder');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);

  // === ダイアログ開閉時の初期化 ===
  useEffect(() => {
    if (!open) return;

    if (category) {
      setName(category.name);
      setSelectedColor(category.color || PRESET_COLORS[0]);
      setSelectedIcon(category.icon || 'Folder');
    } else {
      setName('');
      setSelectedColor(PRESET_COLORS[0]);
      setSelectedIcon('Folder');
    }
    setNameError('');
  }, [open, category]);

  const validate = (): boolean => {
    if (!name.trim()) {
      setNameError('カテゴリ名は必須です');
      return false;
    }
    setNameError('');
    return true;
  };

  // === 保存処理 ===
  // 何をする部分か：バリデーション後にIPC経由でカテゴリを作成または更新
  // なぜ必要か：作成/編集の両モードに対応した保存処理のため
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        color: selectedColor,
        icon: selectedIcon,
      };

      if (isEditMode && category) {
        const response = await window.electronAPI.category.update(category.id, input);
        if (!response.success) throw new Error(response.message);
      } else {
        const response = await window.electronAPI.category.create(input);
        if (!response.success) throw new Error(response.message);
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('カテゴリ保存エラー:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {isEditMode ? 'カテゴリを編集' : 'カテゴリを作成'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3} sx={{ pt: 0.5 }}>
          {/* === 名前入力 === */}
          <TextField
            label="カテゴリ名"
            value={name}
            onChange={e => setName(e.target.value)}
            error={Boolean(nameError)}
            helperText={nameError}
            fullWidth
            required
            autoFocus
            disabled={saving}
          />

          {/* === カラー選択 === */}
          {/* 何をする部分か：プリセットカラーをクリックで選択 */}
          {/* なぜ必要か：カテゴリを色で視覚的に区別するため */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              カラー
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {PRESET_COLORS.map(color => (
                <Tooltip key={color} title={color}>
                  <Box
                    onClick={() => !saving && setSelectedColor(color)}
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: saving ? 'default' : 'pointer',
                      border: selectedColor === color ? '3px solid' : '2px solid transparent',
                      borderColor: selectedColor === color ? 'text.primary' : 'transparent',
                      outline: selectedColor === color ? '2px solid' : 'none',
                      outlineColor: color,
                      outlineOffset: '2px',
                      transition: 'transform 0.15s, outline 0.15s',
                      '&:hover': {
                        transform: saving ? 'none' : 'scale(1.15)',
                      },
                    }}
                  />
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* === アイコン選択 === */}
          {/* 何をする部分か：カテゴリに使用するMUIアイコンをグリッドから選択 */}
          {/* なぜ必要か：カテゴリタブにアイコンを表示して識別性を向上させるため */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
              アイコン
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {ICON_OPTIONS.map(({ name: iconName, label, component: IconComponent }) => (
                <Tooltip key={iconName} title={label}>
                  <Paper
                    onClick={() => !saving && setSelectedIcon(iconName)}
                    elevation={selectedIcon === iconName ? 3 : 0}
                    sx={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: saving ? 'default' : 'pointer',
                      border: '1px solid',
                      borderColor: selectedIcon === iconName ? 'primary.main' : 'divider',
                      bgcolor: selectedIcon === iconName ? 'primary.light' : 'background.paper',
                      color: selectedIcon === iconName ? 'primary.main' : 'text.secondary',
                      borderRadius: 1,
                      transition: 'all 0.15s',
                      '&:hover': {
                        borderColor: saving ? 'divider' : 'primary.main',
                        color: saving ? 'text.secondary' : 'primary.main',
                      },
                    }}
                  >
                    <IconComponent fontSize="small" />
                  </Paper>
                </Tooltip>
              ))}
            </Box>
          </Box>

          {/* === プレビュー === */}
          {/* 何をする部分か：選択したカラー・アイコン・名前の組み合わせをプレビュー表示 */}
          {/* なぜ必要か：作成前に実際の見た目を確認できるようにするため */}
          {name && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                プレビュー
              </Typography>
              <Box
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 0.75,
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: selectedColor,
                  color: selectedColor,
                }}
              >
                {(() => {
                  const found = ICON_OPTIONS.find(i => i.name === selectedIcon);
                  if (!found) return null;
                  const Icon = found.component;
                  return <Icon fontSize="small" />;
                })()}
                <Typography variant="body2" sx={{ color: selectedColor, fontWeight: 500 }}>
                  {name}
                </Typography>
              </Box>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          キャンセル
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {saving ? '保存中...' : isEditMode ? '更新する' : '作成する'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CategoryFormDialog;
