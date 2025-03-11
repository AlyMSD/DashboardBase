from flask import Flask, request, jsonify
from pymongo import MongoClient
import gridfs
from bson.objectid import ObjectId

app = Flask(__name__)

# Connect to MongoDB.
client = MongoClient("mongodb://localhost:27017")
db = client.forms_db
forms_collection = db.forms
submissions_collection = db.submissions
fs = gridfs.GridFS(db)

@app.route("/api/form", methods=["GET", "POST"])
def form_endpoint():
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Form name is required"}), 400

    if request.method == "GET":
        # Optional version parameter.
        version = request.args.get("version")
        if not version:
            # If no version is specified, try to get one from the first matching document.
            doc = forms_collection.find_one({"form_name": form_name})
            if not doc:
                return jsonify({"error": "Form not found"}), 404
            version = doc.get("version_name", "default")
        
        # Find the form definition by form_name and version.
        form_def = forms_collection.find_one({"form_name": form_name, "version_name": version})
        if not form_def:
            return jsonify({"error": "Form definition not found for the given version"}), 404

        # Remove the ObjectId field (or convert it to string).
        form_def["_id"] = str(form_def["_id"])
        
        # Get available versions for this form.
        versions = forms_collection.distinct("version_name", {"form_name": form_name})
        form_def["versions"] = versions

        # Look for a saved submission.
        submission = submissions_collection.find_one({"form_name": form_name, "version_name": version})
        if submission:
            # For each section and question, set the answer from the saved submission if it exists.
            for section in form_def.get("sections", []):
                for question in section.get("questions", []):
                    qid = question.get("id")
                    if qid in submission.get("data", {}):
                        question["answer"] = submission["data"][qid]
                    else:
                        # For file type questions, default to an empty array.
                        question["answer"] = [] if question.get("type") == "file" else None
        else:
            # No submission exists, so ensure default values.
            for section in form_def.get("sections", []):
                for question in section.get("questions", []):
                    question["answer"] = [] if question.get("type") == "file" else None

        return jsonify(form_def)

    # POST: Handle form submission.
    if request.method == "POST":
        # In POST, version_name should be part of the payload.
        form_data = request.form.to_dict()
        version_name = form_data.get("version_name")
        if not version_name:
            version_name = "default"

        # For safety, get form_name again from query parameters.
        form_name = request.args.get("name")
        submission_data = {}

        # Process text/other non-file fields.
        for key, value in form_data.items():
            if key != "version_name":
                submission_data[key] = value

        # Process file uploads.
        for key in request.files:
            file_list = request.files.getlist(key)
            file_entries = []
            for file in file_list:
                # Read file content.
                file_content = file.read()
                # Store file in GridFS.
                file_id = fs.put(file_content, filename=file.filename, content_type=file.content_type)
                file_entries.append({"file_id": str(file_id), "filename": file.filename})
            submission_data[key] = file_entries

        # Prepare submission document.
        submission_doc = {
            "form_name": form_name,
            "version_name": version_name,
            "data": submission_data
        }

        # Upsert the submission document.
        submissions_collection.update_one(
            {"form_name": form_name, "version_name": version_name},
            {"$set": submission_doc},
            upsert=True
        )

        print("Received form submission:")
        print("Form Name:", form_name)
        print("Version:", version_name)
        print("Data:", submission_data)

        return jsonify({"status": "success", "version_name": version_name}), 200

if __name__ == "__main__":
    app.run(debug=True)
