import { useState, useEffect, useRef, type FC } from "react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import speechService from "../services/speechService";
import config from "../config";
import {
  type ConversationMessage,
  type WebSocketIncomingMessage,
  type WebSocketOutgoingMessage,
} from "../types";
import "./ConversationPanel.css";

interface ConversationPanelProps {
  animalType: string; // YOLOの検出クラス名（英語）
  animalName: string; // 日本語の表示名
  isVisible: boolean;
  onClose: () => void;
  clientId: string;
}

const ConversationPanel: FC<ConversationPanelProps> = ({
  // animalType,
  animalName,
  isVisible,
  onClose,
  clientId
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessageIds = useRef<Set<string>>(new Set()); // 処理済みメッセージIDを追跡

  // クライアントIDを含めたWebSocketのURL
  const socketUrl = `${config.websocketEndpoint}?client_id=${encodeURIComponent(clientId)}`;

  // WebSocketの接続
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    socketUrl,
    {
      share: true,
      onOpen: () => {
        console.log(`WebSocket接続確立: クライアントID = ${clientId}`);
        
        // 初期メッセージを追加
        setMessages([
          {
            role: "assistant",
            content: `こんにちは！${animalName || "検出されたもの"}と会話を始められます。何か質問してください！`,
            timestamp: new Date(),
          },
        ]);
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

  // 会話ログを自動スクロール
  const scrollToBottom = (): void => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
      sendMessage(JSON.stringify(outgoingMessage));

      // 少し間を空けて音声認識を自動的に終了
      setTimeout(() => {
        setIsListening(false);
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
      // クリーンアップ - リスナー削除を追加
      speechService.removeSpeechHandler(handleSpeech);
      speechService.removeStartHandler(handleStart);
      speechService.removeEndHandler(handleEnd);
      speechService.stopListening();
    };
  }, [sendMessage]);

  // パネルが表示されている時のみ会話機能をアクティブにする
  useEffect(() => {
    if (!isVisible) {
      speechService.stopListening();
    }
  }, [isVisible]);

  // 音声認識の開始/停止
  const toggleListening = (): void => {
    if (isListening) {
      speechService.stopListening();
    } else {
      speechService.startListening();
    }
  };

  // パネルが非表示の場合は何も表示しない
  if (!isVisible) return null;

  return (
    <div className="conversation-panel">
      <div className="conversation-header">
        <h3>{animalName || "検出されたもの"}との会話</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="conversation-body">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === "user" ? "user-message" : "object-message"}`}
          >
            <div className="message-content">{msg.content}</div>
            <div className="message-time">
              {msg.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="conversation-footer">
        <div className="connection-status">
          {isConnected ? (
            <span className="status-connected">接続中</span>
          ) : (
            <span className="status-disconnected">
              切断 ({connectionStatus})
            </span>
          )}
        </div>

        <button
          className={`mic-button ${isListening ? "listening" : ""} ${isSpeaking ? "speaking" : ""}`}
          onClick={toggleListening}
          disabled={isSpeaking || !isConnected}
        >
          {isListening
            ? "🎤 聞いています..."
            : isSpeaking
              ? "🔊 返答中..."
              : "🎤 話しかける"}
        </button>
      </div>
    </div>
  );
};

export default ConversationPanel;