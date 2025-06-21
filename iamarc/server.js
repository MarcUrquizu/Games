// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';  // or use global fetch in Node 18+

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

app.post('/chat', async (req, res) => {
  try {
    const { mensaje } = req.body;

    const apiRes = await fetch(
      `https://api.openai.com/v1/agents/${process.env.AGENT_ID}/run`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: mensaje })
      }
    );

    const data = await apiRes.json();
    if (!apiRes.ok) {
      // bubble up API errors
      return res
        .status(apiRes.status)
        .json({ error: data.error || data });
    }

    // The agent’s reply may come back under one of these keys:
    const reply =
      data.response    // if the HTTP API uses "response"
      ?? data.output  // or "output"
      ?? data.final_output;  // or "final_output"

    res.json({ respuesta: reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error llamando al agent' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Servidor en http://localhost:${PORT}`)
);
