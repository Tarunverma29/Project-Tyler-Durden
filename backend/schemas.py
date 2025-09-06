from pydantic import BaseModel
from datetime import date
from typing import List, Optional

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    local_language: Optional[str] = None
    education_level: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    consent_given: bool

    class Config:
        from_attributes = True

class ConsentUpdate(BaseModel):
    consent_given: bool

# --- Token Schema ---
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# --- Mood Schema ---
class MoodCreate(BaseModel):
    score: int
    notes: Optional[str] = None
    date: date

# --- Screening Schema ---
class ScreeningResponseCreate(BaseModel):
    questionnaire_name: str
    responses: List[int]

class ScreeningResponseData(BaseModel):
    score: int
    severity: str

