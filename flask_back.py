from flask import Flask, request, jsonify
from flask_cors import CORS
import pymongo
from pymongo import MongoClient
from bson import ObjectId
import os
from werkzeug.utils import secure_filename
import uuid
import json

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder for files
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # Limit file size to 16MB

# MongoDB connection
client = MongoClient('mongodb://localhost:27017/')
db = client['form_database']
forms_collection = db['forms']

# Ensure BlankTemplate exists
blank_template = {
    "form_name": "BlankTemplate",
    "version_name": "BlankTemplate_v_1",
    "submitted": False,
    "sections": [
        {
            "name": "New Section",
            "description": "Add your section description here",
            "questions": [
                {
                    "id": "question1",
                    "type": "text",
                    "label": "Sample Question",
                    "placeholder": "Enter your answer",
                    "answer": None,
                    "required": False
                }
            ]
        }
    ]
}

# Check if BlankTemplate exists, if not create it
if forms_collection.count_documents({"form_name": "BlankTemplate", "version_name": "BlankTemplate_v_1"}) == 0:
    forms_collection.insert_one(blank_template)

# Helper function to handle file uploads
def handle_file_uploads(request_files, question_id, form_id):
    file_paths = []
    if question_id in request_files:
        files = request_files.getlist(question_id)
        for file in files:
            if file.filename:
                # Generate unique filename to prevent conflicts
                original_filename = secure_filename(file.filename)
                filename = f"{uuid.uuid4()}_{original_filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                # Store relative path in database
                relative_path = f"uploads/{filename}"
                file_paths.append(relative_path)
    return file_paths

@app.route('/api/form', methods=['GET', 'POST'])
def form_handler():
    form_name = request.args.get('name')

    if not form_name:
        return jsonify({"error": "Form name is required"}), 400

    # GET: Retrieve form definition
    if request.method == 'GET':
        version_name = request.args.get('version')

        # Query to get the form
        query = {"form_name": form_name}
        if version_name:
            query["version_name"] = version_name

        # Find the most recent form if no version specified
        if not version_name:
            forms = list(forms_collection.find({"form_name": form_name}))
            if not forms:
                return jsonify({"error": "Form not found"}), 404

            # Get all available versions for this form
            versions = [form["version_name"] for form in forms]

            # Return the first form with all versions
            form_data = forms[0]
            form_data["versions"] = versions

            # Convert ObjectId to string for JSON serialization
            form_data["_id"] = str(form_data["_id"])
            return jsonify(form_data)

        # If version is specified, return that specific version
        form_data = forms_collection.find_one(query)
        if not form_data:
            return jsonify({"error": "Form not found"}), 404

        # Get all versions for this form
        all_versions = forms_collection.find({"form_name": form_name})
        versions = [form["version_name"] for form in all_versions]

        # Add versions to the response
        form_data["versions"] = versions

        # Convert ObjectId to string for JSON serialization
        form_data["_id"] = str(form_data["_id"])

        return jsonify(form_data)

    # POST: Save or submit form
    elif request.method == 'POST':
        action = request.form.get('action', 'save')  # 'save' or 'submit'
        version_name = request.form.get('version_name')
        new_version_name = request.form.get('new_version_name')
        is_cloning = new_version_name is not None

        # Check if we're cloning from BlankTemplate
        cloning_blank = version_name == "BlankTemplate_v_1" and is_cloning

        # Validate version name for cloning
        if is_cloning and not new_version_name:
            return jsonify({"error": "New version name is required for cloning"}), 400

        # Check if new version name already exists (for cloning)
        if is_cloning:
            existing_version = forms_collection.find_one({
                "form_name": form_name,
                "version_name": new_version_name
            })
            if existing_version:
                return jsonify({"error": f"Version '{new_version_name}' already exists"}), 409

        # Retrieve existing form if not cloning blank template
        existing_form = None
        if cloning_blank:
            # Get BlankTemplate
            existing_form = forms_collection.find_one({
                "form_name": "BlankTemplate",
                "version_name": "BlankTemplate_v_1"
            })
        elif version_name:
            # Get existing form to update or clone
            existing_form = forms_collection.find_one({
                "form_name": form_name,
                "version_name": version_name
            })

        if not existing_form:
            return jsonify({"error": "Form not found"}), 404

        # Remove _id for cloning (will get a new one)
        if is_cloning:
            existing_form.pop('_id', None)

        # Prepare the updated form data
        if is_cloning:
            # Create a new version
            updated_form = dict(existing_form)
            updated_form["form_name"] = form_name  # Set form name for the new version
            updated_form["version_name"] = new_version_name

            # Remove answers from the cloned form
            for section in updated_form["sections"]:
                for question in section["questions"]:
                    if question["type"] == "checkbox" or question["type"] == "file":
                        question["answer"] = []
                    else:
                        question["answer"] = None
        else:
            # Update existing version
            updated_form = dict(existing_form)

            # If renaming the version
            if new_version_name:
                updated_form["version_name"] = new_version_name

        # Process form fields and files
        for key, value in request.form.items():
            # Skip action, version_name, and new_version_name keys
            if key in ['action', 'version_name', 'new_version_name']:
                continue

            # Update the answer in the form structure
            found = False
            for section in updated_form["sections"]:
                for question in section["questions"]:
                    if question["id"] == key:
                        # Handle special cases (checkboxes, etc.)
                        if question["type"] == "checkbox":
                            # Convert comma-separated string to array
                            question["answer"] = value.split(',') if value else []
                        else:
                            question["answer"] = value
                        found = True
                        break
                if found:
                    break

        # Process file uploads
        for section in updated_form["sections"]:
            for question in section["questions"]:
                if question["type"] == "file":
                    file_paths = handle_file_uploads(request.files, question["id"], str(existing_form.get("_id")))
                    if file_paths:
                        # Keep existing files and add new ones
                        existing_files = question.get("answer", [])
                        if existing_files is None:
                            existing_files = []
                        question["answer"] = existing_files + file_paths

        # Set submission status if action is 'submit'
        if action == 'submit':
            updated_form["submitted"] = True

        # Save to database
        if is_cloning:
            # Insert as a new document
            forms_collection.insert_one(updated_form)
            updated_form["_id"] = str(updated_form.get("_id"))
        else:
            # Update existing document
            forms_collection.update_one(
                {"_id": existing_form["_id"]},
                {"$set": updated_form}
            )
            updated_form["_id"] = str(existing_form["_id"])

        # Get all versions for this form
        all_versions = forms_collection.find({"form_name": form_name})
        versions = [form["version_name"] for form in all_versions]

        # Add versions to the response
        updated_form["versions"] = versions

        return jsonify(updated_form)

if __name__ == '__main__':
    app.run(debug=True)
