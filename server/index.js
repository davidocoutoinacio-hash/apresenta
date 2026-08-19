import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import { SYSTEM_CONTEXT } from "./knowledge.js";
import { applyMineiroAccent } from "./mineiro.js";

const app = express();

// Em produção, defina ALLOWED_ORIGIN (uma URL ou uma lista separada por vírgula)
// com o domínio do Vercel. Sem essa variável, qualquer site pode chamar a API.
const allowedOrigins = (process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (allowedOrigins.length === 0) {
  console.warn(
    "[aviso] ALLOWED_ORIGIN não configurada — CORS está liberado pra qualquer origem. " +
      "Defina ALLOWED_ORIGIN com o domínio do Vercel antes de ir pra produção."
  );
}

app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : true }));
app.use(express.json());

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- Autenticação por código de acesso -------------------------------------
// O código nunca fica exposto no front-end: /api/auth/verify confere contra a
// variável de ambiente e devolve um token assinado (HMAC), que o front-end passa
// em Authorization: Bearer <token> em toda chamada a /api/ask e /api/tts. Sem
// esse token válido, as rotas de IA recusam a requisição — não basta só passar
// pela tela de login, a própria API exige a prova de acesso.
const ACCESS_CODE = process.env.ACCESS_CODE;
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.ACCESS_CODE;
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 horas

function signToken(exp) {
  const sig = crypto.createHmac("sha256", SESSION_SECRET).update(String(exp)).digest("hex");
  return `${exp}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [expStr, sig] = token.split(".");
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig) return false;

  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(String(exp)).digest("hex");
  const sigBuf = Buffer.from(sig, "hex");
  const expectedBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return false;
  }
  return Date.now() < exp;
}

function requireSession(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!verifyToken(token)) {
    return res
      .status(401)
      .json({ error: "Sessão inválida ou expirada. Informe o código de acesso novamente." });
  }
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Muitas requisições em pouco tempo. Aguarde um instante." },
});

app.post("/api/auth/verify", authLimiter, (req, res) => {
  const code = (req.body?.code || "").toString().trim();

  if (!ACCESS_CODE) {
    console.error("[erro] ACCESS_CODE não configurada no servidor.");
    return res.status(500).json({ ok: false, error: "Acesso não configurado no servidor." });
  }
  if (!code) {
    return res.status(400).json({ ok: false, error: "Informe o código de acesso." });
  }
  if (code !== ACCESS_CODE) {
    return res.status(401).json({ ok: false, error: "Código inválido." });
  }

  const exp = Date.now() + SESSION_TTL_MS;
  res.json({ ok: true, token: signToken(exp), expiresAt: exp });
});

app.post("/api/ask", requireSession, apiLimiter, async (req, res) => {
  const question = (req.body?.question || "").toString().trim();

  if (!question) {
    return res.status(400).json({ error: "Campo 'question' é obrigatório." });
  }
  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: "GROQ_API_KEY não configurada no servidor." });
  }

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.6,
        max_tokens: 300,
        messages: [
          { role: "system", content: SYSTEM_CONTEXT },
          { role: "user", content: question },
        ],
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text();
      console.error("Erro da Groq API:", groqRes.status, errBody);
      return res.status(502).json({ error: "Falha ao consultar o modelo de IA." });
    }

    const data = await groqRes.json();
    const answer = data.choices?.[0]?.message?.content?.trim() || "Não consegui gerar uma resposta agora.";
    res.json({ answer });
  } catch (err) {
    console.error("Erro ao chamar Groq:", err);
    res.status(502).json({ error: "Falha ao consultar o modelo de IA." });
  }
});

const GOOGLE_TTS_VOICE = process.env.GOOGLE_TTS_VOICE || "pt-BR-Neural2-C";
const GOOGLE_TTS_PITCH = Number(process.env.GOOGLE_TTS_PITCH ?? -4.0);
const GOOGLE_TTS_RATE = Number(process.env.GOOGLE_TTS_RATE ?? 0.92);
const GOOGLE_TTS_SENTENCE_PAUSE_MS = Number(process.env.GOOGLE_TTS_SENTENCE_PAUSE_MS ?? 480);
const GOOGLE_TTS_COMMA_PAUSE_MS = Number(process.env.GOOGLE_TTS_COMMA_PAUSE_MS ?? 200);
const MINEIRO_ACCENT = process.env.MINEIRO_ACCENT !== "false";

// Vozes Chirp3-HD (geração generativa mais nova do Google) ainda não aceitam o
// parâmetro de pitch — a API rejeita a chamada se ele for enviado para elas.
function voiceSupportsPitch(voiceName) {
  return !voiceName.includes("Chirp3-HD");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toSSML(text, sentencePauseMs, commaPauseMs) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const withPauses = escaped
    .replace(/([.!?]+)\s+/g, `$1<break time="${sentencePauseMs}ms"/> `)
    .replace(/([,;:])\s+/g, `$1<break time="${commaPauseMs}ms"/> `);

  return `<speak>${withPauses}</speak>`;
}

app.post("/api/tts", requireSession, apiLimiter, async (req, res) => {
  const text = (req.body?.text || "").toString().trim();

  if (!text) {
    return res.status(400).json({ error: "Campo 'text' é obrigatório." });
  }
  if (!process.env.GOOGLE_TTS_API_KEY) {
    return res.status(500).json({ error: "GOOGLE_TTS_API_KEY não configurada no servidor." });
  }

  const voice = (req.body?.voice || GOOGLE_TTS_VOICE).toString();
  const pitch = clamp(
    req.body?.pitch !== undefined ? Number(req.body.pitch) : GOOGLE_TTS_PITCH,
    -20,
    20
  );
  const rate = clamp(
    req.body?.rate !== undefined ? Number(req.body.rate) : GOOGLE_TTS_RATE,
    0.25,
    4.0
  );
  const sentencePauseMs = clamp(
    req.body?.sentencePauseMs !== undefined
      ? Number(req.body.sentencePauseMs)
      : GOOGLE_TTS_SENTENCE_PAUSE_MS,
    0,
    2000
  );
  const commaPauseMs = clamp(
    req.body?.commaPauseMs !== undefined ? Number(req.body.commaPauseMs) : GOOGLE_TTS_COMMA_PAUSE_MS,
    0,
    1000
  );
  const mineiroAccent = req.body?.mineiroAccent !== undefined ? Boolean(req.body.mineiroAccent) : MINEIRO_ACCENT;

  const spokenText = mineiroAccent ? applyMineiroAccent(text) : text;

  const audioConfig = { audioEncoding: "MP3", speakingRate: rate };
  if (voiceSupportsPitch(voice)) {
    audioConfig.pitch = pitch;
  }

  try {
    const ttsRes = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GOOGLE_TTS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { ssml: toSSML(spokenText, sentencePauseMs, commaPauseMs) },
          voice: { languageCode: "pt-BR", name: voice },
          audioConfig,
        }),
      }
    );

    if (!ttsRes.ok) {
      const errBody = await ttsRes.text();
      console.error("Erro Google TTS:", ttsRes.status, errBody);
      return res.status(502).json({ error: "Falha ao gerar áudio." });
    }

    const data = await ttsRes.json();
    res.json({ audioContent: data.audioContent });
  } catch (err) {
    console.error("Erro ao chamar Google TTS:", err);
    res.status(502).json({ error: "Falha ao gerar áudio." });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Servidor CX Preditivo rodando na porta ${PORT}`));
