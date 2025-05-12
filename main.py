from fastapi import FastAPI, WebSocket
from fastapi.responses import HTMLResponse
import base64

app = FastAPI()

html = """
<!DOCTYPE html>
<html>
    <head>
        <title>Chat</title>
    </head>
    <body>
        <h1>WebSocket Chat</h1>
        <form action="" onsubmit="sendMessage(event)">
            <input type="text" id="messageText" autocomplete="off"/>
            <button>Send</button>
        </form>
        <h4>画像送信</h4>
        <input type="file" id="fileInput" />
        <button onclick="sendImage()">Send Image</button>
        <h4>音声送信</h4>
        <input type="file" id="fileInput" />
        <button onclick="sendAudio()">Send Audio</button>
        <ul id='messages'>
        </ul>
        <script>
            var ws = new WebSocket("ws://localhost:8000/ws");
            ws.onmessage = function(event) {
                var messages = document.getElementById('messages')
                var message = document.createElement('li')
                var content = document.createTextNode(event.data)
                message.appendChild(content)
                messages.appendChild(message)
            };
            function sendMessage(event) {
                var input = document.getElementById("messageText")
                ws.send(JSON.stringify({ type: "text", data: input.value }))
                input.value = ''
                event.preventDefault()
            }
            function sendImage() {
                var fileInput = document.getElementById("fileInput")
                var file = fileInput.files[0]
                if (file && file.type.startsWith("image/")) {
                    var reader = new FileReader()
                    reader.onload = function() {
                        var base64Data = reader.result.split(",")[1]
                        ws.send(JSON.stringify({ type: "image", data: base64Data, filename: file.name }))
                    }
                    reader.readAsDataURL(file)
                } else {
                    alert("Please select an image file.")
                }
            }
            function sendAudio() {
                var fileInput = document.getElementById("fileInput")
                var file = fileInput.files[0]
                if (file && file.type.startsWith("audio/")) {
                    var reader = new FileReader()
                    reader.onload = function() {
                        var base64Data = reader.result.split(",")[1]
                        ws.send(JSON.stringify({ type: "audio", data: base64Data, filename: file.name }))
                    }
                    reader.readAsDataURL(file)
                } else {
                    alert("Please select an audio file.")
                }
            }
        </script>
    </body>
</html>
"""


@app.get("/")
async def get():
    return HTMLResponse(html)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    while True:
        data = await websocket.receive_text()
        message = eval(data)  # Convert JSON string to dictionary
        if message["type"] == "text":
            await websocket.send_text(f"Message text was: {message['data']}")
        elif message["type"] == "image":
            file_data = base64.b64decode(message["data"])
            filename = message["filename"]
            with open(f"received_image_{filename}", "wb") as f:
                f.write(file_data)
            await websocket.send_text(f"Image {filename} received and saved.")
        elif message["type"] == "audio":
            file_data = base64.b64decode(message["data"])
            filename = message["filename"]
            with open(f"received_audio_{filename}", "wb") as f:
                f.write(file_data)
            await websocket.send_text(f"Audio {filename} received and saved.")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="localhost", port=8000)