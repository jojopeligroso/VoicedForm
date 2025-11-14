from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class UserBase(BaseModel):
    email: EmailStr
    name: Optional[str] = None


class UserCreate(UserBase):
    google_id: str


class User(UserBase):
    id: int
    google_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class FieldType(str, Enum):
    STRING = "string"
    PARAGRAPH = "paragraph"
    NUMBER = "number"
    DATE = "date"
    ENUM = "enum"


class Field(BaseModel):
    label: str
    key: str
    type: FieldType
    constraints: Optional[str] = None
    hint: Optional[str] = None
    enum_options: Optional[List[str]] = None


class Section(BaseModel):
    name: str
    fields: List[Field]


class TemplateBase(BaseModel):
    name: str
    description: Optional[str] = None
    sections: List[Section]


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    sections: Optional[List[Section]] = None


class Template(TemplateBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


class FormSessionBase(BaseModel):
    name: str
    template_id: int


class FormSessionCreate(FormSessionBase):
    pass


class FormSession(FormSessionBase):
    id: int
    user_id: int
    status: SessionStatus
    current_field_index: int
    form_data: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TranscriptionStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class AudioRecordingBase(BaseModel):
    field_key: str


class AudioRecordingCreate(AudioRecordingBase):
    session_id: int


class AudioRecording(AudioRecordingBase):
    id: int
    session_id: int
    file_path: str
    duration: Optional[int] = None
    transcription: Optional[str] = None
    normalized_value: Optional[str] = None
    confidence: Optional[int] = None
    transcription_status: TranscriptionStatus
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptionResponse(BaseModel):
    transcription: str
    normalized_value: Optional[str] = None
    confidence: int


class FormFieldUpdate(BaseModel):
    field_key: str
    value: Any
    transcription: Optional[str] = None


class GoogleAuthCallback(BaseModel):
    code: str
    state: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User
