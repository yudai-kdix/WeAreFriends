FROM --platform=\${BUILDPLATFORM:-linux/amd64} python:3.10-slim

WORKDIR /app

# Poetry のインストール
RUN pip install poetry

# Poetry の設定：仮想環境を作成しない
RUN poetry config virtualenvs.create false

# pyproject.toml と poetry.lock をコピー（存在する場合）
COPY pyproject.toml ./
COPY poetry.lock* ./

# 依存関係のインストール
RUN poetry install --no-interaction --no-ansi

# アプリケーションコードをコピー
COPY . .

# FastAPIアプリの起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
