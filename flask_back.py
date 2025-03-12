import base64
from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)

# Connect to MongoDB.
client = MongoClient("mongodb://localhost:27017")
db = client.forms_db
forms_collection = db.forms
submissions_collection = db.submissions

@app.route("/api/form", methods=["GET", "POST"])
def form_endpoint():
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Form name is required"}), 400

    if request.method == "GET":
        version = request.args.get("version")
        if not version:
            doc = forms_collection.find_one({"form_name": form_name})
            if not doc:
                return jsonify({"error": "Form not found"}), 404
            version = doc.get("version_name", "default")

        form_def = forms_collection.find_one({"form_name": form_name, "version_name": version})
        if not form_def:
            return jsonify({"error": "Form definition not found for the given version"}), 404

        form_def["_id"] = str(form_def["_id"])
        form_def["versions"] = forms_collection.distinct("version_name", {"form_name": form_name})

        # Check for an existing submission.
        submission = submissions_collection.find_one({"form_name": form_name, "version_name": version})
        if submission:
            for section in form_def.get("sections", []):
                for question in section.get("questions", []):
                    qid = question.get("id")
                    if qid in submission.get("data", {}):
                        question["answer"] = submission["data"][qid]
                    else:
                        question["answer"] = [] if question.get("type") == "file" else None
        else:
            for section in form_def.get("sections", []):
                for question in section.get("questions", []):
                    question["answer"] = [] if question.get("type") == "file" else None

        return jsonify(form_def)

    if request.method == "POST":
        form_data = request.form.to_dict()
        version_name = form_data.get("version_name", "default")
        submission_data = {}

        # Process text fields.
        for key, value in form_data.items():
            if key != "version_name":
                submission_data[key] = value

        # Process file uploads.
        for key in request.files:
            file_list = request.files.getlist(key)
            file_entries = []
            for file in file_list:
                file_content = base64.b64encode(file.read()).decode("utf-8")
                file_entries.append({
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "data": file_content
                })
            submission_data[key] = file_entries

        submission_doc = {
            "form_name": form_name,
            "version_name": version_name,
            "data": submission_data
        }

        submissions_collection.update_one(
            {"form_name": form_name, "version_name": version_name},
            {"$set": submission_doc},
            upsert=True
        )

        return jsonify({"status": "success", "version_name": version_name}), 200

if __name__ == "__main__":
    app.run(debug=True)
