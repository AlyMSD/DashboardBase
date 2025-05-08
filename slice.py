from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# --- sample data in-memory, only total & deployed ---
slices = {
    "HERO":    {"total": 30, "deployed": 22},
    "PSS":     {"total": 29, "deployed": 27},
    "FWA":     {"total": 28, "deployed": 24},
    "FWA-1-11":{"total": 27, "deployed": 27},
}

markets = [
    {
        "name":   "BostonMarket",
        "vendor": "Samsung",
        "nf":     "vCU",
        "type":   "RAN",
        "results": {
            "HERO":    {"total": 25, "deployed": 20},
            "PSS":     {"total": 25, "deployed": 23},
            "FWA":     {"total": 25, "deployed": 21},
            "FWA-1-11":{"total": 25, "deployed": 24},
        },
        "nodes": [
            {
                "id": "node-1",
                "results": {
                  "HERO":    {"total": 6, "deployed": 5},
                  "PSS":     {"total": 4, "deployed": 4},
                  "FWA":     {"total": 3, "deployed": 3},
                  "FWA-1-11":{"total": 2, "deployed": 2},
                }
            },
            {
                "id": "node-2",
                "results": {
                  "HERO":    {"total": 8, "deployed": 7},
                  "PSS":     {"total": 6, "deployed": 6},
                  "FWA":     {"total": 7, "deployed": 5},
                  "FWA-1-11":{"total": 4, "deployed": 3},
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
            "HERO":    {"total": 27, "deployed": 20},
            "PSS":     {"total": 27, "deployed": 26},
            "FWA":     {"total": 27, "deployed": 23},
            "FWA-1-11":{"total": 27, "deployed": 27},
        },
        "nodes": [
            {
                "id": "node-A",
                "results": {
                  "HERO":    {"total":12, "deployed":10},
                  "PSS":     {"total": 8, "deployed": 8},
                  "FWA":     {"total": 8, "deployed": 7},
                  "FWA-1-11":{"total": 5, "deployed": 5},
                }
            },
            {
                "id": "node-B",
                "results": {
                  "HERO":    {"total":15, "deployed":12},
                  "PSS":     {"total":11, "deployed":10},
                  "FWA":     {"total":10, "deployed": 9},
                  "FWA-1-11":{"total": 6, "deployed": 6},
                }
            },
        ]
    },
]

@app.route("/api/slices")
def get_slices():
    return jsonify([
        {"name": name, **vals}
        for name, vals in slices.items()
    ])

@app.route("/api/markets")
def get_markets():
    return jsonify([
        {
            "name":   m["name"],
            "vendor": m["vendor"],
            "nf":     m["nf"],
            "type":   m["type"],
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