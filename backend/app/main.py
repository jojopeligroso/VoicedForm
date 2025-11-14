from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List
import os
import aiofiles
from datetime import datetime
import httpx
from authlib.integrations.starlette_client import OAuth

from . import models, schemas, auth
from .database import get_db, init_db
from .modal_whisper import transcribe_audio_modal

app = FastAPI(title="VoicedForm API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OAuth setup
oauth = OAuth()
oauth.register(
    name='google',
    client_id=os.getenv('GOOGLE_CLIENT_ID'),
    client_secret=os.getenv('GOOGLE_CLIENT_SECRET'),
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'},
)

# Create upload directory
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    init_db()


# Authentication endpoints
@app.get("/api/auth/google/login")
async def google_login():
    """Redirect to Google OAuth login"""
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")
    return {"auth_url": f"https://accounts.google.com/o/oauth2/v2/auth?client_id={os.getenv('GOOGLE_CLIENT_ID')}&redirect_uri={redirect_uri}&response_type=code&scope=openid email profile"}


@app.post("/api/auth/google/callback", response_model=schemas.TokenResponse)
async def google_callback(callback_data: schemas.GoogleAuthCallback, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    # Exchange code for token
    token_url = "https://oauth2.googleapis.com/token"
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/api/auth/google/callback")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            token_url,
            data={
                "code": callback_data.code,
                "client_id": os.getenv("GOOGLE_CLIENT_ID"),
                "client_secret": os.getenv("GOOGLE_CLIENT_SECRET"),
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
        )

        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code for token")

        token_data = response.json()
        access_token = token_data["access_token"]

        # Get user info
        userinfo_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )

        if userinfo_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        user_info = userinfo_response.json()

    # Create or get user
    user = auth.get_or_create_user(
        db,
        google_id=user_info["id"],
        email=user_info["email"],
        name=user_info.get("name", "")
    )

    # Create JWT token
    access_token = auth.create_access_token(data={"sub": user.id})

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@app.get("/api/auth/me", response_model=schemas.User)
async def get_current_user_info(current_user: models.User = Depends(auth.get_current_user)):
    """Get current user info"""
    return current_user


# Template endpoints
@app.post("/api/templates", response_model=schemas.Template)
async def create_template(
    template: schemas.TemplateCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new template"""
    db_template = models.Template(
        user_id=current_user.id,
        name=template.name,
        description=template.description,
        sections=[section.dict() for section in template.sections]
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


@app.get("/api/templates", response_model=List[schemas.Template])
async def list_templates(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """List all templates for current user"""
    templates = db.query(models.Template).filter(
        models.Template.user_id == current_user.id
    ).all()
    return templates


@app.get("/api/templates/{template_id}", response_model=schemas.Template)
async def get_template(
    template_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific template"""
    template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return template


@app.put("/api/templates/{template_id}", response_model=schemas.Template)
async def update_template(
    template_id: int,
    template_update: schemas.TemplateUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a template"""
    template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if template_update.name is not None:
        template.name = template_update.name
    if template_update.description is not None:
        template.description = template_update.description
    if template_update.sections is not None:
        template.sections = [section.dict() for section in template_update.sections]

    template.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(template)
    return template


@app.delete("/api/templates/{template_id}")
async def delete_template(
    template_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a template"""
    template = db.query(models.Template).filter(
        models.Template.id == template_id,
        models.Template.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db.delete(template)
    db.commit()
    return {"status": "deleted"}


# Form session endpoints
@app.post("/api/sessions", response_model=schemas.FormSession)
async def create_session(
    session: schemas.FormSessionCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new form session"""
    # Verify template exists and belongs to user
    template = db.query(models.Template).filter(
        models.Template.id == session.template_id,
        models.Template.user_id == current_user.id
    ).first()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    db_session = models.FormSession(
        user_id=current_user.id,
        template_id=session.template_id,
        name=session.name,
        form_data={}
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session


@app.get("/api/sessions", response_model=List[schemas.FormSession])
async def list_sessions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """List all sessions for current user"""
    sessions = db.query(models.FormSession).filter(
        models.FormSession.user_id == current_user.id
    ).order_by(models.FormSession.created_at.desc()).all()
    return sessions


@app.get("/api/sessions/{session_id}", response_model=schemas.FormSession)
async def get_session(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific session"""
    session = db.query(models.FormSession).filter(
        models.FormSession.id == session_id,
        models.FormSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session


@app.post("/api/sessions/{session_id}/upload-audio", response_model=schemas.TranscriptionResponse)
async def upload_audio(
    session_id: int,
    field_key: str,
    audio: UploadFile = File(...),
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Upload audio for a field and transcribe it"""
    # Verify session
    session = db.query(models.FormSession).filter(
        models.FormSession.id == session_id,
        models.FormSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save audio file
    file_path = os.path.join(UPLOAD_DIR, f"session_{session_id}_{field_key}_{datetime.utcnow().timestamp()}.wav")

    async with aiofiles.open(file_path, 'wb') as f:
        content = await audio.read()
        await f.write(content)

    # Create audio recording entry
    audio_record = models.AudioRecording(
        session_id=session_id,
        field_key=field_key,
        file_path=file_path,
        transcription_status=models.TranscriptionStatus.PROCESSING
    )
    db.add(audio_record)
    db.commit()

    # Transcribe using Modal + Whisper
    try:
        transcription_result = transcribe_audio_modal(content)

        # Update audio record
        audio_record.transcription = transcription_result["transcription"]
        audio_record.confidence = transcription_result["confidence"]
        audio_record.transcription_status = models.TranscriptionStatus.COMPLETED

        # TODO: Add field-specific normalization logic here
        # For now, just use the transcription as normalized value
        audio_record.normalized_value = transcription_result["transcription"]

        db.commit()
        db.refresh(audio_record)

        return {
            "transcription": audio_record.transcription,
            "normalized_value": audio_record.normalized_value,
            "confidence": audio_record.confidence
        }
    except Exception as e:
        audio_record.transcription_status = models.TranscriptionStatus.FAILED
        db.commit()
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")


@app.post("/api/sessions/{session_id}/update-field")
async def update_field(
    session_id: int,
    field_update: schemas.FormFieldUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a field value in the session"""
    session = db.query(models.FormSession).filter(
        models.FormSession.id == session_id,
        models.FormSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Update form data
    if not session.form_data:
        session.form_data = {}

    session.form_data[field_update.field_key] = {
        "value": field_update.value,
        "transcription": field_update.transcription
    }

    session.updated_at = datetime.utcnow()
    db.commit()

    return {"status": "updated"}


@app.post("/api/sessions/{session_id}/complete")
async def complete_session(
    session_id: int,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Mark session as completed"""
    session = db.query(models.FormSession).filter(
        models.FormSession.id == session_id,
        models.FormSession.user_id == current_user.id
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.status = models.SessionStatus.COMPLETED
    session.completed_at = datetime.utcnow()
    db.commit()

    return {"status": "completed"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
