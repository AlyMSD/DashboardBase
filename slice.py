from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- sample data in-memory ---
slices = {
    "HERO":  {"pass": 22, "fail": 5, "not_started": 3},
    "PSS":   {"pass": 27, "fail": 0, "not_started": 2},
    "FWA-C": {"pass": 24, "fail": 3, "not_started": 1},
    "FWA-E": {"pass": 27, "fail": 0, "not_started": 0},
}

markets = [
    {
        "name":   "BostonMarket",
        "vendor": "Samsung",
        "nf":     "vCU",
        "type":   "RAN",
        "results": {
            "HERO":   {"pass": 20, "fail": 5},
            "FWA":    {"pass": 21, "fail": 4},
            "PSS":    {"pass": 23, "fail": 2},
            "FWA-1-11":{"pass": 24, "fail": 1},
        },
        "nodes": [
            {"id": "node-1", "status": "pass"},
            {"id": "node-2", "status": "fail"},
            {"id": "node-3", "status": "pass"},
        ]
    },
    # … add more markets the same way …
]

@app.route("/api/slices")
def get_slices():
    return jsonify([
        {"name": k, **v, "total": v["pass"]+v["fail"]+v["not_started"]}
        for k, v in slices.items()
    ])

@app.route("/api/markets")
def get_markets():
    summary = []
    for m in markets:
        summary.append({
            "name":    m["name"],
            "vendor":  m["vendor"],
            "nf":      m["nf"],
            "type":    m["type"],
            "results": m["results"]
        })
    return jsonify(summary)

@app.route("/api/markets/<market_name>")
def get_market_detail(market_name):
    for m in markets:
        if m["name"] == market_name:
            return jsonify(m)
    return jsonify({"error": "not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)