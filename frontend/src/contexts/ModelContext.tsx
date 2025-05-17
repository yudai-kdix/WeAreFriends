// src/contexts/ModelContext.tsx

import React, { createContext, useContext, useState, type ReactNode } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

// コンテキストの型定義
interface ModelContextType {
  model: cocoSsd.ObjectDetection | null;
  isLoading: boolean;
  error: Error | null;
  loadModel: () => Promise<void>;
}

// デフォルト値を持つコンテキストを作成
const ModelContext = createContext<ModelContextType>({
  model: null,
  isLoading: false,
  error: null,
  loadModel: async () => {},
});

// コンテキストプロバイダーの型
interface ModelProviderProps {
  children: ReactNode;
}

// コンテキストプロバイダーコンポーネント
export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // モデルをロードする関数
  const loadModel = async (): Promise<void> => {
    // すでにロード済みまたはロード中ならスキップ
    if (model || isLoading) return;
    
    try {
      setIsLoading(true);
      setError(null);
      console.log('COCO-SSDモデルのロードを開始します');
      
      // モデルをロード
      const loadedModel = await cocoSsd.load();
      setModel(loadedModel);
      console.log('COCO-SSDモデルのロードが完了しました');
    } catch (err) {
      console.error('モデルのロード中にエラーが発生しました:', err);
      setError(err instanceof Error ? err : new Error('モデルのロード中に不明なエラーが発生しました'));
    } finally {
      setIsLoading(false);
    }
  };

  // プロバイダーが提供する値
  const contextValue: ModelContextType = {
    model,
    isLoading,
    error,
    loadModel
  };

  return (
    <ModelContext.Provider value={contextValue}>
      {children}
    </ModelContext.Provider>
  );
};

// カスタムフックでコンテキストを使いやすくする
export const useModel = () => useContext(ModelContext);