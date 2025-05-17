// ARScene.tsx

import React, { useEffect, useRef, useState, type FC } from "react";
import config from '../config';
import { type IdentifyAnimalResponse } from "../types/index";
import ObjectTracking from "./ObjectTracking";
import AnimatedSpeechBubble from "./AnimatedSpeechBubble";
import ModelLoader from "./ModelLoader";
import { useModel } from "../contexts/ModelContext";
import { ConversationProvider, useConversation } from '../contexts/ConversationContext';
import { getObjectInfo } from '../utils/objectInfoUtils';
import IdentifyButton from "./IdentifyButton";
import MicButton from "./MicButton";

// ARSceneコンポーネントの引数にclientIdを追加
interface ARSceneProps {
  clientId: string;
}

// バウンディングボックスの型定義
interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ARシーンコンポーネント
const ARScene: FC<ARSceneProps> = ({ clientId }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [detectedObject, setDetectedObject] = useState<string | null>(null);
  const [isXRSupported, setIsXRSupported] = useState<boolean>(false);
  const [isUsingAR, setIsUsingAR] = useState<boolean>(false);
  const [showConversation, setShowConversation] = useState<boolean>(false);
  // マイクボタンを表示するかどうかのステート追加
  const [showMicButton, setShowMicButton] = useState<boolean>(false);
  
  // モデルローダー関連の状態
  const [isModelLoaded, setIsModelLoaded] = useState<boolean>(false);
  const [modelError, setModelError] = useState<string | null>(null);
  const [identifyButtonVisible, setIdentifyButtonVisible] = useState<boolean>(false);

  // ModelContextからモデル状態を取得
  const { model, isLoading: isModelLoading, error: modelContextError,  loadModel } = useModel();
  // ConversationContextから動物情報更新メソッドを取得
  const { setAnimalInfo } = useConversation();
  
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [objectPosition, setObjectPosition] = useState<BoundingBox | null>(null);
  const [initialPosition, setInitialPosition] = useState<BoundingBox | null>(null);
  const [showSpeechBubble, setShowSpeechBubble] = useState<boolean>(false);
  const [showDebugInfo, setShowDebugInfo] = useState<boolean>(false);

  // WebXRサポートのチェック
  useEffect(() => {
    if (navigator.xr) {
      navigator.xr
        .isSessionSupported("immersive-ar")
        .then((supported) => {
          setIsXRSupported(supported);
        })
        .catch((err) => {
          console.error("WebXRサポートチェック中にエラーが発生しました:", err);
          setIsXRSupported(false);
        });
    } else {
      console.log("このブラウザはWebXRをサポートしていません");
      setIsXRSupported(false);
    }
  }, []);

  // useEffectでモデルの状態を監視
  useEffect(() => {
    // モデルがロードされたとき
    if (model) {
      setIsModelLoaded(true);
      setIdentifyButtonVisible(true);
    } else {
      setIsModelLoaded(false);
    }
    
    // モデルのエラー状態
    if (modelContextError) {
      setModelError(modelContextError.message);
    }
  }, [model, modelContextError]);

  // カメラ設定後にモデルロードを開始
  useEffect(() => {
    if (!isUsingAR) {
      setupCamera().then(() => {
        // カメラ設定後にモデルのロードを開始
        loadModel();
      });
    }
  }, [isUsingAR, loadModel]);

  // モデルロード完了ハンドラー
  const handleModelLoadComplete = () => {
    console.log('モデルのロードが完了しました');
    setIdentifyButtonVisible(true);
  };

  // モデルロードエラーハンドラー
  const handleModelLoadError = (error: Error) => {
    console.error('モデルのロード中にエラーが発生しました:', error);
    setModelError(error.message);
  };

  // カメラのセットアップ
  const setupCamera = async (): Promise<void> => {
    try {
      // すでにストリームが存在する場合は停止
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }

      const constraints = {
        video: {
          facingMode: "environment", // 背面カメラを優先
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        // loadedmetadataイベントを使用して再生を開始
        videoRef.current.onloadedmetadata = () => {
          // onloadedmetadataが発生した後に再生を試みる
          const playPromise = videoRef.current?.play();
          
          // Promiseをハンドリングして、エラーを適切に処理
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                console.log('ビデオの再生が開始されました');
                setIdentifyButtonVisible(true);
              })
              .catch(err => {
                console.error('ビデオの再生に失敗しました:', err);
                // 自動再生ポリシーの問題である可能性がある
                setIdentifyButtonVisible(true); // エラーでも識別ボタンは表示
              });
          }
        };
      }
    } catch (error) {
      console.error("カメラへのアクセスに失敗しました:", error);
    }
  };

  // カメラ映像をキャプチャして画像として送信
  const captureAndIdentifyAnimal = async (): Promise<void> => {
    if (!videoRef.current || !isModelLoaded) return;
    
    try {
      setIsLoading(true);
      
      // 一時的なキャンバスを作成して映像をキャプチャ
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (!context) {
        throw new Error('キャンバスのコンテキストを取得できません');
      }
      
      // ビデオと同じサイズでキャンバスを設定
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      
      // キャンバスにビデオフレームを描画
      context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      // キャンバスから画像データを取得
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      
      // クライアントIDをクエリパラメータとして追加したURLを構築
      const apiUrl = `${config.apiBaseUrl}/identify-animal?client_id=${encodeURIComponent(clientId)}`;
      console.log(`画像識別APIを呼び出し: ${apiUrl}`);
      
      // バックエンドAPIに画像を送信
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData.split(',')[1], // Base64エンコードされた画像データ
        }),
      });
      
      if (!response.ok) {
        throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json() as IdentifyAnimalResponse;
      console.log('API応答:', result);
      
      if (result.animal && result.animal !== "unknown") {
        setDetectedObject(result.animal);

        // ConversationContextの動物情報を更新
        const animalInfo = getObjectInfo(result.animal);
        setAnimalInfo(result.animal, animalInfo.name);
        
        // バックエンドから物体の位置情報を取得した場合
        if (result.boundingBox) {
          const { x, y, width, height } = result.boundingBox;
          setObjectPosition({ x, y, width, height });
          setInitialPosition({ x, y, width, height });

          // マイクボタンを表示（識別ボタンは非表示にしない）
          setShowMicButton(true);
          
          // 吹き出しを表示
          setShowSpeechBubble(true);
        } else {
          // 位置情報がない場合はデフォルト位置を設定（画面中央）
          const defaultPosition = { x: 0.4, y: 0.4, width: 0.2, height: 0.2 };
          setObjectPosition(defaultPosition);
          setInitialPosition(defaultPosition);

          // マイクボタンを表示（識別ボタンは非表示にしない）
          setShowMicButton(true);

          // 吹き出しを表示
          setShowSpeechBubble(true);
          
          console.log('バックエンドから位置情報が返されませんでした。デフォルト位置を使用します。');
        }

        
      } else {
        // 動物が検出されなかった場合
        alert('オブジェクトを検出できませんでした。もう一度試してください。');
        setDetectedObject(null);
        setShowSpeechBubble(false);
        setObjectPosition(null);
      }
    } catch (error) {
      console.error('オブジェクト識別中にエラーが発生しました:', error);
      alert('オブジェクト識別中にエラーが発生しました。もう一度試してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 追跡による位置情報の更新
  const handlePositionUpdate = (newPosition: BoundingBox | null) => {
    if (newPosition) {
      // デバッグ表示がオンの場合のみログを出力
      if (showDebugInfo) {
        console.log("位置情報更新:", newPosition);
      }
      setObjectPosition(newPosition);
    } else if (initialPosition) {
      // 追跡が失敗した場合は初期位置を維持
      if (showDebugInfo) {
        console.log("追跡失敗、初期位置を維持します:", initialPosition);
      }
      // オプション：完全に追跡が失敗した場合は初期位置に戻す
      // setObjectPosition(initialPosition);
    }
  };

  // ARボタンが利用可能かどうか
  const renderARButton = (): React.ReactNode => {
    if (isXRSupported) {
      return (
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <button onClick={toggleARMode} className="ar-toggle-btn">
            {isUsingAR ? "カメラモードに切り替え" : "ARモードに切り替え"}
          </button>
        </div>
      );
    }
    return null;
  };

  // WebXRモードとカメラモードの切り替え
  const toggleARMode = (): void => {
    setIsUsingAR(!isUsingAR);
    // モード切替時に会話パネルを閉じる
    setShowConversation(false);
    setDetectedObject(null);
    setShowSpeechBubble(false);
    setObjectPosition(null);
  };

  // getObjectInfo関数の代わりに新しいユーティリティ関数を使用
  const objectInfo = detectedObject ? getObjectInfo(detectedObject) : getObjectInfo(null);

  // 通常のカメラモード
  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
        autoPlay
        playsInline
        muted
      />

      {/* モデルローダー - カメラが準備できてモデルがまだロードされていないときに表示 */}
      {isModelLoading && !isModelLoaded && !modelError && (
        <ModelLoader 
          onLoadComplete={handleModelLoadComplete}
          onError={handleModelLoadError}
        />
      )}
      
      {/* モデルロードエラー表示 */}
      {modelError && (
        <div className="error-overlay">
          <h3>モデルロードエラー</h3>
          <p>{modelError}</p>
          <button onClick={() => window.location.reload()}>再試行</button>
        </div>
      )}

      {/* オブジェクト追跡コンポーネント - モデルがロードされ、物体が検出された場合に表示 */}
      {detectedObject && !showConversation && isModelLoaded && (
        <ObjectTracking
          videoRef={videoRef}
          detectedAnimal={detectedObject}
          onPositionUpdate={handlePositionUpdate}
          showDebugInfo={showDebugInfo}
        />
      )}

      {/* 会話機能付き吹き出し - ConversationProviderでラップ */}
      {showSpeechBubble && detectedObject && objectPosition && (
          <AnimatedSpeechBubble
            animalName={objectInfo.name}
            color={objectInfo.color}
            isVisible={showSpeechBubble}
            position={objectPosition}
            initialMessage={objectInfo.description}
          />
      )}

      {/* 検出結果と情報を表示（検出された場合のみ、吹き出しが表示されていない場合） */}
      {detectedObject && !showConversation && !showSpeechBubble && (
        <div className="animal-info-overlay">
          <h2>{objectInfo.name}</h2>
          <p>{objectInfo.description}</p>
          <button 
            onClick={() => setShowConversation(true)}
            className="speak-button"
          >
            {objectInfo.name}と会話する
          </button>
        </div>
      )}

      {/* 識別ボタン */}
      {identifyButtonVisible && !isUsingAR && !showConversation && (
        <IdentifyButton
          onIdentify={captureAndIdentifyAnimal}
          isLoading={isLoading}
          isModelLoading={isModelLoading}
          isModelLoaded={isModelLoaded}
          showMicButton={showMicButton}
        />
      )}

      {/* マイクボタン */}
      {showMicButton && detectedObject && !isUsingAR && !showConversation && (
          <MicButton />
      )}

      {renderARButton()}

      {/* ローディングインジケーター */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>オブジェクトを識別中...</p>
        </div>
      )}
    </div>
  );
};

export default ARScene;