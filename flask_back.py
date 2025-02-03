from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# MongoDB configuration
client = MongoClient(os.getenv("MONGO_URI"))
db = client[os.getenv("MONGO_DB")]

@app.route('/analyze', methods=['POST'])
def analyze_data():
    try:
        # Parse request data
        data = request.json
        query = json.loads(data.get('query', '{}'))
        
        # Get collection (you might want to parameterize this)
        collection = db[os.getenv("MONGO_COLLECTION")]
        
        # Execute query
        results = collection.find(query)
        
        # Analyze results (example metrics)
        metrics = {}
        for doc in results:
            for field, value in doc.items():
                if isinstance(value, (int, float)):
                    if field not in metrics:
                        metrics[field] = {
                            'count': 0,
                            'sum': 0,
                            'max': float('-inf'),
                            'min': float('inf')
                        }
                    metrics[field]['count'] += 1
                    metrics[field]['sum'] += value
                    metrics[field]['max'] = max(metrics[field]['max'], value)
                    metrics[field]['min'] = min(metrics[field]['min'], value)
        
        # Format response
        formatted_data = []
        for field, stats in metrics.items():
            formatted_data.append({
                'field': field,
                'count': stats['count'],
                'average': stats['sum'] / stats['count'] if stats['count'] > 0 else 0,
                'max': stats['max'],
                'min': stats['min']
            })
        
        return jsonify({'data': formatted_data})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    app.run(port=5000)