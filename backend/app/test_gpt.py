# import os
# from openai import OpenAI
# from dotenv import load_dotenv

# load_dotenv()
# client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# # 会話の履歴を保持
# messages = [
#     {"role": "system", "content": "あなたは動物園の案内役です。来園者の質問に親切に答えてください。"}
# ]

# while True:
#     # ユーザーからの入力を取得
#     user_input = input("🧑 あなた：")
#     if user_input.lower() in ["exit", "quit", "終了"]:
#         print("会話を終了します。")
#         break

#     messages.append({"role": "user", "content": user_input})

#     # GPTに問い合わせ
#     response = client.chat.completions.create(
#         model="gpt-3.5-turbo",
#         messages=messages
#     )

#     reply = response.choices[0].message.content
#     messages.append({"role": "assistant", "content": reply})

#     print("🐯 GPT：", reply)

import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# 動物の名前を入力
animal = "犬"

# プロンプトを生成
def get_prompt(animal: str) -> str:
    template = "あなたは{animal}です。語尾を{animal}のようにして会話してください。"
    return template.format(animal=animal)

while True:
    print("\n🟢 新しいセッションを開始します（exitで終了）")
    messages = [{"role": "system", "content": get_prompt(animal)}]
    print(messages)

    while True:
        user_input = input("🧑 あなた：")
        if user_input.lower() in ["exit", "quit", "終了"]:
            print("🔴 セッションを終了します。")
            break

        messages.append({"role": "user", "content": user_input})
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        reply = response.choices[0].message.content
        messages.append({"role": "assistant", "content": reply})

        print("🐯 GPT：", reply)

    # ここでセッションを区切って最初に戻る
    restart = input("\n🔄 新しいセッションを始めますか？ (y/n): ")
    if restart.lower() != "y":
        print("👋 終了します。")
        break