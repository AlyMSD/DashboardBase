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
    axios.get('http://127.0.0.1:5000/api/slices').then(response => {
      const data = response.data.map(s => sanitize(s));
      setSlices(data);
    });

    axios.get('http://127.0.0.1:5000/api/markets').then(response => {
      const data = response.data.map(m => sanitize(m));
      setMarkets(data);
    });

    const onClick = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) {
          setOpenFilter(o => (o === key ? null : o));
        }
      });
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
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
      const aRes = a.results?.[sortConfig.slice] || {};
      const bRes = b.results?.[sortConfig.slice] || {};
      const aVal = aRes[sortConfig.field] || 0;
      const bVal = bRes[sortConfig.field] || 0;
      if (sortConfig.direction === 'asc') return aVal - bVal;
      if (sortConfig.direction === 'desc') return bVal - aVal;
      return 0;
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
      m.name,
      m.vendor,
      m.nf,
      m.type,
      ...slices.flatMap(s => {
        const r = m.results?.[s.name] || { total: 0, deployed: 0 };
        return [r.total, r.deployed];
      })
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'market_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <style>{`
        table { border-collapse: collapse; width: 100%; }
        th {
          border-bottom: 2px solid #ccc;
          border-right: 1px solid #ccc;
          background: #fafafa;
        }
        th:last-child { border-right: none; }
        tbody tr:hover { background-color: #f5f5f5; }
      `}</style>
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <h1 style={{ marginBottom: 16 }}>VSOP Slice Dashboard</h1>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          {slices.map(s => {
            const total = s.total || 0;
            const deployed = s.deployed || 0;
            const pct = total ? (deployed / total) * 100 : 0;
            return (
              <div
                key={s.name}
                style={{
                  flex: '1 1 260px',
                  padding: 16,
                  borderRadius: 8,
                  boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <div style={{ marginRight: 16 }}>
                  <CircleProgress percent={pct} />
                </div>
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <h3 style={{ margin: '0 0 8px' }}>{s.name}</h3>
                  <div>Total: <strong>{total}</strong></div>
                  <div>Deployed: <strong style={{ color: '#2e7d32' }}>{deployed}</strong></div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginBottom: 12 }}>
          <button
            onClick={exportCSV}
            style={{ padding: '8px 16px', border: 'none', borderRadius: 4, background: '#1976d2', color: '#fff', cursor: 'pointer' }}
          >
            Export as CSV
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                {['ID', 'Market', 'Vendor', 'NF', 'Type'].map(col => (
                  <th key={col} rowSpan={2} style={{ position: 'relative', textAlign: 'left', padding: '8px' }}>
                    <span>{col}</span>
                    <button
                      onClick={() => setOpenFilter(openFilter === col ? null : col)}
                      style={{
                        background: filters[col.toLowerCase()] ? '#1976d2' : 'none',
                        color: filters[col.toLowerCase()] ? '#fff' : '#000',
                        border: 'none',
                        cursor: 'pointer',
                        marginLeft: 4,
                        verticalAlign: 'middle',
                        padding: 2,
                        borderRadius: 4,
                      }}
                    >
                      <FiFilter />
                    </button>
                    {openFilter === col && (
                      <div
                        ref={el => (dropdownRefs.current[col] = el)}
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          marginTop: 4,
                          background: '#fff',
                          border: '1px solid #ddd',
                          borderRadius: 4,
                          padding: 8,
                          zIndex: 10,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        }}
                      >
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
                  <th key={s.name} colSpan={2} style={{ textAlign: 'center', padding: '8px', background: '#f0f0f0' }}>
                    {s.name}
                  </th>
                ))}
              </tr>
              <tr>
                {slices.flatMap(s => [
                  <th
                    key={`${s.name}-tot`}
                    style={{ padding: '6px', textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }}
                    onClick={() =>
                      setSortConfig(prev =>
                        prev.slice === s.name && prev.field === 'total'
                          ? { slice: s.name, field: 'total', direction: prev.direction === 'asc' ? 'desc' : 'asc' }
                          : { slice: s.name, field: 'total', direction: 'asc' }
                      )
                    }
                  >
                    Total {sortConfig.slice === s.name && sortConfig.field === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>,
                  <th
                    key={`${s.name}-dep`}
                    style={{ padding: '6px', textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }}
                    onClick(() =>
                      setSortConfig(prev =>
                        prev.slice === s.name && prev.field==='deployed'
                          ? { slice: s.name, field: 'deployed', direction: prev.direction==='asc' ? 'desc':'asc' }
                          : { slice: s.name, field: 'deployed', direction: 'asc' }
                      )
                    )
                  >
                    Deployed {sortConfig.slice===s.name && sortConfig.field==='deployed' ? (sortConfig.direction==='asc' ? '▲':'▼') : ''}
                  </th>
                ])}
              </tr>
            </thead>
            <tbody>
              {sortMarkets(markets.filter(applyFilters)).map(m => (
                <tr key={m.id}>
                  <td style={{ padding: 8 }}>{m.id}</td>
                  <td style={{ padding: 8 }}>
                    <a
                      onClick={e => {
                        e.preventDefault();
                        navigate(`/market/${m.name}`);
                      }}
                      href="#"
                      style={{ color: '#1976d2', textDecoration: 'none' }}
                    >
                      {m.name}
                    </a>
                  </td>
                  <td style={{ padding: 8 }}>{m.vendor}</td>
                  <td style={{ padding: 8 }}>{m.nf}</td>
                  <td style={{ padding: 8 }}>{m.type}</td>
                  {slices.map(s => {
                    const r = m.results?.[s.name] || {};
                    const totalVal = r.total || 0;
                    const depVal = r.deployed || 0;
                    return [
                      <td key={`${m.id}-${s.name}-tot`} style={{ padding: 8, textAlign: 'right' }}>{totalVal}</td>,
                      <td key={`${m.id}-${s.name}-dep`} style={{ padding: 8, textAlign: 'right', color: '#2e7d32' }}>{depVal}</td>
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
