import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function Win() {
	const [stats, setStats] = useState([]);
	const [leaderboard, setLeaderboard] = useState([]);
	// const [teamName, setTeamName] = useState("Unknown Team"); // Removed unused variable
	const navigate = useNavigate();

	// Format seconds into "X min Y sec"
	const formatTime = (seconds) => {
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins} min ${secs} sec`;
	};

	useEffect(() => {
		const team = localStorage.getItem("teamName") || "Unknown Team";
		// setTeamName(team); // Removed unused setter
		// Fetch all stats for this team from the backend
    fetch(`http://localhost:8000/team_stats/${team}`)
      .then((res) => res.json())
      .then((data) => {
        if (data && data.games) {
          setStats(data.games);
        } else if (Array.isArray(data)) {
          setStats(data);
        }
      });
		// Fetch global leaderboard
    fetch(`http://localhost:8000/leaderboard?limit=50`)
			.then((res) => res.json())
			.then((data) => setLeaderboard(data.leaderboard || []));
	}, []);

	const totalScore = stats.reduce((acc, curr) => acc + (curr.score || 0), 0);
	const totalTime = stats.reduce((acc, curr) => acc + (curr.time_taken || 0), 0);
	const totalHints = stats.reduce((acc, curr) => acc + (curr.hints_used || 0), 0);
	const totalWrong = stats.reduce((acc, curr) => acc + (curr.wrong_guesses || 0), 0);

	return (
		<div>
			<div className="matrix-bg"></div>

			<div className="win-container">
				<h1 className="win-title">🎉 Congratulations, Detective! 🎉</h1>
				<p className="win-message">You have solved all the mysteries!</p>

				<div className="stats-container">
					<h2>Your Game Stats:</h2>
					<table className="stats-table">
						<thead>
							<tr>
								<th>Mystery</th>
								<th>Time Taken</th>
								<th>Wrong Attempts</th>
								<th>Hints Used</th>
								<th>Score</th>
							</tr>
						</thead>
						<tbody>
							{stats.map((mystery, idx) => (
								<tr key={idx}>
									<td>{mystery.mystery_id || mystery.id}</td>
									<td>{formatTime(mystery.time_taken || mystery.time)}</td>
									<td>{mystery.wrong_guesses || 0}</td>
									<td>{mystery.hints_used || 0}</td>
									<td>{mystery.score || 0}</td>
								</tr>
							))}
						</tbody>
						{stats.length > 0 && (
							<tfoot>
								<tr>
									<th>Total</th>
									<th>{formatTime(totalTime)}</th>
									<th>{totalWrong}</th>
									<th>{totalHints}</th>
									<th>{totalScore}</th>
								</tr>
							</tfoot>
						)}
					</table>
				</div>

				<div className="leaderboard-container">
					<h2>🏆 Global Leaderboard</h2>
					<ol>
						{leaderboard.map((entry, index) => (
							<li key={entry.team_name}>
								<strong>#{index + 1}</strong> - {entry.team_name}: {entry.total_score} pts,{" "}
								{formatTime(entry.total_time)}
							</li>
						))}
					</ol>
				</div>

				<div className="win-actions">
					<button onClick={() => navigate("/leaderboard")} className="leaderboard-btn">
						🏆 View Full Leaderboard
					</button>
				</div>
			</div>
		</div>
	);
}

export default Win;
