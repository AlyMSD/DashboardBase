from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# Example connection to MongoDB
# Adjust the connection string to your environment
client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
collection = db["mycollection"]

@app.route('/api/servers', methods=['GET'])
def get_server_names():
    """
    Returns a list of distinct server names to populate the dropdown.
    """
    distinct_servers = collection.distinct("name")  # "name" is the field for the server name
    return jsonify(distinct_servers)

@app.route('/api/data', methods=['GET'])
def get_data():
    """
    Returns the data filtered by server name (if provided).
    Example of grouping or collecting data from different section_names.
    """
    server_name = request.args.get('serverName', None)

    query = {}
    if server_name:
        query["name"] = server_name
    
    # Fetch documents matching the server name
    docs = list(collection.find(query))

    # Transform the data into a structure that is easy to display in a table.
    # Suppose each document looks like:
    # {
    #   "section_name": "postupgrade",
    #   "name": "server 1",
    #   "questions": [
    #       { "questionId": "stepsCount", "answer": "2" }
    #   ],
    #   "version": "2.0"
    # }
    #
    # We'll group data by "version" and then sum up "stepsCount" (or other metrics)
    # for each "section_name" across all docs that share the same version.
    
    from collections import defaultdict
    
    # Data structure to group by version
    # Example: aggregated_data[version][section_name] = total_steps
    aggregated_data = defaultdict(lambda: defaultdict(int))

    for doc in docs:
        version = doc.get("version", "Unknown")
        section = doc.get("section_name", "Unknown")
        questions = doc.get("questions", [])
        # Sum stepsCount or other question answers
        steps_count = 0
        for q in questions:
            if q.get("questionId") == "stepsCount":
                steps_count += int(q.get("answer", 0))
        aggregated_data[version][section] += steps_count

    # Convert aggregated_data into a list for easier JSON serialization
    # We also want "Total Steps" across all sections, or any other columns you have
    result = []
    for version, sections_dict in aggregated_data.items():
        total_steps = sum(sections_dict.values())
        result.append({
            "version": version,
            "totalSteps": total_steps,
            # If you have specific sections like "healthCheck", "preDeploy", etc., you can add them:
            "healthCheck": sections_dict.get("healthcheck", 0),
            "preDeploy": sections_dict.get("predeploy", 0),
            "deploy": sections_dict.get("deploy", 0),
            "postDeploy": sections_dict.get("postdeploy", 0),
            "preCheck": sections_dict.get("precheck", 0),
            "upgrade": sections_dict.get("upgrade", 0),
            "postCheck": sections_dict.get("postcheck", 0),
            "config": sections_dict.get("config", 0),
            "audit": sections_dict.get("audit", 0),
            "rollback": sections_dict.get("rollback", 0),
            "automation": sections_dict.get("automation", 0),
            "assurance": sections_dict.get("assurance", 0),
            "geo": sections_dict.get("geo", 0),
            "disasterRecovery": sections_dict.get("disasterrecovery", 0),
            # ... add other columns as needed
        })

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
