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

// WebSocketメッセージの型
export type WebSocketMessageType = 'text' | 'audio' | 'set_animal' | 'message';

// WebSocketから送信するメッセージの型
export interface WebSocketOutgoingMessage {
  type: WebSocketMessageType;
  content?: string;
  animal_type?: string;
  id?: string; // メッセージの一意識別子を追加
}

// WebSocketから受信するメッセージの型
export interface WebSocketIncomingMessage {
  type: WebSocketMessageType;
  data?: string;
  id?: string; // メッセージの一意識別子を追加
  error?: string;
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
}