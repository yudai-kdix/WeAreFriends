import { useState, useEffect, type FC } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import './styles.css';
import ARScene from './components/ARScene';
import config from './config';

const App: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // アプリ起動時に一度だけclient_idを生成または取得
  const [clientId] = useState<string>(() => {
    // localStorage から既存のIDを取得
    const savedClientId = localStorage.getItem('animal_app_client_id');
    if (savedClientId) {
      return savedClientId;
    }
    
    // 新しいIDを生成して保存
    const newClientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem('animal_app_client_id', newClientId);
    return newClientId;
  });
  
  // client_idを含めたWebSocketのURL
  const socketUrl = `${config.websocketEndpoint}?client_id=${encodeURIComponent(clientId)}`;

  // WebSocketの状態を監視（client_idを含めたURLで接続）
  const { readyState } = useWebSocket(socketUrl, {
    share: true, // コンポーネント間でWebSocket接続を共有
    shouldReconnect: () => true,
    reconnectAttempts: config.websocket.maxReconnectAttempts,
    reconnectInterval: config.websocket.reconnectDelay,
    onOpen: () => console.log(`App: WebSocket接続が確立されました (client_id: ${clientId})`),
    onClose: () => console.log("App: WebSocket接続が閉じられました"),
    onError: (error) => console.error("App: WebSocketエラー:", error)
  });

  // WebSocketの接続状態
  const websocketStatus = {
    [ReadyState.CONNECTING]: 'connecting',
    [ReadyState.OPEN]: 'connected',
    [ReadyState.CLOSING]: 'closing',
    [ReadyState.CLOSED]: 'disconnected',
    [ReadyState.UNINSTANTIATED]: 'uninstantiated',
  }[readyState];

  // カメラとAPIの可用性をチェック
  useEffect(() => {
    async function checkRequirements() {
      try {
        setIsLoading(true);
        
        // カメラにアクセス可能か確認
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          // 確認後すぐにストリームを停止
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('カメラへのアクセスに失敗しました:', err);
          throw new Error('カメラへのアクセスが許可されていません。このアプリを使用するには、カメラアクセスを許可してください。');
        }
        
        // バックエンドAPIへの接続をチェック
        try {
          const response = await fetch(`${config.apiBaseUrl}/health-check`, { 
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (!response.ok) {
            throw new Error('APIサーバーへの接続に失敗しました。');
          }
        } catch (err) {
          console.error('APIヘルスチェックに失敗しました:', err);
          console.warn('APIヘルスチェックに失敗しました - 開発モードでスキップします');
          // 開発モードでは失敗してもOK（APIがまだ準備できていない可能性があるため）
          if (process.env.NODE_ENV !== 'development') {
            throw new Error('APIサーバーへの接続に失敗しました。インターネット接続を確認してください。');
          }
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error('初期化中にエラーが発生しました:', err);
  
        // エラーオブジェクトの型を確認
        const errorMessage = 
          err instanceof Error ? err.message : 'アプリケーションの初期化中にエラーが発生しました。';
        
        setError(errorMessage);
        setIsLoading(false);
      }
    }

    checkRequirements();
  }, []);

  // ローディング画面
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>動物園ARアプリを準備中...</p>
        <p className="loading-subtitle">カメラとサーバー接続を確認しています</p>
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
        {websocketStatus === 'connected' && (
          <div className="connection-badge connected">サーバー接続中</div>
        )}
        {websocketStatus === 'disconnected' && (
          <div className="connection-badge error">サーバー未接続</div>
        )}
        {websocketStatus === 'connecting' && (
          <div className="connection-badge connecting">接続中...</div>
        )}
      </header>
      
      <main className="app-content">
        <ARScene clientId={clientId}/>
      </main>
      
      <footer className="app-footer">
        <p>動物にカメラを向けて「動物を識別」ボタンを押してください</p>
        <p>動物と会話を楽しんでみましょう</p>
        {websocketStatus === 'disconnected' && (
          <p className="connection-warning">サーバーに接続されていません。会話機能が利用できない場合があります。</p>
        )}
      </footer>
    </div>
  );
};

export default App;