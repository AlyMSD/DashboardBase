  {/* Controls: Export, Items per Page */}
  <div
    style={{
      display: 'flex',
      justifyContent: 'space-between',   // <-- we’ll tweak this
      alignItems: 'center',
      marginBottom: 20,
      flexWrap: 'wrap',
      gap: '10px'
    }}
  >
    <button
      onClick={exportCSV}
      style={{
        padding: '10px 20px',
        background: '#3498db',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: '0.95em',
        transition: 'background-color 0.3s ease'
      }}
      …
    >
      Export as CSV
    </button>
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      … items‑per‑page control …
    </div>
  </div>
