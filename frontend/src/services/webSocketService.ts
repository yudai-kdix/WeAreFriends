// src/services/websocketService.js

class WebSocketService {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.isConnected = false;
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.disconnectionHandlers = [];
    this.errorHandlers = [];
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.clientId = this.generateClientId();
  }

  // ランダムなクライアントIDを生成
  generateClientId() {
    return 'client_' + Math.random().toString(36).substr(2, 9);
  }

  // WebSocket接続を確立
  connect() {
    if (this.isConnected) return;

    try {
      // クライアントIDをクエリパラメータとして追加
      const wsUrl = `${this.url}?client_id=${this.clientId}`;
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('WebSocket接続が確立されました');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.connectionHandlers.forEach(handler => handler());
      };

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('メッセージを受信しました:', message);
          this.messageHandlers.forEach(handler => handler(message));
        } catch (error) {
          // JSONでない場合はテキストメッセージとして処理
          console.log('テキストメッセージを受信しました:', event.data);
          this.messageHandlers.forEach(handler => handler({ type: 'text', data: event.data }));
        }
      };

      this.socket.onclose = (event) => {
        console.log('WebSocket接続が閉じられました', event.code, event.reason);
        this.isConnected = false;
        this.disconnectionHandlers.forEach(handler => handler(event));
        
        // 再接続ロジック
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`${this.reconnectDelay / 1000}秒後に再接続を試みます (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connect(), this.reconnectDelay);
        }
      };

      this.socket.onerror = (error) => {
        console.error('WebSocketエラー:', error);
        this.errorHandlers.forEach(handler => handler(error));
      };
    } catch (error) {
      console.error('WebSocket接続の確立中にエラーが発生しました:', error);
    }
  }

  // WebSocket接続を閉じる
  disconnect() {
    if (this.socket && this.isConnected) {
      this.socket.close();
      this.isConnected = false;
    }
  }

  // メッセージを送信
  sendMessage(message) {
    if (this.socket && this.isConnected) {
      if (typeof message === 'object') {
        this.socket.send(JSON.stringify(message));
      } else {
        this.socket.send(message);
      }
    } else {
      console.error('WebSocketが接続されていないため、メッセージを送信できません');
    }
  }

  // メッセージハンドラを追加
  onMessage(handler) {
    this.messageHandlers.push(handler);
  }

  // 接続ハンドラを追加
  onConnect(handler) {
    this.connectionHandlers.push(handler);
    if (this.isConnected) {
      handler();
    }
  }

  // 切断ハンドラを追加
  onDisconnect(handler) {
    this.disconnectionHandlers.push(handler);
  }

  // エラーハンドラを追加
  onError(handler) {
    this.errorHandlers.push(handler);
  }
}

// シングルトンインスタンスを作成（ウェブソケットURL設定は環境変数から取得することも可能）
const websocketService = new WebSocketService('ws://localhost:8000/ws');

export default websocketService;