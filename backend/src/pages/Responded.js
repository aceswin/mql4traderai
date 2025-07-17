// src/pages/Responded.js

import React, { useEffect, useState } from 'react';

function Responded() {
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:4000/api/respond-to-challenges')
      .then(res => res.json())
      .then(data => {
        setResponses(data);
        setLoading(false);
      });
  }, []);

  if (loading) return <p>⏳ Loading updated responses...</p>;

  return (
    <div style={{ padding: 20 }}>
      <h1>🔁 Updated Responses Based on Challenges</h1>
      {responses.length === 0 && <p>No responses yet.</p>}

      {responses.map((item, i) => (
        <div key={i} style={{ marginBottom: 40, border: '1px solid #ccc', padding: 15 }}>
          <h2>💬 Claim: {item.claim}</h2>
          <p><strong>Confidence:</strong> {item.response.confidence}%</p>
          <p><strong>Summary:</strong> {item.response.summary}</p>

          <h4>✅ Supporting</h4>
          <ul>{item.response.supporting.map((pt, i) => <li key={i}>{pt}</li>)}</ul>

          <h4>❌ Counterpoints</h4>
          <ul>{item.response.counterpoints.map((pt, i) => <li key={i}>{pt}</li>)}</ul>

          <h4>💣 TruthBombs</h4>
          <ul>{item.response.TruthBombs.map((pt, i) => <li key={i}>{pt}</li>)}</ul>

          <h4>🔗 Sources</h4>
          <ul>{item.response.sources.map((url, i) => (
            <li key={i}><a href={url} target="_blank" rel="noreferrer">{url}</a></li>
          ))}</ul>
        </div>
      ))}
    </div>
  );
}

export default Responded;
