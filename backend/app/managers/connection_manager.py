from typing import Dict, Any, Optional
from fastapi import WebSocket
import json
from app.core.logger import logger

class ConnectionManager:
    """
    WebSocket接続を管理し、メッセージの送受信を扱う
    """
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        # クライアントごとの現在の会話相手（動物）を記録
        self.client_friends: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        self.active_connections[client_id] = websocket
        
        # 重要: 既に会話相手が設定されていた場合は上書きしない
        if client_id in self.client_friends:
            current_friend = self.client_friends[client_id]
            logger.info(f"クライアント {client_id} は既に会話相手「{current_friend}」が設定されています。この設定を維持します。")
        else:
            # 新しい接続で会話相手が未設定の場合のみデフォルト値を設定
            self.client_friends[client_id] = "default"
            logger.info(f"クライアント {client_id} の会話相手をデフォルト値に設定しました")
            
        logger.info(f"Connected: {client_id}")
        # デバッグ用: 現在の接続状態を出力
        self._log_state()

    def disconnect(self, client_id: str):
        if client_id in self.active_connections:
            del self.active_connections[client_id]
            # クライアントの会話相手情報も削除
            if client_id in self.client_friends:
                del self.client_friends[client_id]
            logger.info(f"Disconnected: {client_id}")
            # デバッグ用: 現在の接続状態を出力
            self._log_state()

    async def send_message(self, client_id: str, message: Any):
        websocket = self.active_connections.get(client_id)
        if websocket:
            await websocket.send_text(json.dumps(message))
            logger.info(f"Sent message to {client_id}: {message}")
    
    def set_friend(self, client_id: str, friend: str) -> bool:
        """
        クライアントの会話相手（動物）を設定
        
        Args:
            client_id (str): クライアントID
            friend (str): 設定する会話相手（動物名）
            
        Returns:
            bool: 設定が成功したかどうか
        """
        # ここでログを強化: クライアントIDがactive_connectionsに存在するか確認
        previous_friend = self.client_friends.get(client_id, "未設定")
        self.client_friends[client_id] = friend
        logger.info(f"クライアント {client_id} の会話相手を設定: {previous_friend} -> {friend}")
        
        # WebSocketの存在チェックは、メッセージ送信時にのみ必要
        connection_exists = client_id in self.active_connections
        if not connection_exists:
            logger.warning(f"クライアント {client_id} はWebSocketに接続されていませんが、会話相手を設定しました")
        
        # デバッグ用: 現在の接続状態を出力
        self._log_state()
        return True
    
    def get_friend(self, client_id: str) -> str:
        """
        クライアントの現在の会話相手（動物）を取得
        
        Args:
            client_id (str): クライアントID
            
        Returns:
            str: 現在の会話相手（動物名）、未設定の場合は"default"
        """
        friend = self.client_friends.get(client_id, "default")
        logger.debug(f"クライアント {client_id} の会話相手を取得: {friend}")
        return friend

    def get_client_ids(self) -> list:
        """
        接続中の全クライアントIDのリストを取得
        
        Returns:
            list: クライアントIDのリスト
        """
        return list(self.active_connections.keys())
    
    def _log_state(self):
        """
        デバッグ用: 現在の接続状態とクライアントの会話相手を出力
        """
        logger.debug(f"現在の接続数: {len(self.active_connections)}")
        logger.debug(f"接続中のクライアント: {list(self.active_connections.keys())}")
        logger.debug(f"クライアントの会話相手: {self.client_friends}")

    # デバッグ用の情報取得関数を追加
    def get_state_info(self) -> Dict[str, Any]:
        """
        現在の状態情報を取得（デバッグ用）
        
        Returns:
            Dict[str, Any]: 状態情報の辞書
        """
        return {
            "active_connections_count": len(self.active_connections),
            "active_client_ids": list(self.active_connections.keys()),
            "client_friends": self.client_friends
        }

# グローバルインスタンスを作成（このモジュール内で一度だけ作成）
manager = ConnectionManager()