// src/config.ts
import { type AppConfig } from './types';

// 環境に応じた設定
const isDevelopment = import.meta.env.DEV;

// 環境変数が存在する場合は使用し
const getApiHost = () => {
  if (isDevelopment) return 'localhost:8000';
  // 本番環境では環境変数が必須
  if (!import.meta.env.VITE_API_HOST) {
    console.error('本番環境では VITE_API_HOST 環境変数が必要です');
  }
  return import.meta.env.VITE_API_HOST || '';
};

const getApiProtocol = () => {
  if (isDevelopment) return 'http';
  return import.meta.env.VITE_API_PROTOCOL || 'https';
};

const getWsProtocol = () => {
  if (isDevelopment) return 'ws';
  return import.meta.env.VITE_WS_PROTOCOL || 'wss';
};

const config: AppConfig = {
  // WebSocketエンドポイント
  websocketEndpoint: `${getWsProtocol()}://${getApiHost()}/ws`,
  
  // REST APIエンドポイント
  apiBaseUrl: `${getApiProtocol()}://${getApiHost()}`,
  
  // 音声認識の言語設定
  speechRecognitionLang: 'ja-JP',
  
  // WebSocket再接続設定
  websocket: {
    maxReconnectAttempts: 5,
    reconnectDelay: 3000, // ミリ秒
  }
};

export default config;