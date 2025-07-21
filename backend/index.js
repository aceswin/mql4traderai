import express from 'express';  
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // make sure to set this in your .env
);

const app = express();
const PORT = process.env.PORT || 4000;

// CORS
app.use(cors({
  origin: ['https://www.mql4trader.com', 'http://localhost:3000'],
  credentials: true
}));

// ⚠️ Add Stripe webhook BEFORE express.json
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('⚠️ Stripe webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // ✅ Handle successful checkout
  if (event.type === 'checkout.session.completed') {
    const email = event.data.object.customer_email;

    if (!email) return res.status(400).send('Missing email in Stripe metadata');

    const { error } = await supabaseAdmin
      .from('users')
      .update({ has_paid: true })
      .eq('email', email);

    if (error) {
      console.error('❌ Supabase update failed:', error.message);
    } else {
      console.log(`✅ Updated Supabase: ${email} => has_paid: true`);
    }
  }

  res.status(200).send();
});

// Now continue with body parsing for normal JSON routes
app.use(express.json());

// ✅ EA Generation
app.post('/api/generate-ea', async (req, res) => {
  const { messages, language } = req.body;
  console.log('📨 Incoming /generate-ea request:', { messages, language });

  if (!messages || !Array.isArray(messages)) {
    console.log('❌ Invalid messages received');
    return res.status(400).json({ error: 'Messages array is required.' });
  }

  const updatedMessages = [
    {
      role: 'system',
      content: `
You are an ${language === 'mql5' ? 'MQL5' : 'MQL4'} coding expert. The user will describe a trading strategy, and your job is to output complete, clean MQL4 or MQL5 Expert Advisor (.mq4) code that matches the strategy and the chosen code type.

Respond in **two parts**:

1. First, give a short, beginner-friendly explanation of what the EA does.
2. Then output the complete EA code inside a single code block, wrapped in triple backticks and labeled \`\`\`mql4.

✅ The EA code must include:
- OnInit(), OnDeinit(), and OnTick()
- Clear comments in the code

When setting Stop Loss (SL) and Take Profit (TP), always:

- Use NormalizeDouble(..., Digits) on the price values.
✅ Ensure SL and TP are at least \`MarketInfo(Symbol(), MODE_STOPLEVEL) * Point\` away from the entry price.
- Include a comment block with the SL, TP, and Ask/Bid values for debugging.

Example logic:
  double minStop = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
  if ((TP - Ask) < minStop || (Ask - SL) < minStop) {
      Print("SL or TP too close to market price. SL:", SL, " TP:", TP, " Ask:", Ask);
      return;
  }


❌ Do not include multiple code blocks.
❌ Do not repeat the explanation inside the code.
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
        model: 'gpt-4o',
        temperature: 0.2,
        messages: updatedMessages
      })
    });

   console.log('✅ OpenAI responded, attempting to parse JSON...');
    const data = await response.json();
    console.log('🔄 OpenAI raw response:', JSON.stringify(data, null, 2));

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

// ✅ Stripe Checkout
app.post('/api/create-checkout-session', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: 'price_1RmRAFGEZqQYhzCHR2vdkOrh',
          quantity: 1,
        },
      ],
      success_url: 'https://www.mql4trader.com/aibuilder?fromStripe=success',
      cancel_url: 'https://www.mql4trader.com/aibuilder?fromStripe=canceled',
      metadata: { email }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('❌ Stripe session error:', error.message, error);
    res.status(500).json({ error: error.message || 'Could not create checkout session' });
  }
});

// Test route
app.get('/', (req, res) => {
  res.send('✅ Backend is running');
});

// Start server
app.listen(PORT, () => console.log(`🚀 EA Builder backend running on port ${PORT}`));
