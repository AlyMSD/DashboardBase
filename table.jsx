import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';

function Dashboard() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [tableData, setTableData] = useState([]);

  // Fetch distinct server names for the dropdown
  useEffect(() => {
    axios.get('http://localhost:5000/api/servers')
      .then(response => {
        const serverOptions = response.data.map(serverName => ({
          value: serverName,
          label: serverName
        }));
        setServers(serverOptions);
      })
      .catch(error => console.error('Error fetching servers:', error));
  }, []);

  // Fetch data when a server is selected
  useEffect(() => {
    if (selectedServer) {
      axios.get(`http://localhost:5000/api/data?serverName=${selectedServer.value}`)
        .then(response => setTableData(response.data))
        .catch(error => console.error('Error fetching data:', error));
    } else {
      // Clear table if no server is selected
      setTableData([]);
    }
  }, [selectedServer]);

  // Define table columns (adjust as needed)
  const columns = [
    { key: 'version', label: 'Version' },
    { key: 'totalSteps', label: 'Total Steps' },
    { key: 'postupgrade', label: 'Post Upgrade' },
    { key: 'preupgrade', label: 'Pre Upgrade' }
    // Add more columns if your data includes them
  ];

  return (
    <div style={{ margin: '20px' }}>
      <h2>Server Dashboard</h2>
      
      <div style={{ width: '300px', marginBottom: '20px' }}>
        <Select
          options={servers}
          onChange={setSelectedServer}
          placeholder="Select a server..."
          isClearable
        />
      </div>

      {tableData.length > 0 && (
        <table border="1" cellPadding="5" cellSpacing="0">
          <thead>
            <tr>
              {columns.map(col => (
                <th key={col.key}>{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, idx) => (
              <tr key={idx}>
                {columns.map(col => (
                  <td key={col.key}>{row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedServer && tableData.length === 0 && (
        <p>No data found for the selected server.</p>
      )}
    </div>
  );
}

export default Dashboard;
