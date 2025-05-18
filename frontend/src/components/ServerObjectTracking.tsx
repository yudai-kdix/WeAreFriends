// ServerObjectTracking.tsx
// WebSocketを使用したサーバーベースの物体追跡コンポーネント

import React, { useEffect, useRef, useState } from 'react';
import useWebSocket from 'react-use-websocket';
import config from '../config';

// コンポーネントのプロパティ定義
interface ServerObjectTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  detectedAnimal: string;
  onPositionUpdate: (position: { x: number; y: number; width: number; height: number } | null) => void;
  clientId: string;
  active: boolean; // 追跡が有効かどうか
  showDebugInfo?: boolean;
}

// エクスポート用の追跡フラグ
export let isServerTracking = false;

const ServerObjectTracking: React.FC<ServerObjectTrackingProps> = ({
  videoRef,
  detectedAnimal,
  onPositionUpdate,
  clientId,
  active,
  showDebugInfo = false
}) => {
  // 追跡フレームレート (fps)
  const [fps, setFps] = useState<number>(3);
  
  // 追跡ステータス
  const [trackingStatus, setTrackingStatus] = useState<string>('inactive');
  
  // フレーム送信用のinterval ID
  const frameIntervalRef = useRef<number | null>(null);
  
  // 最後の検出結果のタイムスタンプ
  const lastDetectionTimeRef = useRef<number>(0);
  
  // WebSocket URL (クライアントIDを含める)
  const socketUrl = `${config.websocketEndpoint}?client_id=${encodeURIComponent(clientId)}`;
  
  // WebSocket接続を設定
  const { sendJsonMessage, lastMessage } = useWebSocket(socketUrl, {
    share: true, // 既存のWebSocket接続を再利用
    shouldReconnect: () => true,
    reconnectAttempts: config.websocket.maxReconnectAttempts,
    reconnectInterval: config.websocket.reconnectDelay,
  });
  
  // WebSocketメッセージ処理
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // 追跡結果メッセージの処理
        if (data.type === "tracking_result" && data.boundingBox) {
          if (showDebugInfo) {
            console.log("サーバー追跡結果:", data);
          }
          
          // バウンディングボックス情報を親コンポーネントに通知
          onPositionUpdate(data.boundingBox);
          lastDetectionTimeRef.current = Date.now();
        }
        
        // 追跡状態メッセージの処理
        else if (data.type === "tracking_status") {
          setTrackingStatus(data.status);
          
          if (data.status === "error") {
            console.error("サーバー追跡エラー:", data.message);
          }
          
          if (showDebugInfo) {
            console.log("追跡ステータス更新:", data);
          }
        }
      } catch (error) {
        console.error("WebSocketメッセージ解析エラー:", error);
      }
    }
  }, [lastMessage, onPositionUpdate, showDebugInfo]);
  
  // アクティブステータスが変更されたときの処理
  useEffect(() => {
    if (active) {
      startTracking();
    } else {
      stopTracking();
    }
    
    // クリーンアップ関数
    return () => {
      stopTracking();
    };
  }, [active]);
  
  // 追跡開始
  const startTracking = () => {
    if (frameIntervalRef.current) {
      // すでに追跡中なら何もしない
      return;
    }
    
    if (showDebugInfo) {
      console.log(`サーバー追跡を開始: 対象=${detectedAnimal}`);
    }
    
    // 追跡開始リクエストを送信
    sendJsonMessage({
      type: "start_tracking",
      animal_type: detectedAnimal,
      id: `track-${Date.now()}`
    });
    
    // フレーム送信インターバルを設定
    frameIntervalRef.current = window.setInterval(() => {
      captureAndSendFrame();
    }, 1000 / fps);
    
    isServerTracking = true;
  };
  
  // 追跡停止
  const stopTracking = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    
    // 追跡停止リクエストを送信
    sendJsonMessage({
      type: "stop_tracking",
      id: `stop-${Date.now()}`
    });
    
    isServerTracking = false;
    
    if (showDebugInfo) {
      console.log("サーバー追跡を停止しました");
    }
  };
  
  // フレームをキャプチャして送信
  const captureAndSendFrame = () => {
    if (!videoRef.current || !active) return;
    
    const video = videoRef.current;
    
    // ビデオの準備ができていない場合はスキップ
    if (video.readyState !== 4) return;
    
    try {
      // 一時的なキャンバスを作成
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('キャンバスのコンテキストを取得できません');
      }
      
      // 画像サイズを最適化（帯域幅削減のため）
      canvas.width = 480;
      canvas.height = 360;
      
      // ビデオフレームをキャンバスに描画
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 画像をBase64エンコード（JPEG形式、品質70%）
      const imageData = canvas.toDataURL('image/jpeg', 0.7);
      const base64Data = imageData.split(',')[1]; // 'data:image/jpeg;base64,' の部分を除去
      
      // WebSocketを通じて画像データを送信
      sendJsonMessage({
        type: "image",
        data: base64Data,
        id: `img-${Date.now()}`,
        animal_type: detectedAnimal
      });
      
    } catch (error) {
      console.error("フレーム送信エラー:", error);
    }
  };
  
  // FPSの動的調整（オプション機能）
  useEffect(() => {
    // 追跡が有効で、最後の検出から5秒以上経過した場合
    const checkDetectionTimeout = setInterval(() => {
      if (active && Date.now() - lastDetectionTimeRef.current > 5000) {
        // FPSを下げる（最小1fps）
        setFps(prevFps => Math.max(1, prevFps - 1));
      } else if (active && fps < 3) {
        // 検出が成功している場合、FPSを上げる（最大3fps）
        setFps(prevFps => Math.min(3, prevFps + 1));
      }
    }, 5000);
    
    return () => clearInterval(checkDetectionTimeout);
  }, [active, fps]);
  
  // フレームレートが変更された場合、インターバルを再設定
  useEffect(() => {
    if (active && frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = window.setInterval(() => {
        captureAndSendFrame();
      }, 1000 / fps);
      
      if (showDebugInfo) {
        console.log(`フレームレートを${fps}fpsに調整しました`);
      }
    }
  }, [fps]);
  
  // デバッグ情報（オプション）
  if (showDebugInfo) {
    return (
      <div className="server-tracking-debug" style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: 5,
        borderRadius: 5,
        fontSize: 12
      }}>
        <div>サーバー追跡: {active ? '有効' : '無効'}</div>
        <div>ステータス: {trackingStatus}</div>
        <div>FPS: {fps}</div>
        <div>対象: {detectedAnimal}</div>
      </div>
    );
  }
  
  // 通常は何も表示しない（バックグラウンドで動作）
  return null;
};

export default ServerObjectTracking;