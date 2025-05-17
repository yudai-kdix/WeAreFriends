// src/components/ModelLoader.tsx

import React, { useEffect, useState } from 'react';
import './ModelLoader.css';
import { useModel } from '../contexts/ModelContext';

interface ModelLoaderProps {
  onLoadComplete: () => void;
  onError: (error: Error) => void;
}

const ModelLoader: React.FC<ModelLoaderProps> = ({ onLoadComplete, onError }) => {
  const { isLoading, error, loadModel, model } = useModel();
  const [loadProgress, setLoadProgress] = useState<number>(0);
  
  useEffect(() => {
    let isMounted = true;
    let progressInterval: NodeJS.Timeout | null = null;
    
    const simulateProgress = () => {
      progressInterval = setInterval(() => {
        if (isMounted) {
          setLoadProgress(prev => {
            // 仮の進捗表示 (0-95%)
            if (prev < 95) {
              return prev + (95 - prev) * 0.1;
            }
            return prev;
          });
        }
      }, 300);
    };
    
    const loadModelAsync = async () => {
      try {
        // 進捗表示開始
        simulateProgress();
        
        // モデルのロード
        await loadModel();
      } catch (error) {
        // エラー処理はコンテキスト内部で行われる
      }
    };

    // モデルの状態をチェック
    if (model) {
      // すでにロード済みの場合は即座に完了を通知
      setLoadProgress(100);
      onLoadComplete();
    } else if (!isLoading) {
      // ロードされておらず、ロード中でもない場合はロードを開始
      loadModelAsync();
    } else {
      // すでにロード中の場合は、進捗表示のみ
      simulateProgress();
    }
    
    // クリーンアップ関数
    return () => {
      isMounted = false;
      if (progressInterval) clearInterval(progressInterval);
    };
  }, [model, isLoading, loadModel, onLoadComplete]);
  
  // モデルとエラー状態の監視
  useEffect(() => {
    if (model) {
      setLoadProgress(100);
      onLoadComplete();
    }
    
    if (error) {
      onError(error);
    }
  }, [model, error, onLoadComplete, onError]);

  // ロード中の表示
  return (
    <div className="model-loader">
      <div className={`loader-container ${loadProgress === 100 ? 'model-loaded' : ''}`}>
        <h3>オブジェクト追跡の準備中...</h3>
        <div className="progress-bar-container">
          <div 
            className="progress-bar" 
            style={{ width: `${loadProgress}%` }}
          ></div>
        </div>
        <p>{Math.round(loadProgress)}%</p>
        <p className="loader-message">
          {loadProgress < 40 && "モデルをダウンロードしています..."}
          {loadProgress >= 40 && loadProgress < 80 && "モデルを初期化しています..."}
          {loadProgress >= 80 && loadProgress < 100 && "もう少しで準備完了です..."}
          {loadProgress === 100 && "準備完了!"}
        </p>
      </div>
    </div>
  );
};

export default ModelLoader;