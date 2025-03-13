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
        form_name = request.args.get('name')
        version = request.args.get('version')

        if not form_name:
            return jsonify({"error": "Form name is required"}), 400

        query = {"form_name": form_name}
        if version:
            query["version_name"] = version

        form_definition = form_collection.find_one(query)

        if form_definition:
            form_definition['_id'] = str(form_definition['_id'])
            # Fetch all versions for dropdown
            all_versions_cursor = form_collection.find({"form_name": form_name}).sort("version_name", 1) # sort versions
            all_versions = [v['version_name'] for v in all_versions_cursor]
            form_definition['versions'] = all_versions # Include versions in response
            return jsonify(form_definition)
        else:
            return jsonify({"error": "Form not found"}), 404

    elif request.method == 'POST':
        form_name = request.args.get('name') # Form name from URL - this is the *target* form name
        if not form_name:
            return jsonify({"error": "Form name is required"}), 400

        action = request.form.get('action')
        version_name_input = request.form.get('version_name') # Source version string (e.g., "BlankTemplate_v_1")
        new_version_name_input = request.form.get('new_version_name') # New version name input by user
        target_form_name_clone = request.form.get('form_name') # **NEW**: form_name for clone operation

        if not version_name_input: # changed from version_name
            return jsonify({"error": "Version name is required"}), 400

        form_data = {}
        files_data = {}

        for key in request.form:
            if key not in ['action', 'version_name', 'new_version_name', 'form_name']:
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
            "version_name": version_name_input, # changed from version_name
            "action": action,
            "form_data": form_data,
            "files_data": files_data,
            "submitted": action == 'submit'
        }

        if new_version_name_input: # Cloning scenario
            new_version_name = new_version_name_input.strip()
            if not new_version_name:
                return jsonify({"error": "New version name is required for cloning"}), 400

            # Check if version name already exists for this form
            existing_version = form_collection.find_one({"form_name": form_name, "version_name": new_version_name})
            if existing_version:
                return jsonify({"error": "Version name already exists"}), 409 # 409 Conflict

            # ** Parse source form and version from version_name_input string **
            source_form_name = "BlankTemplate" # default
            source_version_name = "1" # default

            if version_name_input: # version_name_input will be like "BlankTemplate_v_1"
                parts = version_name_input.split('_v_')
                if len(parts) == 2:
                    source_form_name = parts[0]
                    source_version_name = parts[1]

            print(f"Backend: Cloning from Form: '{source_form_name}', Version: '{source_version_name}'") # **DEBUG LOGGING**
            print(f"Backend: Cloning to Form Name: '{form_name}', New Version Name: '{new_version_name}'") # **DEBUG LOGGING**


            form_to_clone = form_collection.find_one({"form_name": source_form_name, "version_name": source_version_name})
            if not form_to_clone:
                return jsonify({"error": f"Version to clone not found: Form '{source_form_name}', Version '{source_version_name}'"}), 404

            del form_to_clone['_id']
            form_to_clone['form_name'] = target_form_name_clone if target_form_name_clone else form_name # **NEW**: Use target_form_name_clone from payload, fallback to URL form_name
            form_to_clone['version_name'] = new_version_name # User-provided new version name
            form_to_clone['submitted'] = False
            form_id = form_collection.insert_one(form_to_clone)
            print(f"Backend: Created new cloned version with ID: {form_id.inserted_id}") # **DEBUG LOGGING**


        else: # Save or Submit existing version (or rename)
            form_definition = form_collection.find_one({"form_name": form_name, "version_name": version_name_input}) # changed from version_name
            if not form_definition:
                return jsonify({"error": "Form definition not found"}), 404

            # Check for version rename
            if new_version_name_input and new_version_name_input.strip() != version_name_input: # changed from version_name
                proposed_new_version_name = new_version_name_input.strip()
                existing_version_same_name = form_collection.find_one({"form_name": form_name, "version_name": proposed_new_version_name})
                if existing_version_same_name:
                    return jsonify({"error": "Version name already exists"}), 409 # 409 Conflict

                # Rename version
                form_collection.update_one(
                    {"_id": form_definition["_id"]},
                    {"$set": {"version_name": proposed_new_version_name, "submitted": action == 'submit'}} # Update version_name and submitted
                )


            else: # Just save/submit data, no rename
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
        updated_form_definition = form_collection.find_one({"form_name": form_name, "version_name": new_version_name if new_version_name_input else version_name_input}) # changed from version_name
        updated_form_definition['_id'] = str(updated_form_definition['_id'])
        all_versions_cursor = form_collection.find({"form_name": form_name}).sort("version_name", 1)
        all_versions = [v['version_name'] for v in all_versions_cursor]
        updated_form_definition['versions'] = all_versions # Re-include versions
        return jsonify(updated_form_definition) # Return updated form definition including versions


    return jsonify({"error": "Invalid method"}), 400

if __name__ == '__main__':
    app.run(debug=True)
