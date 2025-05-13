# WeAreFriends

Poetryでパッケージ管理を行うので導入手順(macOS)を記載します。
https://python-poetry.org/docs/#installing-with-the-official-installer
Poetryのインストール
```bash
curl -sSL https://install.python-poetry.org | python3 -
```

パッケージの追加方法
```bash
poetry add <package_name>
```

pullしたときのパッケージのインストール
```bash
poetry install
```

実行コマンド
```bash
poetry run python main.py
```

### セットアップ手順

1. リポジトリをクローンします

```bash
git clone https://github.com/yudai-kdix/WeAreFriends.git
cd WeAreFriends
```

2. 環境変数ファイルを設定します

```bash
# .envファイルを作成
cp backend/.env.example backend/.env
```

`.env`ファイルを編集して、必要なAPIキー（OpenAI APIキーなど）を設定してください。

3. Dockerコンテナを構築・起動します

```bash
docker compose build
docker compose up -d
```

4. 動作確認

以下のURLにアクセスして動作を確認します：
- フロントエンド: http://localhost:5173
- バックエンドAPI: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs

## 開発ガイド

### ディレクトリ構造

```
wearefriends/
├── backend/              # FastAPIバックエンド
│   ├── app/              # アプリケーションコード
│   │   ├── main.py       # エントリーポイント
│   │   ├── api/          # APIエンドポイント
│   │   ├── core/         # コア機能（画像認識、言語処理など）
│   │   └── db/           # データベース関連
│   ├── Dockerfile        # バックエンド用Dockerfile
│   └── pyproject.toml    # Poetryの依存関係定義
├── frontend/             # React + Viteフロントエンド
│   ├── src/              # ソースコード
│   ├── Dockerfile        # フロントエンド用Dockerfile
│   └── package.json      # npm依存関係
└── docker-compose.yml    # Docker Compose設定
```

### コンテナの操作

- コンテナを起動する：`docker compose up -d`
- コンテナを停止する：`docker compose down`
- ログを確認する：
  - バックエンド：`docker compose logs backend`
  - フロントエンド：`docker compose logs frontend`
- バックエンドのコンテナに入る：`docker compose exec backend sh`
- フロントエンドのコンテナに入る：`docker compose exec frontend sh`