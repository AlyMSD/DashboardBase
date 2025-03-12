from flask import Flask, request, jsonify
from pymongo import MongoClient
from flask_cors import CORS
import os
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

# MongoDB Configuration
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/') # default localhost if env variable not set
DATABASE_NAME = os.environ.get('DATABASE_NAME', 'form_database')
FORM_COLLECTION_NAME = os.environ.get('FORM_COLLECTION_NAME', 'forms')

client = MongoClient(MONGO_URI)
db = client[DATABASE_NAME]
form_collection = db[FORM_COLLECTION_NAME]

UPLOAD_FOLDER = 'uploads' # Directory to save uploaded files
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'} # Example allowed extensions
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True) # Ensure upload folder exists


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
            # Convert ObjectId to string for JSON serialization
            form_definition['_id'] = str(form_definition['_id'])
            return jsonify(form_definition)
        else:
            return jsonify({"error": "Form not found"}), 404

    elif request.method == 'POST':
        form_name = request.args.get('name')
        if not form_name:
            return jsonify({"error": "Form name is required"}), 400

        action = request.form.get('action') # 'save' or 'submit'
        version_name = request.form.get('version_name')
        new_version_name = request.form.get('new_version_name') # for cloning

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
                    file.save(file_path) # Save file to disk - in real scenario consider cloud storage
                    file_list.append(filename) # Store just filename, or full path depending on needs
                else:
                    return jsonify({"error": f"Invalid file type for {file.filename}"}), 400
            if file_list:
                files_data[key] = file_list # Store list of filenames for file question IDs

        submission_data = {
            "form_name": form_name,
            "version_name": version_name,
            "action": action,
            "form_data": form_data,
            "files_data": files_data,
            "submitted": action == 'submit' # Indicate if it's a final submission
        }

        if new_version_name: # Cloning scenario
            # Find the form to clone
            form_to_clone = form_collection.find_one({"form_name": form_name, "version_name": version_name})
            if not form_to_clone:
                return jsonify({"error": "Version to clone not found"}), 404

            # Create a new version based on the cloned form
            del form_to_clone['_id'] # Remove ObjectId for new insertion
            form_to_clone['version_name'] = new_version_name
            form_to_clone['submitted'] = False # New version is not submitted
            form_id = form_collection.insert_one(form_to_clone) # Insert the cloned form as new version

        else: # Save or Submit existing version
            # In a real app, you might want to store submissions in a separate collection
            # For simplicity, here we are updating the form definition document itself (not ideal for production)
            # Consider creating a new collection for form submissions linked to form definitions

            # Update the 'answer' field in the form definition with submitted data.
            # This is a simplified approach. In a real-world scenario, you would likely:
            # 1. Store submission data in a separate collection.
            # 2. Not modify the form definition directly upon submission.

            form_definition = form_collection.find_one({"form_name": form_name, "version_name": version_name})
            if not form_definition:
                return jsonify({"error": "Form definition not found"}), 404

            for section_index, section in enumerate(form_definition.get("sections", [])):
                for question_index, question in enumerate(section.get("questions", [])):
                    question_id = question.get("id")
                    if question_id in form_data:
                        form_definition["sections"][section_index]["questions"][question_index]["answer"] = form_data[question_id]
                    if question_id in files_data: # handling file uploads, storing filenames
                         form_definition["sections"][section_index]["questions"][question_index]["answer"] = files_data[question_id]


            form_collection.update_one(
                {"_id": form_definition["_id"]}, # assuming _id exists from the get call
                {"$set": {"sections": form_definition["sections"], "submitted": action == 'submit'}}
            )


        return jsonify({"message": "Form data processed successfully"}), 200

if __name__ == '__main__':
    app.run(debug=True)
