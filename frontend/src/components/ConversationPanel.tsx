import React, { useState, useEffect, useRef, FC } from "react";
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
  animalType: string;
  animalName: string;
  isVisible: boolean;
  onClose: () => void;
}

const ConversationPanel: FC<ConversationPanelProps> = ({
  animalType,
  animalName,
  isVisible,
  onClose,
}) => {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // WebSocketのURLを設定ファイルから取得
  const socketUrl = config.websocketEndpoint;

  // WebSocketの接続
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    config.websocketEndpoint,
    {
      onOpen: () => {
        // 接続時に動物の種類を送信
        sendMessage(
          JSON.stringify({
            type: "set_animal",
            animal_type: animalType || "default",
          })
        );

        // 初期メッセージを追加
        setMessages([
          {
            role: "assistant",
            content: `こんにちは！${animalName || "動物"}と会話を始められます。何か質問してください！`,
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
        // JSONでない場合はテキストメッセージとして処理
        console.log("テキストメッセージを受信しました:", lastMessage.data);
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
  }, [lastMessage]);

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
      };
      sendMessage(JSON.stringify(outgoingMessage));

      // 少し間を空けて音声認識を自動的に終了
      setTimeout(() => {
        setIsListening(false);
      }, 500);
    };

    speechService.onSpeech(handleSpeech);

    speechService.onStart(() => {
      setIsListening(true);
    });

    speechService.onEnd(() => {
      setIsListening(false);
    });

    return () => {
      // クリーンアップ
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
        <h3>{animalName || "動物"}との会話</h3>
        <button className="close-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <div className="conversation-body">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role === "user" ? "user-message" : "animal-message"}`}
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
