const express = require('express');
const cors = require('cors');
const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Suppress path-to-regexp warning
process.env.NODE_OPTIONS = '--no-warnings';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'build')));

// Vertex AI Configuration
const PROJECT_ID = 'striped-sight-443116-g6';
const LOCATION = 'us-central1';
const MODEL_ID = 'gemini-2.0-flash-lite';

// Initialize Google Auth
const auth = new GoogleAuth({
  keyFilename: path.join(__dirname, 'src', 'striped-sight-443116-g6-a85ecf31e5a9.json'),
  scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});

// Helper function to get access token
async function getAccessToken() {
  try {
    const authClient = await auth.getClient();
    const token = await authClient.getAccessToken();
    return token.token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

// Helper function to call Vertex AI
async function callVertexAI(prompt, maxTokens = 1024, temperature = 0.7) {
  try {
    const accessToken = await getAccessToken();
    
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:generateContent`;
    
    const requestBody = {
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: prompt
            }
          ]
        }
      ],
      generationConfig: {
        temperature: temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      }
    };

    const response = await axios.post(endpoint, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Vertex AI API Error:', error.response?.data || error.message);
    throw new Error('Failed to generate AI response');
  }
}

// Authentication endpoints

// Authentication endpoints
app.post('/api/auth/google-token', async (req, res) => {
  try {
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    res.json({
      access_token: accessToken.token,
      expires_in: 3600
    });
  } catch (error) {
    console.error('Google token error:', error);
    res.status(500).json({ error: 'Failed to get access token' });
  }
});

app.post('/api/auth/service-account', async (req, res) => {
  try {
    const { projectId, scopes } = req.body;
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    
    res.json({
      access_token: accessToken.token,
      expires_in: 3600,
      project_id: projectId
    });
  } catch (error) {
    console.error('Service account error:', error);
    res.status(500).json({ error: 'Service account authentication failed' });
  }
});

// API Routes
app.post('/api/ai/generate', async (req, res) => {
  try {
    const { prompt, maxTokens, temperature } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await callVertexAI(prompt, maxTokens, temperature);
    res.json({ response });
  } catch (error) {
    console.error('Generate API Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/validate-murderer', async (req, res) => {
  try {
    console.log('Received validate-murderer request:', req.body);
    const { guess, correctMurderer, mystery } = req.body;
    
    const prompt = `
    You are validating a murderer guess in a murder mystery game.
    
    Mystery: ${mystery.title}
    Correct murderer: ${correctMurderer}
    Player's guess: ${guess}
    
    Determine if the player's guess refers to the correct murderer. Consider:
    1. Nicknames or variations of the name
    2. Partial names (first name only, last name only)
    3. Common misspellings
    4. Titles or honorifics (Mr., Dr., Lady, etc.)
    
    IMPORTANT: If the guess is incorrect, DO NOT reveal or reference the correct murderer's name or any part of it.
    
    Respond with ONLY a JSON object:
    {
      "correct": true/false,
      "confidence": 0.0-1.0,
      "reason": "brief explanation (never reveal the correct name if incorrect)"
    }
    `;

    const response = await callVertexAI(prompt, 256, 0.1);
    console.log('AI response for murderer validation:', response);
    
    try {
      // Check if response is empty or null
      if (!response || response.trim() === '') {
        console.log('Empty AI response for murderer validation');
        res.json({
          correct: false,
          confidence: 0.5,
          reason: "Unable to validate guess"
        });
        return;
      }
      
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      console.log('Cleaned response:', cleaned);
      
      // Check if cleaned response is empty
      if (!cleaned) {
        console.log('Empty cleaned response for murderer validation');
        res.json({
          correct: false,
          confidence: 0.5,
          reason: "Unable to validate guess"
        });
        return;
      }
      
      const parsed = JSON.parse(cleaned);
      console.log('Parsed response:', parsed);
      res.json(parsed);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('Original response was:', response);
      res.json({
        correct: false,
        confidence: 0.5,
        reason: "Unable to validate guess"
      });
    }
  } catch (error) {
    console.error('Validate Murderer Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/validate-motive', async (req, res) => {
  try {
    console.log('Received validate-motive request:', req.body);
    const { inputMotive, validMotives } = req.body;
    
    const prompt = `
    You are validating a motive guess in a murder mystery game.
    
    The player has provided this motive: "${inputMotive}"
    
    The valid motives for this mystery exist, but you must NEVER list, enumerate, or directly describe them in your response. Only accept answers that match the core intent and meaning of the valid motives, not just any plausible or related motive. If the player's motive is incorrect, only provide a vague, thematic nudge—never mention any specific motive or concept.
    
    Be strict: Only accept answers that truly capture the same fundamental reason for the murder as the valid motives.
    
    Respond with ONLY a JSON object:
    {
      "correct": true/false,
      "confidence": 0.0-1.0,
      "reason": "If correct, say 'Correct motive!' If incorrect, give a vague, thematic nudge only"
    }
    `;

    const response = await callVertexAI(prompt, 512, 0.1);
    console.log('AI response for motive validation:', response);
    
    try {
      // Check if response is empty or null
      if (!response || response.trim() === '') {
        console.log('Empty AI response for motive validation');
        res.json({
          correct: false,
          confidence: 0.0,
          reason: "Consider the deeper motivations behind the crime."
        });
        return;
      }
      
      const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
      console.log('Cleaned motive response:', cleaned);
      
      // Check if cleaned response is empty
      if (!cleaned) {
        console.log('Empty cleaned response for motive validation');
        res.json({
          correct: false,
          confidence: 0.0,
          reason: "Consider the deeper motivations behind the crime."
        });
        return;
      }
      
      const parsed = JSON.parse(cleaned);
      console.log('Parsed motive response:', parsed);
      
      if (!parsed.correct) {
        const vageHints = [
          "Consider emotional or personal reasons behind the crime.",
          "Think about hidden resentments or relationships.",
          "Reflect on what might drive someone to act out of desperation or passion.",
          "Sometimes the motive is rooted in the past, not just the present.",
          "Look for clues in the victim's interactions and history."
        ];
        
        parsed.reason = vageHints[Math.floor(Math.random() * vageHints.length)];
      }
      
      res.json(parsed);
    } catch (parseError) {
      console.error('JSON parse error for motive:', parseError);
      console.error('Original motive response was:', response);
      res.json({
        correct: false,
        confidence: 0.0,
        reason: "Consider the deeper motivations behind the crime."
      });
    }
  } catch (error) {
    console.error('Validate Motive Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/detective-chat', async (req, res) => {
  try {
    const { question, mystery } = req.body;
    
    const prompt = `
    You are an AI detective assistant in an interactive murder mystery game. Your job is to provide clues to help players solve the mystery, but you must never directly reveal the murderer, their motive, or outright confirm suspicions. Instead, guide players toward uncovering the truth through logical deduction.

    Response Rules:
    - DO NOT reveal the murderer or motive directly.
    - If asked, "Who is the murderer?" or "Who killed [victim]?", respond cryptically without confirmation.
    - Provide ONLY hints & subtle leads.
    - Never directly confirm or deny accusations.
    - If a player asks, "Is [suspect] the murderer?", respond with cryptic guidance.

    Current Mystery Details:
    - Title: ${mystery.title}
    - Story: ${mystery.story}

    Player's Question: "${question}"
    
    Provide a helpful but cryptic response that guides investigation without revealing answers.
    `;

    const response = await callVertexAI(prompt, 512, 0.7);
    res.json({ response });
  } catch (error) {
    console.error('Detective Chat Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔐 Authentication endpoints available at /api/auth/`);
  console.log(`🏥 Health check available at /api/health`);
});