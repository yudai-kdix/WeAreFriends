import React, { useEffect, useRef, useState } from 'react';
import animalDetector from '../services/animalDetector';
import animalData from '../data/animalData';

// 動物認識コンポーネント - カメラを使って動物を検出するスタンドアローンコンポーネント
const AnimalRecognition = ({ onAnimalDetected }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionError, setDetectionError] = useState(null);
  const detectionIntervalRef = useRef(null);

  // コンポーネントマウント時にカメラをセットアップ
  useEffect(() => {
    const setupCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode: 'environment', // 背面カメラを優先
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          
          // キャンバスのサイズをビデオに合わせる
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          
          // 動物検出を開始
          await startDetection();
        }
      } catch (error) {
        console.error('カメラへのアクセスに失敗しました:', error);
        setDetectionError('カメラへのアクセスができませんでした。カメラの使用許可を確認してください。');
      }
    };

    setupCamera();

    // クリーンアップ処理
    return () => {
      stopDetection();
      
      // カメラストリームの停止
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  // 動物検出を開始
  const startDetection = async () => {
    try {
      if (!animalDetector.model) {
        await animalDetector.loadModel();
      }
      
      setIsDetecting(true);
      
      // 定期的に検出処理を実行
      detectionIntervalRef.current = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            await detectFrame();
          } catch (error) {
            console.error('フレーム検出中にエラーが発生しました:', error);
          }
        }
      }, 500); // 500ms間隔で検出
      
    } catch (error) {
      console.error('動物検出の開始に失敗しました:', error);
      setDetectionError('動物認識モデルのロードに失敗しました。ネットワーク接続を確認して再読み込みしてください。');
      setIsDetecting(false);
    }
  };

  // 動物検出を停止
  const stopDetection = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    setIsDetecting(false);
  };

  // 1フレームの検出処理
  const detectFrame = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    // 動物を検出
    const animals = await animalDetector.detectAnimals(videoRef.current);
    
    // 最も確率の高い動物を取得
    const topAnimal = animalDetector.getTopAnimal(animals);
    
    // キャンバスに検出結果を描画
    drawDetections(animals);
    
    // 親コンポーネントに検出結果を通知
    if (topAnimal && topAnimal.confidence > 0.6) {
      const animalInfo = animalData[topAnimal.type] || animalData.default;
      onAnimalDetected({
        ...topAnimal,
        info: animalInfo
      });
    }
  };

  // 検出結果をキャンバスに描画
  const drawDetections = (detections) => {
    const ctx = canvasRef.current.getContext('2d');
    const { width, height } = canvasRef.current;
    
    // キャンバスをクリア
    ctx.clearRect(0, 0, width, height);
    
    // 検出枠の描画
    detections.forEach(detection => {
      const [x, y, w, h] = detection.bbox;
      const animalInfo = animalData[detection.type] || animalData.default;

      // 枠線の色は動物ごとに設定
      const color = animalInfo.color || '#00FF00';
      
      // 認識枠を描画
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      
      // ラベルの背景を描画
      ctx.fillStyle = color;
      const textWidth = ctx.measureText(`${animalInfo.name} ${Math.round(detection.confidence * 100)}%`).width;
      ctx.fillRect(x, y - 30, textWidth + 10, 30);
      
      // ラベルテキストを描画
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '18px sans-serif';
      ctx.fillText(
        `${animalInfo.name} ${Math.round(detection.confidence * 100)}%`, 
        x + 5, 
        y - 10
      );
    });
  };

  // エラー表示
  if (detectionError) {
    return (
      <div className="detection-error">
        <p>{detectionError}</p>
        <button onClick={() => window.location.reload()}>
          再試行
        </button>
      </div>
    );
  }

  return (
    <div className="animal-recognition">
      {/* カメラ映像 */}
      <video
        ref={videoRef}
        className="camera-feed"
        playsInline 
        autoPlay
        muted
      />
      
      {/* 検出オーバーレイ */}
      <canvas
        ref={canvasRef}
        className="detection-overlay"
      />
      
      {/* 検出状態表示 */}
      {isDetecting && (
        <div className="detection-status">
          <div className="detection-indicator"></div>
          <span>動物を検出中...</span>
        </div>
      )}
    </div>
  );
};

export default AnimalRecognition;