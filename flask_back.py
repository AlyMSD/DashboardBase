from flask import Flask, request, jsonify
from flask_pymongo import PyMongo, ASCENDING
from werkzeug.utils import secure_filename
import os
from datetime import datetime
from bson.objectid import ObjectId

app = Flask(__name__)
app.config["MONGO_URI"] = "mongodb://localhost:27017/formDB"
mongo = PyMongo(app)

# Configure file upload settings
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure upload directory exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename, allowed_types):
    """Check if the file type is allowed based on MIME types."""
    # Map MIME types to file extensions
    mime_to_ext = {
        'application/pdf': ['pdf'],
        'image/png': ['png'],
        'image/jpeg': ['jpg', 'jpeg'],
        'application/msword': ['doc'],
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx']
    }
    allowed_extensions = []
    for mime in allowed_types:
        allowed_extensions.extend(mime_to_ext.get(mime, []))
    
    if '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in allowed_extensions if allowed_extensions else True

@app.route('/api/form', methods=['GET'])
def get_form():
    form_name = request.args.get('name')
    version = request.args.get('version')

    query = {'form_name': form_name}
    if version:
        query['version_name'] = version
    else:
        # Get the latest version by creation date
        form = mongo.db.forms.find_one(query, sort=[('created_at', ASCENDING)])
        if not form:
            return jsonify({'error': 'Form not found'}), 404
        form['_id'] = str(form['_id'])
        return jsonify(form)

    form = mongo.db.forms.find_one(query)
    if form:
        form['_id'] = str(form['_id'])
        return jsonify(form)
    else:
        return jsonify({'error': 'Form not found'}), 404

@app.route('/api/form', methods=['POST'])
def save_form():
    form_name = request.args.get('name')
    if not form_name:
        return jsonify({'error': 'Form name is required'}), 400

    version_name = request.form.get('version_name')
    new_version_name = request.form.get('new_version_name')
    action = request.form.get('action', 'save')
    is_cloning = new_version_name is not None and new_version_name.strip() != ''

    # Handle version cloning
    if is_cloning:
        source_form = mongo.db.forms.find_one({
            'form_name': form_name,
            'version_name': version_name
        })
        if not source_form:
            return jsonify({'error': 'Source form not found'}), 404
        form_doc = source_form.copy()
        form_doc.pop('_id', None)
        form_doc['version_name'] = new_version_name
        form_doc['submitted'] = False
        form_doc['created_at'] = datetime.utcnow()
        version_name = new_version_name
    else:
        form_doc = mongo.db.forms.find_one({
            'form_name': form_name,
            'version_name': version_name
        })
        if not form_doc:
            form_doc = {
                'form_name': form_name,
                'version_name': version_name,
                'submitted': False,
                'sections': [],
                'created_at': datetime.utcnow()
            }
        else:
            form_doc = form_doc.copy()

    # Update answers and handle files
    for section in form_doc.get('sections', []):
        for question in section.get('questions', []):
            qid = question['id']
            qtype = question.get('type')

            if qtype == 'file':
                # Existing files (split comma-separated strings)
                existing_files = []
                for f_str in request.form.getlist(qid):
                    existing_files.extend(f_str.split(','))
                existing_files = [f.strip() for f in existing_files if f.strip()]

                # Process new uploads
                new_files = request.files.getlist(qid)
                saved_files = []
                for file in new_files:
                    if file and file.filename:
                        filename = secure_filename(file.filename)
                        allowed_types = question.get('allowedTypes', [])
                        if not allowed_file(filename, allowed_types):
                            continue
                        # Generate unique filename
                        unique = f"{datetime.utcnow().timestamp()}_{filename}"
                        file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique))
                        saved_files.append(unique)
                # Combine existing and new files
                question['answer'] = existing_files + saved_files
            elif qtype == 'checkbox':
                question['answer'] = request.form.getlist(qid)
            else:
                question['answer'] = request.form.get(qid, '')

    # Update submission status
    form_doc['submitted'] = action == 'submit'

    # Save to database
    if is_cloning:
        mongo.db.forms.insert_one(form_doc)
    else:
        mongo.db.forms.update_one(
            {'form_name': form_name, 'version_name': version_name},
            {'$set': form_doc},
            upsert=True
        )

    return jsonify({
        'message': 'Form saved successfully',
        'version_name': version_name,
        'submitted': form_doc['submitted']
    })

if __name__ == '__main__':
    app.run(debug=True)
