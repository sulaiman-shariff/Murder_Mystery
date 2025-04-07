import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./../styles/Home.css";

function Home() {
  const navigate = useNavigate();
  const [displayText, setDisplayText] = useState("");
  const [playerName, setPlayerName] = useState("");
  const fullText = "Solve all three cases before time’s up—can you?";

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayText(fullText.substring(0, i));
      i++;
      if (i > fullText.length) clearInterval(interval);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  const handleNameChange = (e) => {
    setPlayerName(e.target.value);
  };

  const handleStartGame = async () => {
    if (playerName.trim() !== "") {
      try {
        await fetch("http://127.0.0.1:8000/start_game", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ playerName }),
        });

        localStorage.setItem("playerName", playerName);
        navigate("/game");
      } catch (error) {
        console.warn("⚠️ Error communicating with backend:", error);
        localStorage.setItem("playerName", playerName);
        navigate("/game");
      }
    }
  };

  return (
    <div className="home-container">
      {/* Hacker-style credit top-left corner */}
      <div className="credit-banner">
        <div className="credit-line">DEVELOPED BY CODE CLUB</div>
        <div className="credit-line">MADE BY AKHIL</div>
      </div>

      <div className="content-box">
        <h1 className="glitch-title">
          AI <span className="murder-mystery">Murder Mystery</span>
        </h1>

        <div className="typewriter-text">
          <span>{displayText}</span>
        </div>

        <input
          type="text"
          placeholder="Enter your name..."
          value={playerName}
          onChange={handleNameChange}
          className="name-input"
        />

        {playerName.trim() !== "" && (
          <button className="animated-play-button" onClick={handleStartGame}>
            P L A Y
            <div id="clip">
              <div id="leftTop" className="corner"></div>
              <div id="rightBottom" className="corner"></div>
              <div id="rightTop" className="corner"></div>
              <div id="leftBottom" className="corner"></div>
            </div>
            <span id="rightArrow" className="arrow"></span>
            <span id="leftArrow" className="arrow"></span>
          </button>
        )}
      </div>
    </div>
  );
}

export default Home;
