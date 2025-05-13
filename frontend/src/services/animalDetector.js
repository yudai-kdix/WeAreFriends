import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// 検出対象の動物リスト（COCOデータセットのラベル）
const TARGET_ANIMALS = [
  'cat', 'dog', 'horse', 'sheep', 'cow', 
  'elephant', 'bear', 'zebra', 'giraffe', 'bird'
];

class AnimalDetector {
  constructor() {
    this.model = null;
    this.isLoading = false;
  }

  // モデルの読み込み
  async loadModel() {
    if (this.model) return this.model;
    
    if (this.isLoading) {
      // モデルがロード中の場合は完了を待つ
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.model;
    }

    try {
      this.isLoading = true;
      console.log('動物検出モデルをロード中...');
      this.model = await cocoSsd.load();
      console.log('動物検出モデルのロードが完了しました');
      this.isLoading = false;
      return this.model;
    } catch (error) {
      this.isLoading = false;
      console.error('モデルのロード中にエラーが発生しました:', error);
      throw error;
    }
  }

  // 画像内の動物を検出
  async detectAnimals(imageElement) {
    if (!this.model) {
      await this.loadModel();
    }

    try {
      // オブジェクト検出を実行
      const predictions = await this.model.detect(imageElement);
      
      // 動物のみをフィルタリング
      const animals = predictions
        .filter(prediction => TARGET_ANIMALS.includes(prediction.class))
        .map(animal => ({
          type: animal.class,
          confidence: animal.score,
          bbox: animal.bbox // [x, y, width, height]
        }));

      return animals;
    } catch (error) {
      console.error('動物検出中にエラーが発生しました:', error);
      return [];
    }
  }

  // 検出結果から最も確率の高い動物を取得
  getTopAnimal(detections) {
    if (!detections || detections.length === 0) return null;
    
    // 信頼度でソート
    const sortedAnimals = [...detections].sort((a, b) => b.confidence - a.confidence);
    return sortedAnimals[0];
  }
}

// シングルトンとしてエクスポート
const detector = new AnimalDetector();
export default detector;