import React, { useEffect, useRef, useState, type FC } from "react";
import ConversationPanel from "./ConversationPanel";
import config from '../config';
import objectNameMapping from "../data/objectNameMapping";
import { type IdentifyAnimalResponse } from "../types/index";
import ObjectTracking from "./ObjectTracking";
import AnimatedSpeechBubble from "./AnimatedSpeechBubble";

// ARSceneコンポーネントの引数にclientIdを追加
interface ARSceneProps {
  clientId: string;
}

// 検出された対象の情報を格納するインターフェース
interface ObjectInfo {
  name: string;
  description: string;
  facts: string[];
  color: string;
  prompt?: string;
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
  const [identifyButtonVisible, setIdentifyButtonVisible] = useState<boolean>(false);
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

  // 会話パネルの表示/非表示の制御のためのイベントリスナー
  useEffect(() => {
    const handleToggleConversation = (event: CustomEvent<{ show: boolean, objectName?: string }>) => {
      setShowConversation(event.detail.show);
      
      // 会話パネルが表示されるときは吹き出しを非表示に
      if (event.detail.show) {
        setShowSpeechBubble(false);
      }
    };
    
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

  // 会話パネルが閉じられたとき、吹き出しを再表示
  useEffect(() => {
    if (detectedObject && !showConversation && objectPosition) {
      setShowSpeechBubble(true);
    }
  }, [showConversation, detectedObject, objectPosition]);

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
                // ユーザーに明示的な再生ボタンを表示するなどの対策が必要
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
      
      const result = await response.json() as IdentifyAnimalResponse;
      console.log('API応答:', result);
      
      if (result.animal && result.animal !== "unknown") {
        setDetectedObject(result.animal);
        
        // バックエンドから物体の位置情報を取得した場合
        if (result.boundingBox) {
          const { x, y, width, height } = result.boundingBox;
          setObjectPosition({ x, y, width, height });
          setInitialPosition({ x, y, width, height });
          
          // 吹き出しを表示
          setShowSpeechBubble(true);
        } else {
          // 位置情報がない場合はデフォルト位置を設定
          // 画面中央に表示
          setObjectPosition({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 });
          setInitialPosition({ x: 0.4, y: 0.4, width: 0.2, height: 0.2 });
          setShowSpeechBubble(true);
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

  // WebXRモードとカメラモードの切り替え
  const toggleARMode = (): void => {
    setIsUsingAR(!isUsingAR);
    // モード切替時に会話パネルを閉じる
    setShowConversation(false);
    setDetectedObject(null);
    setShowSpeechBubble(false);
    setObjectPosition(null);
  };

  // 追跡による位置情報の更新
  const handlePositionUpdate = (newPosition: BoundingBox | null) => {
    if (newPosition) {
      console.log("位置情報更新:", newPosition);
      setObjectPosition(newPosition);
    } else if (initialPosition) {
      // 追跡が失敗した場合は初期位置に戻す
      console.log("追跡失敗、初期位置に戻ります:", initialPosition);
      setObjectPosition(initialPosition);
    }
  };

  // デバッグモードの切り替え
  const toggleDebugMode = () => {
    setShowDebugInfo(!showDebugInfo);
  };

  /**
   * 検出したオブジェクトの情報を取得する関数
   */
  const getObjectInfo = (): ObjectInfo => {
    if (!detectedObject) {
      // デフォルトの情報を返す
      return {
        name: "不明なオブジェクト",
        description: "こんにちは！カメラに映ったものについて話しましょう。",
        facts: [
          "カメラをかざして「識別」ボタンを押すと対象を特定できます",
          "動物園には様々な動物や展示物があります",
          "もっと近づいてみると、うまく識別できるかもしれません"
        ],
        color: "#6A5ACD",
      };
    }
    
    // オブジェクト名のマッピングを取得
    let objectName = objectNameMapping[detectedObject] || null;
    
    // マッピングにない場合は英語名を整形して使用
    if (!objectName) {
      objectName = detectedObject
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // 動物か非動物かを判断（簡易的な判定）
    const isAnimal = [
      "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", 
      "zebra", "giraffe", "penguin"
    ].includes(detectedObject);
    
    // オブジェクトのカラーコードを定義
    const colorMap: { [key: string]: string } = {
      cat: "#FFD700", 
      dog: "#4682B4",
      bird: "#32CD32",
      elephant: "#808080",
      zebra: "#000000",
      bear: "#8B4513",
      giraffe: "#DAA520",
      horse: "#8B4513",
      sheep: "#F5F5DC",
      cow: "#8B0000",
      person: "#FF7F50",
      // その他のオブジェクトは簡易的なカラーコードを設定
      default: "#6A5ACD"
    };
    
    const color = colorMap[detectedObject] || colorMap.default;
    
    if (isAnimal) {
      // 動物と判断される場合
      return {
        name: objectName,
        description: `こんにちは！私は${objectName}です。動物園でよく見かける動物の一つです。詳しい特徴については質問してみてください！`,
        facts: [
          `${objectName}についてもっと知りたいですか？`,
          "質問してみてください",
          "動物園の動物たちはみんな個性的です"
        ],
        color: color,
        prompt: `あなたは動物園にいる${detectedObject}です。来園者に${detectedObject}の生態や特徴について、実際の知識に基づいて教えてあげてください。特徴的な鳴き声や仕草を交えながら、自然に振る舞ってください。質問に短く答えてください。`
      };
    } else {
      // 動物ではないオブジェクトと判断される場合
      return {
        name: objectName,
        description: `こんにちは！私は${objectName}です。何か質問はありますか？`,
        facts: [
          "動物園では様々なものに出会えます",
          "カメラを動物に向けて「識別」ボタンを押してみてください",
          "何か知りたいことがあれば質問してください"
        ],
        color: color,
        prompt: `あなたは動物園で検出された${detectedObject}です。${objectName}についての面白い事実や情報を、ユーモアを交えて教えてください。質問に短く答えてください。`
      };
    }
  };

  // 会話パネルを閉じる
  const closeConversation = (): void => {
    setShowConversation(false);
    // 会話パネルを閉じたら吹き出しを再表示
    if (detectedObject && objectPosition) {
      setShowSpeechBubble(true);
    }
  };

  // 吹き出しクリック処理
  const handleSpeechBubbleClick = () => {
    setShowConversation(true);
    setShowSpeechBubble(false);
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
            {isLoading ? "識別中..." : "オブジェクトを識別"}
          </button>
        </div>
      );
    }
    return null;
  };

  // デバッグボタンの表示
  const renderDebugButton = (): React.ReactNode => {
    return (
      <div
        style={{
          position: "absolute",
          top: 70,
          right: 10,
          zIndex: 1000,
        }}
      >
        <button
          onClick={toggleDebugMode}
          style={{
            backgroundColor: showDebugInfo ? "#FF6B6B" : "#4682B4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "5px 10px",
            fontSize: "12px",
          }}
        >
          {showDebugInfo ? "デバッグ非表示" : "デバッグ表示"}
        </button>
      </div>
    );
  };

  // デバッグ情報の表示
  const renderDebugInfo = (): React.ReactNode => {
    if (!showDebugInfo) return null;

    return (
      <div
        style={{
          position: "absolute",
          top: 110,
          left: 10,
          backgroundColor: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "10px",
          borderRadius: "5px",
          fontSize: "12px",
          zIndex: 1000,
          maxWidth: "300px",
        }}
      >
        <h3 style={{ margin: "0 0 5px 0" }}>デバッグ情報</h3>
        <p>検出対象: {detectedObject || "なし"}</p>
        <p>追跡状態: {isTracking ? "追跡中" : "停止中"}</p>
        <p>位置情報: {objectPosition ? JSON.stringify({
          x: Math.round(objectPosition.x * 100) / 100,
          y: Math.round(objectPosition.y * 100) / 100,
          w: Math.round(objectPosition.width * 100) / 100,
          h: Math.round(objectPosition.height * 100) / 100,
        }) : "なし"}</p>
        <p>ビデオサイズ: {videoRef.current ? `${videoRef.current.videoWidth}x${videoRef.current.videoHeight}` : "不明"}</p>
      </div>
    );
  };

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

      {/* オブジェクト追跡コンポーネント */}
      {detectedObject && !showConversation && (
        <ObjectTracking
          videoRef={videoRef}
          detectedAnimal={detectedObject}
          onPositionUpdate={handlePositionUpdate}
        />
      )}

      {/* 動的な吹き出し */}
      {showSpeechBubble && detectedObject && objectPosition && (
        <AnimatedSpeechBubble
          message={getObjectInfo().description}
          animalName={getObjectInfo().name}
          color={getObjectInfo().color}
          isVisible={showSpeechBubble && !showConversation}
          position={objectPosition}
          onClick={handleSpeechBubbleClick}
        />
      )}

      {/* 検出結果と情報を表示（検出された場合のみ、吹き出しが表示されていない場合） */}
      {detectedObject && !showConversation && !showSpeechBubble && (
        <div className="animal-info-overlay">
          <h2>{getObjectInfo().name}</h2>
          <p>{getObjectInfo().description}</p>
          <button 
            onClick={() => setShowConversation(true)}
            className="speak-button"
          >
            {getObjectInfo().name}と会話する
          </button>
        </div>
      )}

      {renderIdentifyButton()}
      {renderARButton()}
      {renderDebugButton()}
      {renderDebugInfo()}

      {/* 会話パネル */}
      {showConversation && detectedObject && (
        <ConversationPanel
          animalType={detectedObject}
          animalName={getObjectInfo().name}
          isVisible={showConversation}
          onClose={closeConversation}
          clientId={clientId} // クライアントIDを渡す
        />
      )}

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