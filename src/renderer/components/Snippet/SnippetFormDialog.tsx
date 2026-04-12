import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Box,
  Chip,
  Stack,
  Typography,
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Add as AddIcon,
  Code as CodeIcon,
  Web as HtmlIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import type {
  Snippet,
  Category,
  CreateSnippetInput,
  UpdateSnippetInput,
  ContentType,
} from '@/shared/types';

// === スニペット作成・編集ダイアログ ===
// 何をする部分か：スニペットの新規作成と編集を行うフォームダイアログ
// なぜ必要か：スニペットのCRUD操作のうち作成・更新UIを提供するため

interface SnippetFormDialogProps {
  open: boolean;
  snippet?: Snippet | null; // null/undefined = 新規作成モード、Snippet = 編集モード
  categories: Category[];
  defaultCategoryId?: number | null;
  onClose: () => void;
  onSaved: () => void; // 保存成功後のコールバック（データ再取得等）
}

const SnippetFormDialog: React.FC<SnippetFormDialogProps> = ({
  open,
  snippet,
  categories,
  defaultCategoryId,
  onClose,
  onSaved,
}) => {
  // === モード判定 ===
  // 何をする部分か：snippet プロップの有無で作成/編集モードを切り替え
  // なぜ必要か：同一コンポーネントで2つの動作を実現するため
  const isEditMode = Boolean(snippet);

  // === フォーム状態 ===
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState<ContentType>('text');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{
    title?: string;
    content?: string;
    category?: string;
  }>({});

  // === ダイアログ開閉時のフォーム初期化 ===
  // 何をする部分か：ダイアログが開くたびにフォームを適切な初期値に設定
  // なぜ必要か：前回の入力内容が残らないようにするため
  useEffect(() => {
    if (!open) return;

    if (snippet) {
      // === 編集モード: 既存データで初期化 ===
      setTitle(snippet.title);
      setContent(snippet.content);
      setContentType(snippet.contentType);
      setCategoryId(snippet.categoryId);
      setTags([...snippet.tags]);
      setIsFavorite(snippet.isFavorite);
    } else {
      // === 新規作成モード: デフォルト値で初期化 ===
      setTitle('');
      setContent('');
      setContentType('text');
      setCategoryId(
        defaultCategoryId !== undefined && defaultCategoryId !== null
          ? defaultCategoryId
          : categories.length > 0
          ? categories[0].id
          : ''
      );
      setTags([]);
      setIsFavorite(false);
    }
    setTagInput('');
    setErrors({});
  }, [open, snippet, defaultCategoryId, categories]);

  // === バリデーション ===
  // 何をする部分か：必須項目の入力チェック
  // なぜ必要か：不完全なデータの送信を防ぐため
  const validate = (): boolean => {
    const newErrors: typeof errors = {};
    if (!title.trim()) newErrors.title = 'タイトルは必須です';
    if (!content.trim()) newErrors.content = 'コンテンツは必須です';
    if (!categoryId) newErrors.category = 'カテゴリを選択してください';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // === タグ追加処理 ===
  // 何をする部分か：入力されたタグを配列に追加してChipとして表示
  // なぜ必要か：複数タグの直感的な入力UIを提供するため
  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed]);
    }
    setTagInput('');
  };

  // === タグ入力キーイベント処理 ===
  // 何をする部分か：Enter/カンマでタグ追加、Backspaceで最後のタグ削除
  // なぜ必要か：キーボード操作でのタグ管理を効率化するため
  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
    if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1));
    }
  };

  // === タグ削除処理 ===
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  // === 保存処理 ===
  // 何をする部分か：フォームデータをバリデーション後にIPCで送信
  // なぜ必要か：作成・更新の両モードに対応した保存処理を実行するため
  const handleSave = async () => {
    if (!validate()) return;
    if (typeof categoryId !== 'number') return;

    setSaving(true);
    try {
      if (isEditMode && snippet) {
        // === 編集モード: スニペット更新 ===
        const input: UpdateSnippetInput = {
          title: title.trim(),
          content: content.trim(),
          contentType,
          categoryId,
          tags,
          isFavorite,
        };
        const response = await window.electronAPI.snippet.update(snippet.id, input);
        // IPCResponse は discriminated union なので !success 後は ErrorResponse に絞り込まれる
        if (!response.success) {
          throw new Error(response.message || '更新に失敗しました');
        }
      } else {
        // === 新規作成モード: スニペット作成 ===
        const input: CreateSnippetInput = {
          title: title.trim(),
          content: content.trim(),
          contentType,
          categoryId,
          tags,
          isFavorite,
        };
        const response = await window.electronAPI.snippet.create(input);
        if (!response.success) {
          throw new Error(response.message || '作成に失敗しました');
        }
      }

      onSaved();
      onClose();
    } catch (error) {
      console.error('スニペット保存エラー:', error);
      // エラー時は保存状態を解除してダイアログを維持
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? 'スニペットを編集' : 'スニペットを作成'}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5} sx={{ pt: 0.5 }}>
          {/* === タイトル入力 === */}
          <TextField
            label="タイトル"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={Boolean(errors.title)}
            helperText={errors.title}
            fullWidth
            required
            autoFocus
            disabled={saving}
          />

          {/* === カテゴリ選択 === */}
          <FormControl fullWidth required error={Boolean(errors.category)} disabled={saving}>
            <InputLabel>カテゴリ</InputLabel>
            <Select
              value={categoryId}
              label="カテゴリ"
              onChange={e => setCategoryId(e.target.value as number)}
            >
              {categories.map(cat => (
                <MenuItem key={cat.id} value={cat.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {cat.color && (
                      <Box
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: '50%',
                          bgcolor: cat.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {cat.name}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {errors.category && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {errors.category}
              </Typography>
            )}
          </FormControl>

          {/* === コンテンツタイプ選択 === */}
          {/* 何をする部分か：テキスト/HTML/画像URLのタイプを切り替え */}
          {/* なぜ必要か：異なるコンテンツ種別に対応したスニペット管理のため */}
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              コンテンツタイプ
            </Typography>
            <ToggleButtonGroup
              value={contentType}
              exclusive
              onChange={(_, val) => val && setContentType(val)}
              size="small"
              disabled={saving}
            >
              <ToggleButton value="text" sx={{ px: 2 }}>
                <CodeIcon fontSize="small" sx={{ mr: 0.5 }} />
                テキスト
              </ToggleButton>
              <ToggleButton value="html" sx={{ px: 2 }}>
                <HtmlIcon fontSize="small" sx={{ mr: 0.5 }} />
                HTML
              </ToggleButton>
              <ToggleButton value="image" sx={{ px: 2 }}>
                <ImageIcon fontSize="small" sx={{ mr: 0.5 }} />
                画像URL
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* === コンテンツ入力 === */}
          <TextField
            label="コンテンツ"
            value={content}
            onChange={e => setContent(e.target.value)}
            error={Boolean(errors.content)}
            helperText={
              errors.content ||
              'プレースホルダー: {date} {time} {datetime} {username} {clipboard}'
            }
            fullWidth
            required
            multiline
            rows={6}
            disabled={saving}
            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.875rem' } }}
          />

          {/* === タグ入力 === */}
          {/* 何をする部分か：Enter またはカンマでタグを追加するChip入力 */}
          {/* なぜ必要か：複数タグによる柔軟な分類を可能にするため */}
          <Box>
            <TextField
              label="タグ（Enter またはカンマで追加）"
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={handleAddTag}
              fullWidth
              size="small"
              disabled={saving}
              InputProps={{
                endAdornment: tagInput && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleAddTag} disabled={saving}>
                      <AddIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {tags.length > 0 && (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                {tags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    onDelete={() => handleRemoveTag(tag)}
                    disabled={saving}
                  />
                ))}
              </Box>
            )}
          </Box>

          {/* === お気に入りチェック === */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isFavorite}
                onChange={e => setIsFavorite(e.target.checked)}
                disabled={saving}
              />
            }
            label="お気に入りに追加"
          />
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

export default SnippetFormDialog;
