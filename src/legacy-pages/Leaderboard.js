import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { optimizedAPI } from '../utils/apiOptimizer';

function Leaderboard() {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await optimizedAPI.getLeaderboard(50);
      setLeaderboard(data?.leaderboard || data || []);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <h1>🏆 Global Leaderboard</h1>
        <p>Top detectives who have solved all mysteries</p>
      </div>

      <div className="leaderboard-container">
        {leaderboard.length > 0 ? (
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div key={index} className={`leaderboard-item ${index < 3 ? 'top-three' : ''}`}> 
                <div className="rank-section">
                  <span className="rank">#{index + 1}</span>
                  {index < 3 && <span className="medal">🥇🥈🥉</span>}
                </div>
                <div className="team-info">
                  <span className="team-name">{entry.teamName}</span>
                  <span className="mystery-info">Mystery {entry.mysteryId}</span>
                </div>
                <div className="score-section">
                  <span className="score">{entry.score} pts</span>
                  <span className="time">{formatTime(entry.timeTaken)}</span>
                </div>
                <div className="details">
                  <span className="penalties">Wrong Guesses: {entry.wrongAttempts || 0}</span>
                  <span className="bonus">Hints Used: {entry.hintsUsed || 0}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">
            <p>No scores yet. Be the first to solve all mysteries!</p>
          </div>
        )}
      </div>

      <div className="leaderboard-actions">
        <button onClick={() => navigate("/")} className="home-btn">
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default Leaderboard;
