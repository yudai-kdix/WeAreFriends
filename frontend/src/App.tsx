import React, { useState, useEffect } from 'react';
import './styles.css';
import ARScene from './components/ARScene';
import animalDetector from './services/animalDetector';

function App() {
  console.log("App.tsx");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // アプリケーションの初期化
  useEffect(() => {
    async function initialize() {
      try {
        // TensorFlow.jsモデルを事前にロード
        await animalDetector.loadModel();
        setIsLoading(false);
      } catch (err) {
        console.error('アプリケーションの初期化中にエラーが発生しました:', err);
        setError('モデルのロードに失敗しました。ページを再読み込みしてください。');
        setIsLoading(false);
      }
    }

    initialize();
  }, []);

  // ローディング画面
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>動物園ARアプリを読み込み中...</p>
        <p className="loading-subtitle">動物認識モデルを準備しています</p>
      </div>
    );
  }

  // エラー画面
  if (error) {
    return (
      <div className="error-container">
        <h2>エラーが発生しました</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>
          再試行
        </button>
      </div>
    );
  }

  // メインアプリ
  return (
    <div className="app">
      <header className="app-header">
        <h1>動物園AR体験</h1>
      </header>
      
      <main className="app-content">
        <ARScene />
      </main>
      
      <footer className="app-footer">
        <p>動物にカメラを向けると、動物が話し始めます！</p>
        <p>WebXR対応ブラウザではARモードも利用できます</p>
      </footer>
    </div>
  );
}

export default App;