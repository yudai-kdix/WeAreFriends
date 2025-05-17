// src/components/IdentifyButton.tsx

import React from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import './IdentifyButton.css';

interface IdentifyButtonProps {
  onIdentify: () => void;
  isLoading: boolean;
  isModelLoading: boolean;
  isModelLoaded: boolean;
  showMicButton?: boolean;
  className?: string;
}

const IdentifyButton: React.FC<IdentifyButtonProps> = ({
  onIdentify,
  isLoading,
  isModelLoading,
  isModelLoaded,
  showMicButton = false,
  className = '',
}) => {
  // ボタンが無効化されるかどうか
  const isDisabled = isLoading || isModelLoading || !isModelLoaded;
  
  // ボタンの状態と位置に基づいてクラス名を構築
  let buttonClassName = 'identify-button';
  
  // 位置クラス
  buttonClassName += showMicButton 
    ? ' identify-button--corner' 
    : ' identify-button--centered';
  
  // 状態クラス
  if (isDisabled) {
    buttonClassName += ' identify-button--disabled';
  } else {
    buttonClassName += showMicButton 
      ? ' identify-button--secondary' 
      : ' identify-button--primary';
  }
  
  // ローディング中はアニメーション
  if (isLoading) {
    buttonClassName += ' identify-button--loading';
  }
  
  // 追加のクラス名
  if (className) {
    buttonClassName += ` ${className}`;
  }
  
  // アクセシビリティラベル
  let ariaLabel = "オブジェクトを識別";
  if (isLoading) ariaLabel = "識別中...";
  else if (isModelLoading) ariaLabel = "モデル準備中...";
  else if (!isModelLoaded) ariaLabel = "モデル未ロード";
  else if (showMicButton) ariaLabel = "再識別";
  
  return (
    <button
      onClick={onIdentify}
      className={buttonClassName}
      disabled={isDisabled}
      aria-label={ariaLabel}
    >
      {showMicButton ? (
        <RefreshCw className="identify-button__icon" />
      ) : (
        <Camera className="identify-button__icon" />
      )}
    </button>
  );
};

export default IdentifyButton;