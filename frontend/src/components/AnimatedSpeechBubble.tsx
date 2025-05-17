import React, { useState, useEffect, useRef } from 'react';
import './AnimatedSpeechBubble.css';

interface AnimatedSpeechBubbleProps {
  message: string;
  animalName: string;
  color?: string;
  isVisible: boolean;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  onClick?: () => void;
}

const AnimatedSpeechBubble: React.FC<AnimatedSpeechBubbleProps> = ({
  message,
  animalName,
  color = '#ffffff',
  isVisible,
  position,
  onClick
}) => {
  const [displayedMessage, setDisplayedMessage] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const charIndexRef = useRef<number>(0);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // メッセージが変更されたときにアニメーションを開始
  useEffect(() => {
    if (message && isVisible) {
      startAnimation();
    }
    
    return () => {
      // クリーンアップ：アニメーションフレームをキャンセル
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [message, isVisible]);
  
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
  const startAnimation = () => {
    setIsAnimating(true);
    charIndexRef.current = 0;
    setDisplayedMessage('');
    
    // 文字を1つずつ表示するアニメーション
    const animateText = () => {
      if (charIndexRef.current < message.length) {
        setDisplayedMessage(prev => prev + message.charAt(charIndexRef.current));
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
      onClick={onClick}
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
          message
        )}
      </div>
      
      <div className="bubble-hint">
        タップして会話する
      </div>
      
      <div 
        className="bubble-tail" 
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );
};

export default AnimatedSpeechBubble;