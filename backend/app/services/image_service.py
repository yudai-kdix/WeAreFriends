import os
import base64
import random
from app.core.logger import logger
from app.services.mock_animals import MOCK_ANIMALS
import glob
from ultralytics import YOLO
from typing import Optional, Tuple


def save_image(image_base64: str, images_dir: str) -> str:
    """
    Base64画像をデコードして保存し、ファイル名を返す
    """
    os.makedirs(images_dir, exist_ok=True)
    image_data = base64.b64decode(image_base64)
    filename = f"animal_{int(random.random()*1e9)}.jpg"
    filepath = os.path.join(images_dir, filename)
    with open(filepath, "wb") as f:
        f.write(image_data)
    logger.info(f"画像を保存: {filepath}")
    return filename


def detect_animal(filename: str) -> tuple[str, float]:
    """
    既存のロジックでランダムに動物を選択して返す
    """
    animal = random.choice(MOCK_ANIMALS)
    confidence = round(random.uniform(0.7, 0.98), 2)
    logger.info(f"ランダム動物: {animal}, 信頼度: {confidence}")
    return animal, confidence


def save_ws_image(image_base64: str, filename: str) -> str:
    """
    WebSocketから受信したBase64画像を保存し、パスを返す
    """
    save_dir = "received_images"
    os.makedirs(save_dir, exist_ok=True)
    
    filepath = os.path.join(save_dir, filename)
    data = base64.b64decode(image_base64)
    with open(filepath, "wb") as f:
        f.write(data)
    logger.info(f"WS画像を保存: {filepath}")
    return filepath

class ImageProcessor:
    """
    画像処理と物体検出を行うクラス
    """
    def __init__(self, folder_path="received_images"):
        self.folder_path = folder_path
        os.makedirs(folder_path, exist_ok=True)
        # YOLOv8の事前学習済みモデルをロード
        self.model = YOLO("yolov8n.pt")
        logger.info("ImageProcessor初期化: YOLOモデルをロード完了")

    def detect_largest_object(self, image_path=None) -> Optional[str]:
        """
        指定された画像または最新の画像から最も大きな物体を検出
        
        Args:
            image_path (str, optional): 画像のパス。指定しない場合は最新の画像を使用
            
        Returns:
            Optional[str]: 検出された物体の名前。検出失敗時はNone
        """
        try:
            if image_path is None:
                # 最新の画像を取得
                image_files = self._get_latest_image_files()
                if not image_files:
                    logger.warning("画像が見つかりませんでした。")
                    return None
                image_path = image_files[0]
                
            # YOLOモデルで物体検出を実行
            results = self.model(image_path)[0]
            
            # 検出された物体がない場合
            if len(results.boxes) == 0:
                logger.warning("物体が検出されませんでした。")
                return None
                
            # 最大の物体を取得
            largest_box = max(
                results.boxes,
                key=lambda box: (box.xyxy[0][2] - box.xyxy[0][0]) * (box.xyxy[0][3] - box.xyxy[0][1])
            )
            
            # クラスIDとラベル名を取得
            class_id = int(largest_box.cls[0])
            label = self.model.names[class_id]
            
            # 検出物体の名前のみを返す
            logger.info(f"検出された物体: {label}")
            return label
            
        except Exception as e:
            logger.error(f"物体検出中にエラー発生: {e}")
            return None

    def detect_largest_object_with_confidence(self, image_path=None) -> Tuple[Optional[str], float]:
        """
        指定された画像または最新の画像から最も大きな物体を検出し、信頼度も返す
        
        Args:
            image_path (str, optional): 画像のパス。指定しない場合は最新の画像を使用
            
        Returns:
            Tuple[Optional[str], float]: (検出された物体の名前, 信頼度)。検出失敗時は(None, 0.0)
        """
        try:
            if image_path is None:
                # 最新の画像を取得
                image_files = self._get_latest_image_files()
                if not image_files:
                    logger.warning("画像が見つかりませんでした。")
                    return None, 0.0
                image_path = image_files[0]
                
            # YOLOモデルで物体検出を実行
            results = self.model(image_path)[0]
            
            # 検出された物体がない場合
            if len(results.boxes) == 0:
                logger.warning("物体が検出されませんでした。")
                return None, 0.0
                
            # 最大の物体を取得
            largest_box = max(
                results.boxes,
                key=lambda box: (box.xyxy[0][2] - box.xyxy[0][0]) * (box.xyxy[0][3] - box.xyxy[0][1])
            )
            
            # クラスIDとラベル名を取得
            class_id = int(largest_box.cls[0])
            label = self.model.names[class_id]
            confidence = float(largest_box.conf[0])
            
            try:
                os.remove(image_path)
            except Exception as e:
                logger.warning(f"[警告] 元画像の削除に失敗しました: {e}")
            
            return label, confidence
            
        except Exception as e:
            logger.error(f"物体検出中にエラー発生: {e}")
            return None, 0.0

    def detect_latest_object(self) -> Optional[str]:
        """
        最新の画像から物体を検出する便利なメソッド
        
        Returns:
            Optional[str]: 検出された物体の名前。検出失敗時はNone
        """
        return self.detect_largest_object()
        
    def _get_latest_image_files(self):
        """
        フォルダ内の画像ファイル一覧を更新時刻の降順で取得
        
        Returns:
            list: 画像ファイルパスのリスト（新しい順）
        """
        return sorted(
            glob.glob(os.path.join(self.folder_path, "*.*")),
            key=os.path.getmtime,
            reverse=True
        )