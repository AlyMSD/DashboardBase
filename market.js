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
    <div style={{ padding: 20 }}>
      <button onClick={() => nav(-1)}>← Back</button>
      <h2>{market.name} – Nodes Breakdown</h2>

      <table style={{
        width: "100%",
        borderCollapse: "collapse",
        marginTop: 20,
        textAlign: "center"
      }}>
        <thead>
          <tr>
            <th rowSpan={2} style={{ background: "#FFFBEA" }}>Node ID</th>
            {Object.keys(market.results).map(slice => (
              <th key={slice}
                  colSpan={2}
                  style={{ background: "#FFF", border: "1px solid #eee" }}>
                {slice}
              </th>
            ))}
          </tr>
          <tr>
            {Object.keys(market.results).flatMap(slice => ([
              <th key={slice+"-tot"} style={{ background: "#E3F2FD" }}>Total</th>,
              <th key={slice+"-dep"} style={{ background: "#E8F5E9" }}>Deployed</th>
            ]))}
          </tr>
        </thead>
        <tbody>
          {market.nodes.map(n => (
            <tr key={n.id}>
              <td>{n.id}</td>
              {Object.values(n.results).flatMap((r, i) => ([
                <td key={n.id+"-tot"+i}>{r.total}</td>,
                <td key={n.id+"-dep"+i} style={{ color: "green" }}>
                  {r.deployed}
                </td>
              ]))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}