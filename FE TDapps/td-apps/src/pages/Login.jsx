import '../assets/css/login.css';
import React, { useState, useEffect } from 'react';
import QRcodes from '../assets/frame.svg';
import { NavLink, useNavigate } from 'react-router-dom';
import Logo from '../assets/New_Logo_TVRI.png';
import axios from 'axios';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();

  // Konfigurasi axios agar bisa kirim cookie
  axios.defaults.withCredentials = true;

  const Auth = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/login', {
        username,
        password,
      });
      navigate('/listtd'); // redirect ke halaman listtd
    } catch (error) {
      if (error.response) {
        setMsg(error.response.data.message || 'Login gagal');
      } else {
        setMsg('Tidak dapat terhubung ke server');
      }
    }
  };

  useEffect(() => {
    document.body.classList.add('login-page');

    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');

    if (signUpButton && signInButton && container) {
      signUpButton.addEventListener('click', () =>
        container.classList.add('right-panel-active')
      );
      signInButton.addEventListener('click', () =>
        container.classList.remove('right-panel-active')
      );
    }

    return () => {
      document.body.classList.remove('login-page');
      if (signUpButton && signInButton) {
        signUpButton.replaceWith(signUpButton.cloneNode(true));
        signInButton.replaceWith(signInButton.cloneNode(true));
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
            {msg && <p className="error-message">{msg}</p>}

            <img src={Logo} className="logo" alt="logo TVRI" width={150} />
            <h1>Technical Director</h1>
            <span>Use your account</span>

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <a href="#">Forgot your password?</a>
            <button type="submit" className="btn-login">
              Login
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
