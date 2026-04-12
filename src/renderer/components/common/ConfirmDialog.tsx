import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

// === 汎用確認ダイアログコンポーネント ===
// 何をする部分か：削除等の破壊的操作の前にユーザーに確認を求めるダイアログ
// なぜ必要か：window.confirm() をMUIデザインに統一し、詳細メッセージを表示するため

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  detail?: string; // 追加情報（例：削除されるスニペット数）
  confirmLabel?: string;
  cancelLabel?: string;
  severity?: 'error' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  detail,
  confirmLabel = '確認',
  cancelLabel = 'キャンセル',
  severity = 'warning',
  onConfirm,
  onCancel,
}) => {
  // === アイコンの選択 ===
  // 何をする部分か：severity に応じたアイコンを返す
  // なぜ必要か：操作の重大度を視覚的に伝えるため
  const getIcon = () => {
    switch (severity) {
      case 'error':
        return <ErrorIcon color="error" sx={{ fontSize: 32 }} />;
      case 'warning':
        return <WarningIcon color="warning" sx={{ fontSize: 32 }} />;
      case 'info':
        return <InfoIcon color="info" sx={{ fontSize: 32 }} />;
    }
  };

  // === 確認ボタンの色設定 ===
  // 何をする部分か：severity に合わせたボタン色を返す
  // なぜ必要か：削除は赤色など、操作の重大度をボタンでも示すため
  const getConfirmColor = () => {
    switch (severity) {
      case 'error':
        return 'error' as const;
      case 'warning':
        return 'warning' as const;
      default:
        return 'primary' as const;
    }
  };

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {getIcon()}
          <Typography variant="h6" component="span">
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* === メインメッセージ === */}
        <Typography variant="body1">{message}</Typography>

        {/* === 追加情報（オプション） === */}
        {detail && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 1.5,
              p: 1.5,
              bgcolor: 'action.hover',
              borderRadius: 1,
              fontStyle: 'italic',
            }}
          >
            {detail}
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} variant="outlined">
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} variant="contained" color={getConfirmColor()}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
