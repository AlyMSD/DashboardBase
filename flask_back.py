import os
from flask import Flask, request, jsonify
from pymongo import MongoClient
from werkzeug.utils import secure_filename
import copy

app = Flask(__name__)

# Configure uploads directory (make sure this folder exists or create it)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Connect to MongoDB using PyMongo (not flask-pymongo)
client = MongoClient('mongodb://localhost:27017/')
db = client['forms_db']
forms_collection = db['forms']

def process_file_uploads():
    """
    Process all file uploads from request.files.
    Returns a dictionary with key: question id, value: list of saved file paths.
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
    Reset all answers in the document's sections.
    """
    for section in document.get('sections', []):
        for question in section.get('questions', []):
            question['answer'] = None
    return document

@app.route('/api/form', methods=['GET', 'POST'])
def form_api():
    if request.method == 'GET':
        # GET route to retrieve a form definition
        form_name = request.args.get('name')
        version = request.args.get('version')
        if not form_name:
            return jsonify({"error": "Missing form name"}), 400

        query = {"form_name": form_name}
        if version:
            query["version_name"] = version

        form_doc = forms_collection.find_one(query)
        if not form_doc:
            return jsonify({"error": "Form not found"}), 404

        # Convert ObjectId to string and remove it for the frontend
        form_doc['_id'] = str(form_doc['_id'])
        return jsonify(form_doc)

    elif request.method == 'POST':
        # POST route for saving/submitting/updating/cloning/renaming a form version
        form_name = request.args.get('name')
        if not form_name:
            return jsonify({"error": "Missing form name in query parameters"}), 400

        action = request.form.get('action')  # 'save' or 'submit'
        current_version = request.form.get('version_name')
        new_version = request.form.get('new_version_name')  # provided for clone or rename operations
        is_cloning = request.form.get('is_cloning', 'false').lower() == 'true'

        # Process file uploads if any
        uploaded_files = process_file_uploads()

        # Check if a new version name is provided (clone/rename)
        if new_version:
            # Check if the new version already exists for this form
            exists = forms_collection.find_one({"form_name": form_name, "version_name": new_version})
            if exists:
                return jsonify({"error": "Version name already exists"}), 409

            if is_cloning:
                # --- CLONING ---
                # Clone the current version (or a specific source version) into a new version.
                source_doc = forms_collection.find_one({"form_name": form_name, "version_name": current_version})
                if not source_doc:
                    return jsonify({"error": "Source form version not found"}), 404

                # Create a deep copy so that we do not modify the original document.
                new_doc = copy.deepcopy(source_doc)
                new_doc.pop("_id", None)  # Remove MongoDB ID so a new one will be generated.
                new_doc['version_name'] = new_version
                new_doc['submitted'] = False
                # Reset answers for cloned version.
                new_doc = reset_answers(new_doc)
                # (Optional) Merge in any file upload info – if your frontend sends files along with the clone.
                for key, paths in uploaded_files.items():
                    # If you store file paths as answers, update them in each question.
                    for section in new_doc.get('sections', []):
                        for question in section.get('questions', []):
                            if question.get('id') == key:
                                question['answer'] = paths
                result = forms_collection.insert_one(new_doc)
                new_doc['_id'] = str(result.inserted_id)
                return jsonify(new_doc)

            else:
                # --- RENAMING THE CURRENT VERSION ---
                # Find the document to rename.
                doc = forms_collection.find_one({"form_name": form_name, "version_name": current_version})
                if not doc:
                    return jsonify({"error": "Form version not found"}), 404

                # Check for version conflict already done above; now update version_name.
                forms_collection.update_one(
                    {"_id": doc["_id"]},
                    {"$set": {"version_name": new_version}}
                )
                # Optionally, also update answers from form data if provided.
                # (Merge text fields and file uploads if needed.)
                form_data = request.form.to_dict(flat=True)
                # Remove special keys
                for key in ['action', 'version_name', 'new_version_name', 'form_name', 'is_cloning']:
                    form_data.pop(key, None)
                # Update answers for non-file questions.
                for section in doc.get('sections', []):
                    for question in section.get('questions', []):
                        qid = question.get('id')
                        if qid in form_data:
                            question['answer'] = form_data[qid]
                        # For file type questions, update using file uploads if available.
                        if qid in uploaded_files:
                            question['answer'] = uploaded_files[qid]
                # If action is 'submit', mark the form as submitted.
                if action == 'submit':
                    doc['submitted'] = True

                # After update, fetch the document with the new version name.
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

            # Get all form fields from the request (excluding our special keys)
            form_data = request.form.to_dict(flat=True)
            for key in ['action', 'version_name', 'new_version_name', 'form_name', 'is_cloning']:
                form_data.pop(key, None)

            # Update each question’s answer in the document.
            for section in doc.get('sections', []):
                for question in section.get('questions', []):
                    qid = question.get('id')
                    if qid in form_data:
                        question['answer'] = form_data[qid]
                    # For file uploads: if files were uploaded for this question, merge them.
                    if qid in uploaded_files:
                        # If there was a previous answer (list of file paths), append the new ones.
                        existing = question.get('answer') or []
                        if not isinstance(existing, list):
                            existing = [existing]
                        question['answer'] = existing + uploaded_files[qid]

            if action == 'submit':
                doc['submitted'] = True

            # Save the updated document back to the database.
            forms_collection.update_one({"_id": doc["_id"]}, {"$set": doc})
            doc['_id'] = str(doc['_id'])
            return jsonify(doc)

if __name__ == '__main__':
    app.run(debug=True)
