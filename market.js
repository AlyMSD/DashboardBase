import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function MarketDetail() {
  const { id, nf, name } = useParams();
  const [market, setMarket] = useState(null);
  const [slices, setSlices] = useState([]);
  const [filters, setFilters] = useState({ gnbDuid: '' });
  const [openFilter, setOpenFilter] = useState(null);
  const dropdownRefs = useRef({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const navigate = useNavigate();

  // define default slices to always display
  const defaultSliceNames = ['HERO', 'Public Safety', 'FWA-VBG'];

  useEffect(() => {
    // fetch configured slices and merge with defaults
    axios.get('http://127.0.0.1:5000/api/slices').then(res => {
      const apiSlices = res.data;
      const merged = defaultSliceNames.map(name => apiSlices.find(s => s.name === name) || { name });
      setSlices(merged);

      // init filters
      const init = merged.reduce(
        (acc, s) => ({ ...acc, [`${s.name}_status`]: '' }),
        { gnbDuid: '' }
      );
      setFilters(init);
    });

    // fetch market data
    axios.get(`http://127.0.0.1:5000/api/markets/${id}/${nf}/${name}`).then(res => setMarket(res.data));

    // click outside to close filters
    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) setOpenFilter(open => (open === key ? null : open));
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

  // filter nodes by gnbDuid and slice status
  let nodes = market.nodes.filter(n => {
    const filterVal = filters.gnbDuid.toLowerCase();
    if (!(n.gnbDuid || '').toString().toLowerCase().includes(filterVal)) return false;
    return slices.every(s => {
      const fv = filters[`${s.name}_status`].toLowerCase();
      const status = (n.Results?.[s.name]?.status || '').toLowerCase();
      return status.includes(fv);
    });
  });

  // sort nodes by selected key
  if (sortConfig.key) {
    const [prefix] = sortConfig.key.split('_');
    nodes.sort((a, b) => {
      let va, vb;
      if (prefix === 'GnbDuid') {
        va = a.gnbDuid || '';
        vb = b.gnbDuid || '';
      } else {
        va = a.Results?.[prefix]?.timestamp
          ? new Date(a.Results[prefix].timestamp).getTime()
          : 0;
        vb = b.Results?.[prefix]?.timestamp
          ? new Date(b.Results[prefix].timestamp).getTime()
          : 0;
      }
      if (va < vb) return sortConfig.direction === 'asc' ? -1 : 1;
      if (va > vb) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // CSV export
  const exportCSV = () => {
    const headers = ['GnbDuid', ...slices.flatMap(s => [`Status ${s.name}`, `Timestamp ${s.name}`])];
    const rows = nodes.map(n => [
      n.gnbDuid || 'NA',
      ...slices.flatMap(s => {
        const res = n.Results?.[s.name] || {};
        const status = res.status || 'NA';
        const ts = res.timestamp ? new Date(res.timestamp).toLocaleString() : 'NA';
        return [status, ts];
      })
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${market.name}_nodes.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = key => {
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
      <h2>{market.name} ({market.nf}) – Nodes</h2>
      <button
        onClick={exportCSV}
        style={{ margin: '12px 0', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}
      >
        Export as CSV
      </button>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', tableLayout: 'auto' }}>
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: 'relative',
                  padding: 8,
                  borderBottom: '2px solid #000',
                  borderRight: '1px solid #000',
                  background: '#fafafa',
                  textAlign: 'left'
                }}
                onClick={() => toggleSort('GnbDuid')}
              >
                GnbDuid
                <button
                  onClick={() => setOpenFilter('gnbDuid')}
                  style={{ marginLeft: 8, background: filters.gnbDuid ? '#1976d2' : 'none', color: filters.gnbDuid ? '#fff' : '#000', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 4 }}
                >
                  <FiFilter />
                </button>
                {openFilter === 'gnbDuid' && (
                  <div ref={el => (dropdownRefs.current['gnbDuid'] = el)} style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, background: '#fff', border: '1px solid #ddd', borderRadius: 4, padding: 8, zIndex: 10 }}>
                    <input
                      type="text"
                      autoFocus
                      placeholder="Filter GnbDuid"
                      value={filters.gnbDuid}
                      onChange={e => setFilters(f => ({ ...f, gnbDuid: e.target.value }))}
                      style={{ width: '100%', padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                    />
                  </div>
                )}
              </th>
              {slices.map((s, idx) => (
                <th
                  key={s.name}
                  colSpan={2}
                  style={{ padding: 8, textAlign: 'center', background: '#f0f0f0', borderBottom: '2px solid #000', borderRight: idx < slices.length - 1 ? '1px solid #000' : undefined }}
                >
                  {s.name}
                </th>
              ))}
            </tr>
            <tr>
              {slices.map((s, idx) => [
                <th key={`${s.name}-status`} style={{ padding: 8, textAlign: 'center', background: '#eaeaea', borderRight: '1px solid #000' }}>Status</th>,
                <th
                  key={`${s.name}-timestamp`}
                  style={{ padding: 8, textAlign: 'center', background: '#eaeaea', cursor: 'pointer', borderRight: idx < slices.length - 1 ? '1px solid #000' : undefined }}
                  onClick={() => toggleSort(`${s.name}_timestamp`)}
                >
                  Timestamp {sortConfig.key === `${s.name}_timestamp` && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                </th>
              ])}
            </tr>
          </thead>
          <tbody>
            {nodes.map((n, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 12, whiteSpace: 'nowrap' }}>{n.gnbDuid || 'NA'}</td>
                {slices.flatMap(s => {
                  const res = n.Results?.[s.name] || {};
                  const status = res.status || 'NA';
                  const color = status.toLowerCase() === 'online' ? '#2e7d32' : status.toLowerCase() === 'degraded' ? '#d32f2f' : '#555';
                  const tsText = res.timestamp ? new Date(res.timestamp).toLocaleString() : 'NA';
                  return [
                    <td key={`${idx}-${s.name}-status`} style={{ padding: 12, textAlign: 'center', whiteSpace: 'nowrap', color }}>{status}</td>,
                    <td key={`${idx}-${s.name}-timestamp`} style={{ padding: 12, textAlign: 'center', whiteSpace: 'nowrap' }}>{tsText}</td>
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
