# Gym Management Backend - Firebase Authentication Setup

## Overview
This backend uses Firebase Admin SDK for Google authentication. Users authenticate via Google on the frontend, and the backend verifies and creates its own JWT tokens for session management.

## Authentication Flow

1. **Frontend**: User clicks "Login with Google"
2. **Firebase Client SDK**: Handles Google OAuth flow, returns ID token
3. **Frontend sends**: ID token to backend `/api/auth/google` endpoint
4. **Backend**: 
   - Verifies token with Firebase Admin SDK
   - Extracts email and name from token
   - Creates or finds user in database
   - Generates own JWT token
   - Returns user data and JWT token
5. **Frontend**: Stores JWT token and uses it for subsequent requests

## Setup Instructions

### 1. Create Firebase Project
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a new project
- Enable Google authentication

### 2. Get Service Account Key
- Go to Project Settings → Service Accounts
- Click "Generate New Private Key"
- This downloads a JSON file with your credentials

### 3. Configure Environment Variables
Add the following to `.env`:

```
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
```

To convert the JSON file to a single line string:
```bash
# Linux/Mac
cat serviceAccountKey.json | tr '\n' ' '

# Windows PowerShell
(Get-Content serviceAccountKey.json) -replace "`n"," "
```

### 4. Get Google OAuth Client ID (for frontend)
- Go to Firebase Console → Authentication → Sign-in Method
- Get your Web SDK configuration
- Use the Client ID in your frontend Firebase config

## API Endpoints

### POST /api/auth/google
**Request:**
```json
{
  "firebaseToken": "ID_TOKEN_FROM_FIREBASE"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "name": "User Name",
    "email": "user@example.com",
    "role": "USER",
    "mobileNumber": ""
  },
  "token": "JWT_TOKEN"
}
```

### PATCH /api/auth/profile/:userId
**Headers:**
```
Authorization: Bearer JWT_TOKEN
```

**Request:**
```json
{
  "mobileNumber": "+91XXXXXXXXXX",
  "name": "Updated Name"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    ...user object...
  }
}
```

## Frontend Integration Example

```typescript
import { GoogleAuthProvider, signInWithPopup, getAuth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Initialize Firebase (in your frontend)
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  // ... other config
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Login handler
const handleGoogleLogin = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Get ID token
    const token = await result.user.getIdToken();
    
    // Send to backend
    const response = await fetch('YOUR_BACKEND_URL/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firebaseToken: token })
    });
    
    const { token: jwtToken, user } = await response.json();
    
    // Store JWT token
    localStorage.setItem('token', jwtToken);
    localStorage.setItem('user', JSON.stringify(user));
    
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

## Security Features

1. **Token Verification**: Firebase verifies the token is signed by Google
2. **Email Verification**: Only accepts verified emails
3. **Expiration**: Firebase tokens have built-in expiration
4. **Custom JWT**: Your backend generates its own JWT for session management
5. **Error Handling**: Specific error messages for token issues

## Troubleshooting

**"Firebase service account key not configured"**
- Make sure `FIREBASE_SERVICE_ACCOUNT_KEY` is set in .env
- Verify it's a valid JSON string (properly escaped)

**"auth/id-token-expired"**
- Frontend token has expired, user needs to re-login

**"auth/invalid-id-token"**
- Token is malformed or not from Firebase
- Verify frontend is using correct Firebase config

## Running the Server

```bash
npm run dev  # Development with hot reload
npm start    # Production
```

Server runs on port 3000 by default (configurable via PORT env var).