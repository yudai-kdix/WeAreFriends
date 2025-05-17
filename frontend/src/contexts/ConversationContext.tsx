// src/contexts/ConversationContext.tsx

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import useWebSocket, { ReadyState } from 'react-use-websocket';
import speechService from '../services/speechService';
import config from '../config';
import {
  type ConversationMessage,
  type WebSocketIncomingMessage,
  type WebSocketOutgoingMessage,
} from '../types';

// コンテキストの型定義
interface ConversationContextType {
  messages: ConversationMessage[];
  isListening: boolean;
  isSpeaking: boolean;
  isConnected: boolean;
  connectionStatus: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  sendMessage: (text: string) => void;
  // 追加するメソッドと状態
  animalType: string | null;
  animalName: string | null;
  setAnimalInfo: (animalType: string, animalName: string) => void;
}

// デフォルト値を持つコンテキストを作成
const ConversationContext = createContext<ConversationContextType>({
  messages: [],
  isListening: false,
  isSpeaking: false,
  isConnected: false,
  connectionStatus: 'uninstantiated',
  animalName: null,
  animalType: null,
  startListening: () => {},
  stopListening: () => {},
  toggleListening: () => {},
  sendMessage: () => {},
  setAnimalInfo: () => {},
});

// プロバイダーのプロップス型
interface ConversationProviderProps {
  children: ReactNode;
  clientId: string;
  initialAnimalType?: string;
  initialAnimalName?: string;
}

// プロバイダーコンポーネント
export const ConversationProvider: React.FC<ConversationProviderProps> = ({
  children,
  clientId,
  initialAnimalType = null,
  initialAnimalName = null,

}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [animalType, setAnimalType] = useState<string>(initialAnimalType || '');
  const [animalName, setAnimalName] = useState<string>(initialAnimalName || '');
  const processedMessageIds = React.useRef<Set<string>>(new Set());

  // クライアントIDを含めたWebSocketのURL
  const socketUrl = `${config.websocketEndpoint}?client_id=${encodeURIComponent(clientId)}`;

  // WebSocketの接続
  const { sendJsonMessage, lastMessage, readyState } = useWebSocket(
    socketUrl,
    {
      share: true,
      onOpen: () => {
        console.log(`WebSocket接続確立: クライアントID = ${clientId}`);
        
        // 初期メッセージを追加（動物情報がある場合のみ）
        if (animalName) {
          setMessages([
            {
              role: "assistant",
              content: `こんにちは！${animalName || "検出されたもの"}と会話を始められます。何か質問してください！`,
              timestamp: new Date(),
            },
          ]);
        }
      },
    }
  );

  // WebSocketの接続状態
  const connectionStatus = {
    [ReadyState.CONNECTING]: "connecting",
    [ReadyState.OPEN]: "open",
    [ReadyState.CLOSING]: "closing",
    [ReadyState.CLOSED]: "closed",
    [ReadyState.UNINSTANTIATED]: "uninstantiated",
  }[readyState];

  // 接続しているかどうか
  const isConnected = readyState === ReadyState.OPEN;

  // 動物情報を設定するメソッド
  const setAnimalInfo = (newAnimalType: string, newAnimalName: string) => {
    setAnimalType(newAnimalType);
    setAnimalName(newAnimalName);
    
    // 新しい動物が設定された時、以前のメッセージをクリアして初期メッセージを設定
    setMessages([
      {
        role: "assistant",
        content: `こんにちは！${newAnimalName}と会話を始められます。何か質問してください！`,
        timestamp: new Date(),
      },
    ]);
  };

  // WebSocketからメッセージを受信したときの処理
  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const data = JSON.parse(lastMessage.data) as WebSocketIncomingMessage;
        console.log("受信メッセージ:", data);

        // メッセージIDを生成（または受信したメッセージに含まれるIDを使用）
        const messageId = data.id || `${data.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        
        // すでに処理したメッセージは無視
        if (processedMessageIds.current.has(messageId)) {
          return;
        }
        
        // 処理済みとしてマーク
        processedMessageIds.current.add(messageId);

        if (data.type === "audio") {
          // 音声データの処理
          if (data.data) {
            speechService.playAudio(data.data);
            setIsSpeaking(true);

            // 音声の再生が終わったことを示すタイマー（実際には音声長に合わせるべき）
            setTimeout(() => {
              setIsSpeaking(false);
            }, 5000); // 仮に5秒後
          }
        } else if (data.type === "text") {
          // テキストメッセージの処理
          if (data.data) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: data.data as string,
                timestamp: new Date(),
              },
            ]);
          }
        }
      } catch (error) {
        console.error("メッセージの解析エラー:", error);
        // JSONでない場合はテキストメッセージとして処理
        console.log("テキストメッセージを受信しました:", lastMessage.data);
        
        // 重複メッセージを避けるためのシンプルなハッシュ
        const messageHash = `text-${lastMessage.data}-${Date.now().toString().substring(0, 8)}`;
        
        if (!processedMessageIds.current.has(messageHash)) {
          processedMessageIds.current.add(messageHash);
          
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: lastMessage.data,
              timestamp: new Date(),
            },
          ]);
        }
      }
    }
  }, [lastMessage]);

  // 一定期間経過後に処理済みメッセージのクリーンアップを行う
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // 処理済みメッセージリストのサイズが大きくなりすぎないようにする
      if (processedMessageIds.current.size > 100) {
        processedMessageIds.current = new Set();
      }
    }, 60000); // 1分ごとにチェック
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // 音声認識イベントのハンドラ設定
  useEffect(() => {
    const handleSpeech = (transcript: string): void => {
      // 認識されたテキストをメッセージとして追加
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: transcript,
          timestamp: new Date(),
        },
      ]);

      // WebSocketを通じてサーバーに送信
      const outgoingMessage: WebSocketOutgoingMessage = {
        type: "message",
        content: transcript,
        id: `user-msg-${Date.now()}`, // 一意のIDを追加
      };
      sendJsonMessage(outgoingMessage);

      // 少し間を空けて音声認識を自動的に終了
      setTimeout(() => {
        stopListening();
      }, 500);
    };

    const handleStart = () => {
      setIsListening(true);
    };

    const handleEnd = () => {
      setIsListening(false);
    };
    // 登録
    speechService.onSpeech(handleSpeech);
    speechService.onStart(handleStart);
    speechService.onEnd(handleEnd);

    return () => {
      // クリーンアップ - リスナー削除
      speechService.removeSpeechHandler(handleSpeech);
      speechService.removeStartHandler(handleStart);
      speechService.removeEndHandler(handleEnd);
      speechService.stopListening();
    };
  }, [sendJsonMessage]);

  // 音声認識の開始
  const startListening = (): void => {
    if (!isListening) {
      speechService.startListening();
    }
  };

  // 音声認識の停止
  const stopListening = (): void => {
    if (isListening) {
      speechService.stopListening();
    }
  };

  // 音声認識の開始/停止トグル
  const toggleListening = (): void => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // テキストメッセージの送信
  const sendMessage = (text: string): void => {
    // メッセージを追加
    setMessages((prev) => [
      ...prev,
      {
        role: "user",
        content: text,
        timestamp: new Date(),
      },
    ]);

    // WebSocketを通じてサーバーに送信
    const outgoingMessage: WebSocketOutgoingMessage = {
      type: "message",
      content: text,
      id: `user-msg-${Date.now()}`,
    };
    sendJsonMessage(outgoingMessage);
  };

  // コンテキスト値を構築
  const contextValue: ConversationContextType = {
    messages,
    isListening,
    isSpeaking,
    isConnected,
    connectionStatus,
    startListening,
    stopListening,
    toggleListening,
    sendMessage,
    // 追加するプロパティとメソッド
    animalType,
    animalName,
    setAnimalInfo,
  };

  // コンテキストプロバイダーでラップ
  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
};

// カスタムフック
export const useConversation = () => useContext(ConversationContext);