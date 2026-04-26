from flask import Flask, request, jsonify

app = Flask(__name__)

users = {}

@app.route("/")
def home():
    return "Chat Genius 🚀"

@app.route("/setup", methods=["POST"])
def setup():
    data = request.json
    name = data.get("name")
    gender = data.get("gender")
    language = data.get("language")

    users[name] = {
        "gender": gender,
        "language": language
    }

    return jsonify({"message": f"تم تسجيلك يا {name}"})

@app.route("/chat", methods=["POST"])
def chat():
    data = request.json
    name = data.get("name")
    message = data.get("message")

    user = users.get(name)

    if not user:
        return jsonify({"reply": "سجل أول"})

    if user["gender"] == "male":
        reply = f"يا {name} قلت: {message}"
    else:
        reply = f"يا {name} قلتي: {message}"

    return jsonify({"reply": reply})

app.run(host="0.0.0.0", port=5000)
