// 音声合成サービスを連携するためのクラス
// プロトタイプでは単純なブラウザのWeb Speech APIを使用
// 本番環境では、FastAPIバックエンドを通じてGoogle Text-to-Speechなどを使用

class SpeechService {
  constructor() {
    this.synth = window.speechSynthesis;
    this.voices = [];
    this.isInitialized = false;
    this.isInitializing = false;
    this.preferredLang = 'ja-JP'; // デフォルト言語は日本語
    
    // 言語ごとの声の設定（男性/女性、高さ、速度など）
    this.voicePresets = {
      'cat': { pitch: 1.3, rate: 1.0, volume: 1.0 },
      'dog': { pitch: 0.9, rate: 1.1, volume: 1.0 },
      'bird': { pitch: 1.5, rate: 1.2, volume: 0.9 },
      'elephant': { pitch: 0.6, rate: 0.8, volume: 1.0 },
      'bear': { pitch: 0.7, rate: 0.9, volume: 1.0 },
      'zebra': { pitch: 1.0, rate: 1.0, volume: 0.8 },
      'giraffe': { pitch: 1.1, rate: 0.9, volume: 0.9 },
      'default': { pitch: 1.0, rate: 1.0, volume: 1.0 }
    };
  }

  // 初期化処理
  async initialize() {
    if (this.isInitialized) return;
    if (this.isInitializing) {
      // 初期化中の場合は完了を待つ
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }
    
    try {
      this.isInitializing = true;
      
      // ブラウザが音声合成APIをサポートしているか確認
      if (!this.synth) {
        console.error('このブラウザは音声合成をサポートしていません。');
        this.isInitializing = false;
        return;
      }
      
      // 利用可能な音声のロード
      await this.loadVoices();
      
      this.isInitialized = true;
      this.isInitializing = false;
      console.log('音声合成サービスが初期化されました');
    } catch (error) {
      console.error('音声合成サービスの初期化に失敗しました:', error);
      this.isInitializing = false;
      throw error;
    }
  }

  // 利用可能な音声のロード
  async loadVoices() {
    // 音声がすでにロードされているか確認
    if (this.synth.getVoices().length > 0) {
      this.voices = this.synth.getVoices();
      return;
    }
    
    // 音声が利用可能になるまで待機
    if (this.synth.onvoiceschanged !== undefined) {
      return new Promise(resolve => {
        this.synth.onvoiceschanged = () => {
          this.voices = this.synth.getVoices();
          resolve();
        };
      });
    }
    
    // 30秒後にタイムアウト
    const timeout = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('音声のロードがタイムアウトしました')), 30000);
    });
    
    // 1秒ごとに音声が利用可能かチェック
    const checkVoices = async () => {
      return new Promise(resolve => {
        const interval = setInterval(() => {
          const availableVoices = this.synth.getVoices();
          if (availableVoices.length > 0) {
            clearInterval(interval);
            this.voices = availableVoices;
            resolve();
          }
        }, 1000);
      });
    };
    
    // タイムアウトか音声ロードのどちらか早い方
    return Promise.race([checkVoices(), timeout]);
  }

  // 言語に適した音声を取得
  getVoiceForLanguage(lang = this.preferredLang, animalType = 'default') {
    if (!this.isInitialized) {
      console.warn('音声合成サービスが初期化されていません');
      return null;
    }
    
    // 指定した言語の音声を検索
    let voices = this.voices.filter(voice => voice.lang.includes(lang));
    
    // 指定言語の音声がない場合はデフォルト言語の音声を使用
    if (voices.length === 0) {
      voices = this.voices.filter(voice => voice.lang.includes('en-US'));
    }
    
    // 動物に応じて男性/女性の音声を選択
    // ここでは簡易的に実装
    if (['cat', 'bird'].includes(animalType)) {
      // 女性の声を優先
      const femaleVoice = voices.find(voice => voice.name.includes('Female'));
      if (femaleVoice) return femaleVoice;
    } else if (['dog', 'bear', 'elephant'].includes(animalType)) {
      // 男性の声を優先
      const maleVoice = voices.find(voice => voice.name.includes('Male'));
      if (maleVoice) return maleVoice;
    }
    
    // 適切な音声が見つからない場合は最初の音声を使用
    return voices[0] || this.voices[0];
  }

  // テキストを読み上げる
  speak(text, animalType = 'default', lang = this.preferredLang) {
    if (!this.isInitialized) {
      console.warn('音声合成サービスが初期化されていません');
      return;
    }
    
    // 現在の発話をキャンセル
    this.synth.cancel();
    
    // 音声合成の設定
    const utterance = new SpeechSynthesisUtterance(text);
    
    // 音声選択
    const voice = this.getVoiceForLanguage(lang, animalType);
    if (voice) utterance.voice = voice;
    
    // 言語設定
    utterance.lang = lang;
    
    // 動物タイプに応じた音声特性の調整
    const preset = this.voicePresets[animalType] || this.voicePresets.default;
    utterance.pitch = preset.pitch;
    utterance.rate = preset.rate;
    utterance.volume = preset.volume;
    
    // スピーチの開始・終了イベント
    utterance.onstart = () => {
      console.log('読み上げ開始:', text.substring(0, 20) + '...');
    };
    
    utterance.onend = () => {
      console.log('読み上げ終了');
    };
    
    utterance.onerror = (error) => {
      console.error('読み上げエラー:', error);
    };
    
    // 発話開始
    this.synth.speak(utterance);
    
    return utterance;
  }

  // バックエンドのText-to-Speech APIを呼び出す（本番環境用）
  async synthesizeWithBackend(text, animalType, lang = this.preferredLang) {
    try {
      // FastAPIバックエンドへのリクエスト
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text,
          animal_type: animalType,
          language: lang
        })
      });
      
      if (!response.ok) {
        throw new Error(`TTS API エラー: ${response.status} ${response.statusText}`);
      }
      
      // 音声データを取得（バイナリ）
      const audioData = await response.arrayBuffer();
      
      // オーディオの再生
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioSource = audioContext.createBufferSource();
      
      // デコード
      const audioBuffer = await audioContext.decodeAudioData(audioData);
      audioSource.buffer = audioBuffer;
      audioSource.connect(audioContext.destination);
      
      // 再生開始
      audioSource.start(0);
      
      return audioSource;
    } catch (error) {
      console.error('バックエンドTTS APIの呼び出しに失敗しました:', error);
      
      // フォールバックとしてブラウザの音声合成を使用
      return this.speak(text, animalType, lang);
    }
  }

  // 言語を設定
  setLanguage(lang) {
    this.preferredLang = lang;
  }

  // 音声合成の中止
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

// シングルトンとしてエクスポート
const speechService = new SpeechService();
export default speechService;