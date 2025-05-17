// src/components/AnimatedSpeechBubble.tsx（修正版）

import React, { useState, useEffect, useRef } from 'react';
import { useConversation } from '../contexts/ConversationContext';
import MicButton from './MicButton';
import './AnimatedSpeechBubble.css';

interface AnimatedSpeechBubbleProps {
  animalName: string;
  color?: string;
  isVisible: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  initialMessage?: string;
}

const AnimatedSpeechBubble: React.FC<AnimatedSpeechBubbleProps> = ({
  animalName,
  color = '#ffffff',
  isVisible,
  position,
  initialMessage,
}) => {
  const { messages, isSpeaking } = useConversation();
  const [displayedMessage, setDisplayedMessage] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const charIndexRef = useRef<number>(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // 最新のメッセージを取得（初期メッセージまたは会話の最新メッセージ）
  const latestMessage = messages.length > 0 
    ? messages[messages.length - 1].content 
    : initialMessage || `こんにちは！${animalName}です。何か質問してください。`;
  
  // メッセージが変更されたときにアニメーションを開始
  useEffect(() => {
    if (latestMessage && isVisible) {
      startAnimation(latestMessage);
    }
    
    return () => {
      // クリーンアップ：アニメーションフレームをキャンセル
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [latestMessage, isVisible]);
  
  // 位置が更新されたときの処理
  useEffect(() => {
    if (position && isVisible) {
      // 位置が更新されたら吹き出しの位置も更新
      updateBubblePosition();
      
      // 位置が変わるたびにアニメーションフレームを要求
      const updatePositionLoop = () => {
        updateBubblePosition();
        animationFrameRef.current = requestAnimationFrame(updatePositionLoop);
      };
      
      animationFrameRef.current = requestAnimationFrame(updatePositionLoop);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [position, isVisible]);
  
  // 吹き出しの位置を更新
  const updateBubblePosition = () => {
    if (!bubbleRef.current || !position) return;
    
    const bubble = bubbleRef.current;
    const container = bubble.parentElement;
    
    if (!container) return;
    
    // コンテナの寸法を取得
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    
    // 吹き出しの寸法を取得
    const bubbleWidth = bubble.offsetWidth;
    const bubbleHeight = bubble.offsetHeight;
    
    // 動物の位置に基づいて吹き出しの位置を計算
    const animalCenterX = position.x + (position.width / 2);
    const animalTopY = position.y;
    
    // 吹き出しの位置を設定（動物の上部中央）
    let bubbleX = animalCenterX * containerWidth - (bubbleWidth / 2);
    let bubbleY = animalTopY * containerHeight - bubbleHeight - 20; // 20pxの余裕
    
    // 画面外にはみ出さないように調整
    bubbleX = Math.max(10, Math.min(containerWidth - bubbleWidth - 10, bubbleX));
    bubbleY = Math.max(10, Math.min(containerHeight - bubbleHeight - 10, bubbleY));
    
    // スタイルを適用
    bubble.style.left = `${bubbleX}px`;
    bubble.style.top = `${bubbleY}px`;
    
    // 吹き出しの尻尾の位置を調整
    const tailElement = bubble.querySelector('.bubble-tail') as HTMLElement;
    if (tailElement) {
      // 尻尾の位置を動物の中心に合わせる
      const tailX = (animalCenterX * containerWidth - bubbleX);
      const constrainedTailX = Math.max(20, Math.min(bubbleWidth - 20, tailX));
      tailElement.style.left = `${constrainedTailX}px`;
    }
  };
  
  // メッセージアニメーションの開始
  const startAnimation = (textToAnimate: string) => {
    setIsAnimating(true);
    charIndexRef.current = 0;
    setDisplayedMessage('');
    
    // 文字を1つずつ表示するアニメーション
    const animateText = () => {
      if (charIndexRef.current < textToAnimate.length) {
        setDisplayedMessage(prev => prev + textToAnimate.charAt(charIndexRef.current));
        charIndexRef.current += 1;
        setTimeout(animateText, 50); // 50msごとに1文字表示
      } else {
        setIsAnimating(false);
      }
    };
    
    animateText();
  };
  
  // 吹き出しが非表示の場合は何も表示しない
  if (!isVisible || !position) return null;
  
  return (
    <div 
      ref={bubbleRef}
      className="animal-speech-bubble"
      style={{ 
        backgroundColor: color,
      }}
    >
      <div className="bubble-header">
        {animalName}
      </div>
      
      <div className="bubble-content">
        {isAnimating ? (
          <>
            {displayedMessage}
            <span className="typing-animation"></span>
          </>
        ) : (
          latestMessage
        )}
      </div>
      
      <div 
        className="bubble-tail" 
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );
};

export default AnimatedSpeechBubble;