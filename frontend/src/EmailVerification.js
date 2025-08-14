import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001';

function EmailVerification() {
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Get token from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      setIsVerifying(true);
      verifyEmail(tokenFromUrl);
    }
  }, []);

  const verifyEmail = async (emailToken) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/verify-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: emailToken }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to verify email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resendVerification = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${API_URL}/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isVerifying) {
    return (
      <div className="app auth-app">
        <div className="auth-container">
          <div className="auth-header">
            <h1>Email Verification</h1>
            <p>Verifying your email address...</p>
          </div>

          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Verifying your email...</p>
            </div>
          ) : (
            <div className="verification-result">
              {message && (
                <div className="success-message">
                  <p>✅ {message}</p>
                  <button 
                    onClick={() => window.location.href = '/login'} 
                    className="btn btn-primary"
                  >
                    Go to Login
                  </button>
                </div>
              )}
              {error && (
                <div className="error-message">
                  <p>❌ {error}</p>
                  <button 
                    onClick={() => window.location.href = '/login'} 
                    className="btn btn-secondary"
                  >
                    Back to Login
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="app auth-app">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Email Verification</h1>
          <p>Resend verification email</p>
        </div>

        {error && (
          <div className="error-message">
            <p>❌ {error}</p>
          </div>
        )}

        {message && (
          <div className="success-message">
            <p>✅ {message}</p>
          </div>
        )}

        <form onSubmit={resendVerification} className="auth-form">
          <div className="form-group">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>
          
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Sending...' : 'Resend Verification Email'}
          </button>
        </form>

        <div className="auth-links">
          <button 
            onClick={() => window.location.href = '/login'} 
            className="btn btn-secondary"
          >
            Back to Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default EmailVerification;
