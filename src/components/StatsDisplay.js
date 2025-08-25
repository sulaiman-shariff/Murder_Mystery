import React from "react";

// Function to format time from seconds to "minutes:seconds"
const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};

function StatsDisplay({ solvedMysteries }) {
  return (
    <div className="stats-container">
      <h3>Game Stats</h3>
      <p>Solved Mysteries: {solvedMysteries.length}</p>
      <ul>
        {solvedMysteries.map((mystery, i) => (
          <li key={i}>
            Mystery {mystery.id} solved in {formatTime(mystery.time)} ⏳
          </li>
        ))}
      </ul>
    </div>
  );
}

export default StatsDisplay;
