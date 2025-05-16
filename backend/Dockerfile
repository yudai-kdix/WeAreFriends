# FROM --platform=\${BUILDPLATFORM:-linux/amd64} python:3.10-slim
# pythonのバージョンを3.12に変えて
FROM --platform=${BUILDPLATFORM:-linux/amd64} python:3.12-slim

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

COPY ./badproxy /etc/apt/apt.conf.d/99fixbadproxy

RUN printf "deb http://ftp.jp.debian.org/debian bullseye main contrib non-free\n" \
        > /etc/apt/sources.list && \
    apt-get update

RUN apt-get clean && rm -rf /var/lib/apt/lists/* \
    && apt-get update \
    && apt-get install -y --fix-missing libopencv-dev

# アプリケーションコードをコピー
COPY . .

# FastAPIアプリの起動
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
