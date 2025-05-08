import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";

export default function MarketDetail() {
  const { name } = useParams();
  const [market, setMarket]   = useState(null);
  const [filter, setFilter]   = useState("");
  const nav = useNavigate();

  useEffect(() => {
    axios.get(`http://localhost:5000/api/markets/${name}`)
         .then(r => setMarket(r.data));
  }, [name]);

  if (!market) return <div>Loading…</div>;

  // filter nodes by node id
  const filteredNodes = market.nodes.filter(n =>
    n.id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h2>{market.name} – Nodes</h2>

      {/* Filter input */}
      <input
        type="text"
        placeholder="Search Node ID"
        value={filter}
        onChange={e => setFilter(e.target.value)}
        style={{
          width: "100%",
          padding: 8,
          margin: "20px 0",
          boxSizing: "border-box"
        }}
      />

      {/* Nodes status table */}
      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        textAlign: "center"
      }}>
        <thead>
          <tr>
            <th style={{ background: "#FFFBEA" }}>Node ID</th>
            <th style={{ background: "#E3F2FD" }}>Status</th>
            <th style={{ background: "#E8F5E9" }}>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filteredNodes.map(n => (
            <tr key={n.id}>
              <td>{n.id}</td>
              <td>{n.status}</td>
              <td>{n.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}