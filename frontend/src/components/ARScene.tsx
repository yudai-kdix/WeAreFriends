import React, { useEffect, useRef, useState, FC } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, ARButton } from "@react-three/xr";
import SpeechBubble from "./SpeechBubble";
import ConversationPanel from "./ConversationPanel";
import animalData from "../data/animalData";
import config from '../config';
import { type AnimalInfo } from '../types';

// ARSceneコンポーネントの引数にclientIdを追加
interface ARSceneProps {
  clientId: string;
}

// ARシーンコンポーネント
const ARScene: FC<ARSceneProps> = ({ clientId }) =>{
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectedAnimal, setDetectedAnimal] = useState<string | null>(null);
  const [isXRSupported, setIsXRSupported] = useState<boolean>(false);
  const [isUsingAR, setIsUsingAR] = useState<boolean>(false);
  const [showConversation, setShowConversation] = useState<boolean>(false);
  const [identifyButtonVisible, setIdentifyButtonVisible] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

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

  // 会話パネルの表示/非表示の制御のためのイベントリスナー
  useEffect(() => {
    const handleToggleConversation = (event: CustomEvent<{ show: boolean, animalName?: string }>) => {
      setShowConversation(event.detail.show);
    };

    // イベントリスナーの型を拡張
    type CustomEventMap = {
      'toggleConversation': CustomEvent<{ show: boolean, animalName?: string }>;
    }
    
    // カスタムイベントをリッスン
    window.addEventListener('toggleConversation', handleToggleConversation as EventListener);
    
    return () => {
      window.removeEventListener('toggleConversation', handleToggleConversation as EventListener);
    };
  }, []);

  // カメラストリームのセットアップ
  useEffect(() => {
    if (!isUsingAR) {
      setupCamera();
    }

    return () => {
      // クリーンアップ：カメラストリームの停止
      if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isUsingAR]);

  // カメラのセットアップ
  const setupCamera = async (): Promise<void> => {
    try {
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
        videoRef.current.play();
        
        // カメラが準備できたら識別ボタンを表示
        videoRef.current.onloadedmetadata = () => {
          setIdentifyButtonVisible(true);
        };
      }
    } catch (error) {
      console.error("カメラへのアクセスに失敗しました:", error);
    }
  };

  // カメラ映像をキャプチャして画像として送信
  const captureAndIdentifyAnimal = async (): Promise<void> => {
    if (!videoRef.current) return;
    
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
      
      const result = await response.json();
      console.log('API応答:', result);
      
      if (result.animal && result.animal !== "unknown") {
        setDetectedAnimal(result.animal);
        // 動物が検出されたら会話パネルを自動的に表示
        setShowConversation(true);
      } else {
        // 動物が検出されなかった場合
        alert('動物を検出できませんでした。もう一度試してください。');
        setDetectedAnimal(null);
      }
    } catch (error) {
      console.error('動物の識別中にエラーが発生しました:', error);
      alert('動物の識別中にエラーが発生しました。もう一度試してください。');
    } finally {
      setIsLoading(false);
    }
  };

  // WebXRモードとカメラモードの切り替え
  const toggleARMode = (): void => {
    setIsUsingAR(!isUsingAR);
    // モード切替時に会話パネルを閉じる
    setShowConversation(false);
    setDetectedAnimal(null);
  };

  // 検出した動物の情報を取得
  const getAnimalInfo = (): AnimalInfo => {
    if (!detectedAnimal) return animalData.default;
    return animalData[detectedAnimal] || animalData.default;
  };

  // 会話パネルを閉じる
  const closeConversation = (): void => {
    setShowConversation(false);
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

  // 識別ボタンの表示
  const renderIdentifyButton = (): React.ReactNode => {
    if (identifyButtonVisible && !isUsingAR && !showConversation) {
      return (
        <div
          style={{
            position: "absolute",
            bottom: 80,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 100,
          }}
        >
          <button
            onClick={captureAndIdentifyAnimal}
            className="identify-button"
            disabled={isLoading}
          >
            {isLoading ? "識別中..." : "動物を識別"}
          </button>
        </div>
      );
    }
    return null;
  };

  // WebXRモードの場合はThree.jsのCanvasを表示
  if (isUsingAR) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <Canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>}>
          <XR>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            {/* AR空間内に吹き出しを表示 */}
            {detectedAnimal && (
              <SpeechBubble
                position={[0, 0, -1]} // ユーザーの1m前に表示
                message={getAnimalInfo().description}
                animalName={getAnimalInfo().name}
                color={getAnimalInfo().color}
                isInteractive={true} // タップで会話パネルを表示可能に
              />
            )}
          </XR>
        </Canvas>

        {/* AR空間内でも会話パネルを表示できるように */}
        {showConversation && detectedAnimal && (
          <ConversationPanel
            animalType={detectedAnimal}
            animalName={getAnimalInfo().name}
            isVisible={showConversation}
            onClose={closeConversation}
            clientId={clientId} // クライアントIDを渡す
          />
        )}

        <div
          style={{
            position: "absolute",
            bottom: 10,
            width: "100%",
            textAlign: "center",
          }}
        >
          <ARButton />
          <button onClick={toggleARMode} style={{ marginLeft: 10 }}>
            カメラモードに切り替え
          </button>
        </div>
      </div>
    );
  }

  // 通常のカメラモード
  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scaleX(-1)", // 自撮りモードのミラー効果
        }}
        autoPlay
        playsInline
        muted
      />

      {/* 検出結果と動物情報を表示（検出された場合のみ） */}
      {detectedAnimal && !showConversation && (
        <div className="animal-info-overlay">
          <h2>{getAnimalInfo().name}</h2>
          <p>{getAnimalInfo().description}</p>
          <button 
            onClick={() => setShowConversation(true)}
            className="speak-button"
          >
            {getAnimalInfo().name}と会話する
          </button>
        </div>
      )}

      {renderIdentifyButton()}
      {renderARButton()}

      {/* 会話パネル */}
      {showConversation && detectedAnimal && (
        <ConversationPanel
          animalType={detectedAnimal}
          animalName={getAnimalInfo().name}
          isVisible={showConversation}
          onClose={closeConversation}
          clientId={clientId} // クライアントIDを渡す
        />
      )}

      {/* ローディングインジケーター */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>動物を識別中...</p>
        </div>
      )}
    </div>
  );
};

export default ARScene;