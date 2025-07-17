// src/pages/Challenges.js
import React, { useEffect, useState } from 'react';

export default function Challenges() {
  const [challenges, setChallenges] = useState([]);

  useEffect(() => {
    fetch('/api/challenges')
      .then(res => res.json())
      .then(data => setChallenges(data))
      .catch(err => console.error('Error fetching challenges:', err));
  }, []);

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🗂️ Community Challenges</h1>
      {challenges.length === 0 ? (
        <p>No challenges submitted yet.</p>
      ) : (
        challenges.map((item, index) => (
          <div key={index} style={{ borderBottom: '1px solid #ccc', padding: '1rem 0' }}>
            <strong>📣 Claim:</strong> {item.claim}
            {item.clarification && (
              <div><strong>📝 Clarification:</strong> {item.clarification}</div>
            )}
            {item.newInfo && (
              <div><strong>🔍 New Info:</strong> {item.newInfo}</div>
            )}
            <div><strong>📅 Timestamp:</strong> {new Date(item.timestamp).toLocaleString()}</div>
          </div>
        ))
      )}
    </div>
  );
}
