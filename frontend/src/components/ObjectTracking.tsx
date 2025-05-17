// src/components/ObjectTracking.tsx

import React, { useEffect, useRef } from 'react';
import '@tensorflow/tfjs';
import { useModel } from '../contexts/ModelContext';

// ObjectTrackingコンポーネントのプロパティ定義
interface ObjectTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detectedAnimal: string;
  onPositionUpdate: (position: { x: number; y: number; width: number; height: number } | null) => void;
  showDebugInfo?: boolean;
}

// 追跡フラグをグローバルに宣言（外部からアクセス可能に）
export let isTracking = false;

const ObjectTracking: React.FC<ObjectTrackingProps> = ({ 
  videoRef, 
  detectedAnimal, 
  onPositionUpdate,
  showDebugInfo = false
}) => {
  const { model } = useModel(); // コンテキストからモデルを取得
  
  const requestAnimationRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const detectionIntervalRef = useRef<number>(10); // ミリ秒単位で検出間隔を設定
  
  // コンポーネントのマウント時に追跡を開始
  useEffect(() => {
    // ローカル変数でクリーンアップ時の参照を保持
    let isComponentMounted = true;
    
    const startTracking = async () => {
      // モデルがロードされていない場合は早期リターン
      if (!model) {
        console.error('モデルがロードされていません。追跡を開始できません。');
        return;
      }
      
      console.log(`${detectedAnimal}の追跡を開始します`);
      isTracking = true;
      
      // 追跡ループを開始
      if (isComponentMounted) {
        detectFrame();
      }
    };
    
    // モデルが利用可能になったら追跡を開始
    if (model) {
      startTracking();
    }
    
    // クリーンアップ関数
    return () => {
      isComponentMounted = false;
      if (requestAnimationRef.current) {
        cancelAnimationFrame(requestAnimationRef.current);
        requestAnimationRef.current = null;
      }
      isTracking = false;
      console.log('追跡を停止しました');
    };
  }, [model, detectedAnimal]);

  // フレームごとの検出処理
  const detectFrame = async () => {
    if (!model || !videoRef.current || !isTracking) return;
    
    const video = videoRef.current;
    
    // ビデオの準備ができているか確認
    if (video.readyState !== 4) {
      requestAnimationRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    // 検出間隔を調整（パフォーマンス最適化のため）
    const now = performance.now();
    if (now - lastDetectionTimeRef.current > detectionIntervalRef.current) {
      lastDetectionTimeRef.current = now;

      try {
        // モデルを使用して予測を実行
        const predictions = await model.detect(video);
        
        // 指定された動物を検索
        let targetClass;
        
        // 検出したい動物の種類の定義
        // 英語の動物名とCOCO-SSDのクラス名を対応させる
        switch (detectedAnimal) {
          case 'elephant':
            targetClass = 'elephant';
            break;
          case 'zebra':
            targetClass = 'zebra';
            break;
          case 'giraffe':
            targetClass = 'giraffe';
            break;
          case 'cat':
            targetClass = 'cat';
            break;
          case 'dog':
            targetClass = 'dog';
            break;
          case 'bird':
            targetClass = 'bird';
            break;
          case 'horse':
            targetClass = 'horse';
            break;
          case 'sheep':
            targetClass = 'sheep';
            break;
          case 'cow':
            targetClass = 'cow';
            break;
          case 'bear':
            targetClass = 'bear';
            break;
          default:
            // 特定のクラスでない場合は人間も検出対象に（テスト用）
            targetClass = ['person', detectedAnimal];
            break;
        }
        
        // 検出結果から対象の動物を探す
        const found = predictions.find(p => {
          if (Array.isArray(targetClass)) {
            return targetClass.includes(p.class);
          } else {
            return p.class === targetClass;
          }
        });
        
        if (found) {
          // 見つかった場合は正規化された位置情報を返す
          const { bbox } = found;
          const [x, y, width, height] = bbox;
          
          // ビデオサイズに対して正規化された位置情報を計算
          const normalizedPosition = {
            x: x / video.videoWidth,
            y: y / video.videoHeight,
            width: width / video.videoWidth,
            height: height / video.videoHeight
          };
          
          // 位置情報を親コンポーネントに通知
          onPositionUpdate(normalizedPosition);
        } else {
          // デバッグモードがオンで、5秒に一回だけログを表示
          if (showDebugInfo && Math.floor(now / 5000) !== Math.floor(lastDetectionTimeRef.current / 5000)) {
            console.log(`${detectedAnimal}が見つかりませんでした。検出されたオブジェクト:`, 
              predictions.length > 0 ? predictions.map(p => p.class).join(', ') : 'なし');
          }
          // 見つからなかった場合はnullを返す（オプション）
          // onPositionUpdate(null);
        }
      } catch (err) {
        console.error('フレーム検出中にエラーが発生しました:', err);
      }
    }
    
    // 次のフレームを処理
    requestAnimationRef.current = requestAnimationFrame(detectFrame);
  };

  // 実際のレンダリングは何も表示しない（バックグラウンドで動作）
  return null;
};

export default ObjectTracking;