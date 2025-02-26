from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import gridfs
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)  # Enable CORS

# Configure MongoDB connection (adjust the URI as needed)
client = MongoClient("mongodb://localhost:27017/")
db = client["formDB"]
forms_collection = db["forms"]       # This collection stores form definitions.
responses_collection = db["responses"] # This collection stores user responses.

# Set up GridFS for file storage
fs = gridfs.GridFS(db)

@app.route("/api/form", methods=["GET"])
def get_form():
    """
    GET /api/form?name=<formName>
    Returns the form definition and any existing response.
    """
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Missing form name"}), 400

    # Retrieve the form definition from MongoDB.
    form_definition = forms_collection.find_one({"name": form_name}, {"_id": 0})
    # Retrieve any previously saved response.
    response = responses_collection.find_one({"formName": form_name}, {"_id": 0})
    return jsonify({"form": form_definition, "response": response}), 200

@app.route("/api/form", methods=["POST"])
def submit_form():
    """
    POST /api/form?name=<formName>
    Processes form submission: saves text fields from request.form and files to MongoDB via GridFS.
    """
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Missing form name"}), 400

    # Retrieve all form fields from the POST request.
    form_data = request.form.to_dict()

    # Process file uploads.
    file_fields = {}
    for key in request.files:
        files = request.files.getlist(key)
        file_ids = []
        for file in files:
            if file:
                filename = secure_filename(file.filename)
                # Save the file into GridFS. The entire file is read and stored.
                file_id = fs.put(file.read(), filename=filename, content_type=file.content_type)
                # Convert ObjectId to string for easy reference.
                file_ids.append(str(file_id))
        file_fields[key] = file_ids

    # Merge file ID arrays into the form data.
    for key, file_ids in file_fields.items():
        form_data[key] = file_ids

    # Upsert the response in the MongoDB responses collection.
    responses_collection.update_one(
        {"formName": form_name},
        {"$set": {"formName": form_name, "data": form_data}},
        upsert=True
    )

    return jsonify({"message": "Form submitted successfully", "data": form_data}), 200

if __name__ == "__main__":
    app.run(debug=True)
