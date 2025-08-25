import React from "react";

const videoSources = [
  process.env.PUBLIC_URL + "/assets/vdo1.mp4",
  process.env.PUBLIC_URL + "/assets/vdo2.mp4",
  process.env.PUBLIC_URL + "/assets/vdo3.mp4",
];

function VideoPlayer({ mysteryIndex }) {
  return (
    <div className="video-container">
      <video width="75%" height="auto" controls autoPlay loop muted>
        <source src={videoSources[mysteryIndex]} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      <p className="video-error">
      </p>
    </div>
  );
}

export default VideoPlayer;
