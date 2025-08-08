import React from 'react';
import {
  Tabs,
  Tab,
  Box,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Add as AddIcon,
  Folder as FolderIcon,
} from '@mui/icons-material';
import type { Category } from '@/shared/types';

// === カテゴリタブコンポーネント ===
// 何をする部分か：カテゴリ切り替え用のタブUIを提供
// なぜ必要か：スニペットをカテゴリ別に整理・表示するため

interface CategoryTabsProps {
  categories: Category[];
  selectedCategoryId: number | null;
  onCategorySelect: (categoryId: number | null) => void;
  onCategoryCreate: () => void;
  onCategoryUpdate: () => void;
}

const CategoryTabs: React.FC<CategoryTabsProps> = ({
  categories,
  selectedCategoryId,
  onCategorySelect,
  onCategoryCreate,
  onCategoryUpdate,
}) => {
  // === タブ選択ハンドリング ===
  // 何をする部分か：タブクリック時のカテゴリ切り替え処理
  // なぜ必要か：選択されたカテゴリのスニペットを表示するため
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number | string) => {
    if (newValue === 'all') {
      // === 「すべて」タブの処理 ===
      // 何をする部分か：全カテゴリのスニペットを表示
      // なぜ必要か：カテゴリを横断した一覧表示のため
      onCategorySelect(null);
    } else {
      // === 特定カテゴリタブの処理 ===
      onCategorySelect(newValue as number);
    }
  };

  // === アイコン表示の統一処理 ===
  // 何をする部分か：カテゴリアイコンまたはデフォルトアイコンを表示
  // なぜ必要か：視覚的な識別性とデザイン統一のため
  const getCategoryIcon = (category: Category) => {
    // TODO: Material-UIアイコンの動的読み込み実装
    return <FolderIcon fontSize="small" />;
  };

  // === タブの値決定 ===
  // 何をする部分か：現在選択中のタブを特定
  // なぜ必要か：Tabsコンポーネントのvalue属性に設定するため
  const currentTabValue = selectedCategoryId === null ? 'all' : selectedCategoryId;

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
            minHeight: 48,
            '& .MuiTab-root': {
              minHeight: 48,
              textTransform: 'none',
              fontSize: '0.875rem',
            },
          }}
        >
          {/* === 「すべて」タブ === */}
          {/* 何をする部分か：全カテゴリ横断表示用のタブ */}
          {/* なぜ必要か：すべてのスニペットを一度に確認できるようにするため */}
          <Tab
            label="すべて"
            value="all"
            icon={<FolderIcon fontSize="small" />}
            iconPosition="start"
            sx={{
              color: currentTabValue === 'all' ? 'primary.main' : 'text.secondary',
            }}
          />

          {/* === 動的カテゴリタブ === */}
          {/* 何をする部分か：データベースから取得したカテゴリごとのタブを生成 */}
          {categories.map((category) => (
            <Tab
              key={category.id}
              label={category.name}
              value={category.id}
              icon={getCategoryIcon(category)}
              iconPosition="start"
              sx={{
                color: currentTabValue === category.id ? 'primary.main' : 'text.secondary',
                // === カスタムカラーの適用 ===
                // 何をする部分か：各カテゴリの設定色をタブに反映
                // なぜ必要か：視覚的な識別性を向上させるため
                ...(category.color &&
                  currentTabValue === category.id && {
                    color: category.color,
                    '& .MuiTab-iconWrapper': {
                      color: category.color,
                    },
                  }),
              }}
            />
          ))}
        </Tabs>
      </Box>

      {/* === カテゴリ管理ボタン群 === */}
      <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
        {/* === カテゴリ追加ボタン === */}
        {/* 何をする部分か：新しいカテゴリ作成のトリガーUI */}
        {/* なぜ必要か：ユーザーがカテゴリを増やせるようにするため */}
        <Tooltip title="カテゴリを追加">
          <IconButton
            size="small"
            onClick={onCategoryCreate}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                bgcolor: 'primary.light',
              },
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* === カテゴリ数表示バッジ === */}
        {/* 何をする部分か：登録されているカテゴリ総数の表示 */}
        {/* なぜ必要か：システム全体の情報をユーザーに提供するため */}
        <Badge
          badgeContent={categories.length}
          color="primary"
          sx={{
            '& .MuiBadge-badge': {
              fontSize: '0.75rem',
              minWidth: 16,
              height: 16,
            },
          }}
        >
          <Box sx={{ width: 8, height: 16 }} />
        </Badge>
      </Box>
    </Box>
  );
};

export default CategoryTabs;