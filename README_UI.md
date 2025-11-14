# VoicedForm - Voice-Based Form Completion

A modern web application for completing forms using voice input, powered by OpenAI's Whisper running on Modal serverless infrastructure.

## Features

- **Google OAuth Authentication** - Secure sign-in with Google accounts
- **Template Management** - Create custom form templates with sections and fields
- **Voice Input** - Record answers using your microphone
- **Real-time Transcription** - Automatic speech-to-text using Whisper AI
- **Smart Normalization** - Converts transcriptions into structured data
- **Review & Edit** - Review all answers before final submission
- **Clean UI** - Minimal, high-contrast interface optimized for productivity

## Architecture

### Backend (FastAPI)
- **Framework**: FastAPI with SQLAlchemy ORM
- **Database**: SQLite (easily upgradable to PostgreSQL)
- **Authentication**: JWT tokens with Google OAuth2
- **AI Integration**: Modal serverless with Whisper for transcription

### Frontend (React)
- **Framework**: React 18 with Vite
- **Routing**: React Router v6
- **State Management**: Zustand
- **Styling**: Custom CSS with CSS variables
- **Audio**: Web Audio API for recording

## Setup Instructions

### Prerequisites

- Python 3.9+
- Node.js 18+
- Google Cloud Console account (for OAuth)
- Modal account (for Whisper transcription)

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

Edit `.env` file with your credentials:

```env
DATABASE_URL=sqlite:///./voicedform.db
SECRET_KEY=<generate-random-secret-key>
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
CORS_ORIGINS=http://localhost:3000
MODAL_TOKEN_ID=<your-modal-token-id>
MODAL_TOKEN_SECRET=<your-modal-token-secret>
```

### 2. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client ID"
5. Application type: Web application
6. Authorized redirect URIs: `http://localhost:3000/auth/callback`
7. Copy Client ID and Client Secret to `.env`

### 3. Modal Setup

```bash
# Install Modal CLI
pip install modal

# Authenticate with Modal
modal token new

# Deploy Whisper function
modal deploy app/modal_whisper.py
```

Your Modal token will be automatically configured. If needed, you can find it at `~/.modal.toml`.

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:8000
```

### 5. Run the Application

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --reload
```

Backend will run on: http://localhost:8000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend will run on: http://localhost:3000

## Usage Guide

### 1. Sign In
- Navigate to http://localhost:3000
- Click "Sign in with Google"
- Authorize the application

### 2. Create a Template

1. Click "New Template" in the Templates panel
2. Enter template name and description
3. Click "Add Section" to create sections
4. For each section, click "Add Field" and configure:
   - **Label**: Display name (e.g., "Date of Incident")
   - **Key**: Unique identifier (e.g., "incident_date")
   - **Type**: string | paragraph | number | date | enum
   - **Constraints**: Optional validation rules
   - **Hint**: Help text for users
5. Click "Save"

### 3. Start a Form Session

1. From Dashboard, select a template from dropdown
2. Enter a session name (e.g., "Weekly Report - Jan 15")
3. Click "Start Session"

### 4. Complete Form with Voice

1. Read the field label and hint
2. Click the microphone button to start recording
3. Speak your answer clearly
4. Click again to stop recording
5. Wait for transcription and normalization
6. Review the interpreted value
7. Click "Edit" to manually correct if needed
8. Click "Accept & Next" to continue
9. Use "Back" to return to previous fields

### 5. Review and Submit

1. After completing all fields, you'll see the Review page
2. Click any value to edit it inline
3. Check validation status for each field
4. Click "Generate PDF & Send Email" when ready

## UI Overview

### Landing Page (/)
- Minimal design with Google sign-in button
- Auto-redirects if already authenticated

### Dashboard (/dashboard)
Three main panels:
- **Templates**: List and manage form templates
- **Start a Form**: Quick access to create new sessions
- **Recent Sessions**: View and resume previous sessions

### Template Editor (/templates/:id)
- Section-based organization
- Field configuration with multiple types
- Drag-free, keyboard-navigable interface

### Form Completion (/forms/:sessionId)
- Large record button (red when recording)
- Live transcription display
- Normalized value with confidence score
- Navigation: Back, Edit, Accept buttons
- Progress bar at top

### Review Page (/forms/:sessionId/review)
- Tabular view of all fields
- Inline editing
- Validation status badges
- PDF generation and email sending

## API Endpoints

### Authentication
- `GET /api/auth/google/login` - Get Google OAuth URL
- `POST /api/auth/google/callback` - Handle OAuth callback
- `GET /api/auth/me` - Get current user

### Templates
- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PUT /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template

### Sessions
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get session
- `POST /api/sessions/:id/upload-audio` - Upload and transcribe audio
- `POST /api/sessions/:id/update-field` - Update field value
- `POST /api/sessions/:id/complete` - Mark session as completed

## Customization

### Field Types

**String**: Single-line text
```javascript
{ type: "string", constraints: "required,max:100" }
```

**Paragraph**: Multi-line text
```javascript
{ type: "paragraph", constraints: "required,min:50" }
```

**Number**: Numeric values
```javascript
{ type: "number", constraints: "min:0,max:100" }
```

**Date**: Date values
```javascript
{ type: "date", constraints: "required" }
```

**Enum**: Predefined options
```javascript
{
  type: "enum",
  enum_options: ["Low", "Medium", "High"],
  constraints: "required"
}
```

### Styling

All styles are in `/frontend/src/styles/global.css` using CSS variables:

```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #7c3aed;
  --spacing-md: 1rem;
  /* etc */
}
```

## Troubleshooting

### Audio Recording Fails
- Check browser permissions for microphone
- Ensure HTTPS (or localhost)
- Try different browser (Chrome/Firefox recommended)

### Transcription Errors
- Verify Modal is deployed: `modal app list`
- Check Modal logs: `modal app logs voicedform-whisper`
- Ensure audio format is supported (WAV, MP3)

### Authentication Issues
- Verify Google OAuth redirect URI matches exactly
- Check CORS settings in backend
- Clear browser cookies and try again

### Database Issues
```bash
# Reset database
rm backend/voicedform.db
# Restart backend to recreate tables
```

## Production Deployment

### Backend
1. Use PostgreSQL instead of SQLite
2. Set strong `SECRET_KEY`
3. Configure HTTPS
4. Set production `CORS_ORIGINS`
5. Use environment variables (not .env file)

### Frontend
1. Build production bundle: `npm run build`
2. Serve static files with nginx/Cloudflare
3. Update `VITE_API_URL` to production backend

### Modal
- Production deployment is automatic
- Monitor usage in Modal dashboard
- Consider upgrading GPU for higher volume

## Development

### Backend Tests
```bash
cd backend
pytest tests/
```

### Frontend Lint
```bash
cd frontend
npm run lint
```

### Hot Reload
Both backend and frontend support hot reload during development.

## License

Internal tool - All rights reserved

## Support

For issues or questions, contact the development team.
