// src/utils/objectInfoUtils.ts

import objectNameMapping from "../data/objectNameMapping";

// 検出された対象の情報を格納するインターフェース
export interface ObjectInfo {
  name: string;
  description: string;
  facts: string[];
  color: string;
  prompt?: string;
}

// オブジェクトの色マッピング
const COLOR_MAP: { [key: string]: string } = {
  cat: "#FFD700", 
  dog: "#4682B4",
  bird: "#32CD32",
  elephant: "#808080",
  zebra: "#000000",
  bear: "#8B4513",
  giraffe: "#DAA520",
  horse: "#8B4513",
  sheep: "#F5F5DC",
  cow: "#8B0000",
  person: "#FF7F50",
  // その他のオブジェクトは簡易的なカラーコードを設定
  default: "#6A5ACD"
};

// 動物と判定されるオブジェクトのリスト
const ANIMAL_TYPES = [
  "bird", "cat", "dog", "horse", "sheep", "cow", 
  "elephant", "bear", "zebra", "giraffe", "penguin"
];

/**
 * 検出したオブジェクトの情報を取得する関数
 * @param detectedObject 検出されたオブジェクトの種類（英語名）
 * @returns オブジェクト情報
 */
export const getObjectInfo = (detectedObject: string | null): ObjectInfo => {
  if (!detectedObject) {
    // デフォルトの情報を返す
    return {
      name: "不明なオブジェクト",
      description: "こんにちは！カメラに映ったものについて話しましょう。",
      facts: [
        "カメラをかざして「識別」ボタンを押すと対象を特定できます",
        "動物園には様々な動物や展示物があります",
        "もっと近づいてみると、うまく識別できるかもしれません"
      ],
      color: "#6A5ACD",
    };
  }
  
  // オブジェクト名のマッピングを取得
  let objectName = objectNameMapping[detectedObject] || null;
  
  // マッピングにない場合は英語名を整形して使用
  if (!objectName) {
    objectName = formatObjectName(detectedObject);
  }
  
  // 動物か非動物かを判断
  const isAnimal = ANIMAL_TYPES.includes(detectedObject);
  
  // 色を取得
  const color = COLOR_MAP[detectedObject] || COLOR_MAP.default;
  
  if (isAnimal) {
    // 動物と判断される場合
    return {
      name: objectName,
      description: `こんにちは！私は${objectName}です。動物園でよく見かける動物の一つです。詳しい特徴については質問してみてください！`,
      facts: [
        `${objectName}についてもっと知りたいですか？`,
        "質問してみてください",
        "動物園の動物たちはみんな個性的です"
      ],
      color: color,
      prompt: `あなたは動物園にいる${detectedObject}です。来園者に${detectedObject}の生態や特徴について、実際の知識に基づいて教えてあげてください。特徴的な鳴き声や仕草を交えながら、自然に振る舞ってください。質問に短く答えてください。`
    };
  } else {
    // 動物ではないオブジェクトと判断される場合
    return {
      name: objectName,
      description: `こんにちは！私は${objectName}です。何か質問はありますか？`,
      facts: [
        "動物園では様々なものに出会えます",
        "カメラを動物に向けて「識別」ボタンを押してみてください",
        "何か知りたいことがあれば質問してください"
      ],
      color: color,
      prompt: `あなたは動物園で検出された${detectedObject}です。${objectName}についての面白い事実や情報を、ユーモアを交えて教えてください。質問に短く答えてください。`
    };
  }
};

/**
 * オブジェクト名をフォーマットする補助関数
 * @param name アンダースコア区切りの英語名
 * @returns スペース区切りの整形された名前
 */
const formatObjectName = (name: string): string => {
  return name
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};