import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Divider,
  Stack,
  ToggleButtonGroup,
  ToggleButton,
  Switch,
  FormControlLabel,
  CircularProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  LightMode as LightIcon,
  DarkMode as DarkIcon,
  SettingsBrightness as AutoIcon,
  Keyboard as KeyboardIcon,
  Info as InfoIcon,
  RestartAlt as ResetIcon,
  FileDownload as DownloadIcon,
  FileUpload as UploadIcon,
  Storage as StorageIcon,
} from '@mui/icons-material';

// === 設定ダイアログコンポーネント ===
// 何をする部分か：テーマ・通知・ショートカット等のユーザー設定を管理するダイアログ
// なぜ必要か：アプリの動作をユーザーが好みに合わせてカスタマイズできるようにするため

interface AppSettings {
  globalShortcut: string;
  quickSearchShortcut: string;
  theme: 'light' | 'dark' | 'auto';
  showNotifications: boolean;
  minimizeToTray: boolean;
  maxRecentItems: number;
}

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  theme: 'light' | 'dark' | 'auto';
  onThemeChange: (theme: 'light' | 'dark' | 'auto') => void;
  onDataImported?: () => void; // インポート完了後のデータ再取得コールバック
}

const SettingsDialog: React.FC<SettingsDialogProps> = ({
  open,
  onClose,
  theme,
  onThemeChange,
  onDataImported,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [version, setVersion] = useState<string>('');
  const [resetConfirm, setResetConfirm] = useState(false);
  const [dataMessage, setDataMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

  // === ダイアログ開時の設定読み込み ===
  // 何をする部分か：DBから保存済み設定を取得して初期化
  // なぜ必要か：常に最新の設定値を表示するため
  useEffect(() => {
    if (!open) return;

    const loadSettings = async () => {
      setLoading(true);
      setResetConfirm(false);
      try {
        const [settingsRes, versionRes] = await Promise.all([
          window.electronAPI.settings.get(),
          window.electronAPI.app.getVersion(),
        ]);

        if (settingsRes.success) {
          const s = settingsRes.data as AppSettings;
          setSettings(s);
          // DBの設定を useTheme フックにも同期
          if (s.theme && s.theme !== theme) {
            onThemeChange(s.theme);
          }
        }
        if (versionRes.success) {
          setVersion(versionRes.data as string);
        }
      } catch (err) {
        console.error('設定読み込みエラー:', err);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // === テーマ変更処理 ===
  // 何をする部分か：テーマ選択を即座にUIに反映し、DBにも保存
  // なぜ必要か：設定変更をリアルタイムでプレビューできるようにするため
  const handleThemeChange = async (_: React.MouseEvent, value: string | null) => {
    if (!value || !settings) return;
    const newTheme = value as 'light' | 'dark' | 'auto';
    setSettings(prev => prev ? { ...prev, theme: newTheme } : prev);
    onThemeChange(newTheme);
    try {
      await window.electronAPI.settings.set('theme', newTheme);
    } catch (err) {
      console.error('テーマ保存エラー:', err);
    }
  };

  // === 通知設定変更処理 ===
  const handleNotificationChange = async (checked: boolean) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, showNotifications: checked } : prev);
    setSaving(true);
    try {
      await window.electronAPI.settings.set('showNotifications', checked);
    } catch (err) {
      console.error('通知設定保存エラー:', err);
    } finally {
      setSaving(false);
    }
  };

  // === トレイ最小化設定変更処理 ===
  const handleMinimizeToTrayChange = async (checked: boolean) => {
    if (!settings) return;
    setSettings(prev => prev ? { ...prev, minimizeToTray: checked } : prev);
    setSaving(true);
    try {
      await window.electronAPI.settings.set('minimizeToTray', checked);
    } catch (err) {
      console.error('トレイ設定保存エラー:', err);
    } finally {
      setSaving(false);
    }
  };

  // === データエクスポート処理 ===
  // 何をする部分か：全カテゴリ・スニペットをJSONファイルに書き出す
  // なぜ必要か：バックアップとデータ移行手段を提供するため
  const handleExport = async () => {
    setSaving(true);
    setDataMessage(null);
    try {
      const res = await window.electronAPI.data.export();
      if (res.success) {
        if (res.data?.canceled) return;
        setDataMessage({
          text: `エクスポート完了：カテゴリ${res.data.categoriesCount}件、スニペット${res.data.snippetsCount}件`,
          severity: 'success',
        });
      } else {
        setDataMessage({ text: 'エクスポートに失敗しました', severity: 'error' });
      }
    } catch {
      setDataMessage({ text: 'エクスポート中にエラーが発生しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // === データインポート処理 ===
  // 何をする部分か：JSONファイルから既存データへカテゴリ・スニペットをマージ
  // なぜ必要か：バックアップからの復元とデータ移行のため
  const handleImport = async () => {
    setSaving(true);
    setDataMessage(null);
    try {
      const res = await window.electronAPI.data.import();
      if (res.success) {
        if (res.data?.canceled) return;
        setDataMessage({
          text: `インポート完了：スニペット${res.data.snippetsCount}件を追加しました`,
          severity: 'success',
        });
        onDataImported?.();
      } else {
        setDataMessage({ text: res.message || 'インポートに失敗しました', severity: 'error' });
      }
    } catch {
      setDataMessage({ text: 'インポート中にエラーが発生しました', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  // === 設定リセット処理 ===
  // 何をする部分か：全設定をデフォルト値に戻す
  // なぜ必要か：設定が壊れた場合やデフォルトに戻したい場合のリカバリーのため
  const handleReset = async () => {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setSaving(true);
    try {
      const res = await window.electronAPI.settings.reset();
      if (res.success) {
        const defaultSettings = res.data as AppSettings;
        setSettings(defaultSettings);
        onThemeChange(defaultSettings.theme || 'auto');
      }
    } catch (err) {
      console.error('設定リセットエラー:', err);
    } finally {
      setSaving(false);
      setResetConfirm(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        設定
        {saving && <CircularProgress size={16} sx={{ ml: 1 }} />}
      </DialogTitle>

      <DialogContent dividers>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Stack spacing={3} sx={{ pt: 0.5 }}>

            {/* ─── テーマ設定 ─── */}
            {/* 何をする部分か：ライト/ダーク/オートの3段階テーマ切り替え */}
            {/* なぜ必要か：ユーザーの環境や好みに合わせた表示を提供するため */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                テーマ
              </Typography>
              <ToggleButtonGroup
                value={settings?.theme || theme}
                exclusive
                onChange={handleThemeChange}
                size="small"
              >
                <ToggleButton value="light" sx={{ px: 2 }}>
                  <LightIcon fontSize="small" sx={{ mr: 0.5 }} />
                  ライト
                </ToggleButton>
                <ToggleButton value="dark" sx={{ px: 2 }}>
                  <DarkIcon fontSize="small" sx={{ mr: 0.5 }} />
                  ダーク
                </ToggleButton>
                <ToggleButton value="auto" sx={{ px: 2 }}>
                  <AutoIcon fontSize="small" sx={{ mr: 0.5 }} />
                  自動
                </ToggleButton>
              </ToggleButtonGroup>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.75, display: 'block' }}>
                「自動」はOSのダークモード設定に追従します
              </Typography>
            </Box>

            <Divider />

            {/* ─── 動作設定 ─── */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                動作
              </Typography>
              <Stack spacing={0.5}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.showNotifications ?? true}
                      onChange={e => handleNotificationChange(e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">通知を表示</Typography>
                      <Typography variant="caption" color="text.secondary">
                        コピー・作成・削除時のシステム通知
                      </Typography>
                    </Box>
                  }
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings?.minimizeToTray ?? true}
                      onChange={e => handleMinimizeToTrayChange(e.target.checked)}
                      disabled={saving}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">×ボタンでトレイに最小化</Typography>
                      <Typography variant="caption" color="text.secondary">
                        無効にするとウィンドウを閉じるとアプリが終了します
                      </Typography>
                    </Box>
                  }
                />
              </Stack>
            </Box>

            <Divider />

            {/* ─── グローバルショートカット ─── */}
            {/* 何をする部分か：登録済みショートカットキーを表示 */}
            {/* なぜ必要か：ユーザーが設定されているショートカットを確認できるようにするため */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <KeyboardIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  グローバルショートカット
                </Typography>
              </Box>
              <Stack spacing={1.5}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">アプリ表示/非表示</Typography>
                  <Chip
                    label={settings?.globalShortcut || 'Ctrl+Shift+V'}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2">クイック検索</Typography>
                  <Chip
                    label={settings?.quickSearchShortcut || 'Ctrl+Shift+Q'}
                    size="small"
                    variant="outlined"
                    sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}
                  />
                </Box>
              </Stack>
            </Box>

            <Divider />

            {/* ─── アプリ情報 ─── */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <InfoIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  アプリ情報
                </Typography>
              </Box>
              <Stack spacing={0.75}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">アプリ名</Typography>
                  <Typography variant="body2">PasteDeck</Typography>
                </Box>
                {version && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">バージョン</Typography>
                    <Typography variant="body2">{version}</Typography>
                  </Box>
                )}
              </Stack>
            </Box>

            <Divider />

            {/* ─── データ管理 ─── */}
            {/* 何をする部分か：JSONエクスポート・インポートによるデータバックアップと復元 */}
            {/* なぜ必要か：PC移行やバックアップなどのデータポータビリティを提供するため */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 1.5 }}>
                <StorageIcon fontSize="small" color="action" />
                <Typography variant="subtitle2" fontWeight={600}>
                  データ管理
                </Typography>
              </Box>
              <Stack direction="row" spacing={1.5} sx={{ mb: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DownloadIcon />}
                  onClick={handleExport}
                  disabled={saving}
                >
                  エクスポート
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<UploadIcon />}
                  onClick={handleImport}
                  disabled={saving}
                >
                  インポート
                </Button>
              </Stack>
              <Stack spacing={0.25}>
                <Typography variant="caption" color="text.secondary">
                  エクスポート: 全データをJSONファイルに保存します
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  インポート: JSONファイルからデータをマージします（既存データは保持）
                </Typography>
              </Stack>
              {dataMessage && (
                <Alert severity={dataMessage.severity} sx={{ mt: 1.5 }} onClose={() => setDataMessage(null)}>
                  {dataMessage.text}
                </Alert>
              )}
            </Box>

            <Divider />

            {/* ─── 設定リセット ─── */}
            {/* 何をする部分か：全設定をデフォルト値に戻すボタン */}
            {/* なぜ必要か：設定が意図しない状態になった場合のリカバリー手段を提供するため */}
            <Box>
              {resetConfirm && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  本当にリセットしますか？全ての設定がデフォルトに戻ります。
                  もう一度「設定をリセット」をクリックすると実行されます。
                </Alert>
              )}
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<ResetIcon />}
                onClick={handleReset}
                disabled={saving}
              >
                設定をリセット
              </Button>
            </Box>

          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="contained">
          閉じる
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SettingsDialog;
