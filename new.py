from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# MongoDB Connection (Make sure your MongoDB is running)
client = MongoClient('mongodb://localhost:27017/')
db = client['form_builder']  # Replace with your database name
forms_collection = db['forms']  # Replace with your collection name

@app.route('/api/form', methods=['GET'])
def get_form():
    name = request.args.get('name')
    version = request.args.get('version')

    if not name:
        return jsonify({'error': 'Form name is required'}), 400

    query = {'form_name': name}
    if version:
        query['version_name'] = version

    form_data = forms_collection.find_one(query)

    if form_data:
        # Fetch all versions for the form
        all_versions = forms_collection.find({'form_name': name}, {'version_name': 1, '_id': 0}).distinct('version_name')
        form_data['versions'] = list(all_versions)
        # Remove the internal MongoDB id
        form_data['_id'] = str(form_data['_id'])
        return jsonify(form_data)
    else:
        return jsonify({'error': 'Form not found'}), 404

@app.route('/api/form', methods=['POST'])
def update_form():
    name = request.args.get('name')
    action = request.form.get('action')
    version_name = request.form.get('version_name')
    new_version_name = request.form.get('new_version_name')
    cloned_from_version = request.form.get('version_name') # In frontend, this is used for source

    if not name:
        return jsonify({'error': 'Form name is required'}), 400

    if action not in ['save', 'submit']:
        return jsonify({'error': 'Invalid action'}), 400

    existing_form = forms_collection.find_one({'form_name': name, 'version_name': version_name})

    if not existing_form and action != 'submit' and not new_version_name and not cloned_from_version:
        return jsonify({'error': 'Form version not found'}), 404

    if new_version_name:
        # Check if the new version name already exists for this form
        if forms_collection.find_one({'form_name': name, 'version_name': new_version_name}):
            return jsonify({'error': 'Version name already exists.'}), 409

        if cloned_from_version and cloned_from_version != 'BlankTemplate':
            # Clone from an existing version
            source_form = forms_collection.find_one({'form_name': name, 'version_name': cloned_from_version})
            if not source_form:
                return jsonify({'error': 'Source version not found for cloning'}), 404
            new_form_data = source_form.copy()
            new_form_data['version_name'] = new_version_name
            new_form_data['submitted'] = False
            # Clear existing answers for the new version
            for section in new_form_data.get('sections', []):
                for question in section.get('questions', []):
                    question['answer'] = None
            forms_collection.insert_one(new_form_data)
            return jsonify(new_form_data)
        elif cloned_from_version == 'BlankTemplate':
            # Create a new version from a blank template
            base_form = forms_collection.find_one({'form_name': name, 'version_name': 'BlankTemplate_v_1'}) # Assuming you have a base template
            if not base_form:
                return jsonify({'error': 'Blank template not found'}), 404
            new_form_data = base_form.copy()
            new_form_data['version_name'] = new_version_name
            new_form_data['submitted'] = False
            # Clear existing answers
            for section in new_form_data.get('sections', []):
                for question in section.get('questions', []):
                    question['answer'] = None
            forms_collection.insert_one(new_form_data)
            return jsonify(new_form_data)
        else:
            # Rename the current version
            if not existing_form:
                return jsonify({'error': 'Form version to rename not found'}), 404
            forms_collection.update_one(
                {'form_name': name, 'version_name': version_name},
                {'$set': {'version_name': new_version_name}}
            )
            updated_form = forms_collection.find_one({'form_name': name, 'version_name': new_version_name})
            updated_form['_id'] = str(updated_form['_id'])
            return jsonify(updated_form)

    # Handle save or submit for an existing version
    if existing_form:
        updated_answers = {}
        for key in request.form:
            if key not in ['action', 'version_name', 'new_version_name']:
                updated_answers[key] = request.form.getlist(key) if len(request.form.getlist(key)) > 1 else request.form.get(key)

        # Update answers in the database
        for section_index, section in enumerate(existing_form.get('sections', [])):
            for question_index, question in enumerate(section.get('questions', [])):
                if question['id'] in updated_answers:
                    existing_form['sections'][section_index]['questions'][question_index]['answer'] = updated_answers[question['id']]

        # Handle file uploads (for simplicity, we are not actually saving files here, just noting their presence)
        for key in request.files:
            files = request.files.getlist(key)
            if files:
                # Update the 'answer' field for file type questions
                for section_index, section in enumerate(existing_form.get('sections', [])):
                    for question_index, question in enumerate(section.get('questions', [])):
                        if question['id'] == key and question['type'] == 'file':
                            # For simplicity, just store the filenames
                            existing_form['sections'][section_index]['questions'][question_index]['answer'] = [file.filename for file in files]

        # Update the submitted status if the action is 'submit'
        if action == 'submit':
            existing_form['submitted'] = True

        forms_collection.update_one(
            {'form_name': name, 'version_name': version_name},
            {'$set': existing_form}
        )
        existing_form['_id'] = str(existing_form['_id'])
        return jsonify(existing_form)
    else:
        return jsonify({'error': 'Form version not found for updating'}), 404

if __name__ == '__main__':
    # Example of creating a blank template if it doesn't exist
    if not forms_collection.find_one({'form_name': 'user info', 'version_name': 'BlankTemplate_v_1'}):
        blank_template = {
            "form_name": "user info",
            "version_name": "BlankTemplate_v_1",
            "submitted": False,
            "sections": [
                {
                    "name": "Name Section",
                    "description": "An area for the user to add their name",
                    "questions": [
                        {
                            "id": "name",
                            "type": "text",
                            "label": "Your Name",
                            "placeholder": "Enter your full name",
                            "answer": None,
                            "required": True
                        },
                        {
                            "id": "filesUp",
                            "type": "file",
                            "label": "Attach any files that are relevant",
                            "allowedTypes": ["application/pdf"],
                            "multiple": True,
                            "conditional": {"questionId": "name", "value": ["Yes"]},
                            "answer": None,
                            "required": False
                        }
                    ]
                }
            ]
        }
        forms_collection.insert_one(blank_template)

    # Example of creating the initial form if it doesn't exist
    if not forms_collection.find_one({'form_name': 'user info', 'version_name': 'Q1 2025'}):
        initial_form_data = {
            "form_name": "user info",
            "version_name": "Q1 2025",
            "submitted": False,
            "sections": [
                {
                    "name": "Name Section",
                    "description": "An area for the user to add their name",
                    "questions": [
                        {
                            "id": "name",
                            "type": "text",
                            "label": "Your Name",
                            "placeholder": "Enter your full name",
                            "answer": None,
                            "required": True
                        },
                        {
                            "id": "filesUp",
                            "type": "file",
                            "label": "Attach any files that are relevant",
                            "allowedTypes": ["application/pdf"],
                            "multiple": True,
                            "conditional": {"questionId": "name", "value": ["Yes"]},
                            "answer": None,
                            "required": False
                        }
                    ]
                }
            ]
        }
        forms_collection.insert_one(initial_form_data)

    app.run(debug=True)
