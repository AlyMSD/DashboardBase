// MarketDetail.js
import React, { useEffect, useState, useRef, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiChevronUp, FiChevronDown, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

export default function MarketDetail() {
  const { id, nf, name } = useParams();
  const [market, setMarket] = useState(null);
  const [slices, setSlices] = useState([]);
  const [filters, setFilters] = useState({ gnbDuid: '' });
  const [openFilter, setOpenFilter] = useState(null);
  const dropdownRefs = useRef({});
  const [sortConfig, setSortConfig] = useState({ key: '', direction: '' });
  const navigate = useNavigate();

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPageOptions = [10, 25, 50, 100];
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);

  const defaultSliceNames = ['HERO', 'Public Safety', 'FWA-VBG'];

  useEffect(() => {
    axios.get('http://127.0.0.1:5000/api/slices').then(res => {
      const apiSlices = res.data;
      const merged = defaultSliceNames.map(nm => apiSlices.find(s => s.name === nm) || { name: nm });
      setSlices(merged);
      setFilters(merged.reduce(
        (acc, s) => ({ ...acc, [`${s.name}_status`]: '' }),
        { gnbDuid: '' }
      ));
    });
    axios.get(`http://127.0.0.1:5000/api/markets/${id}/${nf}/${name}`).then(res => setMarket(res.data));

    const handleClickOutside = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) setOpenFilter(open => (open === key ? null : open));
      });
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [id, nf, name]);

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setCurrentPage(1);
  };

  const filteredNodes = useMemo(() => {
  if (!market) return [];
  return market.nodes.filter(n => {
    const matchGnb = (n.gnbDuid || '')
      .toString()
      .toLowerCase()
      .includes(filters.gnbDuid.toLowerCase());
    const matchSlices = slices.length === 0 || slices.every(s => {
      const fv = (filters[`${s.name}_status`] || '').toLowerCase();
      const status = (n.Results?.[s.name]?.status || '').toLowerCase();
      return status.includes(fv);
    });
    return matchGnb && matchSlices;
  });
}, [market, filters, slices]);

const sortedNodes = useMemo(() => {
  const arr = [...filteredNodes];
  if (sortConfig.key) {
    const [prefix] = sortConfig.key.split('_');
    arr.sort((a, b) => {
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
  return arr;
}, [filteredNodes, sortConfig]);

const currentTableData = useMemo(() => {
  const start = (currentPage - 1) * itemsPerPage;
  return sortedNodes.slice(start, start + itemsPerPage);
}, [currentPage, itemsPerPage, sortedNodes]);

  const totalPages = Math.ceil(sortedNodes.length / itemsPerPage);

  const exportCSV = () => {
    const headers = ['GnbDuid', ...slices.flatMap(s => [`Status ${s.name}`, `Timestamp ${s.name}`])];
    const rows = sortedNodes.map(n => [
      n.gnbDuid || 'NA',
      ...slices.flatMap(s => {
        const r = n.Results?.[s.name] || {};
        return [r.status || 'NA', r.timestamp ? new Date(r.timestamp).toLocaleString() : 'NA'];
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

  const handleSort = key => {
    let dir = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') dir = 'desc';
    setSortConfig({ key, direction: dir });
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = e => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const changePage = page => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  if (!market) return <div style={{ padding: 24, fontFamily: 'sans-serif' }}><p>Loading…</p></div>;

  return (
    <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <FiArrowLeft style={{ marginRight: 8 }} /> Back
      </button>
      <h2>{market.name} ({market.nf}) – Nodes</h2>

      <div style={{ display: 'flex', alignItems: 'center', margin: '12px 0', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <label htmlFor="itemsPerPageDetail" style={{ fontSize: '0.9em', color: '#333' }}>Show:</label>
          <select
            id="itemsPerPageDetail"
            value={itemsPerPage}
            onChange={handleItemsPerPageChange}
            style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.9em' }}
          >
            {itemsPerPageOptions.map(opt => <option key={opt} value={opt}>{opt} entries</option>)}
          </select>
        </div>
        <button
          onClick={exportCSV}
          style={{
            marginLeft: 'auto',
            padding: '8px 16px',
            background: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer'
          }}
        >
          Export as CSV
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th
                rowSpan={2}
                style={{
                  position: 'relative',
                  padding: 8,
                  borderBottom: '2px solid #ccc',
                  borderRight: '1px solid #ccc',
                  background: '#fafafa',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
                onClick={() => handleSort('GnbDuid')}
              >
                GnbDuid
                {sortConfig.key === 'GnbDuid' && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                <button
                  onClick={e => { e.stopPropagation(); setOpenFilter(openFilter === 'gnbDuid' ? null : 'gnbDuid'); }}
                  style={{
                    marginLeft: 8,
                    background: filters.gnbDuid ? '#1976d2' : 'none',
                    color: filters.gnbDuid ? '#fff' : '#000',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 4,
                    borderRadius: 4
                  }}
                >
                  <FiFilter />
                </button>
                {openFilter === 'gnbDuid' && (
                  <div
                    ref={el => (dropdownRefs.current.gnbDuid = el)}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      marginTop: 4,
                      background: '#fff',
                      border: '1px solid #ddd',
                      borderRadius: 4,
                      padding: 8,
                      zIndex: 10
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <input
                      type="text"
                      autoFocus
                      placeholder="Filter GnbDuid"
                      value={filters.gnbDuid}
                      onChange={e => handleFilterChange('gnbDuid', e.target.value)}
                      style={{ width: 200, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                    />
                  </div>
                )}
              </th>
              {slices.map((s, i) => (
                <th
                  key={s.name}
                  colSpan={2}
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    background: '#f0f0f0',
                    borderBottom: '2px solid #ccc',
                    borderRight: i < slices.length - 1 ? '1px solid #ccc' : undefined
                  }}
                >
                  {s.name}
                </th>
              ))}
            </tr>
            <tr>
              {slices.flatMap((s, i) => ([
                <th
                  key={`${s.name}-status`}
                  style={{
                    position: 'relative',
                    padding: 8,
                    textAlign: 'center',
                    background: '#eaeaea',
                    borderRight: '1px solid #ccc'
                  }}
                >
                  Status
                  <button
                    onClick={e => { e.stopPropagation(); setOpenFilter(openFilter === `${s.name}_status` ? null : `${s.name}_status`); }}
                    style={{
                      marginLeft: 4,
                      background: filters[`${s.name}_status`] ? '#1976d2' : 'none',
                      color: filters[`${s.name}_status`] ? '#fff' : '#000',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 2,
                      borderRadius: 4
                    }}
                  >
                    <FiFilter />
                  </button>
                  {openFilter === `${s.name}_status` && (
                    <div
                      ref={el => (dropdownRefs.current[`${s.name}_status`] = el)}
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        marginTop: 4,
                        background: '#fff',
                        border: '1px solid #ddd',
                        borderRadius: 4,
                        padding: 8,
                        zIndex: 10
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        autoFocus
                        placeholder="Filter Status"
                        value={filters[`${s.name}_status`]}
                        onChange={e => handleFilterChange(`${s.name}_status`, e.target.value)}
                        style={{ width: 140, padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
                      />
                    </div>
                  )}
                </th>,
                <th
                  key={`${s.name}-timestamp`}
                  style={{
                    padding: 8,
                    textAlign: 'center',
                    background: '#eaeaea',
                    cursor: 'pointer',
                    borderRight: i < slices.length - 1 ? '1px solid #ccc' : undefined
                  }}
                  onClick={() => handleSort(`${s.name}_timestamp`)}
                >
                  Timestamp {sortConfig.key === `${s.name}_timestamp` && (sortConfig.direction === 'asc' ? <FiChevronUp /> : <FiChevronDown />)}
                </th>
              ]))}
            </tr>
          </thead>
          <tbody>
            {currentTableData.length > 0 ? currentTableData.map((n, idx) => (
              <tr key={`${n.gnbDuid}-${idx}`} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: 12 }}>{n.gnbDuid || 'NA'}</td>
                {slices.flatMap(s => {
                  const res = n.Results?.[s.name] || {};
                  const status = res.status || 'NA';
                  const color = status.toLowerCase() === 'online' ? '#2e7d32' : status.toLowerCase() === 'degraded' ? '#d32f2f' : '#555';
                  const ts = res.timestamp ? new Date(res.timestamp).toLocaleString() : 'NA';
                  return [
                    <td key={`${idx}-${s.name}-status`} style={{ padding: 12, textAlign: 'center', color }}>{status}</td>,
                    <td key={`${idx}-${s.name}-ts`} style={{ padding: 12, textAlign: 'center' }}>{ts}</td>
                  ];
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={1 + slices.length * 2} style={{ textAlign: 'center', padding: 20, color: '#777' }}>
                  No nodes available for the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, padding: 10, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: '0.9em', color: '#555' }}>
            Showing {Math.min(sortedNodes.length, (currentPage - 1) * itemsPerPage + 1)}
            to {Math.min(currentPage * itemsPerPage, sortedNodes.length)}
            of {sortedNodes.length} entries
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
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
