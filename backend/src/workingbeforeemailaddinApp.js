import React, { useState, useEffect } from 'react';

function App() {
  const [language, setLanguage] = useState('mql4');

  const getSystemMessage = (lang) => ({
    role: 'system',
    content: `You are an ${lang === 'mql4' ? 'MQL4' : 'MQL5'} coding expert helping the user build a complete Expert Advisor (.${lang}). The user will describe a trading strategy or problem, and your job is to output clean, working code and assist them until the EA is complete.

Instructions:
- Include OnInit(), OnDeinit(), and OnTick()
- Include risk management and code comments
- If there's a known issue (like OrderSend error 130), explain how to fix it
- Provide clear explanations **above** the code, and output the EA code in plain text without markdown or triple backticks
- Support the user across multiple follow-ups — revise, debug, and improve until it’s ready to go`
  });

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('chatMessages');
    return saved ? JSON.parse(saved) : [getSystemMessage(language)];
  });

  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copySuccess, setCopySuccess] = useState('');

  useEffect(() => {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }, [messages]);

  const sendMessage = async (customInput = null) => {
    const input = customInput !== null ? customInput : userInput;
    if (!input.trim()) return;
    setLoading(true);
    setError('');

    const updatedMessages = [getSystemMessage(language), ...messages.slice(1), { role: 'user', content: input }];
    setUserInput('');

    try {
     const res = await fetch('https://mql4traderaibuiler.onrender.com/api/generate-ea', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      });

      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else {
        const assistantMsg = { role: 'assistant', content: data.eaCode };
        const updatedAllMessages = [...updatedMessages, assistantMsg];
        setMessages(updatedAllMessages);
      }
    } catch (err) {
      setError('Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const resetSession = () => {
    setMessages([getSystemMessage(language)]);
    localStorage.removeItem('chatMessages');
    setUserInput('');
    setError('');
  };

  const downloadCode = () => {
    const lastAssistant = messages.findLast(msg => msg.role === 'assistant');
    if (!lastAssistant) return;
    const blob = new Blob([lastAssistant.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'MyExpertAdvisor.mq4';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const lastAssistant = messages.findLast(msg => msg.role === 'assistant');

  const copyCodeToClipboard = () => {
    if (!lastAssistant?.content) return;

    navigator.clipboard.writeText(lastAssistant.content)
      .then(() => {
        setCopySuccess('Copied!');
        setTimeout(() => setCopySuccess(''), 1500);
      })
      .catch(err => {
        console.error('Failed to copy code:', err);
        setCopySuccess('Failed to copy');
      });
  };

  return (
    <div style={{ background: '#fff', color: '#000', padding: 20, fontFamily: 'monospace' }}>
      <h1>MQL4TraderAI EA Builder</h1>

      <div style={{ marginBottom: 10 }}>
        <label style={{ marginRight: 10 }}>Target Language:</label>
        <select value={language} onChange={(e) => setLanguage(e.target.value)}>
          <option value="mql4">MQL4</option>
          <option value="mql5">MQL5</option>
        </select>
      </div>

      <div style={{ background: '#eef', padding: 15, marginBottom: 20 }}>
        <h3>💡 Tips for Best Results</h3>
        <ul>
          <li>Describe your EA logic step-by-step. Mention entries, exits, indicators, and timeframe.</li>
          <li>Say if it's for scalping, swing trading, news filtering, etc.</li>
          <li>If using indicators (e.g. RSI, MACD), include parameters.</li>
          <li>If there's an error in the compiler or strategy tester (like "OrderSend Error 130"), copy the error into the chat — the AI will help fix it.</li>
          <li>MQL4TraderAI is not yet perfect and can make mistakes. Please be patient and work with AI back and forth to get the best results.</li>
        </ul>
      </div>

      <textarea
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        rows={4}
        placeholder="Describe your EA strategy or request help with your existing code..."
        style={{ width: '100%', padding: 10 }}
      ></textarea>

      <div style={{ marginTop: 10 }}>
        <button onClick={() => sendMessage()} disabled={loading}>
          {loading ? 'Thinking...' : 'Generate EA code'}
        </button>
        <button onClick={resetSession} style={{ marginLeft: 10 }}>
          Reset Session
        </button>
        <button onClick={downloadCode} style={{ marginLeft: 10 }} disabled={!lastAssistant}>
          Download MQ4
        </button>
      </div>

      {error && <div style={{ color: 'red', marginTop: 20 }}>{error}</div>}

      {lastAssistant && (
        <div style={{ marginTop: 20 }}>
          <button onClick={copyCodeToClipboard}>Copy Code</button>
          {copySuccess && <span style={{ marginLeft: 10, color: 'green' }}>{copySuccess}</span>}

          <pre style={{ padding: 15, background: '#fff', color: '#000', whiteSpace: 'pre-wrap', border: '1px solid #ccc', marginTop: 10 }}>
            {lastAssistant.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;
