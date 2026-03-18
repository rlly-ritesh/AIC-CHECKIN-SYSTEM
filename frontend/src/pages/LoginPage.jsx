import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticlesBackground from '../components/ParticlesBackground';
import StatusBadge from '../components/StatusBadge';
import { loginUser } from '../api/api';

const LoginPage = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState({ state: 'idle', text: 'Enter credentials' });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setStatus({ state: 'error', text: '✗ Missing credentials' });
      return;
    }

    setStatus({ state: 'loading', text: '⏳ Authenticating...' });

    try {
      const data = await loginUser(username, password);
      if (data && data.access_token) {
        setStatus({ state: 'success', text: '✓ Login successful!' });
        setTimeout(() => {
          // If admin, they might want the dashboard, else the scanner
          if (data.role === 'admin') {
            navigate('/admin');
          } else {
            navigate('/');
          }
        }, 1000);
      } else {
        setStatus({ state: 'error', text: '✗ Invalid response' });
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        setStatus({ state: 'error', text: `✗ ${error.response.data.detail}` });
      } else {
        setStatus({ state: 'error', text: '✗ Connection error' });
      }
    }
  };

  return (
    <>
      <ParticlesBackground />
      <div className="container" style={{ maxWidth: '400px', marginTop: '10vh' }}>
        <div className="header">
          <div className="logo" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 7V5a2 2 0 0 1 2-2h2"></path>
              <path d="M17 3h2a2 2 0 0 1 2 2v2"></path>
              <path d="M21 17v2a2 2 0 0 1-2 2h-2"></path>
              <path d="M7 21H5a2 2 0 0 1-2-2v-2"></path>
              <path d="M8 7v10"></path>
              <path d="M12 7v10"></path>
              <path d="M16 7v10"></path>
            </svg>
          </div>
          <h1>Soa Hackathon 2026</h1>
          <p>Attendance Authentication</p>
        </div>

        <div className="scanner-section" style={{ padding: '2rem' }}>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleLogin}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>
                Username
              </label>
              <input
                type="text"
                placeholder="Enter username"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(37, 99, 235, 0.4)',
                  color: '#0f172a',
                  outline: 'none'
                }}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: '#475569', fontWeight: 'bold' }}>
                Password
              </label>
              <input
                type="password"
                placeholder="Enter password"
                style={{
                  width: '100%',
                  padding: '0.8rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255,255,255,0.7)',
                  border: '1px solid rgba(37, 99, 235, 0.4)',
                  color: '#0f172a',
                  outline: 'none'
                }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="badge-present"
              style={{
                marginTop: '1rem',
                padding: '1rem',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                background: '#2563eb',
                color: 'white'
              }}
            >
              Sign In
            </button>
          </form>
        </div>

        <StatusBadge status={status.state} text={status.text} />
      </div>
    </>
  );
};

export default LoginPage;
