from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- sample data in-memory ---
slices = {
    "HERO":    {"pass": 22, "fail": 5,  "not_started": 3},
    "PSS":     {"pass": 27, "fail": 0,  "not_started": 2},
    "FWA":     {"pass": 24, "fail": 3,  "not_started": 1},
    "FWA-1-11":{"pass": 27, "fail": 0,  "not_started": 0},
}

markets = [
    {
        "name":   "BostonMarket",
        "vendor": "Samsung",
        "nf":     "vCU",
        "type":   "RAN",
        "results": {
            "HERO":    {"pass": 20, "fail": 5},
            "PSS":     {"pass": 23, "fail": 2},
            "FWA":     {"pass": 21, "fail": 4},
            "FWA-1-11":{"pass": 24, "fail": 1},
        },
        "nodes": [
            {
                "id": "node-1",
                "results": {
                  "HERO":    {"pass": 5, "fail": 1},
                  "PSS":     {"pass": 4, "fail": 0},
                  "FWA":     {"pass": 3, "fail": 0},
                  "FWA-1-11":{"pass": 2, "fail": 0},
                }
            },
            {
                "id": "node-2",
                "results": {
                  "HERO":    {"pass": 7, "fail": 1},
                  "PSS":     {"pass": 6, "fail": 0},
                  "FWA":     {"pass": 5, "fail": 2},
                  "FWA-1-11":{"pass": 3, "fail": 0},
                }
            },
        ]
    },
    {
        "name":   "ChicagoMarket",
        "vendor": "Ericsson",
        "nf":     "vCU",
        "type":   "RAN",
        "results": {
            "HERO":    {"pass": 20, "fail": 7},
            "PSS":     {"pass": 26, "fail": 1},
            "FWA":     {"pass": 23, "fail": 4},
            "FWA-1-11":{"pass": 27, "fail": 0},
        },
        "nodes": [
            {
                "id": "node-A",
                "results": {
                  "HERO":    {"pass":10, "fail":2},
                  "PSS":     {"pass": 8, "fail":0},
                  "FWA":     {"pass": 7, "fail":1},
                  "FWA-1-11":{"pass": 5, "fail":0},
                }
            },
            {
                "id": "node-B",
                "results": {
                  "HERO":    {"pass":12, "fail":3},
                  "PSS":     {"pass":10, "fail":1},
                  "FWA":     {"pass": 9, "fail":2},
                  "FWA-1-11":{"pass": 6, "fail":0},
                }
            },
        ]
    },
    # … add more markets …
]

@app.route("/api/slices")
def get_slices():
    return jsonify([
        {"name": k, **v, "total": v["pass"] + v["fail"] + v["not_started"]}
        for k, v in slices.items()
    ])

@app.route("/api/markets")
def get_markets():
    return jsonify([
        {
            "name":    m["name"],
            "vendor":  m["vendor"],
            "nf":      m["nf"],
            "type":    m["type"],
            "results": m["results"]
        }
        for m in markets
    ])

@app.route("/api/markets/<market_name>")
def get_market_detail(market_name):
    for m in markets:
        if m["name"] == market_name:
            return jsonify(m)
    return jsonify({"error": "not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)