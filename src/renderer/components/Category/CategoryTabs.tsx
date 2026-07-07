import React, { useState } from 'react';
import {
  Tabs,
  Tab,
  Box,
  Tooltip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
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
  SwapVert as ReorderIcon,
} from '@mui/icons-material';
import type { Category } from '@/shared/types';
import CategoryReorderDialog from './CategoryReorderDialog';

// === カテゴリタブコンポーネント ===
// 何をする部分か：カテゴリ切り替え用のタブUIと編集・削除操作を提供
// なぜ必要か：スニペットをカテゴリ別に整理・表示し、管理操作も提供するため

// === アイコン名 → コンポーネントのマップ ===
// 何をする部分か：DBに保存されたアイコン名文字列からMUIコンポーネントを返す
// なぜ必要か：動的なアイコン表示を型安全に実現するため
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

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  onCategoryCreate: () => void;
  onCategoryEdit: (category: Category) => void;
  onCategoryDelete: (category: Category) => void;
  onCategoryUpdate: () => void;
  compact?: boolean; // コンパクトモード時はラベルを省略しアイコンのみ表示
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryCreate,
  onCategoryEdit,
  onCategoryDelete,
  onCategoryUpdate,
  compact = false,
}) => {
  const currentTabValue = selectedCategoryId === null ? 'all' : selectedCategoryId;

  // === 並び替えダイアログ状態 ===
  // 何をする部分か：カテゴリ並び替えダイアログの開閉を管理
  // なぜ必要か：カテゴリタブの表示順をユーザーが変更できるようにするため
  const [reorderDialogOpen, setReorderDialogOpen] = useState(false);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number | string) => {
    onCategorySelect(newValue === 'all' ? null : (newValue as number));
  };

  // === アイコンコンポーネント取得 ===
  // 何をする部分か：カテゴリのアイコン名からMUIアイコンコンポーネントを返す
  // なぜ必要か：DBに保存された文字列名を実際のコンポーネントに変換するため
  const getCategoryIcon = (category: Category) => {
    const IconComponent = category.icon ? ICON_MAP[category.icon] : null;
    return IconComponent
      ? <IconComponent fontSize="small" />
      : <FolderIcon fontSize="small" />;
  };

  // === 選択中カテゴリのタブラベル（編集・削除ボタン付き） ===
  // 何をする部分か：選択中タブにのみ編集・削除ボタンを表示するラベルを生成
  // なぜ必要か：操作対象が明確なカテゴリにのみ操作ボタンを表示するため
  // Note: Tab は <button> としてレンダーされるため、label 内は span/div を使用して
  //       <button> の入れ子（HTML非合法）を回避する
  const getCategoryLabel = (category: Category) => {
    const isSelected = currentTabValue === category.id;

    return (
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.25 }}>
        <span>{category.name}</span>
        {isSelected && (
          <>
            {/* 編集ボタン（span ベースで button 入れ子を回避） */}
            <Tooltip title="カテゴリを編集">
              <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={e => { e.stopPropagation(); onCategoryEdit(category); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCategoryEdit(category); } }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  ml: 0.5,
                  p: 0.25,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'text.secondary',
                  '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
                }}
              >
                <EditIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>

            {/* 削除ボタン（span ベースで button 入れ子を回避） */}
            <Tooltip title="カテゴリを削除">
              <Box
                component="span"
                role="button"
                tabIndex={0}
                onClick={e => { e.stopPropagation(); onCategoryDelete(category); }}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onCategoryDelete(category); } }}
                sx={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  p: 0.25,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  color: 'error.main',
                  '&:hover': { bgcolor: 'error.light', opacity: 0.85 },
                }}
              >
                <DeleteIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>
          </>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        borderBottom: 1,
        borderColor: 'divider',
        bgcolor: 'background.paper',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {/* === カテゴリタブ一覧 === */}
      <Box sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Tabs
          value={currentTabValue}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: compact ? 36 : 48,
            '& .MuiTab-root': {
              minHeight: compact ? 36 : 48,
              minWidth: compact ? 0 : undefined,
              padding: compact ? '6px 10px' : undefined,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
          }}
        >
          {/* === 「すべて」タブ === */}
          <Tab
            label={compact ? undefined : 'すべて'}
            value="all"
            icon={<FolderIcon fontSize="small" />}
            iconPosition="start"
          />

          {/* === カテゴリタブ（動的生成） === */}
          {/* 何をする部分か：DBから取得したカテゴリごとにタブを生成 */}
          {/* なぜ必要か：カテゴリ一覧をタブUIとして表示するため */}
          {categories.map(category => (
            <Tab
              key={category.id}
              label={compact ? undefined : getCategoryLabel(category)}
              value={category.id}
              icon={getCategoryIcon(category)}
              iconPosition="start"
              sx={{
                // === カテゴリカラーの適用 ===
                // 何をする部分か：選択中タブにカテゴリ固有の色を反映
                // なぜ必要か：視覚的な識別性を向上させるため
                ...(category.color && currentTabValue === category.id
                  ? {
                      color: `${category.color} !important`,
                      '& .MuiTab-iconWrapper': { color: category.color },
                    }
                  : {}),
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* === カテゴリ追加・並び替えボタン群 === */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1, gap: 0.5, flexShrink: 0 }}>
        {/* 並び替えボタン（カテゴリが2件以上のとき表示） */}
        {categories.length >= 2 && (
          <Tooltip title="カテゴリを並び替え">
            <Box
              component="button"
              onClick={() => setReorderDialogOpen(true)}
              sx={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                border: 'none', background: 'none', borderRadius: '50%',
                p: 0.75, cursor: 'pointer',
                color: 'text.secondary',
                '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
              }}
            >
              <ReorderIcon fontSize="small" />
            </Box>
          </Tooltip>
        )}

        {/* カテゴリ追加ボタン */}
        <Tooltip title="カテゴリを追加">
          <Box
            component="button"
            onClick={onCategoryCreate}
            sx={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'none', borderRadius: '50%',
              p: 0.75, cursor: 'pointer',
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <AddIcon fontSize="small" />
          </Box>
        </Tooltip>
      </Box>

      {/* === カテゴリ並び替えダイアログ === */}
      <CategoryReorderDialog
        open={reorderDialogOpen}
        categories={categories}
        onClose={() => setReorderDialogOpen(false)}
        onSaved={() => {
          setReorderDialogOpen(false);
          onCategoryUpdate();
        }}
      />
    </Box>
  );
};

export default CategoryTabs;
