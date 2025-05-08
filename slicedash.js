import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

// Simple circular progress: takes percent 0–100
function CircularProgress({ percent }) {
  const radius = 30;
  const stroke = 6;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const dash = `${(percent / 100) * circumference} ${circumference}`;

  return (
    <svg height={radius * 2} width={radius * 2}>
      <circle
        stroke="#eee"
        fill="transparent"
        strokeWidth={stroke}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <circle
        stroke="green"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={dash}
        strokeDashoffset={0}
        strokeLinecap="round"
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="12"
        fill="#333"
      >
        {percent}%
      </text>
    </svg>
  );
}

export default function Dashboard() {
  const [slices,  setSlices]  = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    vendor: "",
    nf: "",
    type: ""
  });
  const nav = useNavigate();

  useEffect(() => {
    axios.get("/api/slices").then(r => setSlices(r.data));
    axios.get("/api/markets").then(r => setMarkets(r.data));
  }, []);

  // apply all column filters
  const filtered = markets.filter(m =>
    String(m.id).includes(filters.id) &&
    m.name.toLowerCase().includes(filters.name.toLowerCase()) &&
    m.vendor.toLowerCase().includes(filters.vendor.toLowerCase()) &&
    m.nf.toLowerCase().includes(filters.nf.toLowerCase()) &&
    m.type.toLowerCase().includes(filters.type.toLowerCase())
  );

  const handleFilterChange = (col, value) => {
    setFilters(f => ({ ...f, [col]: value }));
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>

      {/* Circular summary bars */}
      <div style={{ display: "flex", gap: 20, marginBottom: 40 }}>
        {slices.map(s => {
          const pct = Math.round((s.deployed / s.total) * 100);
          return (
            <div key={s.name} style={{
                flex: 1,
                textAlign: "center",
                border: "1px solid #eee",
                borderRadius: 4,
                padding: 10
              }}>
              <strong>{s.name}</strong>
              <div style={{ marginTop: 8, marginBottom: 4 }}>
                <CircularProgress percent={pct} />
              </div>
              <div style={{ fontSize: 12 }}>
                {s.deployed} / {s.total}
              </div>
            </div>
          );
        })}
      </div>

      {/* Markets table with per-column filters */}
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
        <thead>
          {/* header row: big labels */}
          <tr>
            <th rowSpan={3} style={{ background: "#FFFBEA" }}>ID</th>
            <th rowSpan={3} style={{ background: "#FFFBEA" }}>Market</th>
            <th rowSpan={3} style={{ background: "#E3F2FD" }}>Vendor</th>
            <th rowSpan={3} style={{ background: "#E8F5E9" }}>NF</th>
            <th rowSpan={3} style={{ background: "#F3E5F5" }}>Type</th>
            {slices.map(s => (
              <th key={s.name} colSpan={2} style={{ background: "#FFF", border: "1px solid #eee" }}>
                {s.name}
              </th>
            ))}
          </tr>
          {/* slice subheaders */}
          <tr>
            {slices.flatMap(s => ([
              <th key={s.name+"-tot"} style={{ background: "#E3F2FD" }}>Total</th>,
              <th key={s.name+"-dep"} style={{ background: "#E8F5E9" }}>Deployed</th>
            ]))}
          </tr>
          {/* filter inputs */}
          <tr>
            <th>
              <input
                style={{ width: "80%" }}
                value={filters.id}
                onChange={e => handleFilterChange("id", e.target.value)}
                placeholder="Filter"
              />
            </th>
            <th>
              <input
                style={{ width: "80%" }}
                value={filters.name}
                onChange={e => handleFilterChange("name", e.target.value)}
                placeholder="Filter"
              />
            </th>
            <th>
              <input
                style={{ width: "80%" }}
                value={filters.vendor}
                onChange={e => handleFilterChange("vendor", e.target.value)}
                placeholder="Filter"
              />
            </th>
            <th>
              <input
                style={{ width: "80%" }}
                value={filters.nf}
                onChange={e => handleFilterChange("nf", e.target.value)}
                placeholder="Filter"
              />
            </th>
            <th>
              <input
                style={{ width: "80%" }}
                value={filters.type}
                onChange={e => handleFilterChange("type", e.target.value)}
                placeholder="Filter"
              />
            </th>
            {slices.map(s => (
              <th key={s.name+"-empty1"} colSpan={2} />
            ))}
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
                const r = m.results[s.name] || { total: 0, deployed: 0 };
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