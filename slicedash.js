import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiFilter } from 'react-icons/fi';

export default function Dashboard() {
  const [slices, setSlices] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({ id: '', market: '', vendor: '', nf: '', type: '' });
  const [openFilter, setOpenFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ slice: null, field: null, direction: null });
  const dropdownRefs = useRef({});
  const navigate = useNavigate();

  // Utility to replace empty values with null
  const sanitize = obj => {
    if (obj === '' || obj === undefined) return null;
    if (obj && typeof obj === 'object') {
      const newObj = Array.isArray(obj) ? [] : {};
      Object.entries(obj).forEach(([key, val]) => {
        newObj[key] = sanitize(val);
      });
      return newObj;
    }
    return obj;
  };

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/slices').then(res => setSlices(res.data.map(sanitize)));
    axios.get('http://127.0.0.1:5000/api/markets').then(res => setMarkets(res.data.map(sanitize)));

    const handleClick = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) setOpenFilter(o => (o === key ? null : o));
      });
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const applyFilters = m =>
    String(m.id).includes(filters.id) &&
    (m.name || '').toLowerCase().includes(filters.market) &&
    (m.vendor || '').toLowerCase().includes(filters.vendor) &&
    (m.nf || '').toLowerCase().includes(filters.nf) &&
    (m.type || '').toLowerCase().includes(filters.type);

  const sortMarkets = data => {
    if (!sortConfig.slice || !sortConfig.field) return data;
    return [...data].sort((a, b) => {
      const aVal = a.results?.[sortConfig.slice]?.[sortConfig.field] || 0;
      const bVal = b.results?.[sortConfig.slice]?.[sortConfig.field] || 0;
      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const CircleProgress = ({ percent }) => {
    const radius = 40;
    const stroke = 8;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;
    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="#e6e6e6" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke="#1976d2"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease' }}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="14" fill="#333">
          {Math.round(percent)}%
        </text>
      </svg>
    );
  };

  const exportCSV = () => {
    const headers = ['ID', 'Market', 'Vendor', 'NF', 'Type', ...slices.flatMap(s => [`Total ${s.name}`, `Deployed ${s.name}`])];
    const rows = markets.filter(applyFilters).map(m => [
      m.id,
      m.name || 'No Name',
      m.vendor,
      m.nf,
      m.type,
      ...slices.flatMap(s => {
        const r = m.results?.[s.name] || { total: 0, deployed: 0 };
        return [r.total, r.deployed];
      })
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'market_data.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <style>{`table{border-collapse:collapse;width:100%}th{border-bottom:2px solid #ccc;border-right:1px solid #ccc;background:#fafafa;padding:8px}th:last-child{border-right:none}tbody tr:hover{background:#f5f5f5}`}</style>
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1>VSOP Slice Dashboard</h1>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '16px 0' }}>
          {slices.map(s => {
            const pct = s.total ? (s.deployed / s.total) * 100 : 0;
            return (
              <div key={s.name} style={{ flex: '1 1 260px', padding: 16, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.05)', background: '#fff', display: 'flex', alignItems: 'center' }}>
                <div style={{ marginRight: 16 }}><CircleProgress percent={pct} /></div>
                <div>
                  <h3>{s.name}</h3>
                  <p>Total: <strong>{s.total}</strong></p>
                  <p>Deployed: <strong style={{ color: '#2e7d32' }}>{s.deployed}</strong></p>
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={exportCSV} style={{ marginBottom: 12, padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Export as CSV</button>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {['ID','Market','Vendor','NF','Type'].map(col => (
                  <th key={col} rowSpan={2} style={{ position: 'relative', textAlign: 'left' }}>
                    {col}
                    <FiFilter onClick={() => setOpenFilter(openFilter === col ? null : col)} style={{ marginLeft: 4, cursor: 'pointer', color: filters[col.toLowerCase()] ? '#1976d2' : '#000' }} />
                    {openFilter === col && (
                      <div ref={el => (dropdownRefs.current[col] = el)} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8, zIndex: 10 }}>
                        <input type="text" autoFocus placeholder={`Filter ${col}`} value={filters[col.toLowerCase()]} onChange={e => setFilters(f => ({ ...f, [col.toLowerCase()]: e.target.value.toLowerCase() }))} style={{ width: 160, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
                      </div>
                    )}
                  </th>
                ))}
                {slices.map(s => <th key={s.name} colSpan={2} style={{ textAlign: 'center', background: '#f0f0f0' }}>{s.name}</th>)}
              </tr>
              <tr>
                {slices.flatMap(s => [
                  <th key={`${s.name}-tot`} style={{ padding: 6, textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }} onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'total' ? { slice: s.name, field: 'total', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'total', direction: 'asc' })}>
                    Total {sortConfig.slice === s.name && sortConfig.field === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>,
                  <th key={`${s.name}-dep`} style={{ padding: 6, textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }} onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'deployed' ? { slice: s.name, field: 'deployed', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'deployed', direction: 'asc' })}>
                    Deployed {sortConfig.slice === s.name && sortConfig.field === 'deployed' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ])}
              </tr>
            </thead>
            <tbody>
              {sortMarkets(markets.filter(applyFilters)).map(m => (
                <tr key={`${m.id}-${m.nf}`}>  {/* composite key */}
                  <td>{m.id}</td>
                  <td><a href="#" onClick={e => { e.preventDefault(); navigate(`/market/${m.id}`); }} style={{ color: '#1976d2', textDecoration: 'none' }}>{m.name} ({m.nf})</a></td>
                  <td>{m.vendor}</td>
                  <td>{m.nf}</td>
                  <td>{m.type}</td>
                  {slices.map(s => {
                    const r = m.results?.[s.name] || {};
                    return [
                      <td key={`${m.id}-${s.name}-tot`} style={{ textAlign: 'right' }}>{r.total || 0}</td>,
                      <td key={`${m.id}-${s.name}-dep`} style={{ textAlign: 'right', color: '#2e7d32' }}>{r.deployed || 0}</td>
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
