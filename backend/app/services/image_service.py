# app/services/image_service.py

import os
import json
import base64
import glob
from typing import Optional, Tuple
from ultralytics import YOLO
import cv2
from app.core.logger import logger

PROMPTS_JSON_PATH = "app/core/prompts.json"

def save_ws_image(image_base64: str, filename: str) -> str:
    save_dir = "received_images"
    os.makedirs(save_dir, exist_ok=True)
    filepath = os.path.join(save_dir, filename)
    data = base64.b64decode(image_base64)
    with open(filepath, "wb") as f:
        f.write(data)
    logger.info(f"WS画像を保存: {filepath}")
    return filepath

class ImageProcessor:
    def __init__(self, folder_path="received_images", model_path="models/best.pt", flg: int = 0):
        self.folder_path = folder_path
        os.makedirs(folder_path, exist_ok=True)
        # モデル選択フラグによる切り替え
        self.flg = flg
        if flg == 0:
            # 従来の YOLOv8 モデルを使用
            self.model = YOLO(model_path)
            logger.info(f"YOLOv8モデル {model_path} をロード完了")
        elif flg == 1:
            os.makedirs(folder_path, exist_ok=True)
            self.model = YOLO("yolov8n.pt")
            logger.info("ImageProcessor初期化: YOLOモデルをロード完了")
        else:
            # デフォルトにフォールバック
            self.model = YOLO(model_path)
            logger.info(f"デフォルトモデル {model_path} をロード完了")
        self.prompts = self._load_prompts()

    def _load_prompts(self):
        with open(PROMPTS_JSON_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        logger.info(f"Prompts.json をロード完了: {list(data.keys())}")
        return data

    def _get_latest_image_files(self):
        return sorted(
            glob.glob(os.path.join(self.folder_path, "*.*")),
            key=os.path.getmtime,
            reverse=True
        )

    def detect_top_box(
        self,
        image_path: Optional[str] = None,
        conf_threshold: float = 0.0
    ) -> Optional[dict]:
        """
        最新画像（または指定画像）から、最も信頼度の高い検出結果のラベル、信頼度、バウンディングボックスを返す。
        しきい値以下なら None を返す。
        """
        if image_path is None:
            files = self._get_latest_image_files()
            if not files:
                logger.warning("画像が見つかりませんでした。")
                return None
            image_path = files[0]

        results = self.model(image_path)[0]
        if not results.boxes:
            logger.warning("物体が検出されませんでした。")
            return None

        # 最も信頼度の高いボックスを選択
        top = max(results.boxes, key=lambda b: float(b.conf[0]))
        conf = float(top.conf[0])
        if conf < conf_threshold:
            logger.info(f"信頼度 {conf:.2f} がしきい値 {conf_threshold} 未満のため None を返します")
            return None

        # 座標を整数に変換
        x1, y1, x2, y2 = map(int, top.xyxy[0].tolist())
        label = self.model.names[int(top.cls[0])]

        return {
            "label": label,
            "confidence": conf,
            "bbox": {
                "x": x1,
                "y": y1,
                "width": x2 - x1,
                "height": y2 - y1
            }
        }

    def detect_largest_object_with_confidence(
        self,
        image_path: Optional[str] = None,
        conf_threshold: float = 0.3
    ) -> Tuple[str, float]:
        default_label = "default"
        try:
            # 画像パスの決定
            if image_path is None:
                files = self._get_latest_image_files()
                if not files:
                    logger.warning("画像が見つかりませんでした。")
                    return default_label, 0.0
                image_path = files[0]

            # 推論
            results = self.model(image_path)[0]
            if len(results.boxes) == 0:
                logger.warning("物体が検出されませんでした。")
                return default_label, 0.0

            # 最も信頼度の高いボックスを選択
            top = max(results.boxes, key=lambda b: float(b.conf[0]))
            label = self.model.names[int(top.cls[0])]
            confidence = float(top.conf[0])

            logger.info(f"検出結果: {label} (信頼度: {confidence:.2f})")

            if confidence < conf_threshold:
                logger.info(f"信頼度 {confidence:.2f} がしきい値 {conf_threshold} 未満のため default に切り替え")
                label = default_label

            # 画像読み込み＆描画
            img = cv2.imread(image_path)
            x1, y1, x2, y2 = map(int, top.xyxy[0].tolist())
            cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
            cv2.putText(
                img,
                f"{label} {confidence:.2f}",
                (x1, y1 - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 0),
                2
            )

            # 注釈付き画像を保存
            basename = os.path.basename(image_path)
            boxed_name = f"boxed_{basename}"
            boxed_path = os.path.join(self.folder_path, boxed_name)
            cv2.imwrite(boxed_path, img)
            logger.info(f"Annotated image saved: {boxed_path}")

            # 元画像は削除
            try:
                os.remove(image_path)
            except Exception as e:
                logger.warning(f"元画像の削除に失敗: {e}")

            return label, confidence

        except Exception as e:
            logger.error(f"物体検出エラー: {e}")
            return default_label, 0.0
