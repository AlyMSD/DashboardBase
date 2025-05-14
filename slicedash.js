// Dashboard.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // Assuming you're using react-router v6
import { FiFilter, FiChevronLeft, FiChevronRight } from 'react-icons/fi'; // Added pagination icons

// Mock data for local development if backend is not running
const MOCK_SLICES = [
    { name: 'Slice Alpha', total: 100, deployed: 75 },
    { name: 'Slice Beta', total: 200, deployed: 150 },
    { name: 'Slice Gamma', total: 50, deployed: 20 },
];

const MOCK_MARKETS = Array.from({ length: 150 }, (_, i) => ({
    id: i + 1,
    name: `Market Name ${i + 1}`,
    vendor: `Vendor ${String.fromCharCode(65 + (i % 5))}`, // A, B, C, D, E
    nf: `NF Type ${i % 3 === 0 ? 'Core' : i % 3 === 1 ? 'RAN' : 'Edge'}`,
    type: `Type ${i % 2 === 0 ? 'Urban' : 'Rural'}`,
    results: {
        'Slice Alpha': { total: Math.floor(Math.random() * 20) + 5, deployed: Math.floor(Math.random() * 20) },
        'Slice Beta': { total: Math.floor(Math.random() * 30) + 10, deployed: Math.floor(Math.random() * 30) },
        'Slice Gamma': { total: Math.floor(Math.random() * 10) + 2, deployed: Math.floor(Math.random() * 10) },
    }
}));

export default function Dashboard() {
  const [slices, setSlices] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({ id: '', market: '', vendor: '', nf: '', type: '' });
  const [openFilter, setOpenFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ slice: null, field: null, direction: null });
  const dropdownRefs = useRef({});
  const navigate = useNavigate();

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPageOptions = [10, 25, 50, 100];
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);

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
    const fetchSlices = axios.get('http://127.0.0.1:5000/api/slices')
      .then(res => setSlices(res.data.map(sanitize)))
      .catch(() => setSlices(MOCK_SLICES.map(sanitize)));

    const fetchMarkets = axios.get('http://127.0.0.1:5000/api/markets')
      .then(res => setMarkets(res.data.map(sanitize)))
      .catch(() => setMarkets(MOCK_MARKETS.map(sanitize)));

    Promise.all([fetchSlices, fetchMarkets]);

    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) {
          setOpenFilter(open => (open === key ? null : open));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMarkets = useMemo(() => {
    return markets.filter(m =>
        String(m.id || '').toLowerCase().includes(String(filters.id || '').toLowerCase()) &&
        (m.name || '').toLowerCase().includes(filters.market.toLowerCase()) &&
        (m.vendor || '').toLowerCase().includes(filters.vendor.toLowerCase()) &&
        (m.nf || '').toLowerCase().includes(filters.nf.toLowerCase()) &&
        (m.type || '').toLowerCase().includes(filters.type.toLowerCase())
    );
  }, [markets, filters]);

  const sortedMarkets = useMemo(() => {
    if (!sortConfig.field && !sortConfig.slice) return filteredMarkets;
    let sortableMarkets = [...filteredMarkets];
    sortableMarkets.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.slice && sortConfig.field) {
            aVal = a.results?.[sortConfig.slice]?.[sortConfig.field] || 0;
            bVal = b.results?.[sortConfig.slice]?.[sortConfig.field] || 0;
        } else {
            aVal = a[sortConfig.field] || '';
            bVal = b[sortConfig.field] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        }
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
    });
    return sortableMarkets;
  }, [filteredMarkets, sortConfig]);

  const currentTableData = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * itemsPerPage;
    const lastPageIndex = firstPageIndex + itemsPerPage;
    return sortedMarkets.slice(firstPageIndex, lastPageIndex);
  }, [currentPage, itemsPerPage, sortedMarkets]);

  const totalPages = Math.ceil(sortedMarkets.length / itemsPerPage);

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };
  const changePage = page => setCurrentPage(page);
  const handleFilterChange = (col, val) => {
    setFilters(f => ({ ...f, [col.toLowerCase()]: val }));
    setCurrentPage(1);
  };
  const handleSort = config => {
    setSortConfig(config);
    setCurrentPage(1);
  };

  const CircleProgress = ({ percent }) => {
    const radius = 50, stroke = 7;
    const normalized = radius - stroke * 2;
    const circ = normalized * 2 * Math.PI;
    const offset = circ - (percent / 100) * circ;
    return (
      <svg height={radius * 2} width={radius * 2}>
        <circle stroke="#e6e6e6" fill="transparent" strokeWidth={stroke} r={normalized} cx={radius} cy={radius} />
        <circle
          stroke="#1976d2"
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={`${circ} ${circ}`}
          style={{ strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease', strokeLinecap: 'round' }}
          r={normalized} cx={radius} cy={radius}
          transform={`rotate(-90 ${radius} ${radius})`}
        />
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="16" fill="#333">
          {Math.round(percent)}%
        </text>
      </svg>
    );
  };

  const exportCSV = () => {
    const headers = ['ID', 'Market', 'Vendor', 'NF', 'Type', ...slices.flatMap(s => [`Total ${s.name}`, `Deployed ${s.name}`])];
    const rows = sortedMarkets.map(m => [
      m.id, m.name || 'No Name', m.vendor, m.nf, m.type,
      ...slices.flatMap(s => {
        const r = m.results?.[s.name] || { total: 0, deployed: 0 };
        return [r.total, r.deployed];
      })
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'market_data.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const mainColumns = ['ID', 'Market', 'Vendor', 'NF', 'Type'];

  return (
    <div style={{ padding: 24, fontFamily: 'Arial, sans-serif', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      <h1 style={{ color: '#333', marginBottom: 24, textAlign: 'center' }}>VSOP Slice Dashboard</h1>

      {/* Slice Summary */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 30, justifyContent: 'center' }}>
        {slices.map(s => {
          const pct = s.total ? (s.deployed / s.total) * 100 : 0;
          return (
            <div key={s.name} style={{
              flex: '1 1 280px', maxWidth: 320, padding: '16px 20px',
              borderRadius: 12, boxShadow: '0 6px 12px rgba(0,0,0,0.08)', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ marginTop: 0, marginBottom: 8, color: '#2c3e50', fontSize: '1.1em' }}>{s.name}</h3>
                <div style={{ fontSize: '0.9em', color: '#555' }}>Total: <strong>{s.total}</strong></div>
                <div style={{ fontSize: '0.9em', color: '#555' }}>Deployed: <strong style={{ color: '#27ae60' }}>{s.deployed}</strong></div>
              </div>
              <CircleProgress percent={pct} />
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div style={{
  display: 'flex',
  alignItems: 'center',
  marginBottom: 20,
  gap: '16px',
  justifyContent: 'flex-start',
  flexWrap: 'wrap'
}}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <label htmlFor="itemsPerPage" style={{ fontSize: '0.9em', color: '#333' }}>Show:</label>
    <select
      id="itemsPerPage"
      value={itemsPerPage}
      onChange={handleItemsPerPageChange}
      style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.9em' }}
    >
      {itemsPerPageOptions.map(opt => (
        <option key={opt} value={opt}>{opt} entries</option>
      ))}
    </select>
  </div>
  <button
    onClick={exportCSV}
    style={{
      padding: '10px 20px',
      background: '#3498db',
      color: '#fff',
      border: 'none',
      borderRadius: 6,
      cursor: 'pointer',
      fontSize: '0.95em',
      transition: 'background-color 0.3s ease'
    }}
    onMouseOver={e => e.currentTarget.style.backgroundColor = '#2980b9'}
    onMouseOut={e => e.currentTarget.style.backgroundColor = '#3498db'}
  >
    Export as CSV
  </button>
</div>


      {/* Table */}
      <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 8, boxShadow: '0 4px 8px rgba(0,0,0,0.05)' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              {mainColumns.map(col => (
                <th
                  key={col}
                  rowSpan={slices.length ? 2 : 1}
                  style={{
                    position: 'relative',
                    padding: '12px 10px',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd',
                    borderRight: '1px solid #eee',
                    background: '#f9f9f9',
                    color: '#333',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const dir = sortConfig.field === col.toLowerCase() && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                    handleSort({ slice: null, field: col.toLowerCase(), direction: dir });
                  }}
                >
                  <span>{col}</span>
                  {sortConfig.field === col.toLowerCase() && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                  <button
                    onClick={e => { e.stopPropagation(); setOpenFilter(openFilter === col ? null : col); }}
                    style={{
                      marginLeft: 8,
                      background: filters[col.toLowerCase()] ? '#3498db' : '#efefef',
                      color: filters[col.toLowerCase()] ? '#fff' : '#333',
                      border: '1px solid #ccc',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      borderRadius: 4,
                      verticalAlign: 'middle'
                    }}
                  >
                    <FiFilter size={14} />
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
                        border: '1px solid #ccc',
                        borderRadius: 6,
                        padding: 10,
                        zIndex: 100,
                        boxShadow: '0 3px 6px rgba(0,0,0,0.1)'
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder={`Filter ${col}`}
                        value={filters[col.toLowerCase()]}
                        onChange={e => handleFilterChange(col, e.target.value)}
                        style={{ width: 180, padding: 8, borderRadius: 4, border: '1px solid #bbb' }}
                      />
                    </div>
                  )}
                </th>
              ))}
              {slices.map(s => (
                <th
                  key={s.name}
                  colSpan={2}
                  style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    background: '#f0f4f7',
                    borderBottom: '2px solid #ddd',
                    color: '#2c3e50',
                    fontWeight: '600'
                  }}
                >
                  {s.name}
                </th>
              ))}
            </tr>
            {slices.length > 0 && (
              <tr>
                {slices.flatMap(s => ([
                  <th
                    key={`${s.name}-total`}
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      background: '#f7f9fa',
                      borderRight: '1px solid #eee',
                      cursor: 'pointer',
                      color: '#444',
                      fontWeight: 'normal'
                    }}
                    onClick={() => {
                      const dir = sortConfig.slice === s.name && sortConfig.field === 'total' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                      handleSort({ slice: s.name, field: 'total', direction: dir });
                    }}
                  >
                    Total {sortConfig.slice === s.name && sortConfig.field === 'total' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>,
                  <th
                    key={`${s.name}-deployed`}
                    style={{
                      padding: '10px 6px',
                      textAlign: 'center',
                      background: '#f7f9fa',
                      cursor: 'pointer',
                      color: '#444',
                      fontWeight: 'normal',
                      borderRight: slices.length > 1 ? '1px solid #eee' : 'none'
                    }}
                    onClick={() => {
                      const dir = sortConfig.slice === s.name && sortConfig.field === 'deployed' && sortConfig.direction === 'asc' ? 'desc' : 'asc';
                      handleSort({ slice: s.name, field: 'deployed', direction: dir });
                    }}
                  >
                    Deployed {sortConfig.slice === s.name && sortConfig.field === 'deployed' ? (sortConfig.direction === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ]))}
              </tr>
            )}
          </thead>
          <tbody>
            {currentTableData.length > 0 ? currentTableData.map((m, idx) => (
              <tr key={`${m.id}-${idx}`} style={{ background: idx % 2 === 0 ? '#fff' : '#fdfdfd', borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.id}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>
                  <a
                    href="#"
                    onClick={e => { e.preventDefault(); navigate(`/market/${m.id}/${encodeURIComponent(m.nf)}/${encodeURIComponent(m.name)}`); }}
                    style={{ color: '#3498db', textDecoration: 'none', fontWeight: '500' }}
                    onMouseOver={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseOut={e => e.currentTarget.style.textDecoration = 'none'}
                  >
                    {m.name} ({m.nf})
                  </a>
                </td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.vendor}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid #eee' }}>{m.nf}</td>
                <td style={{ padding: '10px 8px', borderRight: '1px solid '#eee' }}>{m.type}</td>
                {slices.map((s, si) => {
                  const r = m.results?.[s.name] || {};
                  return ([
                    <td key={`${m.id}-${s.name}-t`} style={{ padding: '10px 8px', textAlign: 'right', borderRight: '1px solid #eee' }}>{r.total}</td>,
                    <td key={`${m.id}-${s.name}-d`} style={{ padding: '10px 8px', textAlign: 'right', color: '#27ae60', fontWeight: '500', borderRight: si === slices.length-1 ? 'none' : '1px solid #eee' }}>{r.deployed}</td>
                  ]);
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={mainColumns.length + slices.length * 2} style={{ textAlign: 'center', padding: 20, color: '#777' }}>
                  No data available for the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: '10px', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.9em', color: '#555' }}>
            Showing {Math.min(sortedMarkets.length, (currentPage - 1) * itemsPerPage + 1)}
            to {Math.min(currentPage * itemsPerPage, sortedMarkets.length)}
            of {sortedMarkets.length} entries
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => changePage(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                background: currentPage === 1 ? '#eee' : '#fff',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <FiChevronLeft size={16}/> Previous
            </button>
            <span style={{ padding: '8px 12px', fontSize: '0.9em', color: '#333', display: 'flex', alignItems: 'center' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => changePage(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #ccc',
                background: currentPage === totalPages ? '#eee' : '#fff',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              Next <FiChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
