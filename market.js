import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function MarketDetail() {
  const { name } = useParams();
  const [market, setMarket] = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/markets/${name}`)
         .then(r => setMarket(r.data));
  }, [name]);

  if (!market) return <div>Loading…</div>;

  return (
    <div style={{ padding:20 }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h2>{market.name} — Nodes</h2>
      <table style={{ width:"50%", borderCollapse:"collapse", marginTop:20 }}>
        <thead>
          <tr><th>Node ID</th><th>Status</th></tr>
        </thead>
        <tbody>
          {market.nodes.map(n => (
            <tr key={n.id}>
              <td>{n.id}</td>
              <td style={{ color: n.status==="fail"?"red":"green" }}>
                {n.status}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}