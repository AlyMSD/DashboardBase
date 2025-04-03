from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient

app = Flask(__name__)
CORS(app)

# Connect to MongoDB (update connection string and database/collection names as needed)
client = MongoClient("mongodb://localhost:27017/")
db = client["mydatabase"]
collection = db["mycollection"]

def init_sections():
    # Initializes a dictionary for each section with two keys: 'steps' (regular) and 'auto' (automated)
    return {
        "steps": 0,
        "auto": 0,
    }

@app.route('/api/servers', methods=['GET'])
def get_server_names():
    """Return a list of distinct server names for the dropdown."""
    distinct_servers = collection.distinct("name")
    return jsonify(distinct_servers)

@app.route('/api/data', methods=['GET'])
def get_data():
    """
    Return aggregated data by version filtered by server name.
    Aggregates for the following columns:
      - Health Check
      - Deployment (Pre-Deploy, Deploy, Post-Deploy)
      - Upgrade (Pre-Check, Upgrade, Post-Check)
      - Config Audit, Rollback Automation, Assurance, Geo, Disaster Recovery
    For each, both regular and automated counts are captured.
    """
    server_name = request.args.get('serverName', None)
    query = {}
    if server_name:
        query["name"] = server_name

    docs = list(collection.find(query))

    from collections import defaultdict
    # For each version, initialize all sections with a nested dict for counts.
    aggregated_data = defaultdict(lambda: {
        "healthCheck": init_sections(),
        "preDeploy": init_sections(),
        "deploy": init_sections(),
        "postDeploy": init_sections(),
        "preCheck": init_sections(),
        "upgrade": init_sections(),
        "postCheck": init_sections(),
        "configAudit": init_sections(),
        "rollbackAutomation": init_sections(),
        "assurance": init_sections(),
        "geo": init_sections(),
        "disasterRecovery": init_sections(),
    })

    # Process each document. For each question in the document, check its type.
    for doc in docs:
        version = doc.get("version", "Unknown")
        section = doc.get("section_name", "").lower()
        questions = doc.get("questions", [])
        
        # For each question in the doc, add the value to the proper count.
        for q in questions:
            try:
                # Convert values to integer; if conversion fails, ignore the value.
                value = int(q.get("answer", 0))
            except ValueError:
                value = 0

            if q.get("questionId") == "stepsCount":
                count_type = "steps"  # Regular count (to be shown in red)
            elif q.get("questionId") == "automatedStepsCount":
                count_type = "auto"   # Automated count (to be shown in green)
            else:
                continue

            # Map section names to our aggregated sections.
            if section == "healthcheck":
                aggregated_data[version]["healthCheck"][count_type] += value
            elif section == "predeploy":
                aggregated_data[version]["preDeploy"][count_type] += value
            elif section == "deploy":
                aggregated_data[version]["deploy"][count_type] += value
            elif section == "postdeploy":
                aggregated_data[version]["postDeploy"][count_type] += value
            elif section == "precheck":
                aggregated_data[version]["preCheck"][count_type] += value
            elif section == "upgrade":
                aggregated_data[version]["upgrade"][count_type] += value
            elif section == "postcheck":
                aggregated_data[version]["postCheck"][count_type] += value
            elif section == "configaudit":
                aggregated_data[version]["configAudit"][count_type] += value
            elif section == "rollbackautomation":
                aggregated_data[version]["rollbackAutomation"][count_type] += value
            elif section == "assurance":
                aggregated_data[version]["assurance"][count_type] += value
            elif section == "geo":
                aggregated_data[version]["geo"][count_type] += value
            elif section == "disasterrecovery":
                aggregated_data[version]["disasterRecovery"][count_type] += value

    # Prepare the final result. Compute total steps for each version by summing each section's counts.
    result = []
    for version, sections in aggregated_data.items():
        total_steps = {"steps": 0, "auto": 0}
        for key, counts in sections.items():
            total_steps["steps"] += counts["steps"]
            total_steps["auto"] += counts["auto"]

        row = {
            "version": version,
            "totalSteps": total_steps,
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
        }
        result.append(row)

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)
