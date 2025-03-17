from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
import os

app = Flask(__name__)

# Replace the URI with your MongoDB connection string.
MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(MONGO_URI)
db = client['metricsdb']
nfs_collection = db['nfs']

def serialize_nf(nf):
    nf['_id'] = str(nf['_id'])
    return nf

@app.route('/api/nfs', methods=['GET'])
def get_nfs():
    try:
        nfs_cursor = nfs_collection.find()
        nfs = [serialize_nf(nf) for nf in nfs_cursor]
        return jsonify(nfs), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/nfs', methods=['POST'])
def save_nfs():
    try:
        new_nfs = request.get_json()
        if not new_nfs:
            return jsonify({"error": "No data provided"}), 400

        # For this example, clear the collection and insert new data.
        nfs_collection.delete_many({})
        if isinstance(new_nfs, list):
            # Convert any provided _id strings back to ObjectId if needed.
            for nf in new_nfs:
                nf.pop('_id', None)  # Remove _id if present, letting Mongo generate a new one.
            result = nfs_collection.insert_many(new_nfs)
        else:
            new_nfs.pop('_id', None)
            result = nfs_collection.insert_one(new_nfs)
        return jsonify({"message": "Data saved"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
