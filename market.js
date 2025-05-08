import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function MarketDetail() {
  const { name } = useParams();
  const [market, setMarket] = useState(null);
  const [filter, setFilter] = useState("");
  const nav = useNavigate();

  useEffect(() => {
    axios.get(`/api/markets/${name}`)
         .then(r => setMarket(r.data));
  }, [name]);

  if (!market) return <div>Loading…</div>;

  const nodes = market.nodes.filter(n =>
    n.id.toLowerCase().includes(filter.toLowerCase())
  );

  // extract slice names
  const sliceNames = Object.keys(market.nodes[0]?.results || {});

  return (
    <div style={{ padding:20 }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h2>{market.name} – Nodes Breakdown</h2>

      {/* node filter */}
      <input
        type="text"
        placeholder="Search Node ID"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{ width:"100%", padding:8, margin:"20px 0" }}
      />

      <table style={{ width:"100%", borderCollapse:"collapse", textAlign:"center" }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background:"#FFFBEA" }}>Node ID</th>
            {sliceNames.map(sl => (
              <th key={sl} colSpan={2} style={{ background:"#FFF", border:"1px solid #eee" }}>
                {sl}
              </th>
            ))}
          </tr>
          <tr>
            {sliceNames.flatMap(sl => ([
              <th key={sl+"-status"} style={{ background:"#E3F2FD" }}>Status</th>,
              <th key={sl+"-ts"} style={{ background:"#E8F5E9" }}>Timestamp</th>
            ]))}
          </tr>
        </thead>
        <tbody>
          {nodes.map(n => (
            <tr key={n.id}>
              <td>{n.id}</td>
              {sliceNames.map(sl => {
                const r = n.results[sl] || { status: "-", timestamp: "-" };
                return [
                  <td key={n.id+sl+"-status"}>{r.status}</td>,
                  <td key={n.id+sl+"-ts"}>{r.timestamp}</td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}