import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiFilter, FiChevronUp, FiChevronDown } from 'react-icons/fi';

export default function MarketDetail() {
  const { id } = useParams();
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
      const init = res.data.reduce((acc, s) => ({ ...acc, [`${s.name}_status`]: '' }), {});
      setFilters({ id: '', ...init });
    });
    axios.get(`http://127.0.0.1:5000/api/markets/${id}`).then(res => setMarket(res.data));

    const onClick = e => {
      Object.entries(dropdownRefs.current).forEach(([key, el]) => {
        if (el && !el.contains(e.target)) setOpenFilter(o => (o === key ? null : o));
      });
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [id]);

  if (!market) return <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Loading…</div>;

  let nodes = market.nodes.filter(n => {
    if (!n.id.includes(filters.id)) return false;
    return slices.every(s => n.results[s.name]?.status.toLowerCase().includes(filters[`${s.name}_status`].toLowerCase()));
  });

  if (sortConfig.key) {
    const [sliceName] = sortConfig.key.split('_');
    nodes = nodes.sort((a, b) => {
      const ta = a.results[sliceName]?.timestamp ? new Date(a.results[sliceName].timestamp).getTime() : 0;
      const tb = b.results[sliceName]?.timestamp ? new Date(b.results[sliceName].timestamp).getTime() : 0;
      return sortConfig.direction === 'asc' ? ta - tb : tb - ta;
    });
  }

  const exportCSV = () => {
    const headers = ['Node ID', ...slices.flatMap(s => [`Status ${s.name}`, `Timestamp ${s.name}`])];
    const rows = nodes.map(n => [
      n.id,
      ...slices.flatMap(s => {
        const r = n.results[s.name] || {};
        return [r.status || 'n/a', r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'];
      })
    ]);
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${market.name}_nodes.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const toggleSort = sliceName => {
    const key = `${sliceName}_timestamp`;
    const dir = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction: dir });
  };

  return (
    <>
      <style>{`table{border-collapse:collapse;width:100%}th{border-bottom:2px solid #ccc;border-right:1px solid #ccc;background:#fafafa;padding:8px}tbody tr:hover{background:#f5f5f5}`}</style>
      <div style={{ padding: 24, fontFamily: 'sans-serif' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#1976d2', cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center' }}><FiArrowLeft style={{ marginRight: 8 }} />Back</button>
        <h2>{market.name} ({market.nf}) – Nodes</h2>
        <button onClick={exportCSV} style={{ margin: '12px 0', padding: '8px 16px', background: '#1976d2', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Export as CSV</button>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr><th rowSpan={2} style={{ position:'relative' }}>Node ID<FiFilter onClick={() => setOpenFilter('id')} style={{ marginLeft: 8, cursor:'pointer', color: filters.id?'#1976d2':'#000' }}/>{openFilter==='id'&&<div ref={el=>dropdownRefs.current['id']=el} style={{ position:'absolute',top:'100%', left:0,background:'#fff',border:'1px solid #ddd',padding:8,marginTop:4 }}><input autoFocus placeholder="Filter ID" value={filters.id} onChange={e=>setFilters(f=>({...f,id:e.target.value}))}/></div>}</th>{slices.map(s=><th key={s.name} colSpan={2} style={{ textAlign:'center',background:'#f0f0f0' }}>{s.name}</th>)}</tr>
              <tr>{slices.flatMap(s=>[
                <th key={`${s.name}-status`} style={{ background:'#eaeaea',textAlign:'center',position:'relative' }}>Status<FiFilter onClick={()=>setOpenFilter(`${s.name}_status`)} style={{ marginLeft:4,cursor:'pointer',color:filters[`${s.name}_status`]? '#1976d2':'#000' }}/>{openFilter===`${s.name}_status`&&<div ref={el=>dropdownRefs.current[`${s.name}_status`]=el} style={{ position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',background:'#fff',border:'1px solid #ddd',padding:8,marginTop:4 }}><input autoFocus placeholder="Filter" value={filters[`${s.name}_status`]} onChange={e=>setFilters(f=>({ ...f, [`${s.name}_status`]: e.target.value }))}/></div>}</th>,
                <th key={`${s.name}-ts`} style={{ background:'#eaeaea',textAlign:'center',cursor:'pointer' }} onClick={()=>toggleSort(s.name)}>Timestamp {sortConfig.key===`${s.name}_timestamp`?(sortConfig.direction==='asc'?<FiChevronUp/>:<FiChevronDown/>):null}</th>
              ])}</tr>
            </thead>
            <tbody>
              {nodes.map(n=>(
                <tr key={n.id}> <td>{n.id}</td>{slices.flatMap(s=>{const r=n.results[s.name]||{};const color=r.status==='online'?'#2e7d32':r.status==='degraded'?'#d32f2f':'#555';return[
                  <td key={`${n.id}-${s.name}-status`} style={{ color, textAlign:'center' }}>{r.status||'n/a'}</td>,
                  <td key={`${n.id}-${s.name}-ts`} style={{ textAlign:'center' }}>{r.timestamp?new Date(r.timestamp).toLocaleString():'—'}</td>
                ];})}</tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
