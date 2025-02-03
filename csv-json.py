import csv
import json

# Read the CSV file
with open('file_csv.csv', 'r') as f:
    reader = csv.reader(f)
    headers = [next(reader) for _ in range(3)]  # Read three header rows
    data_rows = list(reader)  # Read the remaining data rows

# Process header rows to build the hierarchy for each column
row0 = headers[0]
row1 = headers[1]
row2 = headers[2]

# Process parent headers (row0)
parent_headers = []
current_parent = None
for cell in row0:
    cell = cell.strip()
    current_parent = cell if cell else current_parent
    parent_headers.append(current_parent)

# Process subheaders (row1)
subheaders = []
current_sub = None
for cell in row1:
    cell = cell.strip()
    current_sub = cell if cell else current_sub
    subheaders.append(current_sub)

# Process subsubheaders (row2)
subsubheaders = []
current_subsub = None
for cell in row2:
    cell = cell.strip()
    current_subsub = cell if cell else current_subsub
    subsubheaders.append(current_subsub)

# Build the column hierarchy for data columns (columns 1-15)
column_hierarchy = []
for i in range(1, 16):  # Data columns are 1-15 (0-based)
    path = []
    parent = parent_headers[i]
    if parent:
        path.append(parent)
    sub = subheaders[i]
    if sub:
        path.append(sub)
    subsub = subsubheaders[i]
    if subsub:
        path.append(subsub)
    column_hierarchy.append(path)

# Process each data row into a JSON object
json_data = []
for row in data_rows:
    if not row:
        continue
    name = row[0].strip()
    data_dict = {'Name': name}

    for i in range(1, 16):  # Iterate over data columns 1-15
        if i - 1 >= len(column_hierarchy) or i >= len(row):
            continue
        path = column_hierarchy[i - 1]
        if not path:
            continue

        value = row[i].strip()
        # Convert value to int/float if possible
        try:
            value = int(value)
        except ValueError:
            try:
                value = float(value)
            except ValueError:
                pass

        current_dict = data_dict
        for key in path[:-1]:
            if key not in current_dict or not isinstance(current_dict.get(key), dict):
                current_dict[key] = {}
            current_dict = current_dict[key]
        current_dict[path[-1]] = value

    json_data.append(data_dict)

# Write the JSON output
with open('output.json', 'w') as f:
    json.dump(json_data, f, indent=2)

print("CSV converted to JSON successfully.")
