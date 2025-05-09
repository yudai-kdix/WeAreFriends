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