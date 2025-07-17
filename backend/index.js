import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// ✅ This was working fine before — basic open CORS
app.use(cors());
app.use(express.json());

// ✅ EA generation route
app.post('/api/generate-ea', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const updatedMessages = [
    {
      role: 'system',
      content: `
You are an MQL4 coding expert. The user will describe a trading strategy, and your job is to output complete, clean MQL4 Expert Advisor (.mq4) code that matches the strategy.

✅ Include:
- OnInit(), OnDeinit(), and OnTick()
- Risk management
- Comments in the code

🛑 If the user mentions an OrderSend error like error 130, explain that it usually means invalid stops (SL/TP too close or not normalized). Encourage the user to print the SL/TP values using Print(), and use NormalizeDouble(..., Digits) to ensure prices are valid.

✅ Do not wrap your answer in markdown or code blocks — output only the raw EA code.
      `.trim()
    },
    ...messages.filter(msg => msg.role !== 'system')
  ];

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4-1106-preview',
        temperature: 0.2,
        messages: updatedMessages
      })
    });

    const data = await response.json();

    let code = data.choices?.[0]?.message?.content?.trim() || '';
    if (code.startsWith('```')) {
      code = code.replace(/```mql4|```mql|```mq4|```/gi, '').trim();
    }

    const currentYear = new Date().getFullYear();
    code = code.replace(/Copyright \d{4}/g, `Copyright ${currentYear}`);

    res.json({ eaCode: code });
  } catch (err) {
    console.error('❌ EA Generator Error:', err);
    res.status(500).json({ error: 'Failed to generate EA code.' });
  }
});

// ✅ Email submission route (was working)
app.post('/api/submit-email', (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  console.log('📧 Email submitted:', email);
  res.status(200).json({ message: 'Email received' });
});
app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});
// ✅ DO NOT hardcode a port — keep this!
app.listen(PORT, () => console.log(`🚀 EA Builder backend running on port ${PORT}`));
