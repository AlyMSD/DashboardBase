import os
import copy
from flask import Flask, request, jsonify
from pymongo import MongoClient
from werkzeug.utils import secure_filename

app = Flask(__name__)

# Configure uploads directory (ensure this folder exists)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Connect to MongoDB using PyMongo (not flask-pymongo)
client = MongoClient('mongodb://localhost:27017/')
db = client['forms_db']
forms_collection = db['forms']

def process_file_uploads():
    """
    Process file uploads from request.files.
    Returns a dict mapping question IDs to a list of saved file paths.
    """
    files_data = {}
    for key in request.files:
        files = request.files.getlist(key)
        saved_files = []
        for file in files:
            if file.filename:
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                saved_files.append(file_path)
        if saved_files:
            files_data[key] = saved_files
    return files_data

def reset_answers(document):
    """
    Reset all answers in the form document's sections.
    """
    for section in document.get('sections', []):
        for question in section.get('questions', []):
            question['answer'] = None
    return document

@app.route('/api/form', methods=['GET', 'POST'])
def form_api():
    if request.method == 'GET':
        # GET endpoint to fetch a form definition
        form_name = request.args.get('name')
        version = request.args.get('version')  # version is optional
        if not form_name:
            return jsonify({"error": "Missing form name"}), 400

        query = {"form_name": form_name}
        if version:
            query["version_name"] = version

        form_doc = forms_collection.find_one(query)
        if not form_doc:
            return jsonify({"error": "Form not found"}), 404

        # Convert _id to string for JSON output
        form_doc['_id'] = str(form_doc['_id'])
        return jsonify(form_doc)

    elif request.method == 'POST':
        # POST endpoint for save/submit, clone, or rename operations.
        form_name = request.args.get('name')
        if not form_name:
            return jsonify({"error": "Missing form name in query parameters"}), 400

        action = request.form.get('action')  # expected 'save' or 'submit'
        current_version = request.form.get('version_name')
        new_version = request.form.get('new_version_name')  # provided for clone/rename
        is_cloning = request.form.get('is_cloning', 'false').lower() == 'true'

        # Process file uploads
        uploaded_files = process_file_uploads()

        # If new_version is provided, we are either cloning or renaming.
        if new_version:
            # Check if a document with the new version already exists for the selected form.
            exists = forms_collection.find_one({"form_name": form_name, "version_name": new_version})
            if exists:
                return jsonify({"error": "Version name already exists"}), 409

            if is_cloning:
                # --- CLONING / CREATING NEW VERSION ---
                # If the source is "BlankTemplate_v_1", then load the source from the BlankTemplate document.
                if current_version == "BlankTemplate_v_1":
                    source_doc = forms_collection.find_one({
                        "form_name": "BlankTemplate",
                        "version_name": current_version
                    })
                    if not source_doc:
                        return jsonify({"error": "Blank template not found"}), 404
                    # Clone and override form_name to the currently selected form.
                    new_doc = copy.deepcopy(source_doc)
                    new_doc.pop("_id", None)
                    new_doc["form_name"] = form_name
                else:
                    # Otherwise, clone an existing version of the current form.
                    source_doc = forms_collection.find_one({
                        "form_name": form_name,
                        "version_name": current_version
                    })
                    if not source_doc:
                        return jsonify({"error": "Source form version not found"}), 404
                    new_doc = copy.deepcopy(source_doc)
                    new_doc.pop("_id", None)

                # Set new version details.
                new_doc["version_name"] = new_version
                new_doc["submitted"] = False
                # Reset all answers so that the cloned form is blank.
                new_doc = reset_answers(new_doc)
                # If file uploads were sent, attach them to matching questions.
                for key, paths in uploaded_files.items():
                    for section in new_doc.get('sections', []):
                        for question in section.get('questions', []):
                            if question.get('id') == key:
                                question['answer'] = paths
                result = forms_collection.insert_one(new_doc)
                new_doc['_id'] = str(result.inserted_id)
                return jsonify(new_doc)
            else:
                # --- RENAMING THE CURRENT VERSION ---
                doc = forms_collection.find_one({"form_name": form_name, "version_name": current_version})
                if not doc:
                    return jsonify({"error": "Form version not found"}), 404

                # Update version name.
                forms_collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"version_name": new_version}}
                )

                # Also update form answers from submitted data.
                form_data = request.form.to_dict(flat=True)
                for key in ['action', 'version_name', 'new_version_name', 'form_name', 'is_cloning']:
                    form_data.pop(key, None)

                for section in doc.get('sections', []):
                    for question in section.get('questions', []):
                        qid = question.get('id')
                        if qid in form_data:
                            question['answer'] = form_data[qid]
                        if qid in uploaded_files:
                            question['answer'] = uploaded_files[qid]
                if action == 'submit':
                    doc['submitted'] = True

                updated_doc = forms_collection.find_one({"form_name": form_name, "version_name": new_version})
                updated_doc['_id'] = str(updated_doc['_id'])
                return jsonify(updated_doc)

        else:
            # --- UPDATING THE CURRENT VERSION (Save/Submit) ---
            if not current_version:
                return jsonify({"error": "Missing version name"}), 400

            doc = forms_collection.find_one({"form_name": form_name, "version_name": current_version})
            if not doc:
                return jsonify({"error": "Form version not found"}), 404

            form_data = request.form.to_dict(flat=True)
            for key in ['action', 'version_name', 'new_version_name', 'form_name', 'is_cloning']:
                form_data.pop(key, None)

            for section in doc.get('sections', []):
                for question in section.get('questions', []):
                    qid = question.get('id')
                    if qid in form_data:
                        question['answer'] = form_data[qid]
                    if qid in uploaded_files:
                        existing = question.get('answer') or []
                        if not isinstance(existing, list):
                            existing = [existing]
                        question['answer'] = existing + uploaded_files[qid]
            if action == 'submit':
                doc['submitted'] = True

            forms_collection.update_one({"_id": doc["_id"]}, {"$set": doc})
            doc['_id'] = str(doc['_id'])
            return jsonify(doc)

if __name__ == '__main__':
    app.run(debug=True)
