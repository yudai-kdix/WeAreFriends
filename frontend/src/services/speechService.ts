// src/services/speechService.ts
import config from '../config';

// ブラウザのSpeechRecognitionに対する型宣言
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionError extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionError) => void) | null;
  onend: ((event: Event) => void) | null;
  onstart: ((event: Event) => void) | null;
}

// SpeechRecognitionコンストラクタ
interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

// グローバルウィンドウに拡張を追加
declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

class SpeechService {
  private recognition: SpeechRecognition | null = null;
  private isListening: boolean = false;
  private speechHandlers: Array<(text: string) => void> = [];
  private errorHandlers: Array<(error: string) => void> = [];
  private startHandlers: Array<() => void> = [];
  private endHandlers: Array<() => void> = [];
  private audioContext: AudioContext | null = null;
  private audioQueue: ArrayBuffer[] = [];
  private isPlaying: boolean = false;

  constructor() {
    this.initSpeechRecognition();
  }

  // Web Speech APIの初期化
  private initSpeechRecognition(): void {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
      // ブラウザによって実装が異なる場合の対応
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRecognitionAPI();
      this.recognition.lang = config.speechRecognitionLang; // 設定ファイルから言語を取得
      this.recognition.interimResults = false; // 中間結果は不要
      this.recognition.continuous = false; // 連続認識はオフ
      this.recognition.maxAlternatives = 1; // 代替候補は1つだけ

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('認識された音声:', transcript);
        this.speechHandlers.forEach(handler => handler(transcript));
      };

      this.recognition.onerror = (event: SpeechRecognitionError) => {
        console.error('音声認識エラー:', event.error);
        this.errorHandlers.forEach(handler => handler(event.error));
        this.isListening = false;
      };

      this.recognition.onstart = () => {
        console.log('音声認識が開始されました');
        this.isListening = true;
        this.startHandlers.forEach(handler => handler());
      };

      this.recognition.onend = () => {
        console.log('音声認識が終了しました');
        this.isListening = false;
        this.endHandlers.forEach(handler => handler());
      };

      console.log('音声認識APIが初期化されました');
    } else {
      console.error('このブラウザは音声認識をサポートしていません');
    }
  }

  // 音声認識の開始
  public startListening(): void {
    if (!this.recognition) {
      console.error('音声認識APIが利用できません');
      return;
    }

    if (!this.isListening) {
      try {
        this.recognition.start();
      } catch (error) {
        console.error('音声認識の開始中にエラーが発生しました:', error);
      }
    }
  }

  // 音声認識の停止
  public stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('音声認識の停止中にエラーが発生しました:', error);
      }
    }
  }

  // 認識状態の取得
  public isRecognizing(): boolean {
    return this.isListening;
  }

  // 音声認識ハンドラの追加
  public onSpeech(handler: (text: string) => void): void {
    this.speechHandlers.push(handler);
  }

  // エラーハンドラの追加
  public onError(handler: (error: string) => void): void {
    this.errorHandlers.push(handler);
  }

  // 認識開始ハンドラの追加
  public onStart(handler: () => void): void {
    this.startHandlers.push(handler);
  }

  // 認識終了ハンドラの追加
  public onEnd(handler: () => void): void {
    this.endHandlers.push(handler);
  }

  // リスナー削除メソッド
  public removeSpeechHandler(handler: (text: string) => void): void {
    this.speechHandlers = this.speechHandlers.filter(h => h !== handler);
  }

  public removeStartHandler(handler: () => void): void {
    this.startHandlers = this.startHandlers.filter(h => h !== handler);
  }

  public removeEndHandler(handler: () => void): void {
    this.endHandlers = this.endHandlers.filter(h => h !== handler);
  }

  // base64エンコードされた音声データを再生
  public async playAudio(base64Audio: string): Promise<void> {
    try {
      // Base64デコード
      const binaryString = window.atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // キューに追加
      this.audioQueue.push(bytes.buffer);
      
      // 再生中でなければ再生開始
      if (!this.isPlaying) {
        this.processAudioQueue();
      }
    } catch (error) {
      console.error('音声の再生中にエラーが発生しました:', error);
    }
  }

  // 音声キューを処理
  private async processAudioQueue(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const audioBuffer = this.audioQueue.shift()!;

    try {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }

      // AudioBufferに変換
      const audioData = await this.audioContext.decodeAudioData(audioBuffer);
      
      // 再生
      const source = this.audioContext.createBufferSource();
      source.buffer = audioData;
      source.connect(this.audioContext.destination);
      
      // 再生終了時のコールバック
      source.onended = () => {
        this.processAudioQueue(); // 次の音声の処理
      };
      
      source.start(0);
    } catch (error) {
      console.error('音声デコード中にエラーが発生しました:', error);
      this.processAudioQueue(); // エラーの場合でも次へ進む
    }
  }

  // 診断用メソッド
  public getListenerStats(): { speech: number, start: number, end: number, error: number } {
    return {
      speech: this.speechHandlers.length,
      start: this.startHandlers.length,
      end: this.endHandlers.length,
      error: this.errorHandlers.length
    };
  }
  
  // デバッグ用にリスナーの内容を出力
  public debugLogListeners(): void {
    console.log('--- SpeechService Listeners Debug ---');
    console.log('Speech handlers:', this.speechHandlers.length);
    console.log('Start handlers:', this.startHandlers.length);
    console.log('End handlers:', this.endHandlers.length);
    console.log('Error handlers:', this.errorHandlers.length);
    
    // オプション: 関数の内容をハッシュ化して一意性を確認
    console.log('Speech handlers (detailed):');
    this.speechHandlers.forEach((handler, index) => {
      console.log(`  [${index}]: ${handler.toString().substring(0, 50)}...`);
    });
  }
}

// シングルトンインスタンスを作成
const speechService = new SpeechService();

export default speechService;