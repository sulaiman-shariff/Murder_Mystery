// API Optimization Utilities for Performance Enhancement
// Now integrated with comprehensive local game service

import { gameService } from '../services/gameService';

class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.cache.clear();
  }
}

// Global cache instances
const gameStatusCache = new APICache(30 * 1000); // 30 seconds for game status
const teamStatsCache = new APICache(2 * 60 * 1000); // 2 minutes for team stats
const hintCache = new APICache(10 * 60 * 1000); // 10 minutes for hints
const leaderboardCache = new APICache(1 * 60 * 1000); // 1 minute for leaderboard

// Request debouncing utility
class RequestDebouncer {
  constructor(delay = 300) {
    this.delay = delay;
    this.timeouts = new Map();
  }

  debounce(key, fn) {
    return (...args) => {
      if (this.timeouts.has(key)) {
        clearTimeout(this.timeouts.get(key));
      }

      const timeoutId = setTimeout(() => {
        this.timeouts.delete(key);
        fn(...args);
      }, this.delay);

      this.timeouts.set(key, timeoutId);
    };
  }
}

// Request queue for API calls
class RequestQueue {
  constructor(maxConcurrent = 3) {
    this.queue = [];
    this.running = 0;
    this.maxConcurrent = maxConcurrent;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        resolve,
        reject
      });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    this.running++;
    const { fn, resolve, reject } = this.queue.shift();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process(); // Process next item in queue
    }
  }
}

// Global instances
const requestQueue = new RequestQueue(3);

// Optimized API functions - using comprehensive local game service
export const optimizedAPI = {
  // Authentication
  async registerTeam(teamName, password) {
    return requestQueue.add(async () => {
      try {
        const result = await gameService.registerTeam(teamName, password);
        return result;
      } catch (error) {
        console.error('Error registering team:', error);
        throw error;
      }
    });
  },

  async loginTeam(teamName, password) {
    return requestQueue.add(async () => {
      try {
        const result = await gameService.loginTeam(teamName, password);
        return result;
      } catch (error) {
        console.error('Error logging in team:', error);
        throw error;
      }
    });
  },

  // Game Management
  async startGame(teamName, mysteryId) {
    return requestQueue.add(async () => {
      try {
        const result = await gameService.startGame(teamName, mysteryId);
        // Clear caches after starting new game
        this.clearAllCaches();
        return result;
      } catch (error) {
        console.error('Error starting game:', error);
        throw error;
      }
    });
  },

  // Cached game status fetch
  async getGameStatus(teamName, mysteryId) {
    const cacheKey = `status_${teamName}_${mysteryId}`;
    
    if (gameStatusCache.has(cacheKey)) {
      return gameStatusCache.get(cacheKey);
    }

    return requestQueue.add(async () => {
      try {
        const data = await gameService.getGameStatus(teamName, mysteryId);
        gameStatusCache.set(cacheKey, data);
        return data;
      } catch (error) {
        console.error('Error fetching game status:', error);
        throw error;
      }
    });
  },

  // AI-Powered Validation
  async validateGuess(teamName, mysteryId, murdererGuess, motiveGuess) {
    try {
      const result = await gameService.validateGuess(teamName, mysteryId, murdererGuess, motiveGuess);
      // Clear cache after validation to get fresh data
      gameStatusCache.clear();
      return result;
    } catch (error) {
      console.error('Error validating guess:', error);
      throw error;
    }
  },

  // AI-Powered Hint System
  async getHint(teamName, mysteryId, question) {
    const cacheKey = `hint_${teamName}_${mysteryId}_${question}`;
    
    if (hintCache.has(cacheKey)) {
      return hintCache.get(cacheKey);
    }

    return requestQueue.add(async () => {
      try {
        const data = await gameService.getHint(teamName, mysteryId, question);
        hintCache.set(cacheKey, data);
        // Clear game status cache to get updated hint count
        gameStatusCache.clear();
        return data;
      } catch (error) {
        console.error('Error getting hint:', error);
        throw error;
      }
    });
  },

  // AI Detective Chat
  async sendAIChat(question, mysteryId, teamName) {
    // Don't cache AI responses as they might be contextual
    return requestQueue.add(async () => {
      try {
        const result = await gameService.getAIDetectiveChat(question, mysteryId, teamName);
        return result;
      } catch (error) {
        console.error('Error sending AI chat:', error);
        throw error;
      }
    });
  },

  // Score and Results
  async saveResult(teamName, mysteryId, timeTaken, wrongAttempts, hintsUsed, score, completed = true) {
    return requestQueue.add(async () => {
      try {
        const result = await gameService.saveResult(teamName, mysteryId, timeTaken, wrongAttempts, hintsUsed, score, completed);
        // Clear caches after saving result
        this.clearAllCaches();
        return result;
      } catch (error) {
        console.error('Error saving result:', error);
        throw error;
      }
    });
  },

  // Cached leaderboard fetch
  async getLeaderboard(limit = 50) {
    const cacheKey = `leaderboard_${limit}`;
    
    if (leaderboardCache.has(cacheKey)) {
      return leaderboardCache.get(cacheKey);
    }

    return requestQueue.add(async () => {
      try {
        const data = gameService.getLeaderboard(limit);
        leaderboardCache.set(cacheKey, data);
        return data;
      } catch (error) {
        console.error('Error fetching leaderboard:', error);
        throw error;
      }
    });
  },

  // Cached team stats fetch
  async getTeamStats(teamName) {
    const cacheKey = `team_${teamName}`;
    
    if (teamStatsCache.has(cacheKey)) {
      return teamStatsCache.get(cacheKey);
    }

    return requestQueue.add(async () => {
      try {
        const data = gameService.getTeamStats(teamName);
        teamStatsCache.set(cacheKey, data);
        return data;
      } catch (error) {
        console.error('Error fetching team stats:', error);
        throw error;
      }
    });
  },

  // Game completion status
  async checkCompletionStatus(teamName) {
    return requestQueue.add(async () => {
      try {
        const data = gameService.checkCompletionStatus(teamName);
        return data;
      } catch (error) {
        console.error('Error checking completion status:', error);
        throw error;
      }
    });
  },

  // Utility functions
  getMystery(mysteryId) {
    return gameService.getMystery(mysteryId);
  },

  getAllMysteries() {
    return gameService.getAllMysteries();
  },

  async healthCheck() {
    return requestQueue.add(async () => {
      try {
        const result = await gameService.healthCheck();
        return result;
      } catch (error) {
        console.error('Error checking health:', error);
        throw error;
      }
    });
  },

  // Admin functions
  isAdminPassword(password) {
    return gameService.isAdminPassword(password);
  },

  // Data management
  clearAllData() {
    gameService.clearAllData();
    this.clearAllCaches();
  },

  exportData() {
    return gameService.exportData();
  },

  importData(data) {
    gameService.importData(data);
    this.clearAllCaches();
  },

  // Clear all caches
  clearAllCaches() {
    gameStatusCache.clear();
    teamStatsCache.clear();
    hintCache.clear();
    leaderboardCache.clear();
  }
};

// Performance monitoring utility
export const performanceMonitor = {
  timers: new Map(),

  start(label) {
    this.timers.set(label, performance.now());
  },

  end(label) {
    const startTime = this.timers.get(label);
    if (startTime) {
      const duration = performance.now() - startTime;
      console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
      this.timers.delete(label);
      return duration;
    }
  },

  // Measure API call performance
  async measureAPICall(label, fn) {
    this.start(label);
    try {
      const result = await fn();
      this.end(label);
      return result;
    } catch (error) {
      this.end(label);
      throw error;
    }
  }
};

export { APICache, RequestDebouncer, RequestQueue };