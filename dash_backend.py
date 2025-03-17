from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
import os

app = Flask(__name__)
# Replace the URI with your own MongoDB connection string
app.config["MONGO_URI"] = os.environ.get("MONGO_URI", "mongodb://localhost:27017/metricsdb")
mongo = PyMongo(app)

def serialize_nf(nf):
    # Convert the ObjectId to string for JSON serialization.
    nf["_id"] = str(nf["_id"])
    return nf

@app.route('/api/nfs', methods=['GET'])
def get_nfs():
    nfs = list(mongo.db.nfs.find())
    # Convert each document to a serializable dict
    nfs = [serialize_nf(nf) for nf in nfs]
    return jsonify(nfs), 200

@app.route('/api/nfs', methods=['POST'])
def save_nfs():
    new_nfs = request.get_json()
    if not new_nfs:
        return jsonify({"error": "No data provided"}), 400

    # Here we use a simple strategy:
    # Remove all existing documents and insert the new list.
    mongo.db.nfs.delete_many({})
    if isinstance(new_nfs, list):
        mongo.db.nfs.insert_many(new_nfs)
    else:
        mongo.db.nfs.insert_one(new_nfs)
    return jsonify({"message": "Data saved"}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
