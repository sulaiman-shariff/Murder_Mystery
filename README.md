# 🕵️ AI-Powered Murder Mystery Game

A full-stack **Next.js** interactive murder mystery game with **AI-powered validation and hints**. The game UI and server-side Vertex AI proxy are deployed together as one Vercel project.

## 🚀 Features

### 🤖 AI-Powered Features
- **AI Murderer Validation**: Flexible name matching (nicknames, misspellings, titles)
- **AI Motive Validation**: Semantic understanding of motives, not just exact text matches
- **AI Hint Generation**: Dynamic, contextual hints based on player questions
- **AI Detective Chat**: Interactive detective assistant for guidance
- **Fallback System**: Graceful degradation to local validation if AI services are unavailable
- **Optional AI Enhancement**: Can connect to external AI services for enhanced features

### 🎮 Complete Game Features
- **3 Unique Mysteries**: Each with complex storylines and multiple suspects
- **Real-time Scoring**: Time-based penalties and bonus points
- **Progress Tracking**: Save and resume game progress
- **Leaderboard**: Compare scores with other teams
- **Team Management**: Register and manage multiple teams
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Capable**: Works without internet connection

## 🏗️ Architecture

### Unified Next.js Design
```
Next.js App (Vercel)
├── src/legacy-pages/       # Existing game screens and React Router flow
├── src/app/                # App Router shell and /api Route Handlers
├── lib/vertex.js           # Server-only Vertex AI integration
└── src/services/           # Game logic and local persistence
```

### Key Components
- **GameService**: Complete game logic and data management
- **AIValidator**: AI-powered validation with local fallback
- **LocalStorageManager**: Data persistence and session management
- **OptimizedAPI**: Performance-optimized API layer with caching

## 🚀 Quick Start

### Prerequisites
- Node.js (v20.9 or higher)
- Modern web browser

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Murder_Mystery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the game**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

### AI Configuration

Configure the server-side Vertex AI integration with:

1. **Set up environment variables**
   ```bash
   cp env.example .env
   ```

2. **Edit `.env` file** with server-only Vertex AI credentials:
   ```
   GOOGLE_CLOUD_PROJECT=striped-sight-443116-g6
   GOOGLE_CLOUD_LOCATION=us-central1
   AI_API_KEY=your_gemini_api_key
   AI_MODEL=gemini-3.5-flash-lite
   ```

`AI_API_KEY` is server-only and takes precedence over Vertex service-account authentication.

The browser uses the same deployment's `/api` endpoints by default. Set `NEXT_PUBLIC_API_URL` only if you intentionally use an external API.

## 🧪 Testing AI Features

Use the included test file to verify AI integration:

```bash
# Open in browser
open test-validation.html
```

The test page allows you to:
- Test AI murderer validation with various name formats
- Test AI motive validation with semantic understanding
- Test AI hint generation with custom questions
- Test AI detective chat functionality

## 🎯 Game Mechanics

### AI Validation Process
1. **Player submits guess** → Frontend validates with AI
2. **AI analyzes guess** → Considers context, variations, semantics
3. **AI provides feedback** → Helpful hints without spoilers
4. **Fallback if needed** → Local validation if AI unavailable

### Scoring System
- **Base Score**: 1000 points
- **Time Penalty**: -10 points per minute
- **Wrong Guess Penalty**: -200 points per wrong attempt
- **Hint Penalty**: -100 points per hint used
- **Speed Bonus**: +50 points for completing under 30 minutes

## 🔧 Configuration

### AI Settings
- **Temperature**: 0.1 for validation (consistent), 0.7 for hints (creative)
- **Max Tokens**: 256 for validation, 512 for hints
- **Confidence Threshold**: 0.8 for accepting AI validation

### Performance Settings
- **Cache TTL**: 5 minutes for API responses
- **Debounce Delay**: 300ms for user input
- **Request Queue**: Max 3 concurrent requests

## 📊 Data Management

### Local Storage Structure
- **Teams**: Registered team information
- **Game Sessions**: Active and completed game sessions
- **Leaderboard**: Global leaderboard data
- **Completed Mysteries**: Progress tracking

### Data Export/Import
```javascript
// Export all data
const data = gameService.exportData();

// Import data
gameService.importData(data);

// Clear all data
gameService.clearAllData();
```

## 🚀 Deployment

### Vercel

1. **Build the app**
   ```bash
   npm run build
   ```

2. **Deploy to your preferred platform**
   - Import the repository into Vercel (framework preset: Next.js)
   - Add `AI_API_KEY` (and optionally `AI_MODEL`) in Project Settings → Environment Variables. Vertex variables remain available as a fallback.
   - Deploy; Vercel runs `npm run build`

### Environment Variables
For production with AI features:
```
NEXT_PUBLIC_API_URL=
```

## 🛠️ Development

### Project Structure
```
src/
├── components/          # React components
├── app/                # Next.js App Router and API routes
├── legacy-pages/       # Existing game page components
├── services/           # Game logic and AI integration
├── utils/              # Utilities and optimizations
├── styles/             # CSS files
└── data/               # Game data and mysteries
```

### Key Files
- `src/services/gameService.js` - Complete game logic
- `src/utils/apiOptimizer.js` - Performance optimization
- `src/data/mysteries.js` - Mystery content
- `test-validation.html` - AI feature testing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test the AI features
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues with AI features:
1. Check the Vercel function logs and server-side environment variables
2. Test with the included `test-validation.html` file
3. Check the browser console for error messages
4. Verify environment variables are set correctly

## 🎉 Features Summary

### ✅ What's Included
- **Complete game logic** in the frontend
- **AI validation** with local fallback
- **Team management** and authentication
- **Leaderboard** and scoring system
- **Progress tracking** and session management
- **Responsive design** for all devices
- **Offline capability** (works without internet)

### 🔧 Optional Enhancements
- **External AI services** for enhanced validation
- **Real-time multiplayer** (future feature)
- **Cloud synchronization** (future feature)
- **Advanced analytics** (future feature)

---

**Happy Detective Work! 🕵️‍♀️**

*The game state remains browser-local; AI requests run through secure server-side Next.js routes.*
