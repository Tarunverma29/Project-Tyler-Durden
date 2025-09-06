from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import date
from fastapi.middleware.cors import CORSMiddleware

import models, schemas, security
from database import Base, engine, SessionLocal

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI()

# --- CORS ---
origins = [
    "http://localhost",
    "http://localhost:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DB Dependency ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- Scoring ---
def score_phq9(responses: list[int]):
    score = sum(responses)
    if 0 <= score <= 4: return score, "Minimal depression"
    elif 5 <= score <= 9: return score, "Mild depression"
    elif 10 <= score <= 14: return score, "Moderate depression"
    elif 15 <= score <= 19: return score, "Moderately severe depression"
    elif 20 <= score <= 27: return score, "Severe depression"
    return score, "Unknown"

def score_gad7(responses: list[int]):
    score = sum(responses)
    if 0 <= score <= 4: return score, "Minimal anxiety"
    elif 5 <= score <= 9: return score, "Mild anxiety"
    elif 10 <= score <= 14: return score, "Moderate anxiety"
    elif 15 <= score <= 21: return score, "Severe anxiety"
    return score, "Unknown"

# --- Auth ---
@app.post("/token", response_model=schemas.Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = security.get_user(db, email=form_data.username)
    if not user or not security.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    access_token = security.create_access_token(data={"sub": user.email})
    return {"access_token": access_token, "token_type": "bearer"}

# --- Users ---
@app.post("/users/", response_model=schemas.User, status_code=status.HTTP_201_CREATED)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = security.get_user(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = security.get_password_hash(user.password)
    db_user = models.User(**user.dict(exclude={"password"}), hashed_password=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/users/me/", response_model=schemas.User)
def read_users_me(current_user: models.User = Depends(security.get_current_user)):
    return current_user

@app.patch("/users/me/consent", response_model=schemas.User)
def update_consent(
    consent_data: schemas.ConsentUpdate,
    current_user: models.User = Depends(security.get_current_user),
    db: Session = Depends(get_db),
):
    # Reattach current_user to this session
    user = db.merge(current_user)
    user.consent_given = consent_data.consent_given
    db.commit()
    db.refresh(user)
    return user

# --- Moods ---
@app.post("/moods/", status_code=status.HTTP_201_CREATED)
def create_mood(mood: schemas.MoodCreate, current_user: models.User = Depends(security.get_current_user), db: Session = Depends(get_db)):
    user = db.merge(current_user)  # ✅ fix detached instance
    db_mood = models.Mood(**mood.dict(), owner_id=user.id)
    db.add(db_mood)
    db.commit()
    db.refresh(db_mood)
    return db_mood

# --- Screenings ---
@app.post("/screenings/", response_model=schemas.ScreeningResponseData, status_code=status.HTTP_201_CREATED)
def create_screening(response: schemas.ScreeningResponseCreate, current_user: models.User = Depends(security.get_current_user), db: Session = Depends(get_db)):
    if response.questionnaire_name.lower() == "phq-9":
        if len(response.responses) != 9:
            raise HTTPException(status_code=400, detail="PHQ-9 requires 9 responses.")
        score, severity = score_phq9(response.responses)
    elif response.questionnaire_name.lower() == "gad-7":
        if len(response.responses) != 7:
            raise HTTPException(status_code=400, detail="GAD-7 requires 7 responses.")
        score, severity = score_gad7(response.responses)
    else:
        raise HTTPException(status_code=400, detail="Unknown questionnaire type.")

    user = db.merge(current_user)  # ✅ fix detached instance
    db_response = models.ScreeningResponse(
        questionnaire_name=response.questionnaire_name,
        responses={"answers": response.responses},
        score=score,
        severity=severity,
        date=date.today(),
        owner_id=user.id
    )
    db.add(db_response)
    db.commit()
    db.refresh(db_response)
    return db_response

# --- Root ---
@app.get("/")
def root():
    return {"message": "Welcome to the Mental Health App API!"}

