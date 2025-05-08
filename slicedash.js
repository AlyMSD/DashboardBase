import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices,  setSlices]  = useState([]);
  const [markets, setMarkets] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:5000/api/slices")
         .then(r => setSlices(r.data));
    axios.get("http://localhost:5000/api/markets")
         .then(r => setMarkets(r.data));
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>

      {/* Slices summary bar */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
        {slices.map(s => (
          <div key={s.name} style={{
              flex:1, padding:10,
              border:"1px solid #eee",
              borderRadius:4,
              textAlign: "center"
            }}>
            <strong>{s.name}</strong><br/>
            Total: {s.total}<br/>
            Deployed: <span style={{ color: "green" }}>{s.deployed}</span>
          </div>
        ))}
      </div>

      {/* Markets table */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "center"
      }}>
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
              <th key={slice+"-tot"} style={{ background: "#E3F2FD" }}>Total</th>,
              <th key={slice+"-dep"} style={{ background: "#E8F5E9" }}>Deployed</th>
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
                <td key={i+"-tot"}>{r.total}</td>,
                <td key={i+"-dep"} style={{ color: "green" }}>{r.deployed}</td>
              ]))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}