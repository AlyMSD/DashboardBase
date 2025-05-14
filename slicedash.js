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
    const radius = 50; // Increased radius for a bigger circle
    const stroke = 7;  // Adjusted stroke for better proportion
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (percent / 100) * circumference;
    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="#e6e6e6" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke="#1976d2" // Main progress color
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circumference} ${circumference}`}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.5s ease', strokeLinecap: 'round' }} // Added strokeLinecap
          r={normalizedRadius}
          cx={radius}
          cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`} // Start from the top
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fill="#333"> {/* Increased font size */}
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
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f8' }}> {/* Added background color for the page */}
      <h1 style={{ color: '#333', marginBottom: '24px' }}>VSOP Slice Dashboard</h1>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, margin: '20px 0' }}> {/* Increased gap */}
        {slices.map(s => {
          const percent = s.total ? (s.deployed / s.total) * 100 : 0;
          return (
            <div
              key={s.name}
              style={{
                flex: '1 1 280px', // Adjusted flex-basis
                padding: '16px 20px', // Adjusted padding
                borderRadius: 12, // Slightly more rounded corners
                boxShadow: '0 6px 12px rgba(0,0,0,0.08)', // Softened shadow
                background: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between', // This will push text to left, circle to right
              }}>
              <div> {/* Container for text content */}
                <h3 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e50' }}>{s.name}</h3>
                <div style={{ fontSize: '0.9em', color: '#555', marginBottom: 4 }}>Total: <strong>{s.total}</strong></div>
                <div style={{ fontSize: '0.9em', color: '#555' }}>Deployed: <strong style={{ color: '#27ae60' }}>{s.deployed}</strong></div> {/* Changed green color slightly */}
              </div>
              <div style={{ marginLeft: 16 }}> {/* Added marginLeft for spacing from text */}
                <CircleProgress percent={percent} />
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={exportCSV}
        style={{
          marginBottom: 20, // Increased margin
          padding: '10px 20px', // Increased padding
          background: '#3498db', // A slightly different blue
          color: '#fff',
          border: 'none',
          borderRadius: 6, // Slightly more rounded
          cursor: 'pointer',
          fontSize: '0.95em',
          transition: 'background-color 0.3s ease' // Smooth transition
        }}
        onMouseOver={e => e.currentTarget.style.backgroundColor = '#2980b9'}
        onMouseOut={e => e.currentTarget.style.backgroundColor = '#3498db'}
        >
        Export as CSV
      </button>
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}> {/* Added bg and shadow to table container */}
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {['ID', 'Market', 'Vendor', 'NF', 'Type'].map(col => (
                <th
                  key={col}
                  rowSpan={2}
                  style={{
                    position: 'relative',
                    padding: '12px 10px', // Adjusted padding
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd', // Lighter border
                    borderRight: '1px solid #eee', // Lighter border
                    background: '#f9f9f9', // Lighter header bg
                    color: '#333',
                    fontWeight: '600' // Bolder header text
                  }}>
                  <span>{col}</span>
                  <button
                    onClick={() => setOpenFilter(openFilter === col ? null : col)}
                    style={{
                      marginLeft: 8, // Increased margin
                      background: filters[col.toLowerCase()] ? '#3498db' : '#efefef', // Adjusted colors
                      color: filters[col.toLowerCase()] ? '#fff' : '#333',
                      border: '1px solid #ccc', // Added subtle border
                      cursor: 'pointer',
                      padding: '3px 5px', // Adjusted padding
                      borderRadius: 4,
                      verticalAlign: 'middle' // Align icon better
                    }}>
                    <FiFilter size={14} /> {/* Slightly larger icon */}
                  </button>
                  {openFilter === col && (
                    <div ref={el => (dropdownRefs.current[col] = el)} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #ccc', borderRadius: 6, padding: 10, zIndex: 10, boxShadow: '0 3px 6px rgba(0,0,0,0.1)' }}> {/* Enhanced dropdown shadow */}
                      <input
                        type="text"
                        autoFocus
                        placeholder={`Filter ${col}`}
                        value={filters[col.toLowerCase()]}
                        onChange={e => setFilters(f => ({ ...f, [col.toLowerCase()]: e.target.value.toLowerCase() }))}
                        style={{ width: 180, padding: 8, borderRadius: 4, border: '1px solid #bbb' }} // Improved input style
                      />
                    </div>
                  )}
                </th>
              ))}
              {slices.map(s => (
                <th key={s.name} colSpan={2} style={{ padding: '12px 8px', textAlign: 'center', background: '#f0f4f7', borderBottom: '2px solid #ddd', color: '#2c3e50', fontWeight: '600' }}>{s.name}</th> // Adjusted slice header style
              ))}
            </tr>
            <tr>
              {slices.flatMap(s => [
                <th
                  key={`${s.name}-total`}
                  style={{ padding: '10px 6px', textAlign: 'center', background: '#f7f9fa', borderRight: '1px solid #eee', cursor: 'pointer', color: '#444', fontWeight: 'normal' }} // Adjusted sub-header style
                  onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'total' ? { slice: s.name, field: 'total', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'total', direction: 'asc' })}>
                  Total {sortConfig.slice === s.name && sortConfig.field === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>,
                <th
                  key={`${s.name}-deployed`}
                  style={{ padding: '10px 6px', textAlign: 'center', background: '#f7f9fa', cursor: 'pointer', color: '#444', fontWeight: 'normal', borderRight: slices.length > 1 ? '1px solid #eee': 'none' }} // Adjusted sub-header style
                  onClick={() => setSortConfig(prev => prev.slice === s.name && prev.field === 'deployed' ? { slice: s.name, field: 'deployed', direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { slice: s.name, field: 'deployed', direction: 'asc' })}>
                  Deployed {sortConfig.slice === s.name && sortConfig.field === 'deployed' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                </th>
              ])}
            </tr>
          </thead>
          <tbody>
            {sortMarkets(markets.filter(applyFilters)).map((m, rowIndex) => (
              <tr key={`${m.id}-${m.nf}-${encodeURIComponent(m.name)}`} style={{ backgroundColor: rowIndex % 2 === 0 ? '#fff' : '#fdfdfd', borderBottom: '1px solid #eee' }}> {/* Alternating row colors */}
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.id}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); navigate(`/market/${m.id}/${encodeURIComponent(m.nf)}/${encodeURIComponent(m.name)}`); }}
                    style={{ color: '#3498db', textDecoration: 'none', fontWeight: '500' }} // Enhanced link style
                    onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                    >
                    {m.name} ({m.nf})
                  </a>
                </td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.vendor}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.nf}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.type}</td>
                {slices.map((s, sliceIndex) => {
                  const r = m.results?.[s.name] || {};
                  return [
                    <td key={`${m.id}-${s.name}-tot`} style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{r.total || 0}</td>,
                    <td key={`${m.id}-${s.name}-dep`} style={{ padding: '10px 8px', textAlign: 'right', color: '#27ae60', fontWeight: '500', borderRight: sliceIndex === slices.length -1 ? 'none' : '1px solid #eee' }}>{r.deployed || 0}</td> // Bolder deployed number
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
