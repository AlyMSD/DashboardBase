import os
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

# Load environment variables from a .env file (ensure you create one with MONGO_URI and DB_NAME)
load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB setup
def get_db():
    uri = os.getenv("MONGO_URI")
    db_name = os.getenv("DB_NAME")
    if not uri or not db_name:
        raise RuntimeError("MONGO_URI and DB_NAME environment variables must be set")
    client = MongoClient(uri)
    return client.get_database(db_name)

db = get_db()

# Collections
markets_col = db.get_collection('markets')

@app.route("/api/slices")
def get_slices():
    # Aggregate slice totals across all markets
    cursor = markets_col.find({}, {"_id": 0, "results": 1})
    aggregate = {}
    for doc in cursor:
        for slice_name, vals in doc.get('results', {}).items():
            if slice_name not in aggregate:
                aggregate[slice_name] = {'total': 0, 'deployed': 0}
            aggregate[slice_name]['total'] += vals.get('total', 0)
            aggregate[slice_name]['deployed'] += vals.get('deployed', 0)
    # Convert to list of objects
    slices = [{ 'name': name, **stats } for name, stats in aggregate.items()]
    return jsonify(slices)

@app.route("/api/markets")
def get_markets():
    # Fetch all markets (only top-level info)
    cursor = markets_col.find(
        {},
        {"_id": 0, "marketId": 1, "marketName": 1, "vendor": 1, "nf": 1, "nfType": 1, "results": 1}
    )
    markets = []
    for m in cursor:
        markets.append({
            "id": m["marketId"],
            "name": m["marketName"],
            "vendor": m.get("vendor"),
            "nf": m.get("nf"),
            "type": m.get("nfType"),
            "results": m.get("results", {})
        })
    return jsonify(markets)

@app.route("/api/markets/<market_name>")
def get_market_detail(market_name):
    # Fetch one market by name
    m = markets_col.find_one(
        {"marketName": market_name},
        {"_id": 0, "marketId": 1, "marketName": 1, "vendor": 1, "nf": 1, "nfType": 1, "nodes": 1}
    )
    if not m:
        return jsonify({"error": "not found"}), 404
    return jsonify({
        "id": m["marketId"],
        "name": m["marketName"],
        "vendor": m.get("vendor"),
        "nf": m.get("nf"),
        "type": m.get("nfType"),
        "nodes": m.get("nodes", [])
    })

if __name__ == "__main__":
    # For development only; in production use a WSGI server like gunicorn
    app.run(debug=True, host='0.0.0.0', port=5000)
