import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices,   setSlices]   = useState([]);
  const [markets,  setMarkets]  = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/slices").then(r => setSlices(r.data));
    axios.get("http://localhost:5000/api/markets").then(r => setMarkets(r.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>

      {/* Slices summary bar */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
        {slices.map(s => {
          const pct = Math.round(s.pass / s.total * 100);
          return (
            <div key={s.name} style={{
                flex: 1,
                padding: 10,
                border: "1px solid #eee",
                borderRadius: 4
              }}>
              <strong>{s.name}</strong> <em>({pct}%)</em><br/>
              Pass: {s.pass} | Fail: {s.fail} | Not Started: {s.not_started}
            </div>
          );
        })}
      </div>

      {/* Markets table with two-row header */}
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>Market</th>
            <th rowSpan={2} style={{ background: "#E3F2FD" }}>Vendor</th>
            <th rowSpan={2} style={{ background: "#E8F5E9" }}>NF</th>
            <th rowSpan={2} style={{ background: "#F3E5F5" }}>Type</th>
            {Object.keys(markets[0]?.results || {}).map(slice => (
              <th key={slice}
                  colSpan={2}
                  style={{ background: "#FFF", border: "1px solid #eee" }}>
                {slice}
              </th>
            ))}
          </tr>
          <tr>
            {Object.keys(markets[0]?.results || {}).flatMap(slice => ([
              <th key={slice+"-pass"} style={{ background: "#E8F5E9" }}>Pass</th>,
              <th key={slice+"-fail"} style={{ background: "#FFEBEE" }}>Fail</th>
            ]))}
          </tr>
        </thead>
        <tbody>
          {markets.map(m => (
            <tr key={m.name}>
              <td>
                <a href="#"
                   onClick={e => { e.preventDefault(); nav(`/market/${m.name}`); }}
                   style={{ color: "#1976D2", textDecoration: "none" }}>
                  {m.name}
                </a>
              </td>
              <td>{m.vendor}</td>
              <td>{m.nf}</td>
              <td>{m.type}</td>
              {Object.values(m.results).flatMap((r, i) => ([
                <td key={i+"-p"} style={{ color: "green" }}>{r.pass}</td>,
                <td key={i+"-f"} style={{ color: r.fail ? "red" : "green" }}>
                  {r.fail}
                </td>
              ]))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}