import { useState, useEffect, type FC } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import useWebSocket, { ReadyState } from "react-use-websocket";
import "./styles.css";
import ARScene from "./components/ARScene";
import ManageScreen from "./pages/manageScreen";
import HomePage from "./pages/HomePage";

import { ConversationProvider } from "./contexts/ConversationContext";

import config from "./config";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Box,
} from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import SettingsIcon from "@mui/icons-material/Settings";


// カメラページのコンポーネント化
const CameraPage: FC<{ clientId: string; websocketStatus: string }> = ({
  clientId,
  websocketStatus,
}) => {
  return (

    <div className="app">
      <ConversationProvider
          clientId={clientId}
        >
      <header className="app-header">
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Typography
            variant="h5"
            component="h1"
            sx={{ fontWeight: "bold", color: "white" }}
          >
            動物園AR体験
          </Typography>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              component={Link}
              to="/"
              color="inherit"
              startIcon={<HomeIcon />}
              sx={{
                borderRadius: 2,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: "6px 12px",
                fontSize: "0.9rem",
                transition: "all 0.2s",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  transform: "translateY(-2px)",
                },
              }}
            >
              ホーム
            </Button>
          </Box>
        </Box>

        {/* WebSocket接続ステータス表示 */}
        <Box
          sx={{
            mt: 1,
            display: "flex",
            justifyContent: "center",
            width: "100%",
          }}
        >
          {websocketStatus === "connected" && (
            <div className="connection-badge connected">サーバー接続中</div>
          )}
          {websocketStatus === "disconnected" && (
            <div className="connection-badge error">サーバー未接続</div>
          )}
          {websocketStatus === "connecting" && (
            <div className="connection-badge connecting">接続中...</div>
          )}
        </Box>
      </header>

      <main className="app-content">
        <ARScene clientId={clientId} />
      </main>

      <footer className="app-footer">
        <p>動物にカメラを向けて「動物を識別」ボタンを押してください</p>
        <p>動物と会話を楽しんでみましょう</p>
        {websocketStatus === "disconnected" && (
          <p className="connection-warning">
            サーバーに接続されていません。会話機能が利用できない場合があります。
          </p>
        )}
      </footer>
      </ConversationProvider>
    </div>
  );
};

// ナビゲーション付きレイアウトコンポーネント
const Layout: FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="layout">
      <AppBar position="static" color="primary" elevation={3}>
        <Container maxWidth="lg">
          <Toolbar sx={{ justifyContent: "space-between" }}>
            <Typography variant="h6" component="div" sx={{ flexGrow: 0 }}>
              We Are Friends
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                component={Link}
                to="/"
                color="inherit"
                startIcon={<HomeIcon />}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  transition: 'background-color 0.3s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                ホーム
              </Button>
              
              <Button
                component={Link}
                to="/camera"
                color="inherit"
                startIcon={<CameraAltIcon />}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  transition: 'background-color 0.3s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                カメラ
              </Button>
              
              <Button
                component={Link}
                to="/manage"
                color="inherit"
                startIcon={<SettingsIcon />}
                sx={{
                  borderRadius: 2,
                  padding: '8px 16px',
                  transition: 'background-color 0.3s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  },
                }}
              >
                識別対象管理
              </Button>
            </Box>
          </Toolbar>
        </Container>
      </AppBar>
      <Container component="main" sx={{ py: 4 }}>
        {children}
      </Container>
      <Box 
        component="footer"
        sx={{
          py: 3,
          px: 2,
          mt: 'auto',
          backgroundColor: theme => theme.palette.grey[100]
        }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary" align="center">
            © 2025 We Are Friends - カメラを通して新しい友達と出会おう
          </Typography>
        </Container>
      </Box>
    </div>
  );
};

const App: FC = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // アプリ起動時に一度だけclient_idを生成または取得
  const [clientId] = useState<string>(() => {
    // localStorage から既存のIDを取得
    const savedClientId = localStorage.getItem("animal_app_client_id");
    if (savedClientId) {
      return savedClientId;
    }

    // 新しいIDを生成して保存
    const newClientId = `client_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    localStorage.setItem("animal_app_client_id", newClientId);
    return newClientId;
  });

  // client_idを含めたWebSocketのURL
  const socketUrl = `${config.websocketEndpoint}?client_id=${encodeURIComponent(
    clientId
  )}`;

  // WebSocketの状態を監視（client_idを含めたURLで接続）
  const { readyState } = useWebSocket(socketUrl, {
    share: true, // コンポーネント間でWebSocket接続を共有
    shouldReconnect: () => true,
    reconnectAttempts: config.websocket.maxReconnectAttempts,
    reconnectInterval: config.websocket.reconnectDelay,
    onOpen: () =>
      console.log(
        `App: WebSocket接続が確立されました (client_id: ${clientId})`
      ),
    onClose: () => console.log("App: WebSocket接続が閉じられました"),
    onError: (error) => console.error("App: WebSocketエラー:", error),
  });

  // WebSocketの接続状態
  const websocketStatus = {
    [ReadyState.CONNECTING]: "connecting",
    [ReadyState.OPEN]: "connected",
    [ReadyState.CLOSING]: "closing",
    [ReadyState.CLOSED]: "disconnected",
    [ReadyState.UNINSTANTIATED]: "uninstantiated",
  }[readyState];

  // カメラとAPIの可用性をチェック
  useEffect(() => {
    async function checkRequirements() {
      try {
        setIsLoading(true);

        // カメラにアクセス可能か確認
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
          });
          // 確認後すぐにストリームを停止
          stream.getTracks().forEach((track) => track.stop());
        } catch (err) {
          console.error("カメラへのアクセスに失敗しました:", err);
          throw new Error(
            "カメラへのアクセスが許可されていません。このアプリを使用するには、カメラアクセスを許可してください。"
          );
        }

        // バックエンドAPIへの接続をチェック
        try {
          const response = await fetch(`${config.apiBaseUrl}/health-check`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (!response.ok) {
            throw new Error("APIサーバーへの接続に失敗しました。");
          }
        } catch (err) {
          console.error("APIヘルスチェックに失敗しました:", err);
          console.warn(
            "APIヘルスチェックに失敗しました - 開発モードでスキップします"
          );
          // 開発モードでは失敗してもOK（APIがまだ準備できていない可能性があるため）
          if (process.env.NODE_ENV !== "development") {
            throw new Error(
              "APIサーバーへの接続に失敗しました。インターネット接続を確認してください。"
            );
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error("初期化中にエラーが発生しました:", err);

        // エラーオブジェクトの型を確認
        const errorMessage =
          err instanceof Error
            ? err.message
            : "アプリケーションの初期化中にエラーが発生しました。";

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
        <p>アプリケーションを準備中...</p>
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
        <button onClick={() => window.location.reload()}>再試行</button>
      </div>
    );
  }

  // メインアプリ（ルーティングを追加）
  return (
    <Router>
      <Routes>
        {/* ホームページをルートに設定 */}
        <Route path="/" element={<HomePage />} />

        {/* カメラページを/cameraに移動 */}
        <Route
          path="/camera"
          element={
            <CameraPage clientId={clientId} websocketStatus={websocketStatus} />
          }
        />

        {/* 管理ページ */}
        <Route
          path="/manage"
          element={
            <Layout>
              <ManageScreen />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
