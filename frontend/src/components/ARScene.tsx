import React, { useEffect, useRef, useState, type FC } from "react";
// import { Canvas } from "@react-three/fiber";
// import { XR } from "@react-three/xr";
// import SpeechBubble from "./SpeechBubble";
import ConversationPanel from "./ConversationPanel";
import config from '../config';
import objectNameMapping from "../data/objectNameMapping";
import { type IdentifyAnimalResponse } from "../types/index";

// ARSceneコンポーネントの引数にclientIdを追加
interface ARSceneProps {
  clientId: string;
}

// 検出された対象の情報を格納するインターフェース（バックエンドではより詳細なデータを使用）
interface ObjectInfo {
  name: string;
  description: string;
  facts: string[];
  color: string;
  prompt?: string;
}

// ARシーンコンポーネント
const ARScene: FC<ARSceneProps> = ({ clientId }) =>{
  const videoRef = useRef<HTMLVideoElement>(null);
  // const canvasRef = useRef<HTMLCanvasElement>(null);
  const [detectedObject, setDetectedObject] = useState<string | null>(null);
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
    const handleToggleConversation = (event: CustomEvent<{ show: boolean, objectName?: string }>) => {
      setShowConversation(event.detail.show);
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
      
      const result = await response.json() as IdentifyAnimalResponse;
      console.log('API応答:', result);
      
      if (result.animal && result.animal !== "unknown") {
        setDetectedObject(result.animal);
        // 動物が検出されたら会話パネルを自動的に表示
        setShowConversation(true);
      } else {
        // 動物が検出されなかった場合
        alert('オブジェクトを検出できませんでした。もう一度試してください。');
        setDetectedObject(null);
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
  };

  /**
   * 検出したオブジェクトの情報を取得する関数
   * フロントエンドでは簡易的な情報のみを使用し、詳細はバックエンドで管理
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

  // // WebXRモードの場合はThree.jsのCanvasを表示
  // if (isUsingAR) {
  //   console.log("ARモードが有効です");
  //   return (
  //     <div style={{ position: "relative", width: "100%", height: "100vh" }}>
  //       <Canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>}>
  //         <XR>
  //           <ambientLight intensity={0.5} />
  //           <pointLight position={[10, 10, 10]} />

  //           {/* AR空間内に吹き出しを表示 */}
  //           {detectedObject && (
  //             <SpeechBubble
  //               position={[0, 0, -1]} // ユーザーの1m前に表示
  //               message={getObjectInfo().description}
  //               animalName={getObjectInfo().name}
  //               color={getObjectInfo().color}
  //               isInteractive={true} // タップで会話パネルを表示可能に
  //               clientId={clientId}
  //             />
  //           )}
  //         </XR>
  //       </Canvas>

  //       {/* AR空間内でも会話パネルを表示できるように */}
  //       {showConversation && detectedObject && (
  //         <ConversationPanel
  //           animalType={detectedObject}
  //           animalName={getObjectInfo().name}
  //           isVisible={showConversation}
  //           onClose={closeConversation}
  //           clientId={clientId} // クライアントIDを渡す
  //         />
  //       )}

  //       <div
  //         style={{
  //           position: "absolute",
  //           bottom: 10,
  //           width: "100%",
  //           textAlign: "center",
  //         }}
  //       >
  //         <button onClick={toggleARMode} style={{ marginLeft: 10 }}>
  //           カメラモードに切り替え
  //         </button>
  //       </div>
  //     </div>
  //   );
  // }

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

      {/* 検出結果と情報を表示（検出された場合のみ） */}
      {detectedObject && !showConversation && (
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