import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import './ModernDashboard.css'; // Import the new CSS file

function Dashboard() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [tableData, setTableData] = useState([]);

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

  useEffect(() => {
    if (selectedServer) {
      axios.get(`http://localhost:5000/api/data?serverName=${selectedServer.value}`)
        .then(response => setTableData(response.data))
        .catch(error => console.error('Error fetching data:', error));
    } else {
      setTableData([]);
    }
  }, [selectedServer]);

  const renderCell = (cellData) => {
    if (cellData && typeof cellData === 'object' && cellData.steps !== undefined && cellData.auto !== undefined) {
      const total = cellData.steps + cellData.auto;
      const percentageAutomated = total > 0 ? ((cellData.auto / total) * 100).toFixed(2) : 0;
      return (
        <div
          className="cell-data"
          title={`Automated: ${percentageAutomated}%`}
        >
          <span className="manual-steps">{cellData.steps}</span>
          <span className="automated-steps">{cellData.auto}</span>
        </div>
      );
    }
    return <div className="cell-data">{cellData}</div>;
  };

  return (
    <div className="dashboard-container">
      <h2 className="dashboard-title">Server Dashboard</h2>
      <div className="filter-section">
        <label htmlFor="server-select" className="filter-label">Select Server:</label>
        <Select
          id="server-select"
          className="server-dropdown"
          options={servers}
          onChange={setSelectedServer}
          placeholder="Select a server..."
          isClearable
        />
      </div>

      <div className="legend">
        <span className="legend-item">
          <div className="legend-color manual"></div> Manual
        </span>
        <span className="legend-item">
          <div className="legend-color automated"></div> Automated
        </span>
      </div>

      {tableData.length > 0 ? (
        <div className="table-responsive">
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th rowSpan="2">Version</th>
                <th rowSpan="2">Total Steps</th>
                <th rowSpan="2">Health Check</th>
                <th colSpan="3" className="group-header">Deployment</th>
                <th colSpan="3" className="group-header">Upgrade</th>
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
                <tr key={idx} className="table-row">
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
        selectedServer && <p className="no-data">No data found for the selected server.</p>
      )}
    </div>
  );
}

export default Dashboard;
