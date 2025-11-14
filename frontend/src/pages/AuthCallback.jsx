import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuthStore } from '../utils/store';

function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code) {
        navigate('/?error=no_code');
        return;
      }

      try {
        const { access_token, user } = await authAPI.handleGoogleCallback(code, state);
        setAuth(user, access_token);
        navigate('/dashboard');
      } catch (error) {
        console.error('Authentication failed:', error);
        navigate('/?error=auth_failed');
      }
    };

    handleCallback();
  }, [searchParams, navigate, setAuth]);

  return (
    <div className="center-column" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <div className="text-center">
        <h2>Authenticating...</h2>
        <p>Please wait while we sign you in.</p>
      </div>
    </div>
  );
}

export default AuthCallback;
