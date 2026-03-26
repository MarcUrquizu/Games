// server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fetch from 'node-fetch';  // or use global fetch in Node 18+
import { promises as fs } from 'fs';
import path from 'path';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());


const PROGRESS_DB_PATH = path.resolve('./progress-store.json');

async function readProgressStore() {
  try {
    const raw = await fs.readFile(PROGRESS_DB_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    if (err.code === 'ENOENT') return {};
    throw err;
  }
}

async function writeProgressStore(store) {
  await fs.writeFile(PROGRESS_DB_PATH, JSON.stringify(store, null, 2), 'utf8');
}

app.get('/progress', async (req, res) => {
  try {
    const email = String(req.query.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ error: 'Falta email' });
    }

    const store = await readProgressStore();
    res.json(store[email] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el progreso' });
  }
});

app.post('/progress', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const progress = req.body.progress;
    const updatedAt = Number(req.body.updatedAt || Date.now());

    if (!email) {
      return res.status(400).json({ error: 'Falta email' });
    }
    if (!progress || typeof progress !== 'object') {
      return res.status(400).json({ error: 'Falta progress válido' });
    }

    const store = await readProgressStore();
    store[email] = {
      email,
      progress,
      updatedAt,
    };
    await writeProgressStore(store);

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo guardar el progreso' });
  }
});

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
