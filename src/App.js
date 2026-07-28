import React, { lazy, Suspense } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";

// Lazy load all page components for better performance
const Home = lazy(() => import("./legacy-pages/Home"));
const GamePage = lazy(() => import("./legacy-pages/Game"));
const Win = lazy(() => import("./legacy-pages/Win"));
const Lost = lazy(() => import("./legacy-pages/Lost"));
const Leaderboard = lazy(() => import("./legacy-pages/Leaderboard"));

// Loading component for suspense fallback
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: 'linear-gradient(135deg, #000000 0%, #0a0a0a 50%, #000000 100%)',
    color: '#ff4444',
    fontFamily: '"Courier New", monospace',
    fontSize: '1.2rem'
  }}>
    <div>
      <div style={{
        width: '40px',
        height: '40px',
        border: '4px solid #333',
        borderTop: '4px solid #ff4444',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '1rem'
      }}></div>
      Loading...
    </div>
  </div>
);

function App() {
  return (
    <Router>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="/game/:mysteryId" element={<GamePage />} />
          <Route path="/lost" element={<Lost />} />
          <Route path="/win" element={<Win />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
