import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  TextField,
  IconButton,
  Box,
  Tooltip,
  CircularProgress,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Refresh as RefreshIcon,
  LightMode as LightModeIcon,
  DarkMode as DarkModeIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

// === ヘッダーコンポーネント ===
// 何をする部分か：検索バー、操作ボタン、テーマ切り替えを配置したアプリ上部UI
// なぜ必要か：主要な操作への素早いアクセスと統一された操作体験のため

interface HeaderProps {
  onSearch: (query: string) => void;
  onFavoriteToggle: (showFavorites: boolean) => void;
  onThemeToggle: () => void;
  onRefresh: () => void;
  darkMode: boolean;
  isLoading: boolean;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  onFavoriteToggle,
  onThemeToggle,
  onRefresh,
  darkMode,
  isLoading,
}) => {
  // === 状態管理 ===
  // 何をする部分か：検索入力とお気に入り表示の状態を管理
  // なぜ必要か：ユーザー操作の状態をUIに反映するため
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFavorites, setShowFavorites] = useState<boolean>(false);

  // === 検索入力ハンドリング ===
  // 何をする部分か：検索文字列の変更を検知して親コンポーネントに通知
  // なぜ必要か：リアルタイム検索機能を実現するため
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchQuery(value);
    
    // === リアルタイム検索の実装 ===
    // 何をする部分か：入力と同時に検索を実行
    // なぜ必要か：素早いフィルタリングでユーザビリティを向上させるため
    onSearch(value);
  };

  // === 検索フィールドクリア ===
  // 何をする部分か：検索条件をリセットして全件表示に戻す
  // なぜ必要か：検索状態から素早く元の表示に戻るため
  const handleSearchClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  // === お気に入り表示切り替え ===
  // 何をする部分か：お気に入りのみ表示とすべて表示を切り替え
  // なぜ必要か：よく使うスニペットへの素早いアクセスを提供するため
  const handleFavoriteToggle = () => {
    const newShowFavorites = !showFavorites;
    setShowFavorites(newShowFavorites);
    onFavoriteToggle(newShowFavorites);
  };

  // === Enterキーでの検索実行 ===
  // 何をする部分か：Enterキー押下時の検索フォーカス維持
  // なぜ必要か：キーボード操作での使いやすさ向上のため
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      // 既にリアルタイム検索で処理済みなので、フォーカス維持のみ
      (event.target as HTMLInputElement).blur();
      setTimeout(() => {
        (event.target as HTMLInputElement).focus();
      }, 100);
    }
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        {/* === 検索フィールド === */}
        {/* 何をする部分か：スニペットタイトル・内容・タグでの文字列検索UI */}
        <Box sx={{ flexGrow: 1, maxWidth: 400 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="スニペットを検索..."
            value={searchQuery}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchQuery && (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={handleSearchClear}
                    edge="end"
                  >
                    <span style={{ fontSize: '18px', color: 'gray' }}>×</span>
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': {
                  borderColor: 'transparent',
                },
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
                '&.Mui-focused fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
        </Box>

        {/* === 操作ボタン群 === */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* === お気に入り表示切り替えボタン === */}
          {/* 何をする部分か：お気に入りのみ/すべて表示の切り替えUI */}
          <Tooltip title={showFavorites ? 'すべて表示' : 'お気に入りのみ表示'}>
            <IconButton
              color={showFavorites ? 'secondary' : 'default'}
              onClick={handleFavoriteToggle}
              sx={{
                bgcolor: showFavorites ? 'secondary.light' : 'transparent',
                '&:hover': {
                  bgcolor: showFavorites ? 'secondary.main' : 'action.hover',
                },
              }}
            >
              {showFavorites ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>

          {/* === 更新ボタン === */}
          {/* 何をする部分か：データ再読み込みのUI */}
          {/* なぜ必要か：手動でのデータ最新化を可能にするため */}
          <Tooltip title="データを更新">
            <IconButton
              color="default"
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? (
                <CircularProgress size={24} />
              ) : (
                <RefreshIcon />
              )}
            </IconButton>
          </Tooltip>

          {/* === テーマ切り替えボタン === */}
          {/* 何をする部分か：ライト/ダークモード切り替えUI */}
          <Tooltip title={darkMode ? 'ライトモード' : 'ダークモード'}>
            <IconButton color="default" onClick={onThemeToggle}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* === 設定ボタン === */}
          {/* 何をする部分か：設定画面へのアクセスUI（将来の拡張用） */}
          <Tooltip title="設定">
            <IconButton
              color="default"
              onClick={() => {
                // TODO: 設定画面の実装
                console.log('設定画面を開く');
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;