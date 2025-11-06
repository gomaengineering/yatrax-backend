# Google Sign-In Test Page

This is a simple test frontend for testing Google authentication with your YatraX backend.

## Setup Instructions

1. **Start your backend server:**
   ```bash
   npm run start
   ```

2. **Open the test page:**
   - Navigate to `http://localhost:3000` in your browser
   - Or open `public/index.html` directly

3. **Configure Google Client ID:**
   - Enter your Google Client ID (from `.env` file) in the configuration section
   - Enter your API URL (default: `http://localhost:3000`)
   - Click "Save Configuration"

4. **Test Google Sign-In:**
   - Click the "Sign in with Google" button
   - Select a Google account
   - View the response from your backend

## Features

- ✅ Simple, clean UI
- ✅ Configuration saved in browser localStorage
- ✅ Displays full API response
- ✅ Shows user information on successful login
- ✅ Error handling and network error messages
- ✅ Responsive design

## Requirements

- Your backend must be running on the configured port (default: 3000)
- Google Client ID must be set in `.env` file
- CORS must be enabled in your backend (already configured)

