import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuthStore } from '../utils/store';

function Landing() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const { auth_url } = await authAPI.getGoogleAuthUrl();
      window.location.href = auth_url;
    } catch (error) {
      console.error('Failed to initiate Google login:', error);
      alert('Failed to initiate Google login. Please try again.');
    }
  };

  return (
    <div className="center-column" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div className="text-center">
        <h1>VoicedForm</h1>
        <p style={{ fontSize: '1.125rem', marginBottom: '2rem' }}>
          Internal tool for voice-based form completion.
          <br />
          Streamline data entry with speech recognition.
        </p>
        <button className="btn-primary btn-large" onClick={handleGoogleLogin}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}

export default Landing;
