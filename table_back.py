from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# Connect to MongoDB (update the connection string and collection names as needed)
client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
collection = db["mycollection"]

def init_section():
    """Initialize a dictionary for a section with 'steps' (regular) and 'auto' (automated)."""
    return {"steps": 0, "auto": 0}

# Define section mapping from lowercase to camelCase
section_mapping = {
    "healthcheck": "healthCheck",
    "predeploy": "preDeploy",
    "deploy": "deploy",
    "postdeploy": "postDeploy",
    "precheck": "preCheck",
    "upgrade": "upgrade",
    "postcheck": "postCheck",
    "configaudit": "configAudit",
    "rollbackautomation": "rollbackAutomation",
    "assurance": "assurance",
    "geo": "geo",
    "disasterrecovery": "disasterRecovery",
}

@app.route('/api/servers', methods=['GET'])
def get_server_names():
    """Return a list of distinct server names for the dropdown."""
    servers = collection.distinct("name")
    return jsonify(servers)

@app.route('/api/data', methods=['GET'])
def get_data():
    """
    Aggregate data by version filtered by server name.
    Only process questions with IDs "stepsCount" or "automatedStepsCount" and a valid integer answer.
    Skip any question that does not have one of these IDs or lacks a valid answer.
    """
    server_name = request.args.get('serverName', None)
    query = {}
    if server_name:
        query["name"] = server_name

    docs = list(collection.find(query))

    # Initialize aggregation structure for each version with all predefined sections
    aggregated = defaultdict(lambda: {section: init_section() for section in section_mapping.values()})

    for doc in docs:
        version = doc.get("version", "Unknown")
        section = doc.get("section_name", "").lower()
        agg_section = section_mapping.get(section)
        if agg_section is None:
            continue  # Skip unknown sections

        questions = doc.get("questions", [])
        for q in questions:
            # Map questionId to count_type; skip if not "stepsCount" or "automatedStepsCount"
            count_type = {"stepsCount": "steps", "automatedStepsCount": "auto"}.get(q.get("questionId"))
            if count_type is None:
                continue

            # Only process if answer is present and valid
            answer = q.get("answer")
            if answer is None:
                continue  # Skip if no answer is provided (e.g., question was skipped)

            try:
                value = int(answer)
            except (ValueError, TypeError):
                continue  # Skip if answer is not a valid integer

            # Add the value to the corresponding section and count type
            aggregated[version][agg_section][count_type] += value

    # Compute total counts for each version and build the result
    result = []
    for version, sections in aggregated.items():
        total = {"steps": 0, "auto": 0}
        for counts in sections.values():
            total["steps"] += counts["steps"]
            total["auto"] += counts["auto"]

        result.append({
            "version": version,
            "totalSteps": total,
            "healthCheck": sections["healthCheck"],
            "preDeploy": sections["preDeploy"],
            "deploy": sections["deploy"],
            "postDeploy": sections["postDeploy"],
            "preCheck": sections["preCheck"],
            "upgrade": sections["upgrade"],
            "postCheck": sections["postCheck"],
            "configAudit": sections["configAudit"],
            "rollbackAutomation": sections["rollbackAutomation"],
            "assurance": sections["assurance"],
            "geo": sections["geo"],
            "disasterRecovery": sections["disasterRecovery"],
        })

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
