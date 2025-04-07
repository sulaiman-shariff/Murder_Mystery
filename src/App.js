import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Game2 from "./pages/Game2"; 
import Game3 from "./pages/Game3";
import Win from "./pages/Win"; // ✅ Import Game2
import Lost from "./pages/Lost";
import "./styles/App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/game" element={<Game />} />
        <Route path="/game2" element={<Game2 />} />  {/* ✅ Add Game2 route */}
        <Route path="/game3" element={<Game3 />} /> 
        <Route path="/lost" element={<Lost />} />
        <Route path="/win" element={<Win />} />
      </Routes>
    </Router>
  );
}

export default App;
