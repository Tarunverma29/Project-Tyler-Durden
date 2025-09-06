from sqlalchemy import Boolean, Column, Integer, String, Date, JSON, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # User profile
    name = Column(String, index=True)
    age = Column(Integer)
    gender = Column(String)
    country = Column(String)
    state = Column(String)
    city = Column(String)
    local_language = Column(String)
    education_level = Column(String)
    consent_given = Column(Boolean, default=False)

    # Relationships
    moods = relationship("Mood", back_populates="owner")
    screening_responses = relationship("ScreeningResponse", back_populates="owner")


class Mood(Base):
    __tablename__ = "moods"

    id = Column(Integer, primary_key=True, index=True)
    score = Column(Integer, nullable=False)
    notes = Column(String, nullable=True)
    date = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="moods")


class ScreeningResponse(Base):
    __tablename__ = "screening_responses"

    id = Column(Integer, primary_key=True, index=True)
    questionnaire_name = Column(String, index=True, nullable=False)
    responses = Column(JSON, nullable=False)
    score = Column(Integer, nullable=False)
    severity = Column(String, nullable=False)
    date = Column(Date, nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"))

    owner = relationship("User", back_populates="screening_responses")

