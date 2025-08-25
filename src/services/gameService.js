// Game Service - Uses Local Storage + Vertex AI Integration
import axios from 'axios';

// API Configuration for Vertex AI proxy
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Create axios instance for AI services
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Game constants
const ADMIN_PASSWORD = "ATRIA";

// Local storage keys
const STORAGE_KEYS = {
  TEAMS: 'murder_mystery_teams',
  GAME_SESSIONS: 'murder_mystery_sessions',
  LEADERBOARD: 'murder_mystery_leaderboard'
};

// Game constants
const BASE_SCORE = 1000;
const TIME_PENALTY_PER_MINUTE = 10;
const WRONG_GUESS_PENALTY = 200;
const HINT_PENALTY = 100;
const BONUS_FOR_FAST_COMPLETION = 50;

// API Error Handling - currently unused but kept for future use
// const handleApiError = (error) => {
//   console.error('API Error:', error);
//   
//   if (error.response) {
//     const message = error.response.data?.detail || error.response.statusText || 'API request failed';
//     throw new Error(message);
//   } else if (error.request) {
//     throw new Error('Unable to connect to server. Please check your internet connection.');
//   } else {
//     throw new Error('An unexpected error occurred. Please try again.');
//   }
// };

// Utility functions
export const formatTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const calculateScore = (timeInSeconds, wrongGuesses, hintsUsed, completed) => {
  if (!completed) {
    return {
      score: 0,
      timeTaken: timeInSeconds,
      wrongGuesses,
      hintsUsed,
      penalties: 0,
      bonus: 0
    };
  }

  let score = BASE_SCORE;
  const timeMinutes = timeInSeconds / 60;
  const timePenalty = Math.floor(timeMinutes * TIME_PENALTY_PER_MINUTE);
  const wrongGuessPenalty = wrongGuesses * WRONG_GUESS_PENALTY;
  const hintPenalty = hintsUsed * HINT_PENALTY;
  const totalPenalties = timePenalty + wrongGuessPenalty + hintPenalty;
  
  score -= totalPenalties;
  
  let bonus = 0;
  if (timeMinutes < 30) {
    bonus = BONUS_FOR_FAST_COMPLETION;
    score += bonus;
  }
  
  score = Math.max(0, score);
  
  return {
    score,
    timeTaken: timeInSeconds,
    wrongGuesses,
    hintsUsed,
    penalties: totalPenalties,
    bonus
  };
};

// Mystery data
const mysteries = {
  1: {
    "title": "The Gilded Rose Mansion - An Opulent Yet Hidden Deception",
    "murderer": "Jonathan Reed",
    "motive": [
      "Revenge for a past deception hidden within the mansion's walls",
      "Elimination of a rival threatening to expose a buried truth",
      "A desperate act to sever ties with a dangerous past",
      "A sacrifice to fulfill an ancient pact tied to the mansion",
      "A misguided attempt to claim power and control over the estate",
      "A secret lover's quarrel that turned deadly",
      "An attempt to erase a witness to a forbidden act",
      "A vendetta fueled by jealousy and ambition"
    ],
    "hints": [
      "Consider the relationships between the victim and those who felt overlooked or undervalued.",
      "Look for someone whose professional pride was wounded by the victim's decisions.",
      "The killer's motive stems from a deep sense of personal betrayal, not financial gain."
    ]
  },
  2: {
    "title": "The Hollowbrook Asylum: A Descent into Darkness",
    "murderer": "Daniel Mercer",
    "motive": [
      "Vengeance for a betrayal long forgotten",
      "Protection of a dark secret hidden beneath the city",
      "A prophecy fulfilled through bloodshed",
      "Elimination of a dangerous threat to the kingdom's balance",
      "Desperation to escape a doomed fate",
      "An oath to an unseen force demanding sacrifice",
      "A desire to dismantle the corruption of Ebonmere",
      "A personal vendetta masked as divine justice"
    ],
    "hints": [
      "Pay attention to those who observed the victim's methods with particular scrutiny.",
      "The killer is someone who saw through the victim's facade and was deeply affected by what they discovered.",
      "This murder was driven by a personal vendetta, not institutional corruption."
    ]
  },
  3: {
    "title": "The Veil of Ebonmere",
    "murderer": "Lady Seraphine Voss",
    "motive": [
      "Vengeance for a betrayal long forgotten",
      "Protection of a dark secret hidden beneath the city",
      "A prophecy fulfilled through bloodshed",
      "Elimination of a dangerous threat to the kingdom's balance",
      "Desperation to escape a doomed fate",
      "An oath to an unseen force demanding sacrifice",
      "A desire to dismantle the corruption of Ebonmere",
      "A personal vendetta masked as divine justice"
    ],
    "hints": [
      "Consider who among the suspects had the most intimate knowledge of the victim's fears and secrets.",
      "The killer is someone whose own destiny was intertwined with the victim's in ways that became unbearable.",
      "This murder was committed to protect something far greater than personal ambition."
    ]
  }
};

// Local Storage Management
class LocalStorageManager {
  static get(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(`Error getting ${key} from localStorage:`, error);
      return null;
    }
  }

  static set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error setting ${key} to localStorage:`, error);
      return false;
    }
  }

  static remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing ${key} from localStorage:`, error);
      return false;
    }
  }
}

// Game Service Class - Uses Local Storage + Vertex AI Proxy

export class GameService {
  // Authentication
  async registerTeam(teamName, password) {
    if (password !== ADMIN_PASSWORD) {
      throw new Error('Invalid admin password');
    }

    const teams = LocalStorageManager.get(STORAGE_KEYS.TEAMS) || {};
    
    if (teams[teamName]) {
      throw new Error('Team name already exists');
    }

    teams[teamName] = {
      name: teamName,
      password,
      registered: new Date().toISOString()
    };

    LocalStorageManager.set(STORAGE_KEYS.TEAMS, teams);
    return { success: true, message: `Team '${teamName}' registered successfully` };
  }

  async loginTeam(teamName, password) {
    const teams = LocalStorageManager.get(STORAGE_KEYS.TEAMS) || {};
    const team = teams[teamName];

    if (!team) {
      throw new Error('Team not found. Please register first.');
    }

    if (team.password !== password) {
      throw new Error('Invalid password for this team');
    }

    return { success: true, message: `Welcome back, ${teamName}!` };
  }

  checkTeamExists(teamName) {
    const teams = LocalStorageManager.get(STORAGE_KEYS.TEAMS) || {};
    return !!teams[teamName];
  }

  // Game Session Management
  async startGame(teamName, mysteryId) {
    if (!this.checkTeamExists(teamName)) {
      throw new Error('Team not found');
    }

    if (!mysteries[mysteryId]) {
      throw new Error('Mystery not found');
    }

    const sessionId = `${teamName}_${mysteryId}`;
    const startTime = new Date().toISOString();
    
    const sessions = LocalStorageManager.get(STORAGE_KEYS.GAME_SESSIONS) || {};
    
    sessions[sessionId] = {
      sessionId,
      teamName,
      mysteryId,
      startTime,
      endTime: null,
      timeTakenSeconds: 0,
      wrongGuesses: 0,
      hintsUsed: 0,
      completed: false,
      score: 0,
      penalties: 0,
      bonus: 0,
      createdAt: startTime,
      updatedAt: startTime
    };

    LocalStorageManager.set(STORAGE_KEYS.GAME_SESSIONS, sessions);

    return {
      success: true,
      sessionId,
      startTime,
      mystery: {
        id: mysteryId,
        title: mysteries[mysteryId].title
      }
    };
  }

  async getGameStatus(teamName, mysteryId) {
    const sessionId = `${teamName}_${mysteryId}`;
    const sessions = LocalStorageManager.get(STORAGE_KEYS.GAME_SESSIONS) || {};
    const session = sessions[sessionId];

    if (!session) {
      throw new Error('Game session not found');
    }

    const startTime = new Date(session.startTime);
    const currentTime = new Date();
    const elapsedSeconds = Math.floor((currentTime - startTime) / 1000);

    return {
      sessionId,
      teamName,
      mysteryId,
      startTime: session.startTime,
      elapsedSeconds,
      elapsedFormatted: formatTime(elapsedSeconds),
      wrongGuesses: session.wrongGuesses,
      hintsUsed: session.hintsUsed,
      completed: session.completed
    };
  }

  async updateGameSession(sessionId, updateData) {
    const sessions = LocalStorageManager.get(STORAGE_KEYS.GAME_SESSIONS) || {};
    
    if (!sessions[sessionId]) {
      throw new Error('Game session not found');
    }

    sessions[sessionId] = {
      ...sessions[sessionId],
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    LocalStorageManager.set(STORAGE_KEYS.GAME_SESSIONS, sessions);
    return sessions[sessionId];
  }

  // Game Logic
  getMystery(mysteryId) {
    console.log('getMystery called with:', mysteryId, 'type:', typeof mysteryId);
    console.log('Available mysteries:', Object.keys(mysteries));
    
    // Try both number and string versions
    let result = mysteries[mysteryId];
    if (!result && typeof mysteryId === 'string') {
      result = mysteries[parseInt(mysteryId)];
    }
    if (!result && typeof mysteryId === 'number') {
      result = mysteries[mysteryId.toString()];
    }
    
    console.log('getMystery result:', result ? 'found' : 'not found');
    return result || null;
  }

  async getHint(teamName, mysteryId, question) {
    const mystery = this.getMystery(mysteryId);
    if (!mystery) {
      throw new Error('Mystery not found');
    }

    const sessionId = `${teamName}_${mysteryId}`;
    const sessions = LocalStorageManager.get(STORAGE_KEYS.GAME_SESSIONS) || {};
    const session = sessions[sessionId];

    let currentHints = 0;
    if (session) {
      currentHints = session.hintsUsed || 0;
    }

    try {
      // Use AI hint generation
      const aiHint = await this.generateAIHint(question, mystery, currentHints);
      currentHints += 1;
      
      // Update session
      if (session) {
        await this.updateGameSession(sessionId, {
          hintsUsed: currentHints
        });
      }
      
      return {
        hint: aiHint,
        hintsUsed: currentHints,
        penaltyApplied: HINT_PENALTY
      };
    } catch (error) {
      console.error('AI Hint generation error:', error);
      // Fallback to static hints
      return this.getStaticHint(mystery, currentHints, sessionId);
    }
  }

  async generateAIHint(question, mystery, hintNumber) {
    try {
      const response = await api.post('/api/ai/generate', {
        prompt: `You are a detective providing hints for a murder mystery game.
        
        Mystery: ${mystery.title}
        Question: ${question}
        Hint number: ${hintNumber + 1}
        
        Provide a helpful but not too revealing hint that guides the player toward the solution without giving away the answer. The hint should be:
        - Relevant to the specific question asked
        - Appropriate for hint number ${hintNumber + 1} (more specific as hint number increases)
        - Engaging and detective-like in tone
        - Not too obvious or too vague
        
        Respond with just the hint text, no additional formatting.`,
        maxTokens: 256,
        temperature: 0.7
      });
      
      return response.data.response;
    } catch (error) {
      console.error('AI Hint generation error:', error);
      throw new Error('AI hint service unavailable');
    }
  }

  getStaticHint(mystery, currentHints, sessionId) {
    const hints = mystery.hints || [];
    if (currentHints < hints.length) {
      const hint = hints[currentHints];
      currentHints += 1;
      
      // Update session
      this.updateGameSession(sessionId, {
        hintsUsed: currentHints
      });
      
      return {
        hint,
        hintsUsed: currentHints,
        penaltyApplied: HINT_PENALTY
      };
    } else {
      return {
        hint: "No more hints available for this mystery. Trust your detective instincts!",
        hintsUsed: currentHints,
        penaltyApplied: 0
      };
    }
  }

  async validateGuess(teamName, mysteryId, murdererGuess, motiveGuess) {
    console.log('validateGuess called with:', { teamName, mysteryId, murdererGuess, motiveGuess });
    console.log('mysteryId type:', typeof mysteryId);
    console.log('mysteryId value:', mysteryId);
    
    const mystery = this.getMystery(mysteryId);
    console.log('Retrieved mystery:', mystery);
    
    if (!mystery) {
      console.error('Mystery not found for ID:', mysteryId);
      console.error('Available mystery IDs:', Object.keys(mysteries));
      
      // Return a proper error response instead of throwing
      return {
        correct: false,
        feedback: "❌ Unable to find mystery data. Please refresh the page and try again.",
        wrongGuesses: 0,
        penaltyApplied: 0,
        gameOver: false
      };
    }

    const correctMurderer = mystery.murderer;
    const validMotives = mystery.motive;

    // Track wrong guesses - define outside try block
    const sessionId = `${teamName}_${mysteryId}`;
    const sessions = LocalStorageManager.get(STORAGE_KEYS.GAME_SESSIONS) || {};
    const session = sessions[sessionId];
    let currentWrongGuesses = session ? (session.wrongGuesses || 0) : 0;

    try {
      // Use AI validation for murderer via proxy
      const murdererResponse = await api.post('/api/ai/validate-murderer', {
        guess: murdererGuess,
        correctMurderer,
        mystery
      });
      
      // Check if response is an error
      if (murdererResponse.status !== 200 || murdererResponse.data.error) {
        throw new Error(murdererResponse.data.error || 'Failed to validate murderer');
      }
      
      const murdererValidation = murdererResponse.data;
      
      // Ensure expected properties exist
      if (typeof murdererValidation.correct !== 'boolean') {
        throw new Error('Invalid murderer validation response format');
      }
      
      // Use AI validation for motive via proxy
      const motiveResponse = await api.post('/api/ai/validate-motive', {
        inputMotive: motiveGuess,
        validMotives
      });
      
      // Check if response is an error
      if (motiveResponse.status !== 200 || motiveResponse.data.error) {
        throw new Error(motiveResponse.data.error || 'Failed to validate motive');
      }
      
      const motiveValidation = motiveResponse.data;
      
      // Ensure expected properties exist
      if (typeof motiveValidation.correct !== 'boolean') {
        throw new Error('Invalid motive validation response format');
      }
      
      const isCorrect = murdererValidation.correct && motiveValidation.correct;
      
      // Update wrong guesses if incorrect
      if (!isCorrect && session) {
        currentWrongGuesses = (session.wrongGuesses || 0) + 1;
        await this.updateGameSession(sessionId, {
          wrongGuesses: currentWrongGuesses
        });
      }

      // Generate feedback based on AI validation results
      let feedback = "";
      
      if (isCorrect) {
        feedback = "🎉 Excellent detective work! You've solved the mystery completely!";
      } else if (murdererValidation.correct && !motiveValidation.correct) {
        feedback = `🔍 You've identified the right person, but your motive needs refinement. ${motiveValidation.reason}`;
      } else if (!murdererValidation.correct) {
        feedback = `🎭 ${murdererValidation.reason}`;
      } else {
        feedback = "❌ Both your murderer and motive guesses need work. Review the clues carefully.";
      }

      const result = {
        correct: isCorrect,
        murdererCorrect: murdererValidation.correct,
        motiveCorrect: motiveValidation.correct,
        feedback,
        wrongGuesses: currentWrongGuesses,
        penaltyApplied: isCorrect ? 0 : WRONG_GUESS_PENALTY,
        gameOver: currentWrongGuesses >= 10
      };
      console.log('validateGuess - murdererValidation:', murdererValidation);
      console.log('validateGuess - motiveValidation:', motiveValidation);
      console.log('validateGuess - result:', result);
      return result;
    } catch (error) {
      console.error('AI Validation error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response?.data);
      
      // Handle different types of errors gracefully
      if (error.response?.status === 500) {
        // Server error - possibly AI service issue
        return {
          correct: false,
          feedback: "❌ Unable to process your guess. Please try again.",
          wrongGuesses: currentWrongGuesses + 1,
          penaltyApplied: WRONG_GUESS_PENALTY,
          gameOver: (currentWrongGuesses + 1) >= 10
        };
      } else if (error.response?.status === 400) {
        // Bad request - possibly invalid input
        return {
          correct: false,
          feedback: "❌ Invalid guess format. Please check your input and try again.",
          wrongGuesses: currentWrongGuesses,
          penaltyApplied: 0,
          gameOver: false
        };
      } else {
        // Network or other error
        throw new Error('AI validation service is currently unavailable. Please try again later.');
      }
    }
  }

  async getAIDetectiveChat(question, mysteryId, teamName) {
    const mystery = this.getMystery(mysteryId);
    if (!mystery) {
      throw new Error('Mystery not found');
    }

    try {
      const response = await api.post('/api/ai/detective-chat', {
        question,
        mystery
      });
      return {
        response: response.data.response,
        mysteryId
      };
    } catch (error) {
      console.error('AI Detective Chat error:', error);
      throw new Error('AI service is currently unavailable. Please try again later.');
    }
  }

  async saveResult(teamName, mysteryId, timeTaken, wrongAttempts, hintsUsed, score, completed = true) {
    const leaderboard = LocalStorageManager.get(STORAGE_KEYS.LEADERBOARD) || [];
    
    // Check if result already exists
    const existingEntry = leaderboard.find(
      entry => entry.teamName === teamName && entry.mysteryId === mysteryId
    );
    
    if (existingEntry) {
      throw new Error('Result for this team and mystery already exists');
    }

    const entry = {
      teamName,
      mysteryId,
      timeTaken,
      timeFormatted: formatTime(timeTaken),
      wrongGuesses: wrongAttempts,
      hintsUsed,
      score,
      completed,
      timestamp: Date.now(),
      createdAt: new Date().toISOString()
    };

    leaderboard.push(entry);
    LocalStorageManager.set(STORAGE_KEYS.LEADERBOARD, leaderboard);

    return { success: true, message: "Result saved successfully" };
  }

  // Stats and Leaderboard
  getLeaderboard(limit = 50) {
    const leaderboard = LocalStorageManager.get(STORAGE_KEYS.LEADERBOARD) || [];
    
    // Group by team and calculate total scores
    const teamStats = {};
    
    leaderboard.forEach(entry => {
      if (!teamStats[entry.teamName]) {
        teamStats[entry.teamName] = {
          team_name: entry.teamName,
          totalScore: 0,
          mysteries: [],
          completedCount: 0,
          totalTime: 0,
          lastCompleted: null
        };
      }
      
      teamStats[entry.teamName].totalScore += entry.score;
      teamStats[entry.teamName].totalTime += entry.timeTaken;
      teamStats[entry.teamName].mysteries.push({
        mysteryId: entry.mysteryId,
        score: entry.score,
        time: entry.timeFormatted,
        completed: entry.completed
      });
      
      if (entry.completed) {
        teamStats[entry.teamName].completedCount++;
      }
      
      if (!teamStats[entry.teamName].lastCompleted || entry.timestamp > teamStats[entry.teamName].lastCompleted) {
        teamStats[entry.teamName].lastCompleted = entry.timestamp;
      }
    });
    
    return {
      leaderboard: Object.values(teamStats)
        .sort((a, b) => b.totalScore - a.totalScore || a.totalTime - b.totalTime)
        .slice(0, limit)
        .map((team, index) => ({
          ...team,
          rank: index + 1,
          score: team.totalScore,
          time_taken: Math.floor(team.totalTime)
        }))
    };
  }

  getTeamStats(teamName) {
    const leaderboard = LocalStorageManager.get(STORAGE_KEYS.LEADERBOARD) || [];
    const teamEntries = leaderboard.filter(entry => entry.teamName === teamName);
    
    return {
      teamName,
      games: teamEntries,
      totalScore: teamEntries.reduce((sum, entry) => sum + entry.score, 0),
      averageScore: teamEntries.length > 0 ? teamEntries.reduce((sum, entry) => sum + entry.score, 0) / teamEntries.length : 0,
      completedMysteries: teamEntries.length,
      totalTime: teamEntries.reduce((sum, entry) => sum + entry.timeTaken, 0)
    };
  }

  checkCompletionStatus(teamName) {
    const leaderboard = LocalStorageManager.get(STORAGE_KEYS.LEADERBOARD) || [];
    const completedMysteries = leaderboard
      .filter(entry => entry.teamName === teamName && entry.completed)
      .map(entry => entry.mysteryId);

    return {
      teamName,
      completedMysteries,
      totalCompleted: completedMysteries.length,
      hasCompletedAll: completedMysteries.length >= 3,
      requiredMysteries: 3
    };
  }

  // Utility
  getAllMysteries() {
    return Object.keys(mysteries).map(id => parseInt(id));
  }

  async healthCheck() {
    try {
      const response = await api.get('/api/health');
      return response.data;
    } catch (error) {
      return { status: 'offline', error: error.message };
    }
  }
}

// Export singleton instance
export const gameService = new GameService();export default gameService;
