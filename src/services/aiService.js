// AI Service - Direct Vertex AI Integration
import axios from 'axios';
import { getAccessToken } from './authService';

// Vertex AI Configuration
const VERTEX_AI_ENDPOINT = 'https://us-central1-aiplatform.googleapis.com/v1/projects/striped-sight-443116-g6/locations/us-central1/publishers/google/models/gemini-2.0-flash-lite:generateContent';

// Vertex AI API call
const callVertexAI = async (prompt, maxTokens = 1024, temperature = 0.7) => {
  try {
    const accessToken = await getAccessToken();
    
    const requestBody = {
      contents: [{
        parts: [{
          text: prompt
        }]
      }],
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: temperature,
        topP: 0.8,
        topK: 40
      }
    };

    const response = await axios.post(VERTEX_AI_ENDPOINT, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.data && response.data.candidates && response.data.candidates[0]) {
      return response.data.candidates[0].content.parts[0].text;
    } else {
      throw new Error('Invalid response from Vertex AI');
    }
  } catch (error) {
    console.error('Vertex AI API error:', error);
    throw new Error('AI service unavailable');
  }
};

// AI Validation Functions
export const validateMurdererWithAI = async (guess, correctMurderer, mystery) => {
  const prompt = `You are validating a murderer guess in a murder mystery game.

Mystery: ${mystery.title}
Correct murderer: ${correctMurderer}
Player's guess: ${guess}

Determine if the player's guess refers to the correct murderer. Consider:
1. Nicknames or variations of the name
2. Partial names (first name only, last name only)
3. Common misspellings
4. Titles or honorifics (Mr., Dr., Lady, etc.)

IMPORTANT: If the guess is incorrect, DO NOT reveal or reference the correct murderer's name or any part of it. Only say that the guess is incorrect and encourage the player to try again.

Respond with ONLY a JSON object:
{
  "correct": true/false,
  "confidence": 0.0-1.0,
  "reason": "brief explanation (never reveal the correct name if incorrect)"
}`;

  const response = await callVertexAI(prompt, 256, 0.1);
  
  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    throw new Error('Invalid AI response format');
  }
};

export const validateMotiveWithAI = async (inputMotive, validMotives) => {
  const prompt = `You are validating a motive guess in a murder mystery game.

The player has provided this motive: "${inputMotive}"

The valid motives for this mystery exist, but you must NEVER list, enumerate, or directly describe them in your response. Only accept answers that match the core intent and meaning of the valid motives, not just any plausible or related motive. If the player's motive is incorrect, only provide a vague, thematic nudge—never mention any specific motive or concept.

Be strict: Only accept answers that truly capture the same fundamental reason for the murder as the valid motives.

Respond with ONLY a JSON object:
{
  "correct": true/false,
  "confidence": 0.0-1.0,
  "reason": "If correct, say 'Correct motive!' If incorrect, give a vague, thematic nudge only"
}`;

  const response = await callVertexAI(prompt, 512, 0.1);
  
  try {
    const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    
    if (!parsed.correct) {
      const vagueHints = [
        "Consider emotional or personal reasons behind the crime.",
        "Think about hidden resentments or relationships.",
        "Reflect on what might drive someone to act out of desperation or passion.",
        "Sometimes the motive is rooted in the past, not just the present.",
        "Look for clues in the victim's interactions and history."
      ];
      
      parsed.reason = vagueHints[Math.floor(Math.random() * vagueHints.length)];
    }
    
    return parsed;
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    throw new Error('Invalid AI response format');
  }
};

export const generateAIHint = async (question, mystery, hintNumber) => {
  const prompt = `You are a detective providing hints for a murder mystery game.

Mystery: ${mystery.title}
Question: ${question}
Hint number: ${hintNumber + 1}

Provide a helpful but not too revealing hint that guides the player toward the solution without giving away the answer. The hint should be:
- Relevant to the specific question asked
- Appropriate for hint number ${hintNumber + 1} (more specific as hint number increases)
- Engaging and detective-like in tone
- Not too obvious or too vague

Respond with just the hint text, no additional formatting.`;

  const response = await callVertexAI(prompt, 256, 0.7);
  
  // Clean the response text
  return response
    .replace(/```[a-z]*\n?/g, '') // Remove markdown code blocks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/`(.*?)`/g, '$1') // Remove inline code formatting
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

export const getAIDetectiveChat = async (question, mystery) => {
  const prompt = `You are an experienced detective in a murder mystery game. A player is asking for your guidance.

Mystery: ${mystery.title}
Player's question: ${question}

Provide helpful, detective-like advice that guides the player without giving away the solution. Be encouraging but mysterious. Keep your response under 200 words and maintain the detective atmosphere.

Remember: You're helping them investigate, not solving the case for them.`;

  const response = await callVertexAI(prompt, 512, 0.8);
  
  // Clean the response text
  return response
    .replace(/```[a-z]*\n?/g, '') // Remove markdown code blocks
    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
    .replace(/`(.*?)`/g, '$1') // Remove inline code formatting
    .replace(/\n\s*\n/g, '\n') // Remove extra blank lines
    .replace(/^\s+|\s+$/g, '') // Trim whitespace
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

// Error handling wrapper
export const safeAICall = async (aiFunction, ...args) => {
  try {
    return await aiFunction(...args);
  } catch (error) {
    console.error('AI call failed:', error);
    throw new Error('AI service is currently unavailable. Please try again later.');
  }
}; 