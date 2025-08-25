// Authentication Service for Vertex AI
import axios from 'axios';

// Google Cloud Service Account Authentication
class GoogleAuthService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    // Check if we have a valid token
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      // For development, use the service account key
      const response = await axios.post('/api/auth/google-token', {
        // You can pass any additional parameters here
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Set expiry to 1 hour from now (minus 5 minutes buffer)
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        return this.accessToken;
      } else {
        throw new Error('Invalid token response');
      }
    } catch (error) {
      console.error('Failed to get access token:', error);
      
      // Fallback: try to use the service account directly
      try {
        const serviceAccountResponse = await this.getServiceAccountToken();
        this.accessToken = serviceAccountResponse.access_token;
        this.tokenExpiry = Date.now() + (55 * 60 * 1000);
        return this.accessToken;
      } catch (fallbackError) {
        console.error('Service account fallback failed:', fallbackError);
        throw new Error('Authentication failed');
      }
    }
  }

  async getServiceAccountToken() {
    try {
      // This would need to be implemented on your backend
      // For now, we'll use a mock implementation
      const response = await axios.post('/api/auth/service-account', {
        projectId: 'striped-sight-443116-g6',
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });

      return response.data;
    } catch (error) {
      console.error('Service account authentication failed:', error);
      throw new Error('Service account authentication failed');
    }
  }

  clearToken() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

// Create singleton instance
export const googleAuthService = new GoogleAuthService();

// Export the getAccessToken function for use in aiService
export const getAccessToken = () => googleAuthService.getAccessToken(); 