import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices, setSlices]   = useState([]);
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
        {slices.map(s => {
          const pct = Math.round(s.pass / s.total * 100);
          return (
            <div key={s.name} style={{
                flex:1, padding:10, border:"1px solid #eee", borderRadius:4
              }}>
              <strong>{s.name}</strong> <em>({pct}%)</em><br/>
              Pass: {s.pass} | Fail: {s.fail} | Not started: {s.not_started}
            </div>
          );
        })}
      </div>

      {/* Markets table */}
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>
            <th>Market</th><th>Vendor</th><th>NF</th><th>Type</th>
            {Object.keys(markets[0]?.results||{}).map(slice => (
              <th key={slice+"p"}>{slice} Pass</th>
            ))}
            {Object.keys(markets[0]?.results||{}).map(slice => (
              <th key={slice+"f"}>{slice} Fail</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {markets.map(m => (
            <tr key={m.name}>
              <td>
                <a href="#"
                   onClick={e => {e.preventDefault(); nav(`/market/${m.name}`);}}>
                  {m.name}
                </a>
              </td>
              <td>{m.vendor}</td>
              <td>{m.nf}</td>
              <td>{m.type}</td>
              {Object.values(m.results).map((r,i) => (
                <td key={i}>{r.pass}</td>
              ))}
              {Object.values(m.results).map((r,i) => (
                <td key={i+"f"} style={{ color: r.fail? "red":"green" }}>
                  {r.fail}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}