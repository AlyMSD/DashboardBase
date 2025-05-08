--- src/Dashboard.js
+++ src/Dashboard.js
@@ return (
-      {/* --- Markets Table --- */}
-      <table style={{ width: "100%", borderCollapse: "collapse" }}>
-        <thead>
-          <tr>
-            <th>Market</th>
-            <th>Vendor</th>
-            <th>NF</th>
-            <th>Type</th>
-            {/* dynamically show slice columns */}
-            {Object.keys(markets[0]?.results || {}).map(slice => (
-              <th key={slice}>{slice} Pass</th>
-            ))}
-            {Object.keys(markets[0]?.results || {}).map(slice => (
-              <th key={slice+"f"}>{slice} Fail</th>
-            ))}
-          </tr>
-        </thead>
-        <tbody>
-          {markets.map(m => (
-            <tr key={m.name}>
-              <td>
-                <a
-                  href="#"
-                  onClick={e => { e.preventDefault(); nav(`/market/${m.name}`); }}
-                >
-                  {m.name}
-                </a>
-              </td>
-              <td>{m.vendor}</td>
-              <td>{m.nf}</td>
-              <td>{m.type}</td>
-              {Object.values(m.results).map((r,i) => (
-                <td key={i}>{r.pass}</td>
-              ))}
-              {Object.values(m.results).map((r,i) => (
-                <td key={i+"f"} style={{ color: r.fail ? "red" : "green" }}>
-                  {r.fail}
-                </td>
-              ))}
-            </tr>
-          ))}
-        </tbody>
-      </table>
+      {/* --- Markets Table --- */}
+      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "center" }}>
+        <thead>
+          <tr>
+            <th rowSpan={2} style={{ background: "#FFFBEA" }}>Market</th>
+            <th rowSpan={2} style={{ background: "#E3F2FD" }}>Vendor</th>
+            <th rowSpan={2} style={{ background: "#E8F5E9" }}>NF</th>
+            <th rowSpan={2} style={{ background: "#F3E5F5" }}>Type</th>
+            {Object.keys(markets[0]?.results || {}).map(slice => (
+              <th
+                key={slice}
+                colSpan={2}
+                style={{ background: "#FFF", border: "1px solid #eee" }}
+              >
+                {slice}
+              </th>
+            ))}
+          </tr>
+          <tr>
+            {Object.keys(markets[0]?.results || {}).flatMap(slice => ([
+              <th key={slice+"-pass"} style={{ background: "#E8F5E9" }}>Pass</th>,
+              <th key={slice+"-fail"} style={{ background: "#FFEBEE" }}>Fail</th>
+            ]))}
+          </tr>
+        </thead>
+        <tbody>
+          {markets.map(m => (
+            <tr key={m.name}>
+              <td>
+                <a
+                  href="#"
+                  onClick={e => { e.preventDefault(); nav(`/market/${m.name}`); }}
+                  style={{ color: "#1976D2", textDecoration: "none" }}
+                >
+                  {m.name}
+                </a>
+              </td>
+              <td>{m.vendor}</td>
+              <td>{m.nf}</td>
+              <td>{m.type}</td>
+              {Object.values(m.results).flatMap((r, i) => ([
+                <td key={i+"-p"} style={{ color: "green" }}>{r.pass}</td>,
+                <td key={i+"-f"} style={{ color: r.fail ? "red" : "green" }}>
+                  {r.fail}
+                </td>
+              ]))}
+            </tr>
+          ))}
+        </tbody>
+      </table>