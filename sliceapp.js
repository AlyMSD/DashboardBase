import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard    from "./Dashboard";
import MarketDetail from "./MarketDetail";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/market/:name" element={<MarketDetail />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;