import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function MarketDetail() {
  const { id, nf, name } = useParams();
  const [market, setMarket] = useState(null);
  const [slices, setSlices] = useState([]);
  const [filters, setFilters] = useState({});
  const [openFilter, setOpenFilter] = useState(null);
  const dropdownRefs = useRef({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const navigate = useNavigate();

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/slices').then(res => {
      const dbSlices = res.data;
      const mandatory = ['HERO', 'Public Safety', 'FWA-VBG'];
      const fullSlices = [...dbSlices];
      mandatory.forEach(name => {
        if (!fullSlices.find(s => s.name === name)) {
          fullSlices.push({ name });
        }
      });
      setSlices(fullSlices);
      // initialize filters for each slice
      const initFilters = fullSlices.reduce((acc, s) => ({ ...acc, [`${s.name}_status`]: '' }), {});
      setFilters(initFilters);
    });

    axios
      .get(`http://127.0.0.1:5000/api/markets/${id}/${nf}/${name}`)
      .then(res => setMarket(res.data));

    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) {
          setOpenFilter(open => (open === key ? null : open));
        }
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, nf, name]);

  if (!market)
    return (
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <p>Loading…</p>
      </div>
    );

  // filter nodes by status filters
  let nodes = market.nodes.filter(n =>
    slices.every(s => {
      const filterVal = filters[`${s.name}_status`].toLowerCase();
      const status = (n.results[s.name]?.status || '').toLowerCase();
      return status.includes(filterVal);
    })
  );

  // sort nodes by selected slice timestamp
  if (sortConfig.key) {
    const [sliceName] = sortConfig.key.split('_');
    nodes.sort((a, b) => {
      const ta = a.results[sliceName]?.timestamp
        ? new Date(a.results[sliceName].timestamp).getTime()
        : 0;
      const tb = b.results[sliceName]?.timestamp
        ? new Date(a.results[sliceName].timestamp).getTime()
        : 0;
      return sortConfig.direction === 'asc' ? ta - tb : tb - ta;
    });
  }

  // export CSV with defaults for missing data
  const exportCSV = () => {
    const headers = slices.flatMap(s => [`Status ${s.name}`, `Timestamp ${s.name}`]);
    const rows = nodes.map(n =>
      slices.flatMap(s => {
        const res = n.results[s.name] || {};
        const status = res.status || 'NA';
        const ts = res.timestamp ? new Date(res.timestamp).toLocaleString() : 'NA';
        return [status, ts];
      })
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
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
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: 16 }}
      >
        <FiArrowLeft style={{ marginRight: 8 }} /> Back
      </button>
      <h2>
        {market.name} ({market.nf}) – Nodes
      </h2>
      <button onClick={exportCSV} style={{ margin: '12px 0', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
        Export as CSV
      </button>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              {slices.map(s => (
                <th key={s.name} colSpan={2} style={{ padding: 8, textAlign: 'center', background: '#f0f0f0', borderBottom: '2px solid #ccc' }}>
                  {s.name}
                </th>
              ))}
            </tr>
            <tr>
              {slices.flatMap(s => [
                <th key={`${s.name}-status`} style={{ position: 'relative', padding: 8, textAlign: 'center', background: '#eaeaea' }}>
                  Status
                  <button onClick={() => setOpenFilter(`${s.name}_status`)} style={{ marginLeft: 4, background: filters[`${s.name}_status`] ? '#1976d2' : 'none', color: filters[`${s.name}_status`] ? '#fff' : '#000', border: 'none', cursor: 'pointer', padding: 2, borderRadius: 4 }}>
                    <FiFilter />
                  </button>
                  {openFilter === `${s.name}_status` && (
                    <div ref={el => (dropdownRefs.current[`${s.name}_status`] = el)} style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8, zIndex: 10 }}>
                      <input type="text" autoFocus placeholder="Filter Status" value={filters[`${s.name}_status`]} onChange={e => setFilters(f => ({ ...f, [`${s.name}_status`]: e.target.value }))} style={{ width: 140, padding: 6, borderRadius: 4, border: '1px solid #ccc' }} />
                    </div>
                  )}
                </th>,
                <th key={`${s.name}-timestamp`} style={{ padding: 8, textAlign: 'center', background: '#eaeaea', cursor: 'pointer' }} onClick={() => toggleSort(s.name)}>
                  Timestamp {sortConfig.key === `${s.name}_timestamp` && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                </th>
              ])}
            </tr>
          </thead>
          <tbody>
            {nodes.map((n, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                {slices.flatMap(s => {
                  const res = n.results[s.name] || {};
                  const status = res.status || 'NA';
                  const tsText = res.timestamp ? new Date(res.timestamp).toLocaleString() : 'NA';
                  const color = status.toLowerCase() === 'online' ? '#2e7d32' : status.toLowerCase() === 'degraded' ? '#d32f2f' : '#555';
                  return [
                    <td key={`${idx}-${s.name}-status`} style={{ padding: 12, textAlign: 'center', color }}>
                      {status}
                    </td>,
                    <td key={`${idx}-${s.name}-timestamp`} style={{ padding: 12, textAlign: 'center' }}>
                      {tsText}
                    </td>
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
