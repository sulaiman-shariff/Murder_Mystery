import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Win.css";

function Win() {
  const [stats, setStats] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [playerName, setPlayerName] = useState("Unknown Detective");
  const navigate = useNavigate();

  // ✅ Format seconds into "X min Y sec"
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} sec`;
  };

  useEffect(() => {
    // Fetch game stats
    const gameStats = JSON.parse(localStorage.getItem("gameStats")) || [];
    const name = localStorage.getItem("playerName") || "Unknown Detective";
    const storedLeaderboard = JSON.parse(localStorage.getItem("leaderboard")) || [];

    setStats(gameStats);
    setPlayerName(name);
    setLeaderboard(storedLeaderboard);
  }, []);

  useEffect(() => {
    if (stats.length === 3) {
      const totalTime = stats.reduce((acc, curr) => acc + curr.time, 0);
      const newScore = {
        id: Date.now(),
        name: playerName,
        time: totalTime,
      };

      const updatedLeaderboard = [...leaderboard, newScore]
        .sort((a, b) => a.time - b.time)
        .slice(0, 12); // limit to top 12

      setLeaderboard(updatedLeaderboard);
      localStorage.setItem("leaderboard", JSON.stringify(updatedLeaderboard));
    }
  }, [stats]);

  const totalTime = stats.reduce((acc, curr) => acc + curr.time, 0);

  return (
    <div>
      <div className="matrix-bg"></div>

      <div className="win-container">
        <h1 className="win-title">🎉 Congratulations, Detective! 🎉</h1>
        <p className="win-message">You have solved all the mysteries!</p>

        <div className="stats-container">
          <h2>Your Stats:</h2>
          <ul>
            {stats.map((mystery, index) => (
              <li key={index}>
                <strong>Mystery {mystery.id}</strong> - Time Taken: {formatTime(mystery.time)}
              </li>
            ))}
          </ul>
          <h3>
            Total Time ({playerName}): {formatTime(totalTime)}
          </h3>
        </div>

        <div className="leaderboard-container">
          <h2>🏆 Leaderboard</h2>
          <ol>
            {leaderboard.map((entry, index) => (
              <li key={entry.id}>
                <strong>#{index + 1}</strong> - {entry.name}: {formatTime(entry.time)}
              </li>
            ))}
          </ol>
        </div>

        <button onClick={() => navigate("/")}>🔄 Play Again</button>
      </div>
    </div>
  );
}

export default Win;
