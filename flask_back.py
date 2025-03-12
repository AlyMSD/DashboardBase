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
        # If no version is provided, fetch all available versions and pick the first (sorted alphabetically).
        version = request.args.get("version")
        versions = forms_collection.distinct("version_name", {"form_name": form_name})
        if not versions:
            return jsonify({"error": "Form not found"}), 404
        versions.sort()  # sort alphabetically (or use another sorting as needed)
        if not version:
            version = versions[0]
        form_def = forms_collection.find_one({"form_name": form_name, "version_name": version})
        if not form_def:
            return jsonify({"error": "Form definition not found for version"}), 404

        form_def["_id"] = str(form_def["_id"])
        form_def["versions"] = versions
        return jsonify(form_def)

    if request.method == "POST":
        # Process the form submission (or save) payload.
        # Required fields: version_name, action.
        form_data = request.form.to_dict()
        version_name = form_data.get("version_name")
        if not version_name:
            return jsonify({"error": "version_name is required in payload"}), 400

        action = form_data.get("action", "save")  # "save" or "submit"
        # Optionally, a new_version_name field can be provided to rename (or clone) the version.
        new_version_name = form_data.get("new_version_name")
        # Remove control fields from form_data.
        for key in ["version_name", "action", "new_version_name"]:
            form_data.pop(key, None)

        # Process file uploads: for each key, store files as Base64 encoded strings.
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

        # Merge text and file answers.
        answers = {**form_data, **file_data}

        # Try to find an existing form document for the given form name and version.
        form_doc = forms_collection.find_one({"form_name": form_name, "version_name": version_name})
        if not form_doc:
            return jsonify({"error": "Form definition not found for version"}), 404

        # If new_version_name is provided, rename (or clone) the document:
        if new_version_name:
            # Check that there is no existing document with the new version name.
            existing = forms_collection.find_one({"form_name": form_name, "version_name": new_version_name})
            if existing:
                return jsonify({"error": "A form with the new version name already exists"}), 400
            # Clone the document with the new version name.
            form_doc["version_name"] = new_version_name
            version_name = new_version_name

        # Update answers for each question in every section.
        for section in form_doc.get("sections", []):
            for question in section.get("questions", []):
                qid = question.get("id")
                if qid in answers:
                    question["answer"] = answers[qid]
        # Set the submitted flag based on the action.
        form_doc["submitted"] = True if action == "submit" else False

        # Update the form document in MongoDB.
        forms_collection.update_one(
            {"form_name": form_name, "version_name": version_name},
            {"$set": form_doc},
            upsert=True
        )

        print("Received form update:")
        print("Form Name:", form_name)
        print("Version:", version_name)
        print("Action:", action)
        print("Answers:", answers)

        return jsonify({"status": "success", "version_name": version_name, "submitted": form_doc["submitted"]}), 200

if __name__ == "__main__":
    app.run(debug=True)
