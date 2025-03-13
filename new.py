from flask import Flask, request, jsonify
from pymongo import MongoClient
from bson.objectid import ObjectId
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
client = MongoClient('mongodb://localhost:27017/')
db = client['form_database']
forms_collection = db['forms']

# Directory for file uploads
UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Function to update answers in a form document
def update_answers(form, form_data, files):
    new_sections = []
    for section in form['sections']:
        new_questions = []
        for question in section['questions']:
            qid = question['id']
            if question['type'] == 'file':
                existing_files = form_data.getlist(qid)
                new_files = files.getlist(qid)
                new_paths = []
                for file in new_files:
                    filename = secure_filename(file.filename)
                    path = os.path.join(UPLOAD_FOLDER, filename)
                    file.save(path)
                    new_paths.append(path)
                question['answer'] = existing_files + new_paths
            elif question['type'] == 'checkbox':
                question['answer'] = form_data.getlist(qid)
            else:
                question['answer'] = form_data.get(qid, question.get('answer'))
            new_questions.append(question)
        section['questions'] = new_questions
        new_sections.append(section)
    form['sections'] = new_sections
    return form

# GET endpoint to retrieve form definition
@app.route('/api/form', methods=['GET'])
def get_form():
    form_name = request.args.get('name')
    version_name = request.args.get('version')
    if not form_name:
        return jsonify({'error': 'Form name is required'}), 400

    query = {'form_name': form_name}
    if version_name:
        query['version_name'] = version_name

    form = forms_collection.find_one(query)
    if not form:
        return jsonify({'error': 'Form not found'}), 404

    # Get all versions for this form
    all_versions = forms_collection.find({'form_name': form_name}, {'version_name': 1})
    versions = [v['version_name'] for v in all_versions]

    form['_id'] = str(form['_id'])  # Convert ObjectId to string for JSON
    form['versions'] = versions
    return jsonify(form)

# POST endpoint to handle form operations
@app.route('/api/form', methods=['POST'])
def post_form():
    form_name = request.args.get('name')
    if not form_name:
        return jsonify({'error': 'Form name is required'}), 400

    action = request.form.get('action')
    version_name = request.form.get('version_name')
    new_version_name = request.form.get('new_version_name')

    if action not in ['save', 'submit', 'clone', 'new_version', 'rename']:
        return jsonify({'error': 'Invalid action'}), 400

    if action in ['clone', 'new_version', 'rename'] and not new_version_name:
        return jsonify({'error': 'New version name is required'}), 400

    if new_version_name and forms_collection.find_one({'form_name': form_name, 'version_name': new_version_name}):
        return jsonify({'error': 'Version name already exists'}), 409

    if action in ['clone', 'new_version']:
        # Cloning or creating new version
        source_form = forms_collection.find_one({'form_name': form_name, 'version_name': version_name})
        if not source_form:
            return jsonify({'error': 'Source version not found'}), 404
        
        new_form = source_form.copy()
        new_form['version_name'] = new_version_name
        new_form['_id'] = ObjectId()
        new_form['submitted'] = False
        
        if action == 'new_version':
            # Set answers to null for new version
            for section in new_form['sections']:
                for question in section['questions']:
                    question['answer'] = None
        
        forms_collection.insert_one(new_form)
        new_form['_id'] = str(new_form['_id'])
        return jsonify(new_form)

    elif action == 'rename':
        # Renaming the current version
        form = forms_collection.find_one({'form_name': form_name, 'version_name': version_name})
        if not form:
            return jsonify({'error': 'Form version not found'}), 404
        forms_collection.update_one(
            {'_id': form['_id']},
            {'$set': {'version_name': new_version_name}}
        )
        form['version_name'] = new_version_name
        form['_id'] = str(form['_id'])
        return jsonify(form)

    else:
        # Regular save or submit
        form = forms_collection.find_one({'form_name': form_name, 'version_name': version_name})
        if not form:
            return jsonify({'error': 'Form version not found'}), 404
        form = update_answers(form, request.form, request.files)
        if action == 'submit':
            form['submitted'] = True
        forms_collection.update_one({'_id': form['_id']}, {'$set': form})
        form['_id'] = str(form['_id'])
        return jsonify(form)

if __name__ == '__main__':
    app.run(debug=True)
