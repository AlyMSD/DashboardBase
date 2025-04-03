import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import './Dashboard.css';  // Custom CSS for styling

function Dashboard() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [tableData, setTableData] = useState([]);

  // Fetch distinct server names for the dropdown.
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

  // Fetch data when a server is selected.
  useEffect(() => {
    if (selectedServer) {
      axios.get(`http://localhost:5000/api/data?serverName=${selectedServer.value}`)
        .then(response => setTableData(response.data))
        .catch(error => console.error('Error fetching data:', error));
    } else {
      setTableData([]);
    }
  }, [selectedServer]);

  // Helper to render a cell with red (regular) and green (automated) numbers.
  const renderCell = (cellData) => {
    if (cellData && typeof cellData === 'object') {
      return (
        <>
          <div style={{ color: 'red', fontWeight: 'bold' }}>{cellData.steps}</div>
          <div style={{ color: 'green', fontWeight: 'bold' }}>{cellData.auto}</div>
        </>
      );
    }
    return cellData;
  };

  return (
    <div className="dashboard-container">
      <h2>Server Dashboard</h2>
      
      <div className="dropdown-container">
        <Select
          options={servers}
          onChange={setSelectedServer}
          placeholder="Select a server..."
          isClearable
        />
      </div>

      {tableData.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th rowSpan="2">Version</th>
                <th rowSpan="2">Total Steps</th>
                <th rowSpan="2">Health Check</th>
                <th colSpan="3">Deployment</th>
                <th colSpan="3">Upgrade</th>
                <th rowSpan="2">Config Audit</th>
                <th rowSpan="2">Rollback Automation</th>
                <th rowSpan="2">Assurance</th>
                <th rowSpan="2">Geo</th>
                <th rowSpan="2">Disaster Recovery</th>
              </tr>
              <tr>
                <th>Pre-Deploy</th>
                <th>Deploy</th>
                <th>Post-Deploy</th>
                <th>Pre-Check</th>
                <th>Upgrade</th>
                <th>Post-Check</th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.version}</td>
                  <td>{renderCell(row.totalSteps)}</td>
                  <td>{renderCell(row.healthCheck)}</td>
                  <td>{renderCell(row.preDeploy)}</td>
                  <td>{renderCell(row.deploy)}</td>
                  <td>{renderCell(row.postDeploy)}</td>
                  <td>{renderCell(row.preCheck)}</td>
                  <td>{renderCell(row.upgrade)}</td>
                  <td>{renderCell(row.postCheck)}</td>
                  <td>{renderCell(row.configAudit)}</td>
                  <td>{renderCell(row.rollbackAutomation)}</td>
                  <td>{renderCell(row.assurance)}</td>
                  <td>{renderCell(row.geo)}</td>
                  <td>{renderCell(row.disasterRecovery)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        selectedServer && <p>No data found for the selected server.</p>
      )}
    </div>
  );
}

export default Dashboard;
