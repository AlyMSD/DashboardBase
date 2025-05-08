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
  const [slices, setSlices] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [filters, setFilters] = useState({
    id: "",
    name: "",
    vendor: "",
    nf: "",
    type: ""
  });
  const [visibleFilters, setVisibleFilters] = useState({
    id: false,
    name: false,
    vendor: false,
    nf: false,
    type: false
  });
  const nav = useNavigate();

  useEffect(() => {
    axios.get("/api/slices").then(r => setSlices(r.data));
    axios.get("/api/markets").then(r => setMarkets(r.data));
  }, []);

  // toggle filter visibility for a column
  const toggleFilter = col => {
    setVisibleFilters(v => ({ ...v, [col]: !v[col] }));
  };

  const handleFilterChange = (col, value) => {
    setFilters(f => ({ ...f, [col]: value }));
  };

  // apply all column filters
  const filtered = markets.filter(m =>
    String(m.id).includes(filters.id) &&
    m.name.toLowerCase().includes(filters.name.toLowerCase()) &&
    m.vendor.toLowerCase().includes(filters.vendor.toLowerCase()) &&
    m.nf.toLowerCase().includes(filters.nf.toLowerCase()) &&
    m.type.toLowerCase().includes(filters.type.toLowerCase())
  );

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

      {/* Markets table with clickable headers to toggle filters */}
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
        <thead>
          <tr>
            <th onClick={() => toggleFilter('id')} style={{ background: "#FFFBEA", cursor: 'pointer' }}>ID</th>
            <th onClick={() => toggleFilter('name')} style={{ background: "#FFFBEA", cursor: 'pointer' }}>Market</th>
            <th onClick={() => toggleFilter('vendor')} style={{ background: "#E3F2FD", cursor: 'pointer' }}>Vendor</th>
            <th onClick={() => toggleFilter('nf')} style={{ background: "#E8F5E9", cursor: 'pointer' }}>NF</th>
            <th onClick={() => toggleFilter('type')} style={{ background: "#F3E5F5", cursor: 'pointer' }}>Type</th>
            {slices.map(s => (
              <th key={s.name} colSpan={2} style={{ background: "#FFF", border: "1px solid #eee" }}>
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
          {/* render filter inputs if visible */}
          <tr>
            {['id','name','vendor','nf','type'].map(col => (
              <th key={col}>
                {visibleFilters[col] && (
                  <input
                    style={{ width: '80%' }}
                    value={filters[col]}
                    onChange={e => handleFilterChange(col, e.target.value)}
                    placeholder="Filter"
                  />
                )}
              </th>
            ))}
            {slices.map(s => (
              <th key={s.name+"-empty"} colSpan={2} />
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
                  <td key={`${s.name}-tot`}>{r.total}</td>,
                  <td key={`${s.name}-dep`} style={{ color: 'green' }}>{r.deployed}</td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
