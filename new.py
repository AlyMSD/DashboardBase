from flask import Flask, request, jsonify, abort
from pymongo import MongoClient, errors
from bson.objectid import ObjectId
import os

app = Flask(__name__)
# Connect to MongoDB (adjust connection string as needed)
client = MongoClient(os.environ.get("MONGO_URI", "mongodb://localhost:27017"))
db = client['formsdb']  # Database name
forms_collection = db['forms']  # Collection name

def get_all_versions(form_name):
    """Return list of version names available for a given form."""
    versions = forms_collection.find({"form_name": form_name}, {"version_name": 1})
    return [doc["version_name"] for doc in versions]

def reset_answers(form_definition):
    """
    Clone a form definition but clear answers in every question.
    Returns a new form document.
    """
    new_form = form_definition.copy()
    # Do not copy the _id field when inserting as a new document.
    new_form.pop("_id", None)
    # Reset the submitted flag and update answer in each question.
    new_form["submitted"] = False
    for section in new_form.get("sections", []):
        for question in section.get("questions", []):
            # Remove any prefilled answers.
            question["answer"] = None
    return new_form

@app.route("/api/form", methods=["GET"])
def get_form():
    """
    GET /api/form?name=<form_name>&version=<version_name>
    If version is not provided, return the first document for the form.
    Additionally, return a list of all available versions.
    """
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Form name is required"}), 400

    version = request.args.get("version", None)
    query = {"form_name": form_name}
    if version:
        query["version_name"] = version

    form_doc = forms_collection.find_one(query)
    if not form_doc:
        return jsonify({"error": "Form not found"}), 404

    # Add available versions to the response.
    form_doc["versions"] = get_all_versions(form_name)
    # Convert ObjectId to string if needed.
    form_doc["_id"] = str(form_doc["_id"])
    return jsonify(form_doc), 200

@app.route("/api/form", methods=["POST"])
def post_form():
    """
    POST /api/form?name=<form_name>
    This endpoint supports three scenarios:
      - Regular save/submit to an existing version.
      - Renaming an existing version.
      - Cloning a version (creating a new version with blank answers).
    
    The expected form data in the request (multipart/form-data) includes:
      - form fields corresponding to question IDs.
      - version_name: current version being edited.
      - new_version_name: new version name if renaming or cloning.
      - form_name (if cloning)
      - action: 'save' or 'submit'
    """
    form_name = request.args.get("name")
    if not form_name:
        return jsonify({"error": "Form name is required in query parameters"}), 400

    # Get posted data (using request.form for text fields)
    posted = request.form.to_dict()
    action = posted.get("action")
    version_name = posted.get("version_name")
    new_version_name = posted.get("new_version_name", "").strip()

    if not version_name:
        return jsonify({"error": "version_name is required"}), 400

    # Determine if this is a clone or rename operation.
    is_cloning = new_version_name and posted.get("form_name")
    is_renaming = new_version_name and not is_cloning

    # For cloning and renaming, check if the new version already exists.
    if new_version_name:
        if forms_collection.find_one({"form_name": form_name, "version_name": new_version_name}):
            return jsonify({"error": "Version name already exists."}), 409

    # For file uploads, here we assume they are appended in the request.files
    # and for simplicity we just record their filenames.
    file_data = {}
    for key in request.files:
        files = request.files.getlist(key)
        file_data[key] = [file.filename for file in files]
        # In production you might store the files and use their storage paths.

    # Retrieve the existing document (source) if any.
    source_doc = forms_collection.find_one({"form_name": form_name, "version_name": version_name})
    if not source_doc:
        # If no source document exists, create a new one.
        source_doc = {
            "form_name": form_name,
            "version_name": version_name,
            "submitted": False,
            "sections": []
        }
    
    if is_cloning:
        # Clone the source document but reset answers.
        new_doc = reset_answers(source_doc)
        new_doc["version_name"] = new_version_name
        # Update answers with posted form data.
        for section in new_doc.get("sections", []):
            for question in section.get("questions", []):
                qid = question.get("id")
                if qid in posted:
                    question["answer"] = posted[qid]
                if qid in file_data:
                    # If files are provided, update answer with list of filenames.
                    question["answer"] = file_data[qid]
        try:
            result = forms_collection.insert_one(new_doc)
            new_doc["_id"] = str(result.inserted_id)
        except errors.PyMongoError as e:
            return jsonify({"error": str(e)}), 500
        response_doc = new_doc
    elif is_renaming:
        # Rename the existing version: update version_name in the document.
        try:
            forms_collection.update_one(
                {"form_name": form_name, "version_name": version_name},
                {"$set": {"version_name": new_version_name}}
            )
            source_doc["version_name"] = new_version_name
        except errors.PyMongoError as e:
            return jsonify({"error": str(e)}), 500
        response_doc = source_doc
    else:
        # Regular save or submit.
        # Update the source document with the provided answers.
        # Loop through sections/questions and update the answer if provided.
        for section in source_doc.get("sections", []):
            for question in section.get("questions", []):
                qid = question.get("id")
                if qid in posted:
                    question["answer"] = posted[qid]
                # If there are file uploads:
                if qid in file_data:
                    question["answer"] = file_data[qid]
        # If the action is "submit", set submitted to True.
        source_doc["submitted"] = (action == "submit")
        try:
            # If the document exists, update it; otherwise, insert it.
            if "_id" in source_doc:
                forms_collection.update_one(
                    {"_id": source_doc["_id"]},
                    {"$set": source_doc}
                )
            else:
                result = forms_collection.insert_one(source_doc)
                source_doc["_id"] = result.inserted_id
        except errors.PyMongoError as e:
            return jsonify({"error": str(e)}), 500
        response_doc = source_doc

    # After any operation, return the updated document along with the available versions.
    response_doc["versions"] = get_all_versions(form_name)
    # Ensure _id is serializable.
    if isinstance(response_doc.get("_id"), ObjectId):
        response_doc["_id"] = str(response_doc["_id"])
    return jsonify(response_doc), 200

if __name__ == "__main__":
    app.run(debug=True, port=5000)
