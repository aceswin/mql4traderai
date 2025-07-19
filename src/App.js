import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [language, setLanguage] = useState('mql4');
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');
  const [freeUses, setFreeUses] = useState(() => Number(localStorage.getItem('freeUses') || 0));
  const [user, setUser] = useState(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setUser(data.session.user);
    };

    getSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem('freeUses', freeUses);
  }, [freeUses]);

  const getSystemMessage = (lang) => ({
    role: 'system',
    content: `You are an ${lang === 'mql4' ? 'MQL4' : 'MQL5'} coding expert helping the user build a complete Expert Advisor (.${lang}). The user will describe a trading strategy or problem, and your job is to output clean, working code and assist them until it’s complete.`
  });

  const sendMessage = async () => {
    if (!user && freeUses >= 3) {
      setError('Please create an account or log in to continue.');
      return;
    }

    setLoading(true);
    setError('');

    const newMessages = messages.length
      ? [...messages, { role: 'user', content: userInput }]
      : [getSystemMessage(language), { role: 'user', content: userInput }];

    setMessages(newMessages);

    try {
      const res = await fetch('https://mql4traderai.onrender.com/api/generate-ea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, language })
      });
      const data = await res.json();

      setMessages([...newMessages, {
        role: 'assistant',
        content: data.eaCode || '❌ No EA code returned'
      }]);

      if (!user) {
        const updatedUses = freeUses + 1;
        setFreeUses(updatedUses);
        localStorage.setItem('freeUses', updatedUses);
      }
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
    }

    setUserInput('');
    setLoading(false);
  };

  const handleAuth = async () => {
    setError('');
    if (!authEmail || !authPassword) {
      setError('Email and password are required.');
      return;
    }

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email: authEmail, password: authPassword })
      : await supabase.auth.signInWithPassword({ email: authEmail, password: authPassword });

    if (error) {
      setError(error.message);
    } else {
      // ✅ Only redirect to Stripe on signup
      if (isSignUp) {
        try {
          const res = await fetch('https://mql4traderai.onrender.com/api/create-checkout-session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: authEmail }),
          });
          const data = await res.json();
          if (data.url) {
            window.location.href = data.url;
          } else {
            setError('Could not start checkout session.');
          }
        } catch (err) {
          console.error(err);
          setError('Payment system unavailable. Try again later.');
        }
      }
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const lastAssistant = messages.findLast(msg => msg.role === 'assistant');

  return (
    <div style={{ background: '#fff', color: '#000', padding: 20, fontFamily: 'monospace' }}>
      <h1>MQL4TraderAI EA Builder</h1>

      {!user && freeUses >= 3 && (
        <div style={{ background: '#ffecec', padding: 20, marginBottom: 20, border: '1px solid red' }}>
          <p>🔒 You’ve used your 3 free requests.</p>
          <p>{isSignUp ? 'Create an account to continue:' : 'Log in to continue:'}</p>

          <input
            type="email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            placeholder="Email"
            style={{ width: '100%', padding: 10, marginBottom: 10 }}
          />
          <input
            type="password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            placeholder="Password"
            style={{ width: '100%', padding: 10, marginBottom: 10 }}
          />
          <button onClick={handleAuth}>{isSignUp ? 'Sign Up' : 'Log In'}</button>
          <button onClick={() => setIsSignUp(!isSignUp)} style={{ marginLeft: 10 }}>
            {isSignUp ? 'Switch to Login' : 'Switch to Signup'}
          </button>
        </div>
      )}

      {user && (
        <div style={{ marginBottom: 10, color: 'green' }}>
          ✅ Logged in as <b>{user.email}</b> | <button onClick={logout}>Logout</button>
        </div>
      )}

      <div style={{ marginBottom: 10 }}>
        <label style={{ marginRight: 10 }}>Target Language:</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="mql4">MQL4</option>
          <option value="mql5">MQL5</option>
        </select>
      </div>

      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        rows={4}
        placeholder="Describe your EA strategy or request help with your existing code..."
        style={{ width: '100%', padding: 10 }}
        disabled={!user && freeUses >= 3}
      ></textarea>

      <div style={{ marginTop: 10 }}>
        <button onClick={sendMessage} disabled={loading || (!user && freeUses >= 3)}>
          {loading ? 'Thinking...' : 'Generate EA code'}
        </button>
      </div>

      {error && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}

      {lastAssistant && (
        <div style={{ marginTop: 20 }}>
          <pre style={{ padding: 15, background: '#fff', color: '#000', whiteSpace: 'pre-wrap', border: '1px solid #ccc', marginTop: 10 }}>
            {lastAssistant.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
