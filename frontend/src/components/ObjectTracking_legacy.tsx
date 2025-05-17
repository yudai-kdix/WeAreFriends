import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';

interface ObjectTrackingProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  detectedAnimal: string | null;
  onPositionUpdate: (position: { x: number; y: number; width: number; height: number } | null) => void;
}

const ObjectTracking: React.FC<ObjectTrackingProps> = ({ 
  videoRef, 
  detectedAnimal,
  onPositionUpdate 
}) => {

  // モデル関連の状態
  const [model, setModel] = useState<cocossd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  
  // 追跡関連の状態
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const isActiveRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  
  // canvasの参照
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // デバッグモード
  const debugModeRef = useRef<boolean>(true);
  
  // 動物の名前をCOCO-SSDモデルのクラス名にマッピング
  const animalToCocoClass: Record<string, string[]> = {
    'cat': ['cat'],
    'dog': ['dog'],
    'bird': ['bird'],
    'horse': ['horse'],
    'cow': ['cow'],
    'sheep': ['sheep'],
    'elephant': ['elephant'],
    'zebra': ['zebra'],
    'giraffe': ['giraffe'],
    'bear': ['bear'],
    'penguin': ['bird'], // penguinはbirdとして検出
    // 汎用的なマッピングも追加
    'animal': ['cat', 'dog', 'bird', 'horse', 'cow', 'sheep', 'elephant', 'zebra', 'giraffe', 'bear'],
    // 物体も検出できるように
    'person': ['person'],
    'bicycle': ['bicycle'],
    'car': ['car'],
    'book': ['book'],
    'cell phone': ['cell phone'],
    'bottle': ['bottle'],
  };
  
  // モデルを読み込む関数を定義
  const loadTensorFlowModel = useCallback(async () => {
    if (model || isModelLoading) {
      console.log('モデルはすでに読み込み中または読み込み済みです');
      return model;
    }
    
    try {
      console.log('物体認識モデルを読み込み中...');
      setIsModelLoading(true);
      
      // TensorFlow.jsを初期化
      await tf.ready();
      console.log('TensorFlow.js初期化完了、バックエンド:', tf.getBackend());
      
      // COCO-SSDモデルを読み込み
      const loadedModel = await cocossd.load({
        base: 'lite_mobilenet_v2', // より軽量なモデル
      });
      
      console.log('物体認識モデルの読み込みが完了しました');
      setModel(loadedModel);
      setIsModelLoading(false);
      
      return loadedModel;
    } catch (error) {
      console.error('モデルの読み込み中にエラーが発生しました:', error);
      setIsModelLoading(false);
      return null;
    }
  }, [model, isModelLoading]);
  
  // マウント時にモデルを読み込む
  useEffect(() => {
    loadTensorFlowModel();
  }, [loadTensorFlowModel]);
  
  // Canvasのセットアップ
  useEffect(() => {
    const setupCanvas = () => {
      if (!canvasRef.current) {
        console.warn('Canvasが存在しません');
        return;
      }
      
      if (!videoRef.current) {
        console.warn('Videoが存在しません');
        return;
      }
      
      console.log('Canvasをセットアップします');
      
      // ビデオのサイズを取得
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // ビデオの表示サイズを使用
      const videoWidth = video.clientWidth || 640;
      const videoHeight = video.clientHeight || 480;
      
      // キャンバスのサイズを設定
      canvas.width = videoWidth;
      canvas.height = videoHeight;
      
      console.log(`Canvasサイズを設定: ${videoWidth}x${videoHeight}`);
      
      // デバッグ情報を出力
      console.log('ビデオ情報:', {
        内部幅: video.videoWidth,
        内部高さ: video.videoHeight,
        表示幅: video.clientWidth,
        表示高さ: video.clientHeight,
        offsetWidth: video.offsetWidth,
        offsetHeight: video.offsetHeight,
        style: video.style
      });
      
      // テスト描画
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(10, 10, 200, 100);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('Canvas初期化完了', 20, 60);
      }
    };
    
    // 初期セットアップ
    setupCanvas();
    
    // リサイズイベントのリスナー
    const handleResize = () => {
      requestAnimationFrame(setupCanvas);
    };
    
    // ビデオのメタデータロード完了イベント
    const handleVideoMetadata = () => {
      console.log('ビデオメタデータがロードされました');
      setupCanvas();
    };
    
    window.addEventListener('resize', handleResize);
    if (videoRef.current) {
      videoRef.current.addEventListener('loadedmetadata', handleVideoMetadata);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', handleVideoMetadata);
      }
    };
  }, [videoRef.current]);
  
  // 検出された動物が変更されたとき & modelの状態が変化したとき
  useEffect(() => {
    const startDetection = async () => {
      if (!detectedAnimal) {
        console.log('検出対象が指定されていません');
        stopTracking();
        return;
      }
      
      console.log(`検出対象: ${detectedAnimal}`);
      
      // モデルがまだロードされていなければロードする
      let currentModel = model;
      if (!currentModel) {
        console.log('モデルがまだロードされていません。ロードを開始します...');
        currentModel = await loadTensorFlowModel();
      }
      
      if (currentModel) {
        console.log('モデルの準備ができました。追跡を開始します。');
        startTracking(currentModel);
      } else {
        console.warn('モデルのロードに失敗しました。追跡を開始できません。');
        stopTracking();
      }
    };
    
    startDetection();
    
    return () => {
      stopTracking();
    };
  }, [detectedAnimal, model, loadTensorFlowModel]);
  
  // ビデオからキャンバスへの座標変換（修正版）
  const transformCoordinates = useCallback((
    bbox: [number, number, number, number],
    flipHorizontal: boolean = true
  ) => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // ビデオの内部サイズと表示サイズ
    const videoInternalWidth = video.videoWidth;
    const videoInternalHeight = video.videoHeight;
    const videoDisplayWidth = canvas.width; // キャンバスと同じサイズで表示
    const videoDisplayHeight = canvas.height;
    
    // バウンディングボックスのピクセル座標（内部解像度ベース）
    const [bboxX, bboxY, bboxWidth, bboxHeight] = bbox;
    
    // アスペクト比に基づくスケーリング係数を計算
    const videoAspect = videoInternalWidth / videoInternalHeight;
    const displayAspect = videoDisplayWidth / videoDisplayHeight;
    
    let scaleX, scaleY, offsetX = 0, offsetY = 0;
    
    if (videoAspect > displayAspect) {
      // ビデオが横長の場合、高さに合わせて拡大/縮小
      scaleY = videoDisplayHeight / videoInternalHeight;
      scaleX = scaleY;
      // はみ出た部分のオフセットを計算
      offsetX = (videoDisplayWidth - (videoInternalWidth * scaleX)) / 2;
    } else {
      // ビデオが縦長の場合、幅に合わせて拡大/縮小
      scaleX = videoDisplayWidth / videoInternalWidth;
      scaleY = scaleX;
      // はみ出た部分のオフセットを計算
      offsetY = (videoDisplayHeight - (videoInternalHeight * scaleY)) / 2;
    }
    
    // 座標をスケーリング
    let scaledX = bboxX * scaleX + offsetX;
    const scaledY = bboxY * scaleY + offsetY;
    const scaledWidth = bboxWidth * scaleX;
    const scaledHeight = bboxHeight * scaleY;
    
    // 水平反転が適用されている場合は座標を反転
    if (flipHorizontal) {
      scaledX = videoDisplayWidth - scaledX - scaledWidth;
    }
    
    // デバッグ情報
    if (debugModeRef.current) {
      console.log('座標変換情報:', {
        元座標: [bboxX, bboxY, bboxWidth, bboxHeight],
        スケール: [scaleX, scaleY],
        オフセット: [offsetX, offsetY],
        変換後: [scaledX, scaledY, scaledWidth, scaledHeight],
        反転: flipHorizontal
      });
    }
    
    // キャンバス上のピクセル座標
    return {
      x: scaledX,
      y: scaledY,
      width: scaledWidth,
      height: scaledHeight
    };
  }, [videoRef, canvasRef]);
  
  // 正規化座標への変換（ピクセル座標から0-1の範囲に）
  const normalizeCoordinates = useCallback((
    pixelCoords: { x: number, y: number, width: number, height: number }
  ) => {
    if (!canvasRef.current) return null;
    
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    
    // 座標を0-1の範囲に正規化
    return {
      x: pixelCoords.x / canvasWidth,
      y: pixelCoords.y / canvasHeight,
      width: pixelCoords.width / canvasWidth,
      height: pixelCoords.height / canvasHeight
    };
  }, [canvasRef]);
  
  // バウンディングボックスの描画
  const drawBoundingBox = useCallback((
    ctx: CanvasRenderingContext2D, 
    coords: { x: number, y: number, width: number, height: number },
    label: string, 
    score: number
  ) => {
    if (!ctx) return;
    
    // バウンディングボックスの描画
    ctx.strokeStyle = '#00FFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
    
    // 背景（テキストが見やすいように）
    ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
    const textWidth = ctx.measureText(`${label} ${(score * 100).toFixed(0)}%`).width;
    ctx.fillRect(coords.x, coords.y - 25, textWidth + 10, 25);
    
    // ラベルとスコアの描画
    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(`${label} ${(score * 100).toFixed(0)}%`, coords.x + 5, coords.y - 7);
    
    console.log(`描画: ${label} (${(score * 100).toFixed(0)}%) @ [${Math.round(coords.x)},${Math.round(coords.y)},${Math.round(coords.width)},${Math.round(coords.height)}]`);
  }, []);
  
  // 追跡の開始 - modelを引数として受け取る
  const startTracking = useCallback((detectionModel: cocossd.ObjectDetection) => {
    if (isTracking) {
      console.log('すでに追跡中です');
      return;
    }
    
    console.log('物体追跡を開始します');
    setIsTracking(true);
    isActiveRef.current = true;
    
    // テスト描画を行う
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.fillRect(50, 50, 200, 100);
        ctx.font = '20px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('追跡開始', 100, 100);
      }
    }
    
    // 追跡を開始
    detectFrame(detectionModel);
  }, [isTracking]);
  
  // 追跡の停止
  const stopTracking = useCallback(() => {
    if (!isTracking && !isActiveRef.current) {
      return;
    }
    
    console.log('物体追跡を停止します');
    setIsTracking(false);
    isActiveRef.current = false;
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // キャンバスをクリア
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
        ctx.fillRect(0, 0, 200, 50);
        ctx.font = '16px Arial';
        ctx.fillStyle = 'white';
        ctx.fillText('追跡停止', 20, 30);
      }
    }
  }, [isTracking]);
  
  // フレーム単位での検出 - modelを引数として受け取る
  const detectFrame = useCallback(async (detectionModel: cocossd.ObjectDetection) => {
    console.log('detectFrameが呼び出されました');
    
    // 条件チェック
    if (!isActiveRef.current || !detectionModel || !videoRef.current || !canvasRef.current || !detectedAnimal) {
      console.warn('検出条件を満たしていません:',
        isActiveRef.current ? '✓' : '✗', 'isActive',
        detectionModel ? '✓' : '✗', 'model',
        videoRef.current ? '✓' : '✗', 'video',
        canvasRef.current ? '✓' : '✗', 'canvas',
        detectedAnimal ? '✓' : '✗', 'detectedAnimal'
      );
      
      // 続行条件がなければここで終了
      if (!isActiveRef.current) return;
      
      // 次のフレームを予約
      animationFrameRef.current = requestAnimationFrame(() => detectFrame(detectionModel));
      return;
    }
    
    try {
      const now = Date.now();
      
      // 前回の検出から1秒以上経過していたら実行
      if (now - lastDetectionTimeRef.current >= 100) {
        lastDetectionTimeRef.current = now;
        
        console.log(`物体検出を実行中... (${new Date().toLocaleTimeString()})`);
        
        // キャンバスの準備
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          console.warn('キャンバスコンテキストが取得できません');
          return;
        }
        
        // キャンバスをクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 現在時刻を表示（デバッグ用）
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(10, 10, 150, 30);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`検出: ${new Date().toLocaleTimeString()}`, 15, 30);
        
        // 物体検出を実行
        console.time('物体検出');
        const predictions = await detectionModel.detect(videoRef.current);
        console.timeEnd('物体検出');
        
        console.log('検出結果:', predictions);
        
        // 検出対象の動物クラス名を取得
        const targetClasses = animalToCocoClass[detectedAnimal] || [detectedAnimal];
        console.log('検索対象クラス:', targetClasses.join(', '));
        
        // 最も確信度の高い検出結果を保持
        let bestMatch = null;
        let highestScore = 0;
        
        // 検出結果から対象の動物を検索
        for (const prediction of predictions) {
          if (targetClasses.includes(prediction.class) && prediction.score > highestScore) {
            // より確信度の高い検出結果を保持
            highestScore = prediction.score;
            bestMatch = prediction;
          }
        }
        
        if (bestMatch && highestScore > 0.5) { // 確信度が50%以上の場合のみ
          console.log(`✓ 検出成功: ${bestMatch.class}, 信頼度: ${(highestScore * 100).toFixed(1)}%, 位置: [${bestMatch.bbox.join(', ')}]`);
          
          // 座標変換（内部解像度から表示サイズへ）
          const transformedCoords = transformCoordinates(bestMatch.bbox, true);
          
          if (transformedCoords) {
            // デバッグ用に全ての検出結果を表示
            if (debugModeRef.current) {
              predictions.forEach((pred) => {
                if (pred !== bestMatch) { // ベストマッチ以外の検出結果
                  const coords = transformCoordinates(pred.bbox, true);
                  if (coords) {
                    ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
                    
                    ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
                    ctx.fillRect(coords.x, coords.y - 20, 100, 20);
                    
                    ctx.fillStyle = 'black';
                    ctx.font = '12px Arial';
                    ctx.fillText(`${pred.class} ${(pred.score * 100).toFixed(0)}%`, coords.x + 5, coords.y - 5);
                  }
                }
              });
            }
            
            // メインの検出対象のバウンディングボックスを描画
            drawBoundingBox(ctx, transformedCoords, bestMatch.class, bestMatch.score);
            
            // センターポイントを描画（デバッグ用）
            if (debugModeRef.current) {
              const centerX = transformedCoords.x + transformedCoords.width / 2;
              const centerY = transformedCoords.y + transformedCoords.height / 2;
              
              ctx.fillStyle = 'red';
              ctx.beginPath();
              ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
              ctx.fill();
            }
            
            // 座標を正規化して親コンポーネントに通知
            const normalizedCoords = normalizeCoordinates(transformedCoords);
            if (normalizedCoords) {
              console.log('正規化座標:', normalizedCoords);
              onPositionUpdate(normalizedCoords);
            }
          } else {
            console.warn('座標変換に失敗しました');
          }
        } else {
          console.log('⚠ 対象の物体が見つかりませんでした');
          
          // デバッグ表示
          ctx.fillStyle = 'rgba(255, 200, 0, 0.5)';
          ctx.fillRect(10, canvas.height - 40, 250, 30);
          ctx.fillStyle = '#000000';
          ctx.font = '14px Arial';
          ctx.fillText('対象が見つかりません: ' + detectedAnimal, 15, canvas.height - 20);
          
          // 全ての検出結果を表示（デバッグ用）
          if (debugModeRef.current) {
            predictions.forEach((pred) => {
              const coords = transformCoordinates(pred.bbox, true);
              if (coords) {
                ctx.strokeStyle = '#AAAAAA';
                ctx.lineWidth = 2;
                ctx.strokeRect(coords.x, coords.y, coords.width, coords.height);
                
                ctx.fillStyle = 'rgba(170, 170, 170, 0.5)';
                ctx.fillRect(coords.x, coords.y - 20, 150, 20);
                ctx.fillStyle = '#000000';
                ctx.font = '12px Arial';
                ctx.fillText(`${pred.class} ${(pred.score * 100).toFixed(0)}%`, coords.x + 5, coords.y - 5);
              }
            });
          }
        }
      } else {
        console.log(`検出待機中... 残り ${Math.max(0, 1000 - (now - lastDetectionTimeRef.current))}ms`);
      }
      
      // 次のフレーム処理をスケジュール
      if (isActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(() => detectFrame(detectionModel));
      }
    } catch (error) {
      console.error('フレーム検出中にエラーが発生しました:', error);
      
      // エラーメッセージをキャンバスに表示
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
          ctx.fillRect(10, 10, 300, 50);
          ctx.fillStyle = 'white';
          ctx.font = '14px Arial';
          ctx.fillText('検出エラー: ' + (error instanceof Error ? error.message : String(error)), 15, 40);
        }
      }
      
      if (isActiveRef.current) {
        // エラー発生時は少し間隔を空けて再試行
        setTimeout(() => {
          animationFrameRef.current = requestAnimationFrame(() => detectFrame(detectionModel));
        }, 2000);
      }
    }
  }, [videoRef, canvasRef, detectedAnimal, onPositionUpdate, drawBoundingBox, transformCoordinates, normalizeCoordinates, animalToCocoClass]);
  
  // デバッグトグルボタン
  const toggleDebugMode = () => {
    debugModeRef.current = !debugModeRef.current;
    console.log(`デバッグモード: ${debugModeRef.current ? 'オン' : 'オフ'}`);
  };
  
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 10
        }}
      />
      {/* デバッグモードトグルボタン（オプション） */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 15
        }}
      >
        <button
          onClick={toggleDebugMode}
          style={{
            background: 'rgba(0, 0, 0, 0.5)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            cursor: 'pointer'
          }}
        >
          Debug
        </button>
      </div>
    </>
  );
};

export default ObjectTracking;