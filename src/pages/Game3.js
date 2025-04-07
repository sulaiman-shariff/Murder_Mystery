import React, { useState, useEffect } from "react";
import Timer from "../components/Timer";
import VideoPlayer from "../components/VideoPlayer";
import AIResponse from "../components/AIResponse";
import StatsDisplay from "../components/StatsDisplay";
import mysteries from "../data/mysteries";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/Game.css";

function Game3() {
  const navigate = useNavigate();
  const [playerMurderer, setPlayerMurderer] = useState("");
  const [playerMotive, setPlayerMotive] = useState("");
  const [feedback, setFeedback] = useState("");
  const [showWinButton, setShowWinButton] = useState(false);
  const [timeTaken, setTimeTaken] = useState(0);
  const [solvedMysteries, setSolvedMysteries] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [playerName, setPlayerName] = useState("");

  // ✅ Load previous game stats and player name
  useEffect(() => {
    const storedStats = JSON.parse(localStorage.getItem("gameStats")) || [];
    const storedName = localStorage.getItem("playerName") || "Unknown Detective";
    setSolvedMysteries(storedStats);
    setPlayerName(storedName);
  }, []);

  // ✅ Track time taken
  useEffect(() => {
    setTimeTaken(0);
    const timer = setInterval(() => {
      setTimeTaken((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ✅ Fetch Mystery 3
  const currentMystery = mysteries.find((mystery) => mystery.id === 3);
  if (!currentMystery) {
    return <p>❌ Mystery not found!</p>;
  }

  // ✅ Handle story truncation & expanding
  const fullStory = currentMystery.story;
  const shortStory = fullStory.length > 150 ? `${fullStory.substring(0, 150)}...` : fullStory;

  const handleMurdererChange = (e) => {
    setPlayerMurderer(e.target.value.toLowerCase());
  };

  const handleMotiveChange = (e) => {
    setPlayerMotive(e.target.value.toLowerCase());
  };

  // ✅ Motive similarity check with Gemini AI
  const checkMotiveWithGemini = async (inputMotive, validMotives) => {
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
      You are an AI assistant in a murder mystery game. 
      Your task is to determine if the given user input describes a similar motive as any of the known motives.
      
      **User Input:** "${inputMotive}"
      **Valid Motives:** ${JSON.stringify(validMotives)}
      
      Respond ONLY with "yes" if the input describes a similar motive. Otherwise, respond with "no".
    `;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
    };

    try {
      const response = await axios.post(url, body, { headers: { "Content-Type": "application/json" } });
      const aiResponse = response.data?.candidates?.[0]?.content?.parts?.[0]?.text.trim().toLowerCase();
      return aiResponse.includes("yes");
    } catch (error) {
      console.error("Gemini validation failed:", error);
      return false;
    }
  };

  // ✅ Send Game Stats to Backend
  const sendGameStats = async () => {
    try {
      await axios.post("http://127.0.0.1:8000/store_stats", {
        playerName: playerName,
        mysteryId: currentMystery.id,
        timeTaken: timeTaken,
      });
      console.log("Final game stats sent successfully.");
    } catch (error) {
      console.error("Failed to send final game stats:", error);
    }
  };

  // ✅ Final validation function
  const validateGuess = async () => {
    const isMurdererCorrect = playerMurderer === currentMystery.murderer.toLowerCase();
    const isMotiveCorrect = await checkMotiveWithGemini(playerMotive, currentMystery.motive);

    if (isMurdererCorrect && isMotiveCorrect) {
      setFeedback("🎉 Correct! You've solved all mysteries!");
      setShowWinButton(true);

      const updatedStats = [
        ...solvedMysteries.filter((stat) => stat.id !== currentMystery.id),
        { id: currentMystery.id, time: timeTaken },
      ];
      setSolvedMysteries(updatedStats);
      localStorage.setItem("gameStats", JSON.stringify(updatedStats));

      await sendGameStats();

      setTimeout(() => {
        navigate("/win");
      }, 2000);
    } else {
      setFeedback("❌ Wrong answer. Redirecting...");
      setTimeout(() => {
        localStorage.removeItem("gameStats");
        navigate("/lost");
      }, 2000);
    }
  };

  return (
    <div>
      <div className="matrix-bg"></div>

      <div className="game-container">
        <h2 className="mystery-title">{currentMystery.title}</h2>

        {/* ✅ Final Mystery Story Container */}
        <div className="story-container">
          <div className="story-content">
            <div className="mystery-description">
              {expanded ? (
                fullStory.split("\n").map((paragraph, i) => (
                  <p key={i} className="story-paragraph">{paragraph}</p>
                ))
              ) : (
                shortStory.split("\n").map((paragraph, i) => (
                  <p key={i} className="story-paragraph">{i === 0 ? paragraph : "..."} </p>
                ))
              )}
            </div>
            {fullStory.length > 150 && (
              <button
                className="read-more-btn"
                onClick={() => setExpanded(!expanded)}
                aria-label={expanded ? "Collapse story" : "Expand story"}
              >
                {expanded ? "▲ Show Less" : "▼ Show More"}
              </button>
            )}
          </div>
        </div>

        <Timer />
        <VideoPlayer mysteryIndex={currentMystery.id - 1} />

        {/* Audio Player */}
        <div className="audio-container">
          <audio controls src={currentMystery.audio} style={{ width: "100%" }}>
            Your browser does not support the audio element.
          </audio>
        </div>

        <AIResponse mysteryId={currentMystery.id} />

        <div className="validation-section">
          <input
            type="text"
            placeholder="🔎 Enter murderer"
            value={playerMurderer}
            onChange={handleMurdererChange}
            aria-label="Final murderer guess input"
          />
          <input
            type="text"
            placeholder="🎭 Enter motive"
            value={playerMotive}
            onChange={handleMotiveChange}
            aria-label="Final motive guess input"
          />
          <button onClick={validateGuess}>✔️ Submit Final Guess</button>
          <p className={`feedback-message ${feedback.includes("🎉") ? "win-feedback" : "error-feedback"}`}>
            {feedback}
          </p>

          {showWinButton && (
            <button onClick={() => navigate("/win")} className="win-button">
              🏆 Claim Victory
            </button>
          )}
        </div>

        <StatsDisplay solvedMysteries={solvedMysteries} isFinalGame={true} />
      </div>
    </div>
  );
}

export default Game3;
