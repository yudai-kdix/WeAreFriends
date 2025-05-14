// src/config.ts
import { type AppConfig } from './types';

// 環境に応じた設定
const isDevelopment = process.env.NODE_ENV === 'development';

const config: AppConfig = {
  // WebSocketエンドポイント
  websocketEndpoint: isDevelopment 
    ? 'ws://localhost:8000/ws'
    : 'wss://your-production-server.com/ws',
  
  // REST APIエンドポイント
  apiBaseUrl: isDevelopment
    ? 'http://localhost:8000'
    : 'https://your-production-server.com/api',
  
  // 音声認識の言語設定
  speechRecognitionLang: 'ja-JP',
  
  // WebSocket再接続設定
  websocket: {
    maxReconnectAttempts: 5,
    reconnectDelay: 3000, // ミリ秒
  }
};

export default config;