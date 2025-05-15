import React, { useRef, useState, useEffect, FC } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import useWebSocket from 'react-use-websocket';
import config from '../config';
import { type WebSocketIncomingMessage } from '../types';

interface SpeechBubbleProps {
  position?: [number, number, number];
  message?: string;
  animalName?: string;
  color?: string;
  isInteractive?: boolean;
}

// 吹き出しコンポーネント
const SpeechBubble: FC<SpeechBubbleProps> = ({ 
  position = [0, 0, -1], 
  message, 
  animalName, 
  color = '#ffffff', 
  isInteractive = true 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotationRef = useRef<{ x: number, y: number, z: number }>({ x: 0, y: 0, z: 0 });
  const [currentMessage, setCurrentMessage] = useState<string>(message || 'こんにちは！私について知りたいですか？');
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [displayedMessage, setDisplayedMessage] = useState<string>('');
  const charIndex = useRef<number>(0);
  const messageQueue = useRef<string[]>([]);
  const [isTalking, setIsTalking] = useState<boolean>(false);
  const processedMessageIds = useRef<Set<string>>(new Set()); // 処理済みメッセージIDを追跡
  
  // WebSocketを使用して吹き出しのメッセージを更新（インタラクティブモードでのみ有効）
  const { lastMessage } = isInteractive ? useWebSocket<WebSocketIncomingMessage>(config.websocketEndpoint, {
    // パネルが表示されている時のみ接続
    share: true, // コンポーネント間でWebSocket接続を共有
    shouldReconnect: (closeEvent) => false, // ConversationPanelで再接続を管理
    onOpen: () => {
      console.log('SpeechBubble: WebSocket接続が確立されました');
    },
  }) : { lastMessage: null };

  // WebSocketからメッセージを受信したときの処理
  useEffect(() => {
    if (!isInteractive || !lastMessage) return;
    
    try {
      const data = JSON.parse(lastMessage.data) as WebSocketIncomingMessage;
      
      // メッセージIDを生成または取得
      const messageId = data.id || `${data.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // すでに処理したメッセージは無視
      if (processedMessageIds.current.has(messageId)) {
        return;
      }
      
      // 処理済みとしてマーク
      processedMessageIds.current.add(messageId);
      
      // テキストメッセージの場合のみ処理
      if (data.type === 'text' && data.data) {
        const messageText = data.data;
        
        // 現在表示中のメッセージがある場合はキューに追加
        if (isAnimating || isTalking) {
          messageQueue.current.push(messageText);
        } else {
          setCurrentMessage(messageText);
          startAnimation(messageText);
        }
      }
    } catch (error) {
      // JSONでない場合はテキストメッセージとして処理
      if (typeof lastMessage.data === 'string') {
        // 重複メッセージを避けるためのシンプルなハッシュ
        const messageHash = `text-${lastMessage.data}-${Date.now().toString().substring(0, 8)}`;
        
        if (!processedMessageIds.current.has(messageHash)) {
          processedMessageIds.current.add(messageHash);
          
          const messageText = lastMessage.data;
          
          // 現在表示中のメッセージがある場合はキューに追加
          if (isAnimating || isTalking) {
            messageQueue.current.push(messageText);
          } else {
            setCurrentMessage(messageText);
            startAnimation(messageText);
          }
        }
      }
    }
  }, [lastMessage, isInteractive, isAnimating, isTalking]);
  
  // 一定期間経過後に処理済みメッセージのクリーンアップを行う
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // 処理済みメッセージリストのサイズが大きくなりすぎないようにする
      if (processedMessageIds.current.size > 100) {
        processedMessageIds.current = new Set();
      }
    }, 60000); // 1分ごとにチェック
    
    return () => clearInterval(cleanupInterval);
  }, []);
  
  // メッセージアニメーションの開始
  const startAnimation = (text: string): void => {
    setIsAnimating(true);
    setIsTalking(true);
    charIndex.current = 0;
    setDisplayedMessage('');
  };
  
  // メッセージのアニメーション表示
  useEffect(() => {
    if (!isAnimating) return;
    
    const interval = setInterval(() => {
      if (charIndex.current < currentMessage.length) {
        setDisplayedMessage(prev => prev + currentMessage.charAt(charIndex.current));
        charIndex.current += 1;
      } else {
        clearInterval(interval);
        setIsAnimating(false);
        
        // アニメーション終了後、一定時間表示してから次のメッセージへ
        setTimeout(() => {
          setIsTalking(false);
          
          // キューに次のメッセージがあれば表示
          if (messageQueue.current.length > 0) {
            const nextMessage = messageQueue.current.shift()!;
            setCurrentMessage(nextMessage);
            startAnimation(nextMessage);
          }
        }, 5000); // 5秒間表示してから次へ
      }
    }, 50); // 50ミリ秒ごとに1文字表示
    
    return () => clearInterval(interval);
  }, [isAnimating, currentMessage]);
  
  // 毎フレーム実行される処理
  useFrame((state) => {
    if (!groupRef.current) return;
    
    // カメラの方向を常に向くように回転
    groupRef.current.lookAt(state.camera.position);
    
    // ゆっくりと上下に浮かぶアニメーション
    const time = state.clock.getElapsedTime();
    groupRef.current.position.y = position[1] + Math.sin(time) * 0.05;
    
    // 軽く揺れるアニメーション（話しているときはより強く揺れる）
    const amplitude = isTalking ? 0.08 : 0.05;
    rotationRef.current.z = Math.sin(time * 0.5) * amplitude;
    groupRef.current.rotation.z = rotationRef.current.z;
  });

  // 吹き出しをタップしたときの処理
  const handleClick = (): void => {
    if (!isInteractive) return;
    
    // 会話パネルの表示トリガーイベントを発火
    const event = new CustomEvent('toggleConversation', { 
      detail: { 
        show: true,
        animalName: animalName
      } 
    });
    window.dispatchEvent(event);
  };

  return (
    <group 
      ref={groupRef} 
      position={position as [number, number, number]}
      onClick={handleClick}
      // カーソルをポインターに変更（インタラクティブな場合のみ）
      onPointerOver={isInteractive ? (e) => { document.body.style.cursor = 'pointer'; } : undefined}
      onPointerOut={isInteractive ? (e) => { document.body.style.cursor = 'auto'; } : undefined}
    >
      {/* 吹き出しの背景 */}
      <mesh>
        <boxGeometry args={[1.5, 0.8, 0.05]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          roughness={0.3}
        />
      </mesh>
      
      {/* 吹き出しの尖った部分 */}
      <mesh position={[0, -0.5, 0]}>
        <coneGeometry args={[0.2, 0.3, 3]} rotation={[0, 0, Math.PI]} />
        <meshStandardMaterial 
          color={color} 
          transparent 
          opacity={0.7} 
          roughness={0.3}
        />
      </mesh>

      {/* 動物の名前 */}
      <Text
        position={[0, 0.25, 0.03]}
        fontSize={0.12}
        color="black"
        anchorX="center"
        anchorY="middle"
        font="/fonts/NotoSansJP-Bold.otf" // 日本語フォントを使用
      >
        {animalName || '動物'}
      </Text>
      
      {/* メッセージ本文（アニメーション表示されるテキスト） */}
      <Text
        position={[0, 0, 0.03]}
        fontSize={0.07}
        maxWidth={1.3}
        color="black"
        anchorX="center"
        anchorY="middle"
        font="/fonts/NotoSansJP-Regular.otf" // 日本語フォントを使用
      >
        {isAnimating ? displayedMessage : currentMessage}
      </Text>
      
      {/* 会話インタラクション用のヒント（インタラクティブモードの場合のみ） */}
      {isInteractive && (
        <Text
          position={[0, -0.3, 0.03]}
          fontSize={0.05}
          color="black"
          anchorX="center"
          anchorY="middle"
          font="/fonts/NotoSansJP-Regular.otf"
        >
          タップして会話を始める
        </Text>
      )}
      
      {/* 話している状態を示すアニメーション（オプション） */}
      {isTalking && (
        <mesh position={[0.65, 0, 0.03]}>
          <sphereGeometry args={[0.03, 16, 16]} />
          <meshBasicMaterial color="black" />
        </mesh>
      )}
    </group>
  );
};

export default SpeechBubble;