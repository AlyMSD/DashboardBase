import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices,   setSlices]  = useState([]);
  const [markets,  setMarkets] = useState([]);
  const [filter,   setFilter]  = useState("");
  const nav = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/slices")
         .then(r => setSlices(r.data));
    axios.get("http://localhost:5000/api/markets")
         .then(r => setMarkets(r.data));
  }, []);

  const term = filter.toLowerCase();
  const filtered = markets.filter(m =>
    String(m.id).includes(term) ||
    m.name.toLowerCase().includes(term) ||
    m.vendor.toLowerCase().includes(term) ||
    m.nf.toLowerCase().includes(term) ||
    m.type.toLowerCase().includes(term)
  );

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>

      {/* Slices summary bar */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {slices.map(s => (
          <div key={s.name} style={{
              flex:1, padding:10,
              border:"1px solid #eee",
              borderRadius:4,
              textAlign:"center"
            }}>
            <strong>{s.name}</strong><br/>
            Total: {s.total}<br/>
            Deployed: <span style={{ color:"green" }}>{s.deployed}</span>
          </div>
        ))}
      </div>

      {/* Global filter */}
      <input
        type="text"
        placeholder="Search by ID, Market, Vendor, NF or Type"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          marginBottom: 20,
          boxSizing: "border-box"
        }}
      />

      {/* Markets table with Total/Deployed slice columns */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "center"
      }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>ID</th>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>Market</th>
            <th rowSpan={2} style={{ background: "#E3F2FD" }}>Vendor</th>
            <th rowSpan={2} style={{ background: "#E8F5E9" }}>NF</th>
            <th rowSpan={2} style={{ background: "#F3E5F5" }}>Type</th>
            {slices.map(s => (
              <th
                key={s.name}
                colSpan={2}
                style={{ background: "#FFF", border: "1px solid #eee" }}
              >
                {s.name}
              </th>
            ))}
          </tr>
          <tr>
            {slices.flatMap(s => ([
              <th key={s.name+"-tot"} style={{ background: "#E3F2FD" }}>Total</th>,
              <th key={s.name+"-dep"} style={{ background: "#E8F5E9" }}>Deployed</th>
            ]))}
          </tr>
        </thead>
        <tbody>
          {filtered.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); nav(`/market/${m.name}`); }}
                  style={{ color: "#1976D2", textDecoration: "none" }}
                >
                  {m.name}
                </a>
              </td>
              <td>{m.vendor}</td>
              <td>{m.nf}</td>
              <td>{m.type}</td>
              {slices.map((s, i) => {
                const r = m.results[s.name];
                return [
                  <td key={i+"-tot"}>{r.total}</td>,
                  <td key={i+"-dep"} style={{ color: "green" }}>{r.deployed}</td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}