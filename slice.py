from flask import Flask, jsonify
from flask_cors import CORS
from datetime import datetime

app = Flask(__name__)
CORS(app)

# Slice summary unchanged
slices = {
    "HERO":    {"total": 30, "deployed": 22},
    "PSS":     {"total": 29, "deployed": 27},
    "FWA":     {"total": 28, "deployed": 24},
    "FWA-1-11":{"total": 27, "deployed": 27},
}

markets = [
    {
        "id":      1,
        "name":    "BostonMarket",
        "vendor":  "Samsung",
        "nf":      "vCU",
        "type":    "RAN",
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
                  "HERO":    {"status": "online",   "timestamp": "2025-05-08T10:15:00Z"},
                  "PSS":     {"status": "online",   "timestamp": "2025-05-08T10:10:00Z"},
                  "FWA":     {"status": "offline",  "timestamp": "2025-05-08T09:45:00Z"},
                  "FWA-1-11":{"status": "online",   "timestamp": "2025-05-08T09:30:00Z"},
                }
            },
            {
                "id": "node-2",
                "results": {
                  "HERO":    {"status": "offline",  "timestamp": "2025-05-08T09:50:30Z"},
                  "PSS":     {"status": "online",   "timestamp": "2025-05-08T09:40:00Z"},
                  "FWA":     {"status": "degraded", "timestamp": "2025-05-08T09:20:00Z"},
                  "FWA-1-11":{"status": "online",   "timestamp": "2025-05-08T09:05:00Z"},
                }
            },
        ]
    },
    {
        "id":      2,
        "name":    "ChicagoMarket",
        "vendor":  "Ericsson",
        "nf":      "vCU",
        "type":    "RAN",
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
                  "HERO":    {"status": "online",   "timestamp": "2025-05-08T11:02:10Z"},
                  "PSS":     {"status": "online",   "timestamp": "2025-05-08T10:55:00Z"},
                  "FWA":     {"status": "online",   "timestamp": "2025-05-08T10:40:00Z"},
                  "FWA-1-11":{"status": "online",   "timestamp": "2025-05-08T10:30:00Z"},
                }
            },
            {
                "id": "node-B",
                "results": {
                  "HERO":    {"status": "degraded", "timestamp": "2025-05-08T10:45:00Z"},
                  "PSS":     {"status": "online",   "timestamp": "2025-05-08T10:35:00Z"},
                  "FWA":     {"status": "degraded", "timestamp": "2025-05-08T10:25:00Z"},
                  "FWA-1-11":{"status": "online",   "timestamp": "2025-05-08T10:15:00Z"},
                }
            },
        ]
    },
]

@app.route("/api/slices")
def get_slices():
    return jsonify([{"name": name, **vals} for name, vals in slices.items()])

@app.route("/api/markets")
def get_markets():
    return jsonify([
        {
            "id":      m["id"],
            "name":    m["name"],
            "vendor":  m["vendor"],
            "nf":      m["nf"],
            "type":    m["type"],
            "results": m["results"]
        } for m in markets
    ])

@app.route("/api/markets/<market_name>")
def get_market_detail(market_name):
    for m in markets:
        if m["name"] == market_name:
            return jsonify({
                "id":      m["id"],
                "name":    m["name"],
                "vendor":  m["vendor"],
                "nf":      m["nf"],
                "type":    m["type"],
                "nodes":   m["nodes"]
            })
    return jsonify({"error": "not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)