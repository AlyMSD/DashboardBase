import base64
from flask import Flask, request, jsonify
from pymongo import MongoClient

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
        # Retrieve all available versions for this form.
        versions = forms_collection.distinct("version_name", {"form_name": form_name})
        if not versions:
            return jsonify({"error": "Form not found"}), 404

        # Sort versions (alphabetically in this example) and select the first version.
        versions.sort()
        version = request.args.get("version", versions[0])
        
        # Retrieve the form definition for the given form name and version.
        form_def = forms_collection.find_one({"form_name": form_name, "version_name": version})
        if not form_def:
            return jsonify({"error": "Form definition not found for the given version"}), 404

        # Convert ObjectId to string for JSON serialization.
        form_def["_id"] = str(form_def["_id"])
        form_def["versions"] = versions
        return jsonify(form_def)

    if request.method == "POST":
        # Expect a POST payload with answers for each question.
        form_data = request.form.to_dict()
        version_name = form_data.get("version_name", "default")
        source_version = form_data.get("source_version")
        form_data.pop("version_name", None)
        form_data.pop("source_version", None)

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

        answers = {**form_data, **file_data}

        # Find an existing form document for the given form name and version.
        form_doc = forms_collection.find_one({"form_name": form_name, "version_name": version_name})
        if not form_doc:
            if source_version:
                # Clone from the source version.
                source_doc = forms_collection.find_one({"form_name": form_name, "version_name": source_version})
                if source_doc:
                    source_doc.pop("_id", None)
                    source_doc["version_name"] = version_name
                    form_doc = source_doc
                else:
                    form_doc = {
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
            else:
                form_doc = {
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

        for section in form_doc.get("sections", []):
            for question in section.get("questions", []):
                qid = question.get("id")
                if qid in answers:
                    question["answer"] = answers[qid]
        form_doc["submitted"] = True

        forms_collection.update_one(
            {"form_name": form_name, "version_name": version_name},
            {"$set": form_doc},
            upsert=True
        )

        print("Received form submission:")
        print("Form Name:", form_name)
        print("New Version:", version_name)
        if source_version:
            print("Cloned From Version:", source_version)
        print("Answers:", answers)

        return jsonify({"status": "success", "version_name": version_name}), 200

if __name__ == "__main__":
    app.run(debug=True)
