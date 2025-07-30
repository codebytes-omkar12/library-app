import axios from 'axios';

// Create a new instance of axios with a custom configuration
const api = axios.create({
  // The base URL for all API requests will be your backend server
  baseURL: 'http://localhost:3000',

  // This allows the browser to send cookies (like your session cookie)
  // with every request to the backend. This is CRITICAL for keeping the user logged in.
  withCredentials: true
});

export default api;