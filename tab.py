from flask import Flask, render_template, abort
import os
import json

app = Flask(__name__)

# Define the root directory where JSON folders are stored.
DATA_ROOT = os.path.join(os.path.dirname(__file__), 'json_data')

def get_tabs():
    """
    Return a list of folder names under DATA_ROOT.
    Each folder is assumed to contain one or more JSON files.
    """
    return [d for d in os.listdir(DATA_ROOT) if os.path.isdir(os.path.join(DATA_ROOT, d))]

def load_json_for_tab(tab_name):
    """
    Load the first JSON file found in the folder corresponding to tab_name.
    """
    folder_path = os.path.join(DATA_ROOT, tab_name)
    json_files = [f for f in os.listdir(folder_path) if f.endswith('.json')]
    if not json_files:
        return {}
    # Here, we're choosing the first JSON file in the folder.
    file_path = os.path.join(folder_path, json_files[0])
    with open(file_path, 'r') as file:
        return json.load(file)

@app.route('/')
@app.route('/<tab>')
def index(tab=None):
    tabs = get_tabs()
    if not tabs:
        return "No tabs available."
    # Default to the first tab if none is specified.
    if tab is None:
        tab = tabs[0]
    if tab not in tabs:
        abort(404)
    data = load_json_for_tab(tab)
    return render_template('index.html', data=data, tabs=tabs, current_tab=tab)

if __name__ == '__main__':
    app.run(debug=True)
