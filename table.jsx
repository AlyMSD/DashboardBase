import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import './Dashboard.css';

function Dashboard() {
  const [servers, setServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch distinct server names for the dropdown
  useEffect(() => {
    setIsLoading(true);
    axios.get('http://localhost:5000/api/servers')
      .then(response => {
        const serverOptions = response.data.map(serverName => ({
          value: serverName,
          label: serverName
        }));
        setServers(serverOptions);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching servers:', error);
        setIsLoading(false);
      });
  }, []);

  // Fetch data when a server is selected
  useEffect(() => {
    if (selectedServer) {
      setIsLoading(true);
      axios.get(`http://localhost:5000/api/data?serverName=${selectedServer.value}`)
        .then(response => {
          setTableData(response.data);
          setIsLoading(false);
        })
        .catch(error => {
          console.error('Error fetching data:', error);
          setIsLoading(false);
        });
    } else {
      setTableData([]);
    }
  }, [selectedServer]);

  // Helper to render a cell with red (regular) and green (automated) numbers
  const renderCell = (cellData) => {
    if (cellData && typeof cellData === 'object') {
      return (
        <div className="cell-data">
          <span className="cell-steps">{cellData.steps}</span>
          <span className="cell-auto">{cellData.auto}</span>
        </div>
      );
    }
    return cellData;
  };

  // Custom styles for react-select
  const selectStyles = {
    control: (base) => ({
      ...base,
      borderRadius: '0.375rem',
      borderColor: '#e2e8f0',
      boxShadow: 'none',
      '&:hover': {
        borderColor: '#cbd5e1',
      },
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '0.375rem',
      overflow: 'hidden',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f1f5f9' : 'white',
      color: state.isSelected ? 'white' : '#334155',
    }),
  };

  return (
    <div className="dashboard-wrapper">
      <Card className="dashboard-card">
        <CardHeader className="dashboard-header">
          <CardTitle className="dashboard-title">Server Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="dashboard-content">
          <div className="server-select-container">
            <label className="select-label">
              Select Server
            </label>
            <Select
              options={servers}
              onChange={setSelectedServer}
              placeholder="Select a server..."
              isClearable
              isLoading={isLoading}
              styles={selectStyles}
              className="server-select"
            />
          </div>

          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
            </div>
          ) : tableData.length > 0 ? (
            <div className="table-responsive">
              <div className="table-container">
                <div className="table-wrapper">
                  <table className="dashboard-table">
                    <thead>
                      <tr>
                        <th rowSpan="2" className="main-header">Version</th>
                        <th rowSpan="2" className="main-header">Total Steps</th>
                        <th rowSpan="2" className="main-header">Health Check</th>
                        <th colSpan="3" className="group-header">Deployment</th>
                        <th colSpan="3" className="group-header">Upgrade</th>
                        <th rowSpan="2" className="main-header">Config Audit</th>
                        <th rowSpan="2" className="main-header">Rollback Automation</th>
                        <th rowSpan="2" className="main-header">Assurance</th>
                        <th rowSpan="2" className="main-header">Geo</th>
                        <th rowSpan="2" className="main-header">Disaster Recovery</th>
                      </tr>
                      <tr>
                        <th className="sub-header">Pre-Deploy</th>
                        <th className="sub-header">Deploy</th>
                        <th className="sub-header">Post-Deploy</th>
                        <th className="sub-header">Pre-Check</th>
                        <th className="sub-header">Upgrade</th>
                        <th className="sub-header">Post-Check</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, idx) => (
                        <tr key={idx} className={idx % 2 === 0 ? 'row-even' : 'row-odd'}>
                          <td className="table-cell">{row.version}</td>
                          <td className="table-cell">{renderCell(row.totalSteps)}</td>
                          <td className="table-cell">{renderCell(row.healthCheck)}</td>
                          <td className="table-cell">{renderCell(row.preDeploy)}</td>
                          <td className="table-cell">{renderCell(row.deploy)}</td>
                          <td className="table-cell">{renderCell(row.postDeploy)}</td>
                          <td className="table-cell">{renderCell(row.preCheck)}</td>
                          <td className="table-cell">{renderCell(row.upgrade)}</td>
                          <td className="table-cell">{renderCell(row.postCheck)}</td>
                          <td className="table-cell">{renderCell(row.configAudit)}</td>
                          <td className="table-cell">{renderCell(row.rollbackAutomation)}</td>
                          <td className="table-cell">{renderCell(row.assurance)}</td>
                          <td className="table-cell">{renderCell(row.geo)}</td>
                          <td className="table-cell">{renderCell(row.disasterRecovery)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            selectedServer && (
              <div className="no-data-message">
                No data found for the selected server.
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Dashboard;
