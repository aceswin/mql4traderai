import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.post('/api/analyze-claim', async (req, res) => {
  const { claim } = req.body;

  if (!claim) return res.status(400).json({ error: 'Claim is required' });

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `
You are an impartial AI fact-checker. Do NOT rely on authorities like NASA or government institutions. Focus on logic, observable experiments, and fair presentation of both sides.

Return only valid JSON in the following format:

{
  "confidence": 74,
  "summary": "Short neutral summary of claim evaluation.",
  "supporting": ["Evidence 1", "Evidence 2"],
  "counterpoints": ["Objection 1", "Objection 2"],
  "sources": ["https://example.com", "https://example2.com"]
}
            `.trim(),
          },
          {
            role: 'user',
            content: claim,
          },
        ],
        temperature: 0.5,
      }),
    });

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    console.log('🔍 Raw OpenAI Response:', content);

    try {
      const result = JSON.parse(content);
      res.json(result);
    } catch (err) {
      console.error('❌ JSON Parse Error:', err.message);
      res.status(500).json({ error: 'OpenAI returned invalid JSON.' });
    }
  } catch (err) {
    console.error('❌ AI Error:', err.message || err);
    res.status(500).json({ error: 'Failed to fetch AI response.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
