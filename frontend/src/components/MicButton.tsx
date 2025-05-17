// src/components/MicButton.tsx

import React from 'react';
import { useConversation } from '../contexts/ConversationContext';
import './MicButton.css';

interface MicButtonProps {
  className?: string;
  buttonText?: {
    default?: string;
    listening?: string;
    speaking?: string;
  };
}

const MicButton: React.FC<MicButtonProps> = ({
  className = '',
  buttonText = {
    default: '🎤 話しかける',
    listening: '🎤 聞いています...',
    speaking: '🔊 返答中...'
  }
}) => {
  const { isListening, isSpeaking, isConnected, toggleListening } = useConversation();
  
  // ボタンクラスの構築
  const buttonClass = `mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''} ${className}`;
  
  // ボタンテキストの選択
  let text = buttonText.default;
  if (isListening) text = buttonText.listening || '聞いています...';
  if (isSpeaking) text = buttonText.speaking || '返答中...';
  
  return (
    <button
      className={buttonClass}
      onClick={toggleListening}
      disabled={isSpeaking || !isConnected}
    >
      {text}
    </button>
  );
};

export default MicButton;