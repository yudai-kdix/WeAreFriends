// src/utils/modelLoader.ts

import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

// グローバル変数としてモデルとステータスを保持
let modelInstance: cocoSsd.ObjectDetection | null = null;
let isLoading = false;
let loadPromise: Promise<cocoSsd.ObjectDetection> | null = null;
let loadError: Error | null = null;

/**
 * COCO-SSDモデルのロード状態を取得
 */
export const getModelStatus = () => {
  return {
    isLoaded: !!modelInstance,
    isLoading,
    hasError: !!loadError,
    error: loadError
  };
};

/**
 * COCO-SSDモデルをロード
 * すでにロード済みの場合は既存のモデルを返す
 */
export const loadModel = async (): Promise<cocoSsd.ObjectDetection> => {
  // すでにモデルがロードされていれば、それを返す
  if (modelInstance) {
    return modelInstance;
  }
  
  // ロード中の場合は既存のPromiseを返す
  if (loadPromise) {
    return loadPromise;
  }
  
  // ロード開始
  isLoading = true;
  loadError = null;
  
  try {
    console.log('COCO-SSDモデルのロードを開始します');
    
    // ロードプロミスを作成
    loadPromise = cocoSsd.load();
    
    // モデルをロード
    modelInstance = await loadPromise;
    console.log('COCO-SSDモデルのロードが完了しました');
    
    return modelInstance;
  } catch (error) {
    console.error('COCO-SSDモデルのロード中にエラーが発生しました:', error);
    loadError = error instanceof Error ? error : new Error('モデルのロード中に不明なエラーが発生しました');
    throw loadError;
  } finally {
    isLoading = false;
    loadPromise = null;
  }
};

/**
 * モデルを使用して画像内のオブジェクトを検出
 */
export const detectObjects = async (
  imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
): Promise<cocoSsd.DetectedObject[]> => {
  const model = await loadModel();
  return model.detect(imageElement);
};