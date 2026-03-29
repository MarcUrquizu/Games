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
const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo?id_token=';
const GOOGLE_CLIENT_IDS = new Set(
  String(process.env.GOOGLE_CLIENT_IDS || process.env.GOOGLE_CLIENT_ID || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
);

if (GOOGLE_CLIENT_IDS.size === 0) {
  GOOGLE_CLIENT_IDS.add('960980369582-b8o0bnb4g2tc450lerhn7cbc4hpbhtqi.apps.googleusercontent.com');
}

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

function parseBearerToken(headerValue = '') {
  const [scheme, token] = String(headerValue).split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return '';
  return token.trim();
}

async function verifyGoogleCredential(credential) {
  const token = String(credential || '').trim();
  if (!token) return null;

  const response = await fetch(`${GOOGLE_TOKENINFO_URL}${encodeURIComponent(token)}`);
  if (!response.ok) return null;

  const tokenInfo = await response.json();
  const expMs = Number(tokenInfo.exp || 0) * 1000;
  if (!tokenInfo.email || !expMs || expMs <= Date.now()) return null;

  if (GOOGLE_CLIENT_IDS.size > 0 && !GOOGLE_CLIENT_IDS.has(String(tokenInfo.aud || '').trim())) {
    return null;
  }

  return {
    userId: String(tokenInfo.sub || tokenInfo.email).trim().toLowerCase(),
    email: String(tokenInfo.email).trim().toLowerCase(),
  };
}

async function requireVerifiedUser(req, res) {
  try {
    const bodyCredential = typeof req.body === 'object' ? req.body?.credential : null;
    const queryCredential = req.query?.credential;
    const bearerCredential = parseBearerToken(req.headers.authorization);
    const credential = bearerCredential || bodyCredential || queryCredential;

    const verified = await verifyGoogleCredential(credential);
    if (!verified) {
      res.status(401).json({ error: 'Token de Google inválido o expirado' });
      return null;
    }
    return verified;
  } catch (err) {
    console.error('Error verificando token Google:', err);
    res.status(401).json({ error: 'No se pudo validar la sesión' });
    return null;
  }
}

app.get('/progress', async (req, res) => {
  try {
    const verifiedUser = await requireVerifiedUser(req, res);
    if (!verifiedUser) return;

    const store = await readProgressStore();
    const record = store[verifiedUser.userId] || null;
    res.json(record);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'No se pudo leer el progreso' });
  }
});

app.post('/progress', async (req, res) => {
  try {
    const verifiedUser = await requireVerifiedUser(req, res);
    if (!verifiedUser) return;

    const progress = req.body.progress;
    const updatedAt = Number(req.body.updatedAt || Date.now());

    if (!progress || typeof progress !== 'object') {
      return res.status(400).json({ error: 'Falta progress válido' });
    }

    const store = await readProgressStore();
    const existing = store[verifiedUser.userId];
    const existingUpdatedAt = Number(existing?.updatedAt || 0);
    const nextUpdatedAt = Number.isFinite(updatedAt) ? updatedAt : Date.now();

    if (existing && existingUpdatedAt > nextUpdatedAt) {
      return res.json({ ok: true, skipped: true, updatedAt: existingUpdatedAt });
    }

    store[verifiedUser.userId] = {
      userId: verifiedUser.userId,
      email: verifiedUser.email,
      progress,
      updatedAt: nextUpdatedAt,
    };
    await writeProgressStore(store);

    res.json({ ok: true, updatedAt: nextUpdatedAt });
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
