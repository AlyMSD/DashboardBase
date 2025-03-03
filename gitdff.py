import base64
import requests
import difflib
from flask import Flask, request, jsonify

app = Flask(__name__)

# Configure these variables with your GitLab details
GITLAB_API_URL = 'https://gitlab.com/api/v4'
PRIVATE_TOKEN = 'your_gitlab_private_token'
PROJECT_ID = 'your_project_id'  # e.g. 123456 or URL encoded if necessary
DEFAULT_FILE_PATH = 'path/to/file.txt'   # Default file path (can be overridden via query parameter)

def get_file_from_gitlab(branch, file_path):
    """
    Retrieve the file content from the given branch via the GitLab API.
    The file content is returned as a list of lines.
    """
    # URL encode the file path for the API request
    encoded_path = requests.utils.quote(file_path, safe='')
    url = f"{GITLAB_API_URL}/projects/{PROJECT_ID}/repository/files/{encoded_path}"
    params = { "ref": branch }
    headers = { "PRIVATE-TOKEN": PRIVATE_TOKEN }
    
    response = requests.get(url, params=params, headers=headers)
    if response.status_code == 200:
        data = response.json()
        # The file content is base64 encoded; decode it into text and split into lines
        content = base64.b64decode(data['content']).decode('utf-8')
        return content.splitlines()
    else:
        print(f"Error fetching file from branch '{branch}': {response.status_code} {response.text}")
        return []

@app.route('/api/diff')
def get_diff():
    """
    API endpoint that accepts query parameters:
      - branch1: first branch name
      - branch2: second branch name
      - file_path: (optional) file path to compare; defaults to DEFAULT_FILE_PATH if omitted.
      
    It returns an HTML diff between the file versions from the two branches.
    """
    branch1 = request.args.get('branch1')
    branch2 = request.args.get('branch2')
    file_path = request.args.get('file_path', DEFAULT_FILE_PATH)
    
    if not branch1 or not branch2:
        return jsonify({'error': 'Please provide both branch1 and branch2 as query parameters.'}), 400

    file1_lines = get_file_from_gitlab(branch1, file_path)
    file2_lines = get_file_from_gitlab(branch2, file_path)
    
    # Generate an HTML diff using Python's difflib.HtmlDiff
    html_diff = difflib.HtmlDiff(wrapcolumn=80).make_file(
        file1_lines, file2_lines,
        fromdesc=f"{branch1}:{file_path}",
        todesc=f"{branch2}:{file_path}"
    )
    return html_diff

if __name__ == "__main__":
    app.run(debug=True)
