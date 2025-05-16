// src/data/objectNameMapping.ts

/**
 * YOLOの検出クラス名と日本語名のマッピング
 * フロントエンド用の軽量データ
 * バックエンドとの連携のために英語のクラス名をキーとして使用
 */
const objectNameMapping: { [key: string]: string } = {
  // 人間
  person: "人間",
  
  // 乗り物・交通手段
  bicycle: "自転車",
  car: "車",
  motorcycle: "バイク",
  airplane: "飛行機",
  bus: "バス",
  train: "電車",
  truck: "トラック",
  boat: "ボート",
  
  // 道路設備
  traffic_light: "信号機",
  fire_hydrant: "消火栓",
  stop_sign: "一時停止標識",
  parking_meter: "パーキングメーター",
  bench: "ベンチ",
  
  // 動物
  bird: "鳥",
  cat: "猫",
  dog: "犬",
  horse: "馬",
  sheep: "羊",
  cow: "牛",
  elephant: "象",
  bear: "クマ",
  zebra: "シマウマ",
  giraffe: "キリン",
  
  // 持ち物・アクセサリー
  backpack: "バックパック",
  umbrella: "傘",
  handbag: "ハンドバッグ",
  tie: "ネクタイ",
  suitcase: "スーツケース",
  
  // スポーツ用品
  frisbee: "フリスビー",
  skis: "スキー",
  snowboard: "スノーボード",
  sports_ball: "スポーツボール",
  kite: "凧",
  baseball_bat: "野球バット",
  baseball_glove: "野球グローブ",
  skateboard: "スケートボード",
  surfboard: "サーフボード",
  tennis_racket: "テニスラケット",
  
  // 容器・食器
  bottle: "ボトル",
  wine_glass: "ワイングラス",
  cup: "カップ",
  fork: "フォーク",
  knife: "ナイフ",
  spoon: "スプーン",
  bowl: "ボウル",
  
  // 食べ物
  banana: "バナナ",
  apple: "リンゴ",
  sandwich: "サンドイッチ",
  orange: "オレンジ",
  broccoli: "ブロッコリー",
  carrot: "ニンジン",
  hot_dog: "ホットドッグ",
  pizza: "ピザ",
  donut: "ドーナツ",
  cake: "ケーキ",
  
  // 家具・家電
  chair: "椅子",
  couch: "ソファ",
  potted_plant: "観葉植物",
  bed: "ベッド",
  dining_table: "ダイニングテーブル",
  toilet: "トイレ",
  tv: "テレビ",
  laptop: "ノートパソコン",
  mouse: "マウス",
  remote: "リモコン",
  keyboard: "キーボード",
  cell_phone: "スマートフォン",
  microwave: "電子レンジ",
  oven: "オーブン",
  toaster: "トースター",
  sink: "シンク",
  refrigerator: "冷蔵庫",
  
  // 文具・日用品
  book: "本",
  clock: "時計",
  vase: "花瓶",
  scissors: "はさみ",
  teddy_bear: "テディベア",
  hair_drier: "ドライヤー",
  toothbrush: "歯ブラシ"
};

export default objectNameMapping;