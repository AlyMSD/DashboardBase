import base64
from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId

app = Flask(__name__)

# Connect to MongoDB.
client = MongoClient("mongodb://localhost:27017")
db = client.forms_db
forms_collection = db.forms

@app.route("/api/form", methods=["GET", "POST"])
def form_endpoint():
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Form name is required"}), 400

    if request.method == "GET":
        # Optional version parameter.
        version = request.args.get("version")
        if not version:
            # If no version is specified, pick the first available document.
            doc = forms_collection.find_one({"form_name": form_name})
            if not doc:
                return jsonify({"error": "Form not found"}), 404
            version = doc.get("version_name", "default")
        # Retrieve the form definition for the given form name and version.
        form_def = forms_collection.find_one({"form_name": form_name, "version_name": version})
        if not form_def:
            return jsonify({"error": "Form definition not found for the given version"}), 404

        # Convert ObjectId to string for JSON serialization.
        form_def["_id"] = str(form_def["_id"])
        # Get all available versions for this form.
        versions = forms_collection.distinct("version_name", {"form_name": form_name})
        form_def["versions"] = versions
        return jsonify(form_def)

    if request.method == "POST":
        # Expect a POST payload with answers for each question.
        # The answers should be stored in the questions' "answer" field.
        form_data = request.form.to_dict()
        version_name = form_data.get("version_name", "default")
        # Remove version_name from answers.
        if "version_name" in form_data:
            del form_data["version_name"]

        # Process file uploads (store each file as a Base64 encoded string).
        file_data = {}
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
            file_data[key] = file_entries

        # Merge non-file answers and file answers.
        answers = {**form_data, **file_data}

        # Try to find an existing form definition for the given form name and version.
        form_doc = forms_collection.find_one({"form_name": form_name, "version_name": version_name})
        if not form_doc:
            # If the document does not exist, assume this is a new (or cloned) version.
            # Here we simulate a base form structure.
            base_form = {
                "form_name": form_name,
                "version_name": version_name,
                "submitted": False,
                "sections": [
                    {
                        "name": "Name Section",
                        "description": "An area for the user to add their name",
                        "questions": [
                            {
                                "id": "name",
                                "type": "text",
                                "label": "Your Name",
                                "placeholder": "Enter your full name",
                                "answer": None,
                                "required": True
                            },
                            {
                                "id": "resume",
                                "type": "file",
                                "label": "Upload Resume",
                                "allowedTypes": ["application/pdf", "application/msword"],
                                "answer": [],
                                "required": False
                            }
                        ]
                    }
                ]
            }
            form_doc = base_form
            # Insert the new form document.
            result = forms_collection.insert_one(form_doc)
            form_doc["_id"] = result.inserted_id

        # Update the answers for each question.
        # For each section and each question, if a value exists in the answers payload, update the "answer" field.
        for section in form_doc.get("sections", []):
            for question in section.get("questions", []):
                qid = question.get("id")
                if qid in answers:
                    question["answer"] = answers[qid]
        # Mark as submitted (set to True, or leave as False if desired).
        form_doc["submitted"] = True

        # Update (or insert) the form document in MongoDB.
        forms_collection.update_one(
            {"form_name": form_name, "version_name": version_name},
            {"$set": form_doc},
            upsert=True
        )

        print("Received form submission:")
        print("Form Name:", form_name)
        print("Version:", version_name)
        print("Answers:", answers)

        return jsonify({"status": "success", "version_name": version_name}), 200

if __name__ == "__main__":
    app.run(debug=True)
