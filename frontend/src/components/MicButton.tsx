// src/components/MicButton.tsx

import React from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { useConversation } from '../contexts/ConversationContext';
import './MicButton.css';
import speechService from '../services/speechService';

interface MicButtonProps {
  className?: string;
}

const MicButton: React.FC<MicButtonProps> = ({
  className = '',
}) => {
  const { isListening, isSpeaking, isConnected, toggleListening } = useConversation();

  // トグルボタンのクリックハンドラーにデバッグを追加
  const handleToggleClick = () => {
    console.log('マイクボタンクリック前のリスナー状態:');
    speechService.debugLogListeners();
    
    toggleListening();
    
    // 非同期のためタイムアウトで少し待つ
    setTimeout(() => {
      console.log('マイクボタンクリック後のリスナー状態:');
      speechService.debugLogListeners();
    }, 100);
  };
  
  // ボタンのクラス名を構築
  let buttonClassName = 'mic-button';
  
  if (isListening) {
    buttonClassName += ' mic-button--listening';
  } else if (isSpeaking) {
    buttonClassName += ' mic-button--speaking';
  } else {
    buttonClassName += ' mic-button--default';
  }
  
  if (className) {
    buttonClassName += ` ${className}`;
  }
  
  return (
    <button
      className={buttonClassName}
      onClick={handleToggleClick}
      disabled={isSpeaking || !isConnected}
      aria-label={isListening ? "音声認識を停止" : "話しかける"}
    >
      {isListening ? (
        <Mic className="mic-button__icon mic-button__icon--pulse" />
      ) : isSpeaking ? (
        <Volume2 className="mic-button__icon" />
      ) : (
        <Mic className="mic-button__icon" />
      )}
    </button>
  );
};

export default MicButton;