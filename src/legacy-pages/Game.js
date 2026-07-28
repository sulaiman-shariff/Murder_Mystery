import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from "react";
import mysteries from "../data/mysteries";
import { useNavigate, useParams } from "react-router-dom";
import { optimizedAPI } from "../utils/apiOptimizer";


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Lazy load AIResponse component
const AIResponse = lazy(() => import("../components/AIResponse"));

function GamePage() {
  const navigate = useNavigate();
  const { mysteryId } = useParams(); // Get mystery ID from URL params
  const [playerMurderer, setPlayerMurderer] = useState("");
  const [playerMotive, setPlayerMotive] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showNextButton, setShowNextButton] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [solvedMysteries, setSolvedMysteries] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintCount, setHintCount] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [submissionLocked, setSubmissionLocked] = useState(false);
  
  const teamName = localStorage.getItem("teamName") || "Unknown Team";
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";

  // Determine which mystery to show - memoized for performance
  const currentMysteryId = useMemo(() => parseInt(mysteryId) || 1, [mysteryId]);
  const currentMystery = useMemo(() => 
    mysteries.find((mystery) => mystery.id === currentMysteryId), 
    [currentMysteryId]
  );
  const isFinalCase = useMemo(() => currentMysteryId === 3, [currentMysteryId]);
  
  // Memoize story content and other computed values early
  const { fullStory, shortStory } = useMemo(() => {
    const story = currentMystery?.story || '';
    return {
      fullStory: story,
      shortStory: story.length > 300 ? `${story.substring(0, 300)}...` : story
    };
  }, [currentMystery?.story]);
  
  const maxHints = useMemo(() => currentMystery?.hints?.length || 3, [currentMystery?.hints]);
  
  // When displaying progress, count only unique mystery IDs - memoized
  const uniqueSolvedCount = useMemo(() => 
    Array.from(new Set(solvedMysteries.map(m => typeof m === 'object' ? m.id : m))).length,
    [solvedMysteries]
  );

  // Memoized handlers
  const handleMurdererChange = useCallback((e) => {
    setPlayerMurderer(e.target.value);
  }, []);

  const handleMotiveChange = useCallback((e) => {
    setPlayerMotive(e.target.value);
  }, []);

  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Check authentication
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/");
      return;
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const storedStats = JSON.parse(localStorage.getItem("gameStats")) || [];
    if (window.location.pathname === "/game" && storedStats.length >= 3) {
      localStorage.removeItem("gameStats");
      setSolvedMysteries([]);
    } else {
      setSolvedMysteries(storedStats);
      // Redirect if this mystery is already solved
      const solvedIds = storedStats.map((s) => s.id);
      if (solvedIds.includes(currentMysteryId)) {
        // Find the next unsolved mystery
        const allMysteryIds = mysteries.map((m) => m.id);
        const nextUnsolved = allMysteryIds.find((id) => !solvedIds.includes(id));
        if (nextUnsolved) {
          navigate(`/game/${nextUnsolved}`);
        } else {
          navigate("/win");
        }
      }
    }
  }, [currentMysteryId, navigate]);

  // Fetch all per-mystery state from backend
  useEffect(() => {
    let timer;
    let isMounted = true;
    async function fetchSessionState() {
      try {
        const statusData = await optimizedAPI.getGameStatus(teamName, currentMysteryId);
        if (!isMounted) return;
        setTimeTaken(statusData.elapsedSeconds);
        setWrongAttempts(statusData.wrongGuesses || 0);
        setHintCount(statusData.hintsUsed || 0);
        let base = statusData.elapsedSeconds;
        timer = setInterval(() => {
          base += 1;
          setTimeTaken(base);
        }, 1000);
      } catch (err) {
        // If no session exists, create one
        if (err.message && err.message.includes('not found')) {
          try {
            await optimizedAPI.startGame(teamName, currentMysteryId);
            if (!isMounted) return;
            setTimeTaken(0);
            setWrongAttempts(0);
            setHintCount(0);
            let base = 0;
            timer = setInterval(() => {
              base += 1;
              setTimeTaken(base);
            }, 1000);
          } catch (startError) {
            console.error("Failed to start game session:", startError);
            setTimeTaken(0);
            setWrongAttempts(0);
            setHintCount(0);
          }
        } else {
          console.error("Error fetching session state:", err);
          setTimeTaken(0);
          setWrongAttempts(0);
          setHintCount(0);
        }
      }
    }
    fetchSessionState();
    return () => { isMounted = false; if (timer) clearInterval(timer); };
  }, [currentMysteryId, teamName]);

  // Fetch solved mysteries/progress from local service
  useEffect(() => {
    async function fetchProgress() {
      try {
        const data = await optimizedAPI.getTeamStats(teamName);
        // data.games is an array of completed mysteries
        if (data && data.games) {
          setSolvedMysteries(data.games.map(g => g.mysteryId || g.mystery_id || g.id));
        } else {
          setSolvedMysteries([]);
        }
      } catch (error) {
        console.error("Error fetching team progress:", error);
        setSolvedMysteries([]);
      }
    }
    fetchProgress();
  }, [teamName]);

  // When updating solvedMysteries, ensure uniqueness
  const addSolvedMystery = useCallback((id, time) => {
    setSolvedMysteries((prevStats) => {
      // Remove any previous entry for this id
      const filtered = prevStats.filter((stat) => stat.id !== id);
      const updatedStats = [...filtered, { id, time }];
      localStorage.setItem("gameStats", JSON.stringify(updatedStats));
      return updatedStats;
    });
  }, []);

  const sendStatsToBackend = useCallback(async (mysteryId, time, completed = true, wrongAttemptsVal = 0, hintsUsedVal = 0, scoreVal = 0) => {
    try {
      const result = await optimizedAPI.saveResult(
        teamName,
        parseInt(mysteryId),
        parseInt(time),
        wrongAttemptsVal,
        hintsUsedVal,
        scoreVal,
        completed
      );
      if (result?.success) console.log("Game stats saved successfully.");
      /*
      const response = await fetch(`${API_BASE_URL}/save_result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          team_name: teamName,
          mystery_id: parseInt(mysteryId),
          time_taken: parseInt(time),
          completed: completed,
          wrong_attempts: wrongAttemptsVal,
          hints_used: hintsUsedVal,
          score: scoreVal,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success === false && data.message && data.message.includes("already exists")) {
          setFeedback("❌ You have already submitted your result for this mystery. Scores cannot be changed.");
          setSubmissionLocked(true);
        } else {
          console.log("Game stats sent to backend successfully.");
        }
      }
      */
    } catch (error) {
      console.error("Error sending game stats:", error);
    }
  }, [teamName]);

  // Optimized guess validation with debouncing  
  const validateGuess = useCallback(async () => {
    if (!currentMystery || !currentMysteryId) {
      console.warn("Mystery not loaded correctly. Skipping validation.");
      return;
    }
    
    setIsLoading(true);
    try {
      const data = await optimizedAPI.validateGuess(teamName, currentMysteryId, playerMurderer, playerMotive);
      
      // Ensure data exists and has feedback property
      if (!data || typeof data.feedback !== 'string') {
        console.log('Invalid data or feedback:', data); // Keep this debug log for now
        setFeedback("❌ Unable to process your guess. Please try again.");
        return;
      }
      
      setFeedback(data.feedback);
      
      // Re-fetch state for updated stats
      const statusData = await optimizedAPI.getGameStatus(teamName, currentMysteryId);
      setWrongAttempts(statusData.wrong_guesses || 0);
      setHintCount(statusData.hints_used || 0);
      
      if (data.correct === true) {
        // Calculate score
        const baseScore = 1000;
        const timePenalty = timeTaken * 2;
        const wrongPenalty = wrongAttempts * 50;
        const hintPenalty = hintCount * 100;
        const roundScore = Math.max(baseScore - timePenalty - wrongPenalty - hintPenalty, 0);
        setScore(roundScore);
        
        // Clear stored session
        const sessionKey = `game_start_${teamName}_${currentMysteryId}`;
        localStorage.removeItem(sessionKey);
        
        setShowNextButton(true);
        addSolvedMystery(currentMysteryId, timeTaken);
        await sendStatsToBackend(currentMysteryId, timeTaken, true, wrongAttempts, hintCount, roundScore);

        // Navigate to next case
        setTimeout(() => {
          setFeedback("🔄 Redirecting to next case...");
          setPlayerMurderer("");
          setPlayerMotive("");
          window.scrollTo({ top: 0, behavior: "smooth" });
          setTimeout(() => {
            setShowNextButton(false);
            if (isFinalCase) {
              navigate("/win");
            } else {
              navigate(`/game/${currentMysteryId + 1}`);
            }
          }, 1000);
        }, 2000);
      } else {
        // Wrong guess
        setPlayerMurderer("");
        setPlayerMotive("");
        setWrongAttempts((prev) => prev + 1);
        if (data.game_over === true) {
          const sessionKey = `game_start_${teamName}_${currentMysteryId}`;
          localStorage.removeItem(sessionKey);
          setTimeout(() => {
            localStorage.removeItem("gameStats");
            navigate("/lost");
          }, 4000);
        }
      }
    } catch (error) {
      console.error("Error validating guess:", error);
      console.error("Error details:", error.message, error.stack);
      if (error.message && error.message.includes('AI validation service')) {
        setFeedback("❌ Unable to process your guess. Please try again.");
      } else {
        setFeedback("❌ Network error. Please check your connection and try again.");
      }
    } finally {
      setIsLoading(false);
    }
  }, [currentMystery, currentMysteryId, teamName, playerMurderer, playerMotive, timeTaken, wrongAttempts, hintCount, isFinalCase, navigate, addSolvedMystery, sendStatsToBackend]);

  if (!currentMystery) {
    return (
      <div className="game-container">
        <div className="completion-message">
          <h2>🎉 All mysteries solved! Congrats, Detective! 🎉</h2>
          <button 
            className="restart-btn"
            onClick={() => {
              localStorage.removeItem("gameStats");
              navigate("/game");
            }}
          >
            Play Again
          </button>
        </div>
      </div>
    );
  }

  // After using a hint, re-fetch state from backend
  const getHint = async () => {
    if (hintCount >= maxHints) return;
    setIsLoading(true);
    try {
      const data = await optimizedAPI.getHint(teamName, currentMysteryId, "I need a hint to solve this mystery");
      setHint(data.hint);
      setShowHint(true);
      setHintCount(data.hintsUsed);
    } catch (error) {
      console.error("Error getting hint:", error);
      setHint("Unable to get hint at this time. Trust your detective instincts!");
      setShowHint(true);
    } finally {
      setIsLoading(false);
    }
  };





  return (
    <div className="game-page">
      <div className="game-container">
        {/* Header */}
        <header className="game-header">
          <div className="header-info">
            <h1 className="game-title">
              Case #{currentMysteryId}
              {isFinalCase && " - Final Case"}
            </h1>
            <div className="team-info">
              <span className="team-name">Team: {teamName}</span>
              <span className="timer">Time: {formatTime(timeTaken)}</span>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className="hint-btn"
              onClick={getHint}
              disabled={isLoading || hintCount >= maxHints}
            >
              {isLoading ? "Getting Hint..." : hintCount >= maxHints ? `All Hints Used` : `Hint ${hintCount + 1}/${maxHints}`}
            </button>
          </div>
        </header>

        {/* Mystery Content */}
        <div className="mystery-content">
          <h2 className="mystery-title">{currentMystery.title}</h2>

          <div className="story-container">
            <div className="story-content">
              <div className="mystery-description">
                {expanded ? (
                  <>
                    {fullStory.split("\n").map((paragraph, i) => (
                      <p key={i} className="story-paragraph">
                        {paragraph}
                      </p>
                    ))}
                  </>
                ) : (
                  <>
                    {shortStory.split("\n").map((paragraph, i) => (
                      <p key={i} className="story-paragraph">
                        {i === 0 ? paragraph : "..."}
                      </p>
                    ))}
                  </>
                )}
              </div>

              {fullStory.length > 300 && (
                <button
                  className="read-more-btn"
                  onClick={() => setExpanded(!expanded)}
                  aria-label={expanded ? "Collapse story" : "Expand story"}
                >
                  {expanded ? "▲ Show Less" : "▼ Read Full Story"}
                </button>
              )}
            </div>
          </div>

          {/* AI Detective Chat UI - Lazy loaded */}
          <Suspense fallback={<div className="loading">Loading detective chat...</div>}>
            <AIResponse mysteryId={currentMysteryId} />
          </Suspense>

          {/* Hint Section */}
          {showHint && (
            <div className="hint-section">
              <h3>💡 Detective's Hint</h3>
              <p className="hint-text">{hint}</p>
            </div>
          )}

          {/* Investigation Form */}
          <div className="investigation-form">
            <h3>
              🔍 Your {isFinalCase ? "Final " : ""}Investigation
            </h3>
            
            <div className="form-group">
              <label htmlFor="murderer">Who is the murderer?</label>
              <input
                id="murderer"
                type="text"
                value={playerMurderer}
                onChange={handleMurdererChange}
                placeholder="Enter the murderer's name..."
                className="form-input"
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="motive">What was the motive?</label>
              <textarea
                id="motive"
                value={playerMotive}
                onChange={handleMotiveChange}
                placeholder="Describe the motive for the murder..."
                className="form-textarea"
                rows="4"
                disabled={isLoading}
              />
            </div>

            <div className="form-actions">
              <button
                className={`submit-btn ${isFinalCase ? "final-submit" : ""}`}
                onClick={validateGuess}
                disabled={!playerMurderer.trim() || !playerMotive.trim() || isLoading || submissionLocked}
              >
                {isLoading ? "🔍 Analyzing..." : `Submit ${isFinalCase ? "Final " : ""}Investigation`}
              </button>
            </div>
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`feedback ${feedback.includes("✅") || feedback.includes("🎉") ? "success" : "error"}`}>
              {feedback}
            </div>
          )}
          {/* Round Stats after solving */}
          {showNextButton && (
            <div className="round-stats">
              <h4>📝 Case Summary</h4>
              <ul>
                <li><strong>Time Taken:</strong> {formatTime(timeTaken)}</li>
                <li><strong>Wrong Attempts:</strong> {wrongAttempts}</li>
                <li><strong>Hints Used:</strong> {hintCount}</li>
                <li><strong>Score:</strong> {score}</li>
              </ul>
            </div>
          )}

          {/* Win Button for Final Case */}
          {showNextButton && isFinalCase && (
            <div className="win-section">
              <button onClick={() => navigate("/win")} className="win-button">
                🏆 Claim Victory
              </button>
            </div>
          )}

          {/* Progress */}
          <div className="progress-section">
            <h3>Case Progress</h3>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${(uniqueSolvedCount / 3) * 100}%` }}
              ></div>
            </div>
            <p className="progress-text">
              {uniqueSolvedCount} of 3 cases solved
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GamePage;
