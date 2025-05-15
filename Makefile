##########ビルド系
init:  #新規のビルド
	docker compose -f compose.yml up -d --build

build:  #キャッシュを使わないビルド,起動はしない
	docker compose -f compose.yml build --no-cache

up:  #セットアップや既存イメージの再ビルド
	docker compose -f compose.yml up -d

down:  #コンテナ削除
	docker compose down --remove-orphans

start:  #コンテナの起動
	docker compose -f compose.yml start

stop:  #コンテナの停止
	docker compose stop

destroy: #イメージ、ボリューム、その他コンテナを全て削除します
	docker compose down --rmi all --volumes --remove-orphans

destroy-volumes: #ボリュームの削除
	docker compose down --volumes --remove-orphans

pull:
	git pull origin main
	cd backend && poetry install

##########コンテナ操作系

restart: #コンテナの再起動
	@make stop
	@make up

remake:  #コンテナの再生成
	@make down
	@make up

reupdate:  #コンテナを更新
	@make down
	@make init

reset:  #全てのデータを削除し、新規ビルド(成果物は消えない)
	@make destroy
	@make init

##########コンテナに入る系

backend:  #バックエンドコンテナに入る
	docker compose exec backend bash

frontend:  #フロントエンドコンテナに入る
	docker compose exec frontend bash

ps: . #現在稼働中のコンテナを表示
	docker compose ps

##########その他

npm-dev:  #サーバーを起動(コンテナ起動時にport:3000は使われているため、あまり意味はない)
	docker compose exec app npm run dev

##########ブラウザ表示系

mac-app:  #MacOSの場合はこれでブラウザが開く
	open http://localhost:3000