from flask import Flask, request, jsonify
from pymongo import MongoClient
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# MongoDB Configuration (same as before)
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/')
DATABASE_NAME = os.environ.get('DATABASE_NAME', 'form_database')
FORM_COLLECTION_NAME = os.environ.get('FORM_COLLECTION_NAME', 'forms')

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
form_collection = db[FORM_COLLECTION_NAME]

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/form', methods=['GET', 'POST'])
def form_endpoint():
    if request.method == 'GET':
        # ... (GET route code - remains the same) ...
        form_name = request.args.get('name')
        version = request.args.get('version')

        if not form_name:
            return jsonify({"error": "Form name is required"}), 400

        if version: # If specific version is requested, fetch that
            query = {"form_name": form_name, "version_name": version}
            form_definition = form_collection.find_one(query)
        else: # If no version requested, fetch the *first* version
            all_versions_cursor = form_collection.find({"form_name": form_name}).sort("version_name", 1).limit(1) # Sort and limit to 1
            first_version_doc = next(all_versions_cursor, None) # Get the first document or None if no versions

            if first_version_doc:
                query = {"form_name": form_name, "version_name": first_version_doc['version_name']} # Query for the first version
                form_definition = form_collection.find_one(query)
            else: # No versions exist for this form_name
                form_definition = None # Indicate form not found

        if form_definition:
            form_definition['_id'] = str(form_definition['_id'])
            # Fetch all versions for dropdown (still needed for dropdown population)
            all_versions_cursor = form_collection.find({"form_name": form_name}).sort("version_name", 1)
            all_versions = [v['version_name'] for v in all_versions_cursor]
            form_definition['versions'] = all_versions # Include versions in response
            return jsonify(form_definition)
        else:
            return jsonify({"error": "Form not found"}), 404


    elif request.method == 'POST':
        form_name = request.args.get('name')
        if not form_name:
            return jsonify({"error": "Form name is required"}), 400

        action = request.form.get('action') # 'save' or 'submit'
        version_name = request.form.get('version_name') # current version name (might be old name if renaming)
        new_version_name_input = request.form.get('new_version_name') # for cloning, and rename input

        if not version_name:
            return jsonify({"error": "Version name is required"}), 400

        form_data = {}
        files_data = {}

        for key in request.form:
            if key not in ['action', 'version_name', 'new_version_name']:
                form_data[key] = request.form.get(key)

        for key in request.files:
            uploaded_files = request.files.getlist(key)
            file_list = []
            for file in uploaded_files:
                if file and allowed_file(file.filename):
                    filename = secure_filename(file.filename)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                    file.save(file_path)
                    file_list.append(filename)
                else:
                    return jsonify({"error": f"Invalid file type for {file.filename}"}), 400
            if file_list:
                files_data[key] = file_list

        submission_data = {
            "form_name": form_name,
            "version_name": version_name,
            "action": action,
            "form_data": form_data,
            "files_data": files_data,
            "submitted": action == 'submit'
        }


        form_definition = form_collection.find_one({"form_name": form_name, "version_name": version_name})
        if not form_definition:
            return jsonify({"error": "Form definition not found"}), 404


        # **REORDERED LOGIC: Rename Check BEFORE Clone Check**
        if new_version_name_input and new_version_name_input.strip() != version_name: # **RENAME Scenario:** if new_version_name provided and *different* from current version_name, it's a RENAMING operation
            proposed_new_version_name = new_version_name_input.strip()
            existing_version_same_name = form_collection.find_one({"form_name": form_name, "version_name": proposed_new_version_name})
            if existing_version_same_name:
                return jsonify({"error": "Version name already exists"}), 409 # 409 Conflict

            # Rename version
            form_collection.update_one(
                {"_id": form_definition["_id"]},
                {"$set": {"version_name": proposed_new_version_name, "submitted": action == 'submit'}} # Update version_name and submitted
            )
            version_name = proposed_new_version_name # Update version_name to the NEW name for subsequent fetch


        elif new_version_name_input: # **CLONING Scenario:** if new_version_name provided BUT it's the *same* as current version_name (or rename was not triggered above), it's a CLONING operation
            new_version_name = new_version_name_input.strip() # use input new version name
            if not new_version_name:
                return jsonify({"error": "New version name is required for cloning"}), 400

            # Check if version name already exists for this form
            existing_version = form_collection.find_one({"form_name": form_name, "version_name": new_version_name})
            if existing_version:
                return jsonify({"error": "Version name already exists"}), 409 # 409 Conflict


            form_to_clone = form_collection.find_one({"form_name": form_name, "version_name": version_name})
            if not form_to_clone:
                return jsonify({"error": "Version to clone not found"}), 404

            del form_to_clone['_id']
            form_to_clone['version_name'] = new_version_name # Use the NEW version name
            form_to_clone['submitted'] = False
            form_id = form_collection.insert_one(form_to_clone)
            version_name = new_version_name # Update version_name to the NEW name for subsequent fetch


        else: # Just save/submit data, no rename, no clone
            for section_index, section in enumerate(form_definition.get("sections", [])):
                for question_index, question in enumerate(section.get("questions", [])):
                    question_id = question.get("id")
                    if question_id in form_data:
                        form_definition["sections"][section_index]["questions"][question_index]["answer"] = form_data[question_id]
                    if question_id in files_data:
                         form_definition["sections"][section_index]["questions"][question_index]["answer"] = files_data[question_id]

            form_collection.update_one(
                {"_id": form_definition["_id"]},
                {"$set": {"sections": form_definition["sections"], "submitted": action == 'submit'}} # Just update sections and submitted
            )


        # After POST, always refetch the form definition to get updated version list for frontend dropdown
        updated_form_definition = form_collection.find_one({"form_name": form_name, "version_name": version_name}) # get latest version
        updated_form_definition['_id'] = str(updated_form_definition['_id'])
        all_versions_cursor = form_collection.find({"form_name": form_name}).sort("version_name", 1)
        all_versions = [v['version_name'] for v in all_versions_cursor]
        updated_form_definition['versions'] = all_versions # Re-include versions
        return jsonify(updated_form_definition) # Return updated form definition including versions


    return jsonify({"error": "Invalid method"}), 400

if __name__ == '__main__':
    app.run(debug=True)
