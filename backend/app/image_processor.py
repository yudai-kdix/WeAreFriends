import os
import glob
from ultralytics import YOLO

# 指定されたフォルダ内の最新の画像から、最も大きく写っている物体を検出するクラス。
# YOLOv8モデルを使用します。
class ImageProcessor:
    # ImageProcessorのコンストラクタ。
    #
    # Args:
    #     folder_path (str, optional): 画像が保存されているフォルダのパス。
    #                                      デフォルトは "received_images"。
    def __init__(self, folder_path="received_images"):
        self.folder_path = folder_path
        # YOLOv8の事前学習済みモデルをロード（n: nano, s: small など、サイズと精度で選択可）
        self.model = YOLO("yolov8n.pt")

    # 指定されたフォルダ内の最新の画像ファイルを取得し、
    # その中で最も大きく写っている物体を検出し、そのラベル名を返します。
    #
    # Returns:
    #     str: 検出結果のメッセージ。物体が検出された場合はそのラベル名、
    #          画像がない場合や物体が検出されなかった場合はエラーメッセージ。
    def detect_largest_object(self) -> str:
        # フォルダ内の画像ファイル一覧を更新時刻の降順で取得
        image_files = sorted(
            glob.glob(os.path.join(self.folder_path, "*.*")), # 全ての拡張子のファイルを取得
            key=os.path.getmtime,  # 更新時刻をソートキーとする
            reverse=True           # 降順（新しいものが先頭）
        )

        # 画像ファイルが存在しない場合の処理
        if not image_files:
            return "画像が見つかりませんでした。"

        latest_image = image_files[0]  # 最新の画像ファイルを取得

        # YOLOモデルで物体検出を実行
        # results[0] には最初の画像の検出結果が含まれる (今回は1画像のみ処理)
        results = self.model(latest_image)[0]

        # 検出された物体がない場合の処理
        if len(results.boxes) == 0:
            return "物体が検出されませんでした。"

        # 検出されたバウンディングボックスの中で、面積が最大のものを特定
        largest_box = max(
            results.boxes, # 検出された全てのバウンディングボックス
            # バウンディングボックスの面積 (幅 * 高さ) を計算するラムダ式
            key=lambda box: (box.xyxy[0][2] - box.xyxy[0][0]) * (box.xyxy[0][3] - box.xyxy[0][1])
        )

        # 最大のバウンディングボックスのクラスIDとラベル名を取得
        class_id = int(largest_box.cls[0])  # クラスID (整数)
        label = self.model.names[class_id]   # クラスIDに対応するラベル名

        return f"画像から最も大きく写っていたのは「{label}」です。"

