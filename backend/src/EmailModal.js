import React, { useState, useEffect } from 'react';

function EmailModal({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem('userEmail');
    if (savedEmail) {
      setAlreadySubmitted(true);
      onSubmit(savedEmail); // auto-close modal if already registered
    }
  }, [onSubmit]);

  const handleSubmit = () => {
    if (!email || !email.includes('@')) {
      alert('Please enter a valid email address.');
      return;
    }

    localStorage.setItem('userEmail', email);
    localStorage.setItem('usageCount', '0'); // reset usage count after signup
    onSubmit(email);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 9999
    }}>
      <div style={{ background: '#fff', padding: 20, borderRadius: 10, width: '320px' }}>
        <h3>🔐 Free trial limit reached</h3>
        <p>Enter your email to continue using the EA builder:</p>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', padding: 8 }}
        />
        <button onClick={handleSubmit} style={{
          marginTop: 10, width: '100%', padding: 10, backgroundColor: '#007bff',
          color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 4
        }}>
          Continue
        </button>
      </div>
    </div>
  );
}

export default EmailModal;
