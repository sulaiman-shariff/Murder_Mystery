import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { optimizedAPI } from '../utils/apiOptimizer';

function Home() {
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState("");
  const [teamName, setTeamName] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [expandedTeams, setExpandedTeams] = useState(new Set());
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);
  
  const fullText = "Enter the realm of mystery and deception. Can you solve all three cases before time runs out?";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleTeamNameChange = (e) => {
    setTeamName(e.target.value);
    setError("");
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamName.trim() || !password.trim()) {
      setError("Please enter both team name and password");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (isLoginMode) {
        await optimizedAPI.loginTeam(teamName, password);
        localStorage.setItem("teamName", teamName);
        localStorage.setItem("isAuthenticated", "true");
        setShowRegisterPrompt(false);
        // Start the game
        await startGame();
      } else {
        await optimizedAPI.registerTeam(teamName, password);
        setShowRegisterPrompt(true);
        // Switch to login mode after successful registration
        setTimeout(() => {
          setIsLoginMode(true);
          setShowRegisterPrompt(false);
        }, 2000);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      let errorMsg = error.message || "Authentication failed";
      
      if (errorMsg.includes("not found")) {
        setShowRegisterPrompt(true);
      } else if (errorMsg.includes("already exists")) {
        errorMsg = "Team name already exists. Please choose a different name or try logging in.";
        setShowRegisterPrompt(true);
      } else if (errorMsg.includes("Invalid admin password")) {
        setShowRegisterPrompt(false);
      } else {
        setShowRegisterPrompt(false);
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = async () => {
    try {
      const result = await optimizedAPI.startGame(teamName, 1);
      if (result.success) {
        navigate("/game");
      } else {
        setError("Failed to start game");
      }
    } catch (error) {
      console.error("Start game error:", error);
      setError(error.message || "Failed to start game. Please try again.");
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const data = await optimizedAPI.getLeaderboard(10);
      setLeaderboard(data?.leaderboard || data || []);
    } catch (error) {
      console.error("Failed to fetch leaderboard:", error);
    }
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setError("");
  };

  const toggleLeaderboard = () => {
    if (!showLeaderboard) {
      fetchLeaderboard();
      setExpandedTeams(new Set());
    }
    setShowLeaderboard(!showLeaderboard);
  };

  const toggleTeamExpansion = (teamName) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamName)) {
      newExpanded.delete(teamName);
    } else {
      newExpanded.add(teamName);
    }
    setExpandedTeams(newExpanded);
  };

  const getMysteryTitle = (mysteryId) => {
    const titles = {
      1: "Gilded Rose Mansion",
      2: "Hollowbrook Asylum", 
      3: "Veil of Ebonmere"
    };
    return titles[mysteryId] || `Mystery ${mysteryId}`;
  };

  return (
    <div className="home-container">
      {/* Modern header */}
      <header className="game-header">
        <div className="header-content">
          <h1 className="game-title">
            <span className="title-main">MURDER</span>
            <span className="title-sub">MYSTERY</span>
          </h1>
        </div>
      </header>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
        <div className="leaderboard-modal">
          <div className="leaderboard-content">
            <h2>🏆 Top Detectives</h2>
            <div className="leaderboard-list">
              {leaderboard.length > 0 ? (
                leaderboard.map((team, index) => (
                  <div key={team.team_name} className="leaderboard-team">
                    <div 
                      className="leaderboard-item main-team-item"
                      onClick={() => toggleTeamExpansion(team.team_name)}
                    >
                      <span className="rank">#{index + 1}</span>
                      <span className="team-name">{team.team_name}</span>
                      <span className="score">{team.score} pts</span>
                      <span className="mysteries-count">{team.completedCount}/3</span>
                      <span className="expand-icon">
                        {expandedTeams.has(team.team_name) ? '▼' : '▶'}
                      </span>
                    </div>
                    
                    {expandedTeams.has(team.team_name) && (
                      <div className="mystery-breakdown">
                        {team.mysteries.map((mystery, mysteryIndex) => (
                          <div key={mysteryIndex} className="mystery-item">
                            <span className="mystery-name">
                              {getMysteryTitle(mystery.mysteryId)}
                            </span>
                            <span className="mystery-score">
                              {mystery.score} pts
                            </span>
                            <span className="mystery-time">
                              {mystery.time}
                            </span>
                            <span className="mystery-status">
                              {mystery.completed ? '✅' : '⏳'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-data">No scores yet. Be the first to solve the mysteries!</p>
              )}
            </div>
            <button 
              className="close-btn"
              onClick={toggleLeaderboard}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="main-content">
        <div className="content-box">
          <div className="typewriter-text">
            <span>{displayText}</span>
          </div>

          <div className="auth-container">
            <div className="auth-header">
              <h2>{isLoginMode ? "Welcome Back" : "Join the Investigation"}</h2>
              <p>{isLoginMode ? "Enter your credentials to continue" : "Register your team to begin"}</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="teamName">Team Name</label>
                <input
                  id="teamName"
                  type="text"
                  placeholder="Enter your team name..."
                  value={teamName}
                  onChange={handleTeamNameChange}
                  className="form-input"
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Admin Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter admin password..."
                  value={password}
                  onChange={handlePasswordChange}
                  className="form-input"
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="error-message">
                  {error}
                  {showRegisterPrompt && isLoginMode && (
                    <div style={{ marginTop: '10px' }}>
                      <button
                        type="button"
                        className="submit-btn"
                        onClick={() => {
                          setIsLoginMode(false);
                          setShowRegisterPrompt(false);
                        }}
                      >
                        Register this team
                      </button>
                    </div>
                  )}
                </div>
              )}

              <button 
                type="submit" 
                className="submit-btn"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="loading">Loading...</span>
                ) : (
                  isLoginMode ? "Enter Game" : "Register & Start"
                )}
              </button>
            </form>

            <div className="auth-footer">
              <p>
                {isLoginMode ? "New team?" : "Already registered?"}
                <button 
                  className="toggle-btn"
                  onClick={toggleMode}
                  disabled={isLoading}
                >
                  {isLoginMode ? "Register here" : "Login here"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="game-footer">
        <div className="footer-content">
          <p>Developed by Code Club </p>
          <p>Enter the world of mystery and deception</p>
        </div>
      </footer>
    </div>
  );
}

export default Home;
