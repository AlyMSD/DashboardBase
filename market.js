import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function MarketDetail() {
  const { name } = useParams();
  const [market, setMarket] = useState(null);
  const [slices, setSlices] = useState([]);
  const [filters, setFilters] = useState({ id: '' });
  const [openFilter, setOpenFilter] = useState(null);
  const dropdownRefs = useRef({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/slices').then(res => {
      setSlices(res.data);
      const sliceFilterInit = res.data.reduce((acc, s) => {
        acc[`${s.name}_status`] = '';
        return acc;
      }, {});
      setFilters({ id: '', ...sliceFilterInit });
    });
    axios.get(`http://127.0.0.1:5000/api/markets/${name}`).then(res => setMarket(res.data));

    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) {
          setOpenFilter(of => (of === key ? null : of));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [name]);

  if (!market) return <div style={{ padding: 24, fontFamily: 'sans-serif' }}><p>Loading…</p></div>;

  let filteredNodes = market.nodes.filter(n => {
    if (!n.id.toLowerCase().includes(filters.id.toLowerCase())) return false;
    return slices.every(s => {
      const statusFilter = filters[`${s.name}_status`].toLowerCase();
      const status = (n.results[s.name]?.status || '').toLowerCase();
      return status.includes(statusFilter);
    });
  });

  if (sortConfig.key) {
    filteredNodes.sort((a, b) => {
      const [sliceName] = sortConfig.key.split('_');
      const ta = a.results[sliceName]?.timestamp ? new Date(a.results[sliceName].timestamp).getTime() : 0;
      const tb = b.results[sliceName]?.timestamp ? new Date(b.results[sliceName].timestamp).getTime() : 0;
      if (ta < tb) return sortConfig.direction === 'asc' ? -1 : 1;
      if (ta > tb) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const exportCSV = () => {
    const headers = ['Node ID', ...slices.flatMap(s => [`Status ${s.name}`, `Timestamp ${s.name}`])];
    const rows = filteredNodes.map(n => [
      n.id,
      ...slices.flatMap(s => {
        const res = n.results[s.name] || {};
        const ts = res.timestamp ? new Date(res.timestamp).toLocaleString() : '—';
        return [res.status || 'n/a', ts];
      })
    ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${market.name}_nodes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = sliceName => {
    const key = `${sliceName}_timestamp`;
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <>
      {/* Updated CSS to ensure font consistency */}
      <style>{`
        table { 
          border-collapse: collapse; 
          width: 100%; 
        }
          .sort-button {
            background: none;
            border: none;
            cursor: pointer;
            margin-left: 4px;
            display: inline-flex;
            align-items: center;
            font: inherit;
            color: inherit;
            padding: 0;
            }

        th { 
          border-bottom: 2px solid #ccc; 
          border-right: 1px solid #ccc; 
          background: #fafafa; 
          padding: 8px; 
        }
        th:last-child { 
          border-right: none; 
        }
        tbody tr:hover { 
          background-color: #f5f5f5; 
        }
        .sort-button { 
          background: none; 
          border: none; 
          cursor: pointer; 
          margin-left: 4px; 
          font-family: inherit; /* 🔥 Ensures font consistency */
        }
      `}</style>
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <button
          onClick={() => navigate(-1)}
          style={{ 
            background: 'none', 
            border: 'none', 
            color: '#1976d2', 
            display: 'flex', 
            alignItems: 'center', 
            cursor: 'pointer', 
            marginBottom: 16, 
            fontSize: 16 
          }}
        >
          <FiArrowLeft style={{ marginRight: 8 }} /> Back
        </button>

        <h2 style={{ marginBottom: 16 }}>{market.name} – Nodes</h2>

        <div style={{ marginBottom: 12 }}>
          <button
            onClick={exportCSV}
            style={{ 
              padding: '8px 16px', 
              border: 'none', 
              borderRadius: 4, 
              background: '#1976d2', 
              color: '#fff', 
              cursor: 'pointer' 
            }}
          >Export as CSV</button>
        </div>

        <div style={{ overflowX: 'auto', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', borderRadius: 6 }}>
          <table style={{ minWidth: 600 }}>
            <thead>
              <tr>
                <th rowSpan={2} style={{ position: 'relative', textAlign: 'left' }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    Node ID
                    <button 
                      onClick={() => setOpenFilter('id')} 
                      style={{ 
                        background: filters.id ? '#1976d2' : 'none', 
                        color: filters.id ? '#fff' : '#000', 
                        border: 'none', 
                        cursor: 'pointer', 
                        marginLeft: 8, 
                        padding: 4, 
                        borderRadius: 4 
                      }}
                    >
                      <FiFilter />
                    </button>
                  </div>
                  {openFilter === 'id' && (
                    <div ref={el => (dropdownRefs.current['id'] = el)} style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      marginTop: 4, 
                      background: '#fff', 
                      border: '1px solid #ddd', 
                      borderRadius: 4, 
                      padding: 8, 
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)', 
                      zIndex: 10 
                    }}>
                      <input 
                        type="text" 
                        autoFocus 
                        placeholder="Filter Node ID" 
                        value={filters.id}
                        onChange={e => setFilters(f => ({ ...f, id: e.target.value }))}
                        style={{ 
                          width: 200, 
                          padding: 6, 
                          borderRadius: 4, 
                          border: '1px solid #ccc' 
                        }} 
                      />
                    </div>
                  )}
                </th>
                {slices.map(s => (
                  <th key={s.name} colSpan={2} style={{ textAlign: 'center', background: '#f0f0f0' }}>{s.name}</th>
                ))}
              </tr>
              <tr>
                {slices.flatMap(s => [
                  <th key={`${s.name}-status`} style={{ position: 'relative', background: '#eaeaea', textAlign: 'center', padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      Status
                      <button 
                        onClick={() => setOpenFilter(`${s.name}_status`)} 
                        style={{ 
                          background: filters[`${s.name}_status`] ? '#1976d2' : 'none', 
                          color: filters[`${s.name}_status`] ? '#fff' : '#000', 
                          border: 'none', 
                          cursor: 'pointer', 
                          marginLeft: 4, 
                          padding: 2, 
                          borderRadius: 4 
                        }}
                      >
                        <FiFilter />
                      </button>
                    </div>
                    {openFilter === `${s.name}_status` && (
                      <div ref={el => (dropdownRefs.current[`${s.name}_status`] = el)} style={{ 
                        position: 'absolute', 
                        top: '100%', 
                        left: '50%', 
                        transform: 'translateX(-50%)', 
                        marginTop: 4, 
                        background: '#fff', 
                        border: '1px solid #ddd', 
                        borderRadius: 4, 
                        padding: 8, 
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)', 
                        zIndex: 10 
                      }}>
                        <input 
                          type="text" 
                          autoFocus 
                          placeholder="Filter Status" 
                          value={filters[`${s.name}_status`]}
                          onChange={e => setFilters(f => ({ ...f, [`${s.name}_status`]: e.target.value }))}
                          style={{ 
                            width: 140, 
                            padding: 6, 
                            borderRadius: 4, 
                            border: '1px solid #ccc' 
                          }} 
                        />
                      </div>
                    )}
                  </th>,
                  <th key={`${s.name}-timestamp`} style={{ background: '#eaeaea', textAlign: 'center', padding: 8 }}>
                    <button className="sort-button" onClick={() => toggleSort(s.name)}>
                      Timestamp {sortConfig.key === `${s.name}_timestamp` && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                    </button>
                  </th>
                ])}
              </tr>
            </thead>
            <tbody>
              {filteredNodes.map(n => (
                <tr key={n.id}>
                  <td style={{ padding: 12 }}>{n.id}</td>
                  {slices.flatMap(s => {
                    const res = n.results[s.name] || {};
                    const color = res.status === 'online' ? '#2e7d32' : res.status === 'degraded' ? '#d32f2f' : '#555';
                    const tsDisplay = res.timestamp ? new Date(res.timestamp).toLocaleString() : '—';
                    return [
                      <td key={`${n.id}-${s.name}-status`} style={{ padding: 12, textAlign: 'center', color }}>{res.status || 'n/a'}</td>,
                      <td key={`${n.id}-${s.name}-timestamp`} style={{ padding: 12, textAlign: 'center' }}>{tsDisplay}</td>
                    ];
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
