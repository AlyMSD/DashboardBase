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

  const sanitize = obj => {
    if (obj === '' || obj === undefined) return null;
    if (obj && typeof obj === 'object') {
      const newObj = Array.isArray(obj) ? [] : {};
      Object.entries(obj).forEach(([key, val]) => { newObj[key] = sanitize(val); });
      return newObj;
    }
    return obj;
  };

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/slices').then(res => setSlices(res.data.map(sanitize)));
    axios.get('http://127.0.0.1:5000/api/markets').then(res => setMarkets(res.data.map(sanitize)));
    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) setOpenFilter(open => (open === key ? null : open));
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="#e6e6e6" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke="#1976d2"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease' }}
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
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'market_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>VSOP Slice Dashboard</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, margin: '16px 0' }}>
        {slices.map(s => {
          const percent = s.total ? (s.deployed / s.total) * 100 : 0;
          return (
            <div
              key={s.name}
              style={{ flex: '1 1 260px', padding: 16, borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.05)', background: '#fff', display: 'flex', alignItems: 'center' }}>
              <div style={{ marginRight: 16 }}><CircleProgress percent={percent} /></div>
              <div>
                <h3>{s.name}</h3>
                <div>Total: <strong>{s.total}</strong></div>
                <div>Deployed: <strong style={{ color: '#2e7d32' }}>{s.deployed}</strong></div>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={exportCSV} style={{ marginBottom: 12, padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        Export as CSV
      </button>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['ID', 'Market', 'Vendor', 'NF', 'Type'].map(col => (
                <th
                  key={col}
                  rowSpan={2}
                  style={{ position: 'relative', padding: 8, textAlign: 'left', borderBottom: '2px solid #ccc', borderRight: '1px solid #ccc', background: '#fafafa' }}>
                  <span>{col}</span>
                  <button
                    onClick={() => setOpenFilter(openFilter === col ? null : col)}
                    style={{ marginLeft: 4, background: filters[col.toLowerCase()] ? '#1976d2' : 'none', color: filters[col.toLowerCase()] ? '#fff' : '#000', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4 }}>
                    <FiFilter />
                  </button>
                  {openFilter === col && (
                    <div ref={el => (dropdownRefs.current[col] = el)} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8, zIndex: 10 }}>
                      <input
                        type="text"
                        autoFocus
                        placeholder={`Filter ${col}`}
                        value={filters[col.toLowerCase()]}
                        onChange={e => setFilters(f => ({ ...f, [col.toLowerCase()]: e.target.value.toLowerCase() }))}
                        style={{ width: 160, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                      />
                    </div>
                  )}
                </th>
              ))}
              {slices.map(s => (
                <th key={s.name} colSpan={2} style={{ padding: 8, textAlign: 'center', background: '#f0f0f0', borderBottom: '2px solid #ccc' }}>{s.name}</th>
              ))}
            </tr>
            <tr>
              {slices.flatMap(s => [
                <th
                  key={`${s.name}-total`}
                  style={{ padding: 6, textAlign: 'center', background: '#eaeaea', borderRight: '1px solid #ccc', cursor: 'pointer' }}
                  onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'total' ? { slice: s.name, field: 'total', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'total', direction: 'asc' })}>
                  Total {sortConfig.slice === s.name && sortConfig.field === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>,
                <th
                  key={`${s.name}-deployed`}
                  style={{ padding: 6, textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }}
                  onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'deployed' ? { slice: s.name, field: 'deployed', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'deployed', direction: 'asc' })}>
                  Deployed {sortConfig.slice === s.name && sortConfig.field === 'deployed' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ])}
            </tr>
          </thead>
          <tbody>
            {sortMarkets(markets.filter(applyFilters)).map(m => (
              <tr key={`${m.id}-${m.nf}-${encodeURIComponent(m.name)}`}>  
                <td style={{ padding: 8 }}>{m.id}</td>
                <td style={{ padding: 8 }}>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); navigate(`/market/${m.id}/${encodeURIComponent(m.nf)}/${encodeURIComponent(m.name)}`); }}
                    style={{ color: '#1976d2', textDecoration: 'none' }}>
                    {m.name} ({m.nf})
                  </a>
                </td>
                <td style={{ padding: 8 }}>{m.vendor}</td>
                <td style={{ padding: 8 }}>{m.nf}</td>
                <td style={{ padding: 8 }}>{m.type}</td>
                {slices.map(s => {
                  const r = m.results?.[s.name] || {};
                  return [
                    <td key={`${m.id}-${s.name}-tot`} style={{ padding: 8, textAlign: 'right' }}>{r.total || 0}</td>,
                    <td key={`${m.id}-${s.name}-dep`} style={{ padding: 8, textAlign: 'right', color: '#2e7d32' }}>{r.deployed || 0}</td>
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
