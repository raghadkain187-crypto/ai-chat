from flask import Flask, request
import sqlite3
# trigger deploy
app = Flask(__name__)

# إنشاء قاعدة البيانات
conn = sqlite3.connect("chat.db", check_same_thread=False)
c = conn.cursor()

c.execute("CREATE TABLE IF NOT EXISTS users (email TEXT)")
c.execute("CREATE TABLE IF NOT EXISTS messages (email TEXT, sender TEXT, message TEXT)")
conn.commit()
# redeploy
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        email = request.form.get("email")

        return f"""
        <h2>Welcome {email}</h2>
        <form action="/chat" method="post">
            <input type="hidden" name="email" value="{email}">
            <input name="message" placeholder="Type...">
            <button>Send</button>
        </form>
        """

    return """
    <h2>Login</h2>
    <form method="post">
        <input name="email" placeholder="Enter your email">
        <button>Start</button>
    </form>
    """

@app.route("/chat", methods=["POST"])
def chat():
    email = request.form.get("email")
    msg = request.form.get("message")

    reply = "AI: " + msg

    # حفظ الرسائل
    c.execute("INSERT INTO messages VALUES (?, ?, ?)", (email, "You", msg))
    c.execute("INSERT INTO messages VALUES (?, ?, ?)", (email, "AI", reply))
    conn.commit()

    # جلب المحادثة
    c.execute("SELECT sender, message FROM messages WHERE email=?", (email,))
    rows = c.fetchall()

    chat_html = ""
    for sender, text in rows:
        chat_html += f"<p><b>{sender}:</b> {text}</p>"

    return f"""
    <h2>Chat - {email}</h2>
    {chat_html}
    <form method="post">
        <input type="hidden" name="email" value="{email}">
        <input name="message" placeholder="Type...">
        <button>Send</button>
    </form>
    """

app.run(host="0.0.0.0", port=5000)if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)


