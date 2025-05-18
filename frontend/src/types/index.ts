// src/types/index.ts
// 型定義をモデルなしバージョンに更新

// 動物情報の型
export interface AnimalInfo {
  name: string;
  description: string;
  facts: string[];
  color: string;
  prompt?: string; // バックエンド用プロンプト（オプション）
}

// 動物データの型
export interface AnimalData {
  [key: string]: AnimalInfo;
}

// WebSocketのメッセージタイプを拡張
export type WebSocketMessageType = 
  'text' | 'audio' | 'set_animal' | 'message' | 
  'image' | 'tracking_result' | 'tracking_status' |
  'start_tracking' | 'stop_tracking';

// WebSocketから送信するメッセージの型
// WebSocketから送信するメッセージの型を拡張
export interface WebSocketOutgoingMessage {
  type: WebSocketMessageType;
  content?: string;
  animal_type?: string;
  id?: string;
  
  // 追跡関連の新しいフィールド
  data?: string;        // Base64エンコードされた画像データ
  settings?: {
    fps?: number;
    quality?: number;
    resolution?: {
      width: number;
      height: number;
    }
  }
}

// WebSocketから受信するメッセージの型
export interface WebSocketIncomingMessage {
  type: WebSocketMessageType;
  data?: string;
  id?: string;
  error?: string;
  
  // 追跡関連の新しいフィールド
  object_name?: string;
  confidence?: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  status?: 'starting' | 'active' | 'stopped' | 'error';
  message?: string;
}

// 会話メッセージの型
export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

// アプリケーション設定の型
export interface AppConfig {
  websocketEndpoint: string;
  apiBaseUrl: string;
  speechRecognitionLang: string;
  websocket: {
    maxReconnectAttempts: number;
    reconnectDelay: number;
  };
}

// バックエンドAPIのレスポンス型
export interface IdentifyAnimalResponse {
  animal: string;
  confidence: number;
  filename: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  }
}

export interface BoundingBox {
  x: number;      // 正規化された x 座標 (0-1)
  y: number;      // 正規化された y 座標 (0-1)
  width: number;  // 正規化された幅 (0-1)
  height: number; // 正規化された高さ (0-1)
}

export type TrackingMode = 'local' | 'server';