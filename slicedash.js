import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slices, setSlices] = useState([]);
  const [markets, setMarkets] = useState([]);
  // per‐column filter values
  const [colFilters, setColFilters] = useState({
    id: "",
    name: "",
    vendor: "",
    nf: "",
    type: ""
  });
  // which filters are visible
  const [showFilters, setShowFilters] = useState({
    id: false,
    name: false,
    vendor: false,
    nf: false,
    type: false
  });
  const [sortCfg, setSortCfg] = useState({ slice: null, key: null, asc: true });
  const nav = useNavigate();

  useEffect(() => {
    axios.get("/api/slices").then(r => setSlices(r.data));
    axios.get("/api/markets").then(r => setMarkets(r.data));
  }, []);

  const onSort = (slice, key) => {
    setSortCfg(cfg =>
      cfg.slice === slice && cfg.key === key
        ? { ...cfg, asc: !cfg.asc }
        : { slice, key, asc: true }
    );
  };

  const toggleFilter = col =>
    setShowFilters(f => ({ ...f, [col]: !f[col] }));

  const onFilterChange = (col, value) =>
    setColFilters(f => ({ ...f, [col]: value }));

  // apply all active filters
  let list = markets.filter(m => {
    // for each column where filter text is non‐empty, require a match
    return (
      (colFilters.id === "" ||
        String(m.id).toLowerCase().includes(colFilters.id.toLowerCase())) &&
      (colFilters.name === "" ||
        m.name.toLowerCase().includes(colFilters.name.toLowerCase())) &&
      (colFilters.vendor === "" ||
        m.vendor.toLowerCase().includes(colFilters.vendor.toLowerCase())) &&
      (colFilters.nf === "" ||
        m.nf.toLowerCase().includes(colFilters.nf.toLowerCase())) &&
      (colFilters.type === "" ||
        m.type.toLowerCase().includes(colFilters.type.toLowerCase()))
    );
  });

  // then sort if needed
  if (sortCfg.slice) {
    list = [...list].sort((a, b) => {
      const ar = a.results[sortCfg.slice][sortCfg.key];
      const br = b.results[sortCfg.slice][sortCfg.key];
      return sortCfg.asc ? ar - br : br - ar;
    });
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>VSOP Slice Dashboard</h2>

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        {slices.map(s => (
          <div
            key={s.name}
            style={{
              flex: 1,
              padding: 10,
              border: "1px solid #eee",
              borderRadius: 4,
              textAlign: "center"
            }}
          >
            <strong>{s.name}</strong>
            <br />
            Total: {s.total}
            <br />
            Deployed: <span style={{ color: "green" }}>{s.deployed}</span>
          </div>
        ))}
      </div>

      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          textAlign: "center"
        }}
      >
        <thead>
          {/* Header row 1: fixed columns + slice names */}
          <tr>
            <th
              rowSpan={2}
              style={{ background: "#FFFBEA", cursor: "pointer" }}
              onClick={() => toggleFilter("id")}
            >
              ID
            </th>
            <th
              rowSpan={2}
              style={{ background: "#FFFBEA", cursor: "pointer" }}
              onClick={() => toggleFilter("name")}
            >
              Market
            </th>
            <th
              rowSpan={2}
              style={{ background: "#E3F2FD", cursor: "pointer" }}
              onClick={() => toggleFilter("vendor")}
            >
              Vendor
            </th>
            <th
              rowSpan={2}
              style={{ background: "#E8F5E9", cursor: "pointer" }}
              onClick={() => toggleFilter("nf")}
            >
              NF
            </th>
            <th
              rowSpan={2}
              style={{ background: "#F3E5F5", cursor: "pointer" }}
              onClick={() => toggleFilter("type")}
            >
              Type
            </th>
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

          {/* Header row 2: per‐slice sort controls */}
          <tr>
            {slices.flatMap(s => [
              <th
                key={s.name + "-tot"}
                style={{ background: "#E3F2FD", cursor: "pointer" }}
                onClick={() => onSort(s.name, "total")}
              >
                Total{" "}
                {sortCfg.slice === s.name && sortCfg.key === "total"
                  ? sortCfg.asc
                    ? "↑"
                    : "↓"
                  : ""}
              </th>,
              <th
                key={s.name + "-dep"}
                style={{ background: "#E8F5E9", cursor: "pointer" }}
                onClick={() => onSort(s.name, "deployed")}
              >
                Deployed{" "}
                {sortCfg.slice === s.name && sortCfg.key === "deployed"
                  ? sortCfg.asc
                    ? "↑"
                    : "↓"
                  : ""}
              </th>
            ])}
          </tr>

          {/* Header row 3: per‐column filter inputs */}
          <tr>
            {/* for each of the first five, if its filter is shown render an input */}
            {["id", "name", "vendor", "nf", "type"].map(col => (
              <th key={"filter-" + col}>
                {showFilters[col] && (
                  <input
                    type="text"
                    placeholder={`Filter ${col}`}
                    value={colFilters[col]}
                    onChange={e => onFilterChange(col, e.target.value)}
                    style={{ width: "90%", padding: "4px" }}
                  />
                )}
              </th>
            ))}
            {/* blank cells under slices */}
            {slices.flatMap(s => [
              <th key={s.name + "-filt-tot"} />,
              <th key={s.name + "-filt-dep"} />
            ])}
          </tr>
        </thead>

        <tbody>
          {list.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    nav(`/market/${m.name}`);
                  }}
                  style={{ color: "#1976D2", textDecoration: "none" }}
                >
                  {m.name}
                </a>
              </td>
              <td>{m.vendor}</td>
              <td>{m.nf}</td>
              <td>{m.type}</td>
              {slices.map(s => {
                const r = m.results[s.name] || { total: 0, deployed: 0 };
                return [
                  <td key={s.name + "-tot"}>{r.total}</td>,
                  <td key={s.name + "-dep"} style={{ color: "green" }}>
                    {r.deployed}
                  </td>
                ];
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
