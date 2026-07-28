import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function FlipTimer({ initialTime = 900 }) {
  const navigate = useNavigate();
  const [time, setTime] = useState(initialTime);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (time <= 0) {
      navigate("/lost"); // Redirect to "Lost" page when time runs out
      return;
    }

    const interval = setInterval(() => {
      setFlip(true); // Start flip animation
      setTimeout(() => {
        setTime((prev) => prev - 1);
        setFlip(false); // Reset animation after flipping
      }, 500);
    }, 1000);

    return () => clearInterval(interval);
  }, [time, navigate]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${minutes}:${sec < 10 ? "0" : ""}${sec}`;
  };

  return (
    <div className="flip-timer-container">
      <div className={`flip-card ${flip ? "flip" : ""}`}>
        <div className="flip-front">{formatTime(time)}</div>
        <div className="flip-back">{formatTime(time - 1)}</div>
      </div>
    </div>
  );
}

export default FlipTimer;
