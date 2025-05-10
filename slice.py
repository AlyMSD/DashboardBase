import os
from flask import Flask, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

def get_db():
    uri = os.getenv('MONGO_URI')
    db_name = os.getenv('DB_NAME')
    if not uri or not db_name:
        raise RuntimeError('MONGO_URI and DB_NAME must be set')
    client = MongoClient(uri)
    return client[db_name]

col = get_db().markets

@app.route('/api/slices')
def get_slices():
    agg = {}
    for doc in col.find({}, {'_id': 0, 'results': 1}):
        for name, vals in doc.get('results', {}).items():
            if name not in agg:
                agg[name] = {'total': 0, 'deployed': 0}
            agg[name]['total'] += vals.get('total', 0)
            agg[name]['deployed'] += vals.get('deployed', 0)
    return jsonify([{ 'name': n, **stats } for n, stats in agg.items()])

@app.route('/api/markets')
def get_markets():
    markets = []
    for m in col.find({}, {'_id': 0, 'marketId': 1, 'marketName': 1, 'vendor': 1, 'nf': 1, 'nfType': 1, 'results': 1}):
        markets.append({
            'id': m['marketId'],
            'name': m['marketName'],
            'vendor': m.get('vendor'),
            'nf': m.get('nf'),
            'type': m.get('nfType'),
            'results': m.get('results', {})
        })
    return jsonify(markets)

@app.route('/api/markets/<int:id>/<nf>/<name>')
def get_market_detail(id, nf, name):
    m = col.find_one({'marketId': id, 'nf': nf, 'marketName': name}, {'_id': 0, 'marketId': 1, 'marketName': 1, 'vendor': 1, 'nf': 1, 'nfType': 1, 'nodes': 1})
    if not m:
        return jsonify({'error': 'not found'}), 404
    return jsonify({
        'id': m['marketId'],
        'name': m['marketName'],
        'vendor': m.get('vendor'),
        'nf': m.get('nf'),
        'type': m.get('nfType'),
        'nodes': m.get('nodes', [])
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
