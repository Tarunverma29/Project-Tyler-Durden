import React, { useState, useEffect } from 'react';
import axios from 'axios';

// --- Configuration ---
const API_URL = 'http://127.0.0.1:8000';

// --- Main App Component ---
export default function App() {
  const [authState, setAuthState] = useState({ token: null, isLoading: true, user: null });
  const [currentScreen, setCurrentScreen] = useState('auth'); // auth, consent, dashboard, screening
  const [alertInfo, setAlertInfo] = useState({ show: false, title: '', message: '' });

  const showAlert = (title, message) => setAlertInfo({ show: true, title, message });

  useEffect(() => {
    const bootstrapAsync = async () => {
      let userToken;
      try {
        userToken = localStorage.getItem('userToken');
      } catch (e) {
        console.error('Restoring token failed', e);
      }
      if (userToken) {
        setAuthState({ token: userToken, isLoading: false, user: null });
        fetchUserData(userToken);
      } else {
        setAuthState({ token: null, isLoading: false, user: null });
        setCurrentScreen('auth');
      }
    };
    bootstrapAsync();
  }, []);

  const fetchUserData = async (token) => {
    try {
      const response = await axios.get(`${API_URL}/users/me/`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const user = response.data;
      setAuthState(prev => ({ ...prev, user, isLoading: false }));
      if (!user.consent_given) {
        setCurrentScreen('consent');
      } else {
        setCurrentScreen('dashboard');
      }
    } catch (error) {
      console.error("Failed to fetch user data", error);
      signOut(); // Token might be invalid
    }
  };

  const signIn = async (email, password) => {
    try {
      const formData = new FormData();
      formData.append('username', email);
      formData.append('password', password);

      const response = await axios.post(`${API_URL}/token`, formData);
      const userToken = response.data.access_token;
      localStorage.setItem('userToken', userToken);
      setAuthState({ token: userToken, isLoading: false, user: null });
      fetchUserData(userToken);
    } catch (error) {
      const detail = error.response?.data?.detail || 'An unexpected error occurred.';
      showAlert('Login Failed', detail);
    }
  };

  const signUp = async (userData) => {
     try {
      await axios.post(`${API_URL}/users/`, userData);
      await signIn(userData.email, userData.password);
    } catch (error) {
      const detail = error.response?.data?.detail || 'An unexpected error occurred.';
      showAlert('Sign-up Failed', detail);
    }
  };
  
  const signOut = () => {
    localStorage.removeItem('userToken');
    setAuthState({ token: null, isLoading: false, user: null });
    setCurrentScreen('auth');
  };

  const giveConsent = async () => {
     try {
        await axios.patch(`${API_URL}/users/me/consent`, { consent_given: true }, {
            headers: { Authorization: `Bearer ${authState.token}` }
        });
        setAuthState(prev => ({...prev, user: {...prev.user, consent_given: true}}));
        setCurrentScreen('dashboard');
    } catch (error) {
        showAlert('Error', 'Could not save your consent. Please try again.');
    }
  };

  if (authState.isLoading) {
    return <div style={styles.container}><p>Loading...</p></div>;
  }

  const renderScreen = () => {
    switch(currentScreen) {
        case 'auth':
            return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
        case 'consent':
            return <ConsentScreen onConsent={giveConsent} />;
        case 'dashboard':
            return <DashboardScreen user={authState.user} onSignOut={signOut} onNavigate={setCurrentScreen} token={authState.token} showAlert={showAlert} />;
        case 'screening':
            return <ScreeningScreen onComplete={() => setCurrentScreen('dashboard')} token={authState.token} showAlert={showAlert} />;
        default:
            return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
    }
  }

  return (
    <div style={styles.appContainer}>
      {alertInfo.show && <AlertModal title={alertInfo.title} message={alertInfo.message} onClose={() => setAlertInfo({ show: false, title: '', message: '' })} />}
      <div style={styles.container}>
        {renderScreen()}
      </div>
    </div>
  );
}

// --- Screens & Components ---

const AlertModal = ({ title, message, onClose }) => (
  <div style={styles.modalBackdrop}>
    <div style={styles.modalContent}>
      <h2 style={styles.cardTitle}>{title}</h2>
      <p style={styles.paragraph}>{message}</p>
      <button style={styles.button} onClick={onClose}>OK</button>
    </div>
  </div>
);

const AuthScreen = ({ onSignIn, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Sign up fields
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [region, setRegion] = useState('');
  const [localLanguage, setLocalLanguage] = useState('');
  const [educationLevel, setEducationLevel] = useState('');
  
  const handleAuthAction = (e) => {
    e.preventDefault();
    if (isLogin) {
      onSignIn(email, password);
    } else {
      const userData = { email, password, name, age: parseInt(age), gender, region, local_language: localLanguage, education_level: educationLevel };
      onSignUp(userData);
    }
  };

  return (
    <div style={styles.authContainer}>
      <h1 style={styles.title}>{isLogin ? 'Welcome Back!' : 'Create Account'}</h1>
      <form onSubmit={handleAuthAction} style={{width: '100%'}}>
        {!isLogin && (
          <>
            <input style={styles.input} placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
            <input style={styles.input} placeholder="Age" value={age} onChange={e => setAge(e.target.value)} type="number" required />
            <input style={styles.input} placeholder="Gender" value={gender} onChange={e => setGender(e.target.value)} />
            <input style={styles.input} placeholder="Region (e.g., Country, State)" value={region} onChange={e => setRegion(e.target.value)} />
            <input style={styles.input} placeholder="Primary Language" value={localLanguage} onChange={e => setLocalLanguage(e.target.value)} />
            <input style={styles.input} placeholder="Education Level" value={educationLevel} onChange={e => setEducationLevel(e.target.value)} />
          </>
        )}
        
        <input style={styles.input} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} type="email" required />
        <input style={styles.input} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} type="password" required />
        
        <button style={styles.button} type="submit">
          {isLogin ? 'Login' : 'Sign Up'}
        </button>
      </form>
      <button onClick={() => setIsLogin(!isLogin)} style={styles.switchButton}>
          {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Login'}
      </button>
    </div>
  );
};

const ConsentScreen = ({ onConsent }) => (
    <div style={styles.page}>
        <h1 style={styles.title}>Consent</h1>
        <p style={styles.paragraph}>This application collects personal and sensitive data to provide mental health support. Your data will be stored securely and encrypted.</p>
        <p style={styles.paragraph}>By clicking "I Agree," you consent to the collection and processing of your data. You can withdraw your consent at any time.</p>
        <button style={styles.button} onClick={onConsent}>I Agree</button>
    </div>
);

const DashboardScreen = ({ user, onSignOut, onNavigate, token, showAlert }) => {
    const emojis = ['😞', '😟', '😐', '🙂', '😄'];
    const [notes, setNotes] = useState('');

    const handleMoodSubmit = async (score) => {
        try {
            const moodData = {
                score: score + 1, // 1-5
                notes: notes,
                date: new Date().toISOString().split('T')[0] // YYYY-MM-DD
            };
            await axios.post(`${API_URL}/moods/`, moodData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            showAlert('Success', 'Your mood has been logged!');
            setNotes('');
        } catch(error) {
            showAlert('Error', 'Could not save your mood. Please try again.');
        }
    };
    
    return (
        <div style={styles.page}>
            <header style={styles.header}>
              <h1 style={styles.title}>Hello, {user?.name || 'User'}!</h1>
              <button onClick={onSignOut} style={styles.logoutButton}>Logout</button>
            </header>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>How are you feeling today?</h2>
                <div style={styles.emojiContainer}>
                    {emojis.map((emoji, index) => (
                        <button key={index} onClick={() => handleMoodSubmit(index)} style={styles.emojiButton}>
                            <span style={styles.emoji}>{emoji}</span>
                        </button>
                    ))}
                </div>
                <textarea 
                    style={{...styles.input, marginTop: 15, height: 80}} 
                    placeholder="Add a note (optional)"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                />
            </div>

            <div style={styles.card}>
                <h2 style={styles.cardTitle}>Screening Tools</h2>
                <p style={styles.paragraph}>Take a quick check-up to understand your mental state.</p>
                <button style={styles.button} onClick={() => onNavigate('screening')}>
                    Take PHQ-9 Depression Test
                </button>
            </div>
        </div>
    );
};

const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things",
  "Feeling down, depressed, or hopeless",
  "Trouble falling or staying asleep, or sleeping too much",
  "Feeling tired or having little energy",
  "Poor appetite or overeating",
  "Feeling bad about yourself",
  "Trouble concentrating on things",
  "Moving or speaking slowly, or being fidgety/restless",
  "Thoughts that you would be better off dead or of hurting yourself"
];
const PHQ9_OPTIONS = ["Not at all (0)", "Several days (1)", "More than half (2)", "Nearly every day (3)"];


const ScreeningScreen = ({ onComplete, token, showAlert }) => {
    const [responses, setResponses] = useState(Array(PHQ9_QUESTIONS.length).fill(null));

    const setResponse = (qIndex, value) => {
        const newResponses = [...responses];
        newResponses[qIndex] = value;
        setResponses(newResponses);
    };

    const handleSubmit = async () => {
        if (responses.includes(null)) {
            showAlert('Incomplete', 'Please answer all questions.');
            return;
        }
        try {
            const responseData = { questionnaire_name: "phq-9", responses };
            const result = await axios.post(`${API_URL}/screenings/`, responseData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            const { score, severity } = result.data;
            showAlert(
                'Screening Complete', 
                `Your Score: ${score}\nSeverity: ${severity}\n\nPlease note: This is a screening tool, not a diagnosis. Consult a healthcare professional for advice.`
            );
            onComplete();
        } catch(error) {
             showAlert('Error', 'Could not save your screening results. Please try again.');
        }
    };

    return (
        <div style={styles.page}>
            <h1 style={styles.title}>PHQ-9 Depression Screening</h1>
            <p style={styles.paragraph}>Over the last 2 weeks, how often have you been bothered by any of the following problems?</p>
            {PHQ9_QUESTIONS.map((question, qIndex) => (
                <div key={qIndex} style={styles.questionCard}>
                    <p style={styles.questionText}>{qIndex + 1}. {question}</p>
                    <div style={styles.optionsContainer}>
                        {PHQ9_OPTIONS.map((option, rIndex) => (
                            <button 
                                key={rIndex} 
                                style={{...styles.optionButton, ...(responses[qIndex] === rIndex ? styles.optionSelected : {})}}
                                onClick={() => setResponse(qIndex, rIndex)}
                            >
                                {option}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
            <button style={styles.button} onClick={handleSubmit}>Submit & See Score</button>
            <button style={{...styles.button, ...styles.buttonSecondary}} onClick={onComplete}>Back to Dashboard</button>
        </div>
    );
};


// --- Styles ---

const styles = {
  appContainer: { fontFamily: 'sans-serif', backgroundColor: '#F0F4F8', minHeight: '100vh'},
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto',
  },
  authContainer: { width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  page: { width: '100%', padding: '10px' },
  title: { fontSize: '28px', fontWeight: 'bold', color: '#102A43', marginBottom: '20px', textAlign: 'center' },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    height: '50px',
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '0 15px',
    fontSize: '16px',
    marginBottom: '12px',
    border: '1px solid #D9E2EC'
  },
  button: {
    width: '100%',
    height: '50px',
    backgroundColor: '#4A90E2',
    borderRadius: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '10px',
    color: '#FFFFFF',
    fontSize: '18px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
  },
  switchButton: { color: '#4A90E2', marginTop: '20px', fontSize: '16px', background: 'none', border: 'none', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '20px' },
  logoutButton: { color: '#D0021B', fontSize: '16px', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' },
  card: {
    width: '100%',
    boxSizing: 'border-box',
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    boxShadow: '0 2px 4px rgba(16,42,67,0.1)',
  },
  cardTitle: { fontSize: '20px', fontWeight: '600', color: '#102A43', marginBottom: '10px' },
  paragraph: { fontSize: '16px', color: '#334E68', lineHeight: '1.5', marginBottom: '15px' },
  emojiContainer: { display: 'flex', justifyContent: 'space-around', marginTop: '10px' },
  emojiButton: { padding: '5px', background: 'none', border: 'none', cursor: 'pointer' },
  emoji: { fontSize: '36px' },
  questionCard: { marginBottom: '20px' },
  questionText: { fontSize: '16px', color: '#334E68', marginBottom: '10px', lineHeight: '1.4' },
  optionsContainer: { display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' },
  optionButton: {
    backgroundColor: '#F0F4F8',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '8px',
    width: '48%',
    fontSize: '14px',
    color: '#334E68',
    border: 'none',
    cursor: 'pointer',
    textAlign: 'center',
  },
  optionSelected: { backgroundColor: '#4A90E2', color: '#FFFFFF' },
  buttonSecondary: { backgroundColor: 'transparent', border: '1px solid #4A90E2', color: '#4A90E2', marginTop: '10px' },
  modalBackdrop: {
    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
    justifyContent: 'center', alignItems: 'center', zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white', padding: '20px', borderRadius: '8px',
    width: '90%', maxWidth: '400px', textAlign: 'center'
  },
};


