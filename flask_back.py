import os
from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename

app = Flask(__name__)

# MongoDB configuration (change the URI as needed)
app.config["MONGO_URI"] = "mongodb://localhost:27017/formsdb"

# Folder to store file uploads
app.config["UPLOAD_FOLDER"] = "uploads"
if not os.path.exists(app.config["UPLOAD_FOLDER"]):
    os.makedirs(app.config["UPLOAD_FOLDER"])

mongo = PyMongo(app)
db = mongo.db

def update_question_answer(form_doc, question_id, answer_value):
    """
    Update the answer field for the question with the given id in the form document.
    """
    if "sections" in form_doc:
        for section in form_doc["sections"]:
            for question in section.get("questions", []):
                if question.get("id") == question_id:
                    question["answer"] = answer_value

def update_file_question_answer(form_doc, question_id, file_paths):
    """
    Update file question answer in the form document.
    If the question already has a list of file paths, new files are appended.
    """
    if "sections" in form_doc:
        for section in form_doc["sections"]:
            for question in section.get("questions", []):
                if question.get("id") == question_id:
                    if question.get("answer") and isinstance(question["answer"], list):
                        question["answer"].extend(file_paths)
                    else:
                        question["answer"] = file_paths

def process_file_uploads(form_doc):
    """
    Process file uploads from request.files and update the corresponding
    file question's answer with the paths to the saved files.
    """
    for key in request.files:
        files = request.files.getlist(key)
        saved_files = []
        for file in files:
            if file:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
                file.save(file_path)
                saved_files.append(file_path)
        if saved_files:
            update_file_question_answer(form_doc, key, saved_files)

@app.route('/api/form', methods=['GET'])
def get_form():
    """
    GET endpoint to fetch a form definition by form name and (optional) version.
    Also returns all available version names for the given form.
    """
    form_name = request.args.get('name')
    version = request.args.get('version')
    if not form_name:
        return jsonify({"error": "Form name required"}), 400

    query = {"form_name": form_name}
    if version:
        query["version_name"] = version

    form = db.forms.find_one(query)
    if not form:
        return jsonify({"error": "Form not found"}), 404

    # Get all available versions for this form.
    versions = list(db.forms.find({"form_name": form_name}).distinct("version_name"))
    form["versions"] = versions

    # Convert Mongo _id to string.
    form["_id"] = str(form["_id"])
    return jsonify(form)

@app.route('/api/form', methods=['POST'])
def save_form():
    """
    POST endpoint to save or submit a form.
    
    Handles three main cases:
      1. **Normal Update:** Update answers on the current version.
      2. **Renaming:** Update an existing version's name (when the new version name is provided and differs).
      3. **Cloning / Create New Version:** Clone an existing version (or the "BlankTemplate") into a new one.
         In this case, the client must provide a new version name (via `new_version_name`), and if needed, override
         the form name (when cloning a blank template).
    
    A conflict is returned if the new version already exists.
    """
    # form name is provided in the query string
    form_name_query = request.args.get('name')
    if not form_name_query:
        return jsonify({"error": "Form name required in query parameter"}), 400

    # Extract the parameters from the form-data payload.
    current_version = request.form.get('version_name')  # current version to update or clone from
    new_version = request.form.get('new_version_name')    # provided if cloning or renaming
    action = request.form.get('action')                   # either 'save' or 'submit'
    # For "create new version", the frontend sends an additional form_name (the current form)
    new_form_name = request.form.get('form_name', form_name_query)

    # If a new_version is provided, we treat this as a clone/rename action.
    if new_version:
        # Check if the new version already exists for this form.
        exists = db.forms.find_one({"form_name": new_form_name, "version_name": new_version})
        if exists:
            return jsonify({"error": "Version name already exists."}), 409

        # Retrieve the source form to clone from.
        source = db.forms.find_one({"form_name": form_name_query, "version_name": current_version})
        # Special case: if cloning a "BlankTemplate", try to get it from the proper document.
        if not source and current_version == "BlankTemplate_v_1":
            source = db.forms.find_one({"form_name": "BlankTemplate", "version_name": "v_1"})
        if not source:
            return jsonify({"error": "Source form not found for cloning."}), 404

        # Remove the MongoDB _id field so we can insert as a new document.
        source.pop("_id", None)
        # Update with the new version name and (if provided) new form name.
        source["version_name"] = new_version
        source["form_name"] = new_form_name
        source["submitted"] = (action == "submit")

        # Update any answers from the text fields sent in the payload.
        for key in request.form:
            if key not in ["version_name", "new_version_name", "action", "form_name"]:
                update_question_answer(source, key, request.form.get(key))

        # Process any file uploads.
        process_file_uploads(source)

        # Insert the new (cloned/renamed) form into the database.
        inserted = db.forms.insert_one(source)
        new_doc = db.forms.find_one({"_id": inserted.inserted_id})
        new_doc["_id"] = str(new_doc["_id"])
        new_doc["versions"] = list(db.forms.find({"form_name": new_form_name}).distinct("version_name"))
        return jsonify(new_doc)

    else:
        # No new_version provided – perform a normal update on the existing version.
        doc = db.forms.find_one({"form_name": form_name_query, "version_name": current_version})
        if not doc:
            return jsonify({"error": "Form not found"}), 404

        # Update text field answers.
        for key in request.form:
            if key not in ["version_name", "action"]:
                update_question_answer(doc, key, request.form.get(key))

        # Process file uploads.
        process_file_uploads(doc)

        doc["submitted"] = (action == "submit")
        db.forms.update_one({"_id": doc["_id"]}, {"$set": doc})
        updated_doc = db.forms.find_one({"_id": doc["_id"]})
        updated_doc["_id"] = str(updated_doc["_id"])
        updated_doc["versions"] = list(db.forms.find({"form_name": form_name_query}).distinct("version_name"))
        return jsonify(updated_doc)

if __name__ == '__main__':
    app.run(debug=True)
