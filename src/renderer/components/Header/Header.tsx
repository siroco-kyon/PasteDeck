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
  PushPin as PushPinIcon,
  PushPinOutlined as PushPinOutlinedIcon,
  PhotoSizeSelectSmall as CompactIcon,
  Fullscreen as NormalSizeIcon,
} from '@mui/icons-material';

// === ヘッダーコンポーネント ===
// 何をする部分か：検索バー、操作ボタン、テーマ切り替えを配置したアプリ上部UI
// なぜ必要か：主要な操作への素早いアクセスと統一された操作体験のため

interface HeaderProps {
  onSearch: (query: string) => void;
  onFavoriteToggle: (showFavorites: boolean) => void;
  onThemeToggle: () => void;
  onRefresh: () => void;
  onSettingsOpen: () => void; // 設定ダイアログを開く
  darkMode: boolean;
  isLoading: boolean;
  alwaysOnTop: boolean; // 常に最前面固定モードの現在値
  onToggleAlwaysOnTop: () => void;
  compactMode: boolean; // コンパクトモードの現在値
  onToggleCompactMode: () => void;
}

const Header: React.FC<HeaderProps> = ({
  onSearch,
  onFavoriteToggle,
  onThemeToggle,
  onRefresh,
  onSettingsOpen,
  darkMode,
  isLoading,
  alwaysOnTop,
  onToggleAlwaysOnTop,
  compactMode,
  onToggleCompactMode,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavorites, setShowFavorites] = useState(false);

  // === 検索入力ハンドリング ===
  // 何をする部分か：入力と同時にリアルタイム検索を実行
  // なぜ必要か：素早いフィルタリングでユーザビリティを向上させるため
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch(value);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    onSearch('');
  };

  const handleFavoriteToggle = () => {
    const next = !showFavorites;
    setShowFavorites(next);
    onFavoriteToggle(next);
  };

  // === キーボード処理 ===
  // 何をする部分か：Escape キー押下で検索をクリアする
  // なぜ必要か：キーボードだけで検索解除できるようにするため
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleSearchClear();
    }
  };

  return (
    <AppBar position="static" elevation={1}>
      <Toolbar sx={{ gap: compactMode ? 1 : 2 }} variant={compactMode ? 'dense' : 'regular'}>
        {/* === 検索フィールド === */}
        <Box sx={{ flexGrow: 1, maxWidth: compactMode ? 200 : 400 }}>
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
                  <IconButton size="small" onClick={handleSearchClear} edge="end">
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>×</span>
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{
              bgcolor: 'background.paper',
              borderRadius: 1,
              '& .MuiOutlinedInput-root fieldset': { borderColor: 'transparent' },
              '& .MuiOutlinedInput-root:hover fieldset': { borderColor: 'primary.main' },
              '& .MuiOutlinedInput-root.Mui-focused fieldset': { borderColor: 'primary.main' },
            }}
          />
        </Box>

        {/* === 操作ボタン群 === */}
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {/* お気に入りフィルター */}
          <Tooltip title={showFavorites ? 'すべて表示' : 'お気に入りのみ表示'}>
            <IconButton
              color={showFavorites ? 'secondary' : 'default'}
              onClick={handleFavoriteToggle}
              sx={{ bgcolor: showFavorites ? 'rgba(245,0,87,0.12)' : 'transparent' }}
            >
              {showFavorites ? <StarIcon /> : <StarBorderIcon />}
            </IconButton>
          </Tooltip>

          {/* 更新ボタン */}
          <Tooltip title="データを更新">
            <span>
              <IconButton color="default" onClick={onRefresh} disabled={isLoading}>
                {isLoading ? <CircularProgress size={24} color="inherit" /> : <RefreshIcon />}
              </IconButton>
            </span>
          </Tooltip>

          {/* テーマ切り替え */}
          <Tooltip title={darkMode ? 'ライトモード' : 'ダークモード'}>
            <IconButton color="default" onClick={onThemeToggle}>
              {darkMode ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* 設定ボタン */}
          {/* 何をする部分か：設定ダイアログを開くボタン */}
          {/* なぜ必要か：テーマ・通知等のユーザー設定画面へのアクセスを提供するため */}
          <Tooltip title="設定">
            <IconButton color="default" onClick={onSettingsOpen}>
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* === 常に最前面固定トグル === */}
          {/* 何をする部分か：メインウィンドウを常に最前面に表示するモードを切り替え */}
          {/* なぜ必要か：他アプリの作業中も参照し続けたいユーザーのニーズに対応するため */}
          <Tooltip title={alwaysOnTop ? '最前面固定を解除' : '常に最前面に固定'}>
            <IconButton
              color={alwaysOnTop ? 'primary' : 'default'}
              onClick={onToggleAlwaysOnTop}
              sx={{ bgcolor: alwaysOnTop ? 'rgba(33,150,243,0.12)' : 'transparent' }}
            >
              {alwaysOnTop ? <PushPinIcon /> : <PushPinOutlinedIcon />}
            </IconButton>
          </Tooltip>

          {/* === コンパクトモードトグル === */}
          {/* 何をする部分か：ウィンドウを小型化し、UIの密度を上げるモードを切り替え */}
          {/* なぜ必要か：作業スペースを圧迫しない小さな表示形態を提供するため */}
          <Tooltip title={compactMode ? '通常サイズに戻す' : 'コンパクトモード'}>
            <IconButton
              color={compactMode ? 'primary' : 'default'}
              onClick={onToggleCompactMode}
            >
              {compactMode ? <NormalSizeIcon /> : <CompactIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
