// TrackingModeSelector.tsx
// 追跡モード選択のUIコンポーネント

import React from 'react';
import { Button, ButtonGroup, Tooltip, Badge } from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import CloudIcon from '@mui/icons-material/Cloud';
import { type TrackingMode } from './TrackingController';

// コンポーネントのプロパティ定義
interface TrackingModeSelectorProps {
  mode: TrackingMode;
  onChange: (mode: TrackingMode) => void;
  isConnected: boolean; // WebSocketが接続されているか
  disabled?: boolean;
  compact?: boolean; // コンパクト表示モード
}

const TrackingModeSelector: React.FC<TrackingModeSelectorProps> = ({
  mode,
  onChange,
  isConnected,
  disabled = false,
  compact = false
}) => {
  // モード切り替えハンドラ
  const handleModeChange = (newMode: TrackingMode) => {
    if (newMode !== mode && !disabled) {
      onChange(newMode);
    }
  };
  
  // コンパクトモード用のスタイル
  const compactStyle = compact ? {
    position: 'absolute' as const,
    right: 10,
    top: 10,
    zIndex: 100
  } : {};
  
  return (
    <div style={{
      padding: compact ? 8 : 16,
      backgroundColor: 'rgba(0, 0, 0, 0.1)',
      borderRadius: 8,
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      ...compactStyle
    }}>
      {!compact && (
        <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
          追跡モード
        </div>
      )}
      
      <ButtonGroup
        variant="contained"
        aria-label="追跡モード選択"
        disabled={disabled}
        size={compact ? "small" : "medium"}
      >
        <Tooltip title="ローカル追跡（デバイス内で処理）">
          <Button
            onClick={() => handleModeChange('local')}
            color={mode === 'local' ? 'primary' : 'inherit'}
            startIcon={<DevicesIcon />}
            sx={{
              backgroundColor: mode === 'local' ? '' : 'rgba(255, 255, 255, 0.3)',
              fontWeight: mode === 'local' ? 'bold' : 'normal'
            }}
          >
            {compact ? '' : 'ローカル'}
          </Button>
        </Tooltip>
        
        <Tooltip title={isConnected ? "サーバー追跡（クラウドで処理）" : "サーバーに接続されていません"}>
          <span>
            <Button
              onClick={() => handleModeChange('server')}
              color={mode === 'server' ? 'primary' : 'inherit'}
              startIcon={<CloudIcon />}
              disabled={disabled || !isConnected}
              sx={{
                backgroundColor: mode === 'server' ? '' : 'rgba(255, 255, 255, 0.3)',
                fontWeight: mode === 'server' ? 'bold' : 'normal'
              }}
            >
              {compact ? '' : 'サーバー'}
              {!isConnected && (
                <Badge
                  color="error"
                  variant="dot"
                  sx={{ ml: 1 }}
                />
              )}
            </Button>
          </span>
        </Tooltip>
      </ButtonGroup>
      
      {!compact && (
        <div style={{
          marginTop: 8,
          fontSize: '0.8rem',
          color: 'rgba(0, 0, 0, 0.7)',
          textAlign: 'center'
        }}>
          {mode === 'local' ? (
            '端末内で処理：低遅延、オフライン対応'
          ) : (
            'サーバーで処理：高精度、バッテリー節約'
          )}
        </div>
      )}
      
      {!isConnected && mode === 'server' && (
        <div style={{
          marginTop: 8,
          fontSize: '0.8rem',
          color: 'red',
          textAlign: 'center'
        }}>
          サーバーに接続できません
        </div>
      )}
    </div>
  );
};

export default TrackingModeSelector;