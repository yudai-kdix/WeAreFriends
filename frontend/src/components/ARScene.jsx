import React, { useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { XR, ARButton, RayGrab, useXR } from "@react-three/xr";
import { Text } from "@react-three/drei";
import SpeechBubble from "./SpeechBubble";
import animalDetector from "../services/animalDetector";
import animalData from "../data/animalData";

// ARシーンコンポーネント
const ARScene = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [detectedAnimal, setDetectedAnimal] = useState(null);
  const [isXRSupported, setIsXRSupported] = useState(false);
  const [isUsingAR, setIsUsingAR] = useState(false);

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

  // カメラストリームのセットアップ
  useEffect(() => {
    if (!isUsingAR) {
      setupCamera();
    }

    // モデルを事前にロード
    animalDetector.loadModel();

    return () => {
      // クリーンアップ：カメラストリームの停止
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [isUsingAR]);

  // カメラのセットアップ
  const setupCamera = async () => {
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
      }
    } catch (error) {
      console.error("カメラへのアクセスに失敗しました:", error);
    }
  };

  // 定期的に動物検出を実行
  useEffect(() => {
    if (!isUsingAR && videoRef.current) {
      const detectInterval = setInterval(async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          try {
            const animals = await animalDetector.detectAnimals(
              videoRef.current
            );
            const topAnimal = animalDetector.getTopAnimal(animals);

            if (topAnimal && topAnimal.confidence > 0.6) {
              setDetectedAnimal(topAnimal);
            } else if (!topAnimal) {
              // 動物が検出されなかった場合、nullにセット
              setDetectedAnimal(null);
            }
          } catch (error) {
            console.error("動物検出中にエラーが発生しました:", error);
          }
        }
      }, 1000); // 1秒ごとに検出

      return () => clearInterval(detectInterval);
    }
  }, [isUsingAR]);

  // WebXRモードとカメラモードの切り替え
  const toggleARMode = () => {
    setIsUsingAR(!isUsingAR);
  };

  // 検出した動物の情報を取得
  const getAnimalInfo = () => {
    if (!detectedAnimal) return animalData.default;

    const animalType = detectedAnimal.type;
    return animalData[animalType] || animalData.default;
  };

  // ARボタンが利用可能かどうか
  const renderARButton = () => {
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

  // 検出した動物の情報表示
  const renderAnimalInfo = () => {
    if (!detectedAnimal && !isUsingAR) return null;

    const animalInfo = getAnimalInfo();

    return (
      <div className="animal-info-overlay">
        <h2>{animalInfo.name}</h2>
        <p>{animalInfo.description}</p>
        <ul>
          {animalInfo.facts.map((fact, index) => (
            <li key={index}>{fact}</li>
          ))}
        </ul>
      </div>
    );
  };

  // WebXRモードの場合はThree.jsのCanvasを表示
  if (isUsingAR) {
    return (
      <div style={{ position: "relative", width: "100%", height: "100vh" }}>
        <Canvas ref={canvasRef}>
          <XR>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            {/* AR空間内に吹き出しを表示 */}
            <SpeechBubble
              position={[0, 0, -1]} // ユーザーの1m前に表示
              message={getAnimalInfo().description}
              animalName={getAnimalInfo().name}
              color={getAnimalInfo().color}
            />
          </XR>
        </Canvas>

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

      {renderAnimalInfo()}
      {renderARButton()}
    </div>
  );
};

export default ARScene;
