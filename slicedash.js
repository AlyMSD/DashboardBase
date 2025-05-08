import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices,   setSlices]   = useState([]);
  const [markets,  setMarkets]  = useState([]);
  const [filter,   setFilter]   = useState("");
  const [sortCfg,  setSortCfg]  = useState({ slice: null, key: null, asc: true });
  const nav = useNavigate();

  useEffect(() => {
    axios.get("/api/slices").then(r => setSlices(r.data));
    axios.get("/api/markets").then(r => setMarkets(r.data));
  }, []);

  // apply filter
  let list = markets.filter(m => {
    const t = filter.toLowerCase();
    return (
      String(m.id).includes(t) ||
      m.name.toLowerCase().includes(t) ||
      m.vendor.toLowerCase().includes(t) ||
      m.nf.toLowerCase().includes(t) ||
      m.type.toLowerCase().includes(t)
    );
  });

  // apply sort if set
  if (sortCfg.slice) {
    list = [...list].sort((a, b) => {
      const ar = a.results[sortCfg.slice][sortCfg.key];
      const br = b.results[sortCfg.slice][sortCfg.key];
      return sortCfg.asc ? ar - br : br - ar;
    });
  }

  const onSort = (slice, key) => {
    setSortCfg(cfg =>
      cfg.slice === slice && cfg.key === key
        ? { ...cfg, asc: !cfg.asc }
        : { slice, key, asc: true }
    );
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {slices.map(s => (
          <div key={s.name} style={{
              flex:1, padding:10, border:"1px solid #eee",
              borderRadius:4, textAlign:"center"
            }}>
            <strong>{s.name}</strong><br/>
            Total: {s.total}<br/>
            Deployed: <span style={{ color:"green" }}>{s.deployed}</span>
          </div>
        ))}
      </div>

      {/* filter */}
      <input
        type="text"
        placeholder="Search by ID, Market, Vendor, NF or Type"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ width:"100%", padding:8, marginBottom:20 }}
      />

      <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>ID</th>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>Market</th>
            <th rowSpan={2} style={{ background: "#E3F2FD" }}>Vendor</th>
            <th rowSpan={2} style={{ background: "#E8F5E9" }}>NF</th>
            <th rowSpan={2} style={{ background: "#F3E5F5" }}>Type</th>
            {slices.map(s => (
              <th key={s.name} colSpan={2}
                  style={{ background:"#FFF", border:"1px solid #eee" }}>
                {s.name}
              </th>
            ))}
          </tr>
          <tr>
            {slices.flatMap(s => ([
              <th
                key={s.name+"-tot"}
                style={{ background:"#E3F2FD", cursor:"pointer" }}
                onClick={() => onSort(s.name, "total")}
              >
                Total {sortCfg.slice===s.name && sortCfg.key==="total"? (sortCfg.asc?"↑":"↓"):""}
              </th>,
              <th
                key={s.name+"-dep"}
                style={{ background:"#E8F5E9", cursor:"pointer" }}
                onClick={() => onSort(s.name, "deployed")}
              >
                Deployed {sortCfg.slice===s.name && sortCfg.key==="deployed"? (sortCfg.asc?"↑":"↓"):""}
              </th>
            ]))}
          </tr>
        </thead>
        <tbody>
          {list.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>
                <a href="#"
                   onClick={e => { e.preventDefault(); nav(`/market/${m.name}`); }}
                   style={{ color:"#1976D2", textDecoration:"none" }}>
                  {m.name}
                </a>
              </td>
              <td>{m.vendor}</td>
              <td>{m.nf}</td>
              <td>{m.type}</td>
              {slices.map(s => {
                const r = m.results[s.name] || { total:0, deployed:0 };
                return [
                  <td key={s.name+"-tot"}>{r.total}</td>,
                  <td key={s.name+"-dep"} style={{ color:"green" }}>{r.deployed}</td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}