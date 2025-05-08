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
]

def to_tot_dep(raw):
    """Given {'pass': x, 'fail': y}, return {'total': x+y, 'deployed': x}."""
    return {"total": raw["pass"] + raw["fail"], "deployed": raw["pass"]}

@app.route("/api/slices")
def get_slices():
    # Return for each slice: name, total (pass+fail+not_started), deployed (pass)
    out = []
    for name, v in slices.items():
        total = v["pass"] + v["fail"] + v["not_started"]
        deployed = v["pass"]
        out.append({"name": name, "total": total, "deployed": deployed})
    return jsonify(out)

@app.route("/api/markets")
def get_markets():
    # Summary of each market: name, vendor, nf, type, results:{slice:{total,deployed}}
    out = []
    for m in markets:
        results = { slice: to_tot_dep(vals) 
                    for slice, vals in m["results"].items() }
        out.append({
            "name":   m["name"],
            "vendor": m["vendor"],
            "nf":     m["nf"],
            "type":   m["type"],
            "results": results
        })
    return jsonify(out)

@app.route("/api/markets/<market_name>")
def get_market_detail(market_name):
    # Full detail: includes nodes with their own results transformed
    for m in markets:
        if m["name"] == market_name:
            results = { slice: to_tot_dep(vals) 
                        for slice, vals in m["results"].items() }
            nodes = []
            for n in m["nodes"]:
                node_res = { slice: to_tot_dep(vals) 
                             for slice, vals in n["results"].items() }
                nodes.append({"id": n["id"], "results": node_res})
            return jsonify({
                "name":    m["name"],
                "vendor":  m["vendor"],
                "nf":      m["nf"],
                "type":    m["type"],
                "results": results,
                "nodes":   nodes
            })
    return jsonify({"error": "not found"}), 404

if __name__ == "__main__":
    app.run(debug=True)