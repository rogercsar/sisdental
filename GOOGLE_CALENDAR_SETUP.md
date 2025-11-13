# Google Calendar Integration Setup

This document explains how to set up Google Calendar integration for the dental system.

## 1. Google Cloud Console Setup

### Step 1: Create a Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Note down the Project ID

### Step 2: Enable Google Calendar API
1. Go to "APIs & Services" → "Library"
2. Search for "Google Calendar API"
3. Click on it and press "Enable"

### Step 3: Create Credentials
1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "API Key"
3. Copy the API Key (this will be `VITE_GOOGLE_API_KEY`)
4. Click "Create Credentials" → "OAuth 2.0 Client IDs"
5. Configure the OAuth consent screen if prompted
6. For Application type, choose "Web application"
7. Add authorized JavaScript origins:
   - `http://localhost:5173` (for development)
   - Your production domain (e.g., `https://yourdomain.com`)
8. Copy the Client ID (this will be `VITE_GOOGLE_CLIENT_ID`)

### Step 4: Configure OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "Sistema Odontológico"
   - User support email: your email
   - Developer contact information: your email
4. Add scopes:
   - `https://www.googleapis.com/auth/calendar`
5. Add test users (if in testing mode)

## 2. Frontend Configuration

### Step 1: Environment Variables
1. Copy `.env.example` to `.env.local`
2. Fill in the Google API credentials:

```env
VITE_GOOGLE_API_KEY=your_api_key_here
VITE_GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
VITE_API_URL=http://localhost:8080
```

### Step 2: Domain Configuration
For production, make sure to:
1. Add your production domain to OAuth authorized origins
2. Update the environment variables in your deployment

## 3. How It Works

### For Doctors/Staff:
1. Go to Settings → System → Google Calendar Integration
2. Click "Connect Google Calendar"
3. Authorize the application to access your calendar
4. Choose which calendar to sync with
5. Configure sync preferences

### For Appointments:
- When creating a new appointment, there's an option to sync with Google Calendar
- If auto-sync is enabled, appointments are automatically added to Google Calendar
- Patients receive calendar invites if their email is provided
- Reminders are automatically set based on preferences

### Features:
- ✅ Create calendar events for appointments
- ✅ Update events when appointments change
- ✅ Delete events when appointments are cancelled
- ✅ Multiple calendar support
- ✅ Automatic reminders
- ✅ Patient email invitations
- ✅ Timezone handling
- ✅ Detailed event descriptions

## 4. Security Considerations

- API keys are stored in environment variables
- OAuth flow ensures secure authentication
- Users can revoke access at any time
- No sensitive patient data is stored in Google Calendar descriptions (only names and basic info)

## 5. Troubleshooting

### Common Issues:
1. **"Access blocked"** - Make sure your domain is added to authorized origins
2. **"API key invalid"** - Check if the Calendar API is enabled for your project
3. **"Sign-in failed"** - Verify OAuth consent screen is properly configured
4. **"Events not appearing"** - Check if the correct calendar is selected

### Testing:
1. Use the development server with `http://localhost:5173`
2. Test with a Google account that has Calendar access
3. Check browser console for any errors
4. Verify events appear in your Google Calendar

## 6. Production Deployment

Before deploying to production:
1. Add your production domain to OAuth authorized origins
2. Update environment variables with production values
3. Consider moving from "Testing" to "Published" in OAuth consent screen
4. Test the integration with real appointments

## 7. User Guide

### For Staff:
1. **Setup**: Go to Settings → Google Calendar Integration
2. **Connect**: Click "Connect Google Calendar" and authorize
3. **Configure**: Choose calendar and set preferences
4. **Use**: Check the sync option when creating appointments

### For Patients:
- Patients will receive calendar invites automatically (if email provided)
- They can accept/decline the invitation
- Reminders will be sent according to settings
- Updates and cancellations are automatically reflected

This integration enhances the user experience by keeping appointments synchronized across platforms and ensuring no appointments are missed.