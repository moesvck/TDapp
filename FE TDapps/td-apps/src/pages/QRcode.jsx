import React, { useState, useEffect, useRef } from 'react';
import Typed from 'typed.js';
import batmanImage from '../assets/images/batman.jpg';

function QRcode() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const typedRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  useEffect(() => {
    if (!isLoading) {
      const options = {
        strings: ['Stasiun Sumatera Utara'],
        typeSpeed: 40,
        backSpeed: 40,
        backDelay: 1600,
        loop: true,
      };

      typedRef.current = new Typed('.element', options);

      return () => {
        if (typedRef.current) {
          typedRef.current.destroy();
        }
      };
    }
  }, [isLoading]);

  // Apply dark mode class to container
  useEffect(() => {
    if (containerRef.current) {
      if (isDarkMode) {
        containerRef.current.classList.add('qr-dark-mode');
      } else {
        containerRef.current.classList.remove('qr-dark-mode');
      }
    }
  }, [isDarkMode]);

  // Isolated CSS styles hanya untuk komponen ini
  const qrCodeStyles = `
    .qr-code-page {
      --bg-primary: #ffffff;
      --bg-secondary: #f8f9fa;
      --text-primary: #333333;
      --text-secondary: #666666;
      --card-bg: #ffffff;
      --border-color: #dee2e6;
      --primary-color: #007bff;
      --primary-hover: #0056b3;
      --social-bg: #6c757d;
      --social-hover: #545b62;
    }
    
    .qr-code-page.qr-dark-mode {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2d2d2d;
      --text-primary: #ffffff;
      --text-secondary: #b0b0b0;
      --card-bg: #2d2d2d;
      --border-color: #404040;
      --primary-color: #0d6efd;
      --primary-hover: #0b5ed7;
      --social-bg: #495057;
      --social-hover: #343a40;
    }

    .qr-code-page {
      background-color: var(--bg-primary);
      min-height: 100vh;
      padding: 60px 15px 40px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      transition: all 0.3s ease;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .qr-code-container {
      background-color: var(--card-bg);
      border-radius: 20px;
      padding: 60px 30px 40px;
      max-width: 450px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0,0,0,0.1);
      border: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 25px;
      position: relative;
      transition: all 0.3s ease;
      margin-top: 40px;
    }

    .qr-profile-image-container {
      position: absolute;
      top: -60px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 2;
    }

    .qr-profile-image {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid var(--primary-color);
      box-shadow: 0 8px 25px rgba(0,123,255,0.3);
      background-color: var(--card-bg);
      padding: 4px;
    }

    .qr-title {
      color: var(--text-primary);
      font-weight: 700;
      font-size: 28px;
      margin: 0;
      text-align: center;
      margin-top: 10px;
    }

    .qr-subtitle {
      color: var(--text-secondary);
      font-size: 16px;
      margin: 0;
      min-height: 24px;
      font-weight: 400;
      text-align: center;
    }

    .qr-button {
      background-color: var(--primary-color);
      color: #ffffff;
      padding: 16px 0;
      border-radius: 50px;
      font-size: 16px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      width: 100%;
      border: none;
      cursor: pointer;
      transition: all 0.3s ease;
      display: block;
    }

    .qr-button:hover {
      background-color: var(--primary-hover);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0,123,255,0.4);
    }

    .qr-social-icon {
      background-color: var(--social-bg);
      color: #ffffff;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      text-decoration: none;
      font-size: 18px;
      transition: all 0.3s ease;
    }

    .qr-social-icon:hover {
      background-color: var(--social-hover);
      transform: translateY(-2px);
    }

    .qr-toggle-switch {
      position: absolute;
      top: 20px;
      right: 20px;
      cursor: pointer;
      z-index: 3;
    }

    .qr-toggle-track {
      width: 50px;
      height: 24px;
      background-color: #ccc;
      border-radius: 12px;
      position: relative;
      transition: background-color 0.3s ease;
    }

    .qr-dark-mode .qr-toggle-track {
      background-color: #4f4f4f;
    }

    .qr-toggle-thumb {
      position: absolute;
      top: 2px;
      left: 2px;
      width: 20px;
      height: 20px;
      background-color: #ffffff;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      transition: left 0.3s ease;
    }

    .qr-dark-mode .qr-toggle-thumb {
      left: 26px;
    }

    .qr-preloader {
      background-color: #ffffff;
      height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 9999;
    }

    .qr-dark-mode .qr-preloader {
      background-color: #1a1a1a;
    }

    .qr-spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #007bff;
      border-radius: 50%;
      animation: qr-spin 1s linear infinite;
    }

    .qr-dark-mode .qr-spinner {
      border: 4px solid #404040;
      border-top: 4px solid #0d6efd;
    }

    .qr-content {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 25px;
      margin-top: 30px;
    }

    /* Bootstrap Icons fallback */
    .bi::before {
      display: inline-block;
      font-family: bootstrap-icons !important;
      font-style: normal;
      font-weight: normal !important;
      font-variant: normal;
      text-transform: none;
      line-height: 1;
      vertical-align: -.125em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .bi-youtube::before { content: "\\f62d"; }
    .bi-twitter-x::before { content: "\\f65c"; }
    .bi-instagram::before { content: "\\f437"; }
    .bi-tiktok::before { content: "\\e07b"; }
    .bi-facebook::before { content: "\\f344"; }

    @keyframes qr-spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    /* Ensure text colors work properly */
    .qr-code-page * {
      color: var(--text-primary);
    }

    .qr-code-page .qr-subtitle {
      color: var(--text-secondary);
    }

    .qr-code-page small {
      color: var(--text-secondary);
    }
  `;

  if (isLoading) {
    return (
      <div className={`qr-preloader ${isDarkMode ? 'qr-dark-mode' : ''}`}>
        <div className="qr-spinner"></div>
      </div>
    );
  }

  // Semua button disimpan di array, termasuk Rate Card Kerjasama
  const allButtons = [
    {
      href: 'https://docs.google.com/forms/d/e/1FAIpQLSed5cu0WfLX7yC2sX2BOu0RmCZyaN8oxZ7iCmCTS6YwRcCEuA/viewform?usp=header ',
      title: 'Wadah Aspirasi',
      external: true,
    },
    {
      href: 'https://docs.google.com/forms/d/e/1FAIpQLSe_LWtLO8BHsbFu90R49X8tYfAV2lTig4ZASXjfSNes8FQj6A/viewform?usp=header ',
      title: 'Survei Kepuasan Masyarakat',
      external: true,
    },
    {
      href: 'https://drive.google.com/drive/folders/1tQrsSPcaXF1aVhavPybdR3sk26q0AwjX?usp=sharing',
      title: 'Rate Card Kerjasama',
      external: true,
    },
  ];

  // Filter untuk hanya menampilkan button yang diinginkan (tidak termasuk Rate Card Kerjasama)
  const displayedButtons = allButtons.filter(
    (button) => button.title !== 'Rate Card Kerjasama'
  );

  const socialLinks = [
    {
      href: 'https://www.youtube.com/@tvrisumaterautara',
      icon: 'bi bi-youtube',
      name: 'YouTube',
    },
    {
      href: '#',
      icon: 'bi bi-twitter-x',
      name: 'Twitter',
    },
    {
      href: 'https://www.instagram.com/tvrisumaterautara',
      icon: 'bi bi-instagram',
      name: 'Instagram',
    },
    {
      href: 'https://www.tiktok.com/@tvrisumaterautara',
      icon: 'bi bi-tiktok',
      name: 'TikTok',
    },
    {
      href: 'https://www.facebook.com/profile.php?id=100086716212366',
      icon: 'bi bi-facebook',
      name: 'Facebook',
    },
  ];

  return (
    <>
      <style>{qrCodeStyles}</style>
      {/* Add Bootstrap Icons CDN */}
      <link
        rel="stylesheet"
        href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css"
      />

      <div
        className={`qr-code-page ${isDarkMode ? 'qr-dark-mode' : ''}`}
        ref={containerRef}
      >
        <div className="qr-code-container">
          {/* Dark Mode Toggle */}
          <div className="qr-toggle-switch" onClick={toggleDarkMode}>
            <div className="qr-toggle-track">
              <div className="qr-toggle-thumb"></div>
            </div>
          </div>

          {/* Profile Image */}
          <div className="qr-profile-image-container">
            <img
              src={batmanImage}
              alt="TVRI Sumatera Utara"
              className="qr-profile-image"
            />
          </div>

          {/* Content */}
          <div className="qr-content">
            {/* Header Text */}
            <div style={{ textAlign: 'center', width: '100%' }}>
              <h1 className="qr-title">TVRI</h1>
              <p className="qr-subtitle">
                <span className="element"></span>
              </p>
            </div>

            {/* Buttons - Hanya menampilkan yang ada di displayedButtons (tidak termasuk Rate Card Kerjasama) */}
            <div
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '15px',
              }}
            >
              {displayedButtons.map(({ href, title, external }) => (
                <a
                  key={title}
                  href={href}
                  target={external ? '_blank' : '_self'}
                  rel={external ? 'noopener noreferrer' : ''}
                  className="qr-button"
                >
                  {title}
                </a>
              ))}
            </div>

            {/* Social Links */}
            <div
              style={{ width: '100%', textAlign: 'center', marginTop: '10px' }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '20px',
                }}
              >
                {socialLinks.map(({ href, icon, name }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="qr-social-icon"
                    title={name}
                  >
                    <i className={icon} />
                  </a>
                ))}
              </div>

              <small>©2025 - TVRI Stasiun Sumatera Utara</small>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default QRcode;
