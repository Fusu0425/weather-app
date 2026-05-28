from flask import Flask, render_template
from weather import get_weather
from datetime import datetime
import webbrowser
import threading
import os

app = Flask(__name__)


@app.route("/")
def index():
    try:
        weather = get_weather()
        return render_template("index.html", weather=weather, now=datetime.now())
    except Exception as e:
        return render_template("index.html", weather=None, error=str(e), now=datetime.now())


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # 只在本地开发时自动打开浏览器
    if os.environ.get("AUTO_BROWSER", "1") == "1" and "RENDER" not in os.environ:
        threading.Timer(1.0, lambda: webbrowser.open(f"http://127.0.0.1:{port}")).start()
    app.run(debug=False, host="0.0.0.0", port=port)
