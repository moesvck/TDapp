import '../assets/css/login.css';
import React, { useState, useEffect } from 'react';
import QRcodes from '../assets/frame.svg';
import { useNavigate } from 'react-router-dom';
import Logo from '../assets/New_Logo_TVRI.png';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { jwtDecode } from 'jwt-decode';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const Auth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg('');

    if (!username || !password) {
      setMsg('Username dan password harus diisi');
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('http://localhost:3000/login', {
        username,
        password,
      });

      console.log('Login response:', response.data);

      if (response.data.accessToken) {
        const accessToken = response.data.accessToken;

        // ✅ DECODE TOKEN UNTUK MENDAPATKAN USER DATA
        const decodedToken = jwtDecode(accessToken);
        console.log('Decoded token:', decodedToken);

        const userData = {
          id: decodedToken.userId,
          name: decodedToken.name,
          username: decodedToken.username,
          role: decodedToken.role,
        };

        // ✅ GUNAKAN LOGIN FUNCTION DARI AUTH CONTEXT
        login(accessToken, userData, true);
        console.log('Login berhasil, user role:', userData.role);

        // ✅ REDIRECT BERDASARKAN ROLE USER
        switch (userData.role) {
          case 'staff':
            navigate('/listkpp');
            break;
          case 'admin':
            navigate('/admin');
            break;
          case 'user':
            navigate('/listtd'); // Redirect ke ListTD.jsx untuk role user
            break;
          default:
            navigate('/');
            break;
        }
      } else {
        setMsg('Token tidak diterima dari server');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response) {
        setMsg(error.response.data.message || 'Login gagal');
      } else if (error.request) {
        setMsg('Tidak dapat terhubung ke server');
      } else {
        setMsg('Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.body.classList.add('login-page');

    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    const handleSignUp = () => container?.classList.add('right-panel-active');
    const handleSignIn = () =>
      container?.classList.remove('right-panel-active');

    if (signUpButton && signInButton && container) {
      signUpButton.addEventListener('click', handleSignUp);
      signInButton.addEventListener('click', handleSignIn);
    }

    return () => {
      document.body.classList.remove('login-page');
      if (signUpButton && signInButton) {
        signUpButton.removeEventListener('click', handleSignUp);
        signInButton.removeEventListener('click', handleSignIn);
      }
    };
  }, []);

  return (
    <div>
      <div className="container" id="container">
        <div className="form-container sign-up-container">
          <form action="#">
            <h1>Create Account</h1>
            <span>Scan QR Code Here</span>
            <img src={QRcodes} alt="QR Code" />
          </form>
        </div>

        <div className="form-container sign-in-container">
          <form onSubmit={Auth}>
            {msg && (
              <div className="alert alert-danger" role="alert">
                {msg}
              </div>
            )}

            <img src={Logo} className="logo" alt="logo TVRI" width={150} />
            <h1>Technical Director</h1>
            <span>Use your account</span>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />

            <a href="#">Forgot your password?</a>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Loading...' : 'Login'}
            </button>

            <p>Copyright &copy; 2025 IT TVRI SUMUT</p>
          </form>
        </div>

        <div className="overlay-container">
          <div className="overlay">
            <div className="overlay-panel overlay-left">
              <h1>Welcome Back!</h1>
              <p>
                To keep connected with us please login with your personal info
              </p>
              <button className="ghost" id="signIn">
                Sign In
              </button>
            </div>
            <div className="overlay-panel overlay-right">
              <h1>Hello, Friend!</h1>
              <p>
                Please contact the IT team to start your experience as a
                Technical Director.
              </p>
              <button className="ghost" id="signUp">
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
