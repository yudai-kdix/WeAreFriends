// src/services/animalDetector.ts
// 重要: バックエンドを明示的にインポート（順序も重要）
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-cpu';
// cocoSsdのインポートはバックエンドの後
import * as cocoSsd from '@tensorflow-models/coco-ssd';

// 検出対象の動物リスト（COCOデータセットのラベル）
const TARGET_ANIMALS = [
  'cat', 'dog', 'horse', 'sheep', 'cow', 
  'elephant', 'bear', 'zebra', 'giraffe', 'bird'
];

class AnimalDetector {
  model = null;
  isLoading = false;

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
      
      // 利用可能なバックエンドを確認
      console.log('Available backends:', Object.keys(tf.engine().registryFactory));
      
      // バックエンドを明示的に設定 (CPU優先)
      await tf.setBackend('cpu')
        .then(() => console.log('Using CPU backend'))
        .catch(async (e) => {
          console.warn('Failed to set CPU backend:', e);
          // WebGLバックエンドを試す
          await tf.setBackend('webgl')
            .then(() => console.log('Using WebGL backend'))
            .catch(e => console.error('Failed to set WebGL backend:', e));
        });
      
      // 現在のバックエンドを確認
      console.log('Current backend:', tf.getBackend());
      
      console.log('動物検出モデルをロード中...');
      // 軽量モデルを使用するオプションを指定
      const modelConfig = {
        base: 'lite_mobilenet_v2'
      };
      this.model = await cocoSsd.load(modelConfig);
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