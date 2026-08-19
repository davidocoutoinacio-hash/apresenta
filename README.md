# CX Preditivo · IA LAB

Assistente de IA com avatar 3D animado que responde por voz perguntas sobre o tema
**CX Preditivo**. Feito com Three.js (React Three Fiber), Web Speech API (voz gratuita,
nativa do navegador) e Groq (LLM gratuito e rápido) via um backend Node/Express.

## Estrutura

```
apresenta/
  src/, public/, index.html, package.json  -> App React + Three.js (avatar 3D, mic, fala) — deploy no Vercel (raiz do repositório)
  server/                                  -> API Node/Express que consulta a Groq com o conteúdo de CX Preditivo — deploy no Render
```

O front-end fica na **raiz** do repositório (não numa subpasta) — assim o Vercel detecta o projeto Vite automaticamente, sem precisar configurar "Root Directory". Só o backend fica isolado em `server/`.

## 1. Rodando localmente

### Backend

```bash
cd server
cp .env.example .env
# edite .env e cole sua chave gratuita da Groq (GROQ_API_KEY)
npm run dev
```

Chave gratuita: crie em https://console.groq.com/keys (conta gratuita, tier free generoso).

Para ver quais modelos sua chave tem acesso (o catálogo muda com frequência), rode:

```bash
curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer SUA_CHAVE" \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>JSON.parse(d).data.forEach(m=>console.log(m.id)))"
```

e ajuste `GROQ_MODEL` no `.env` se necessário (padrão: `openai/gpt-oss-120b`).

#### Voz neural (opcional, recomendado)

Sem essa chave, a fala usa a voz nativa do navegador (gratuita, porém mais robótica).
Com ela, a resposta é narrada por uma voz neural do Google, muito mais humana — e o app
cai de volta na voz do navegador automaticamente se a chave faltar ou a chamada falhar.

1. Acesse https://console.cloud.google.com e crie um projeto (ou use um existente).
2. Ative a **Cloud Text-to-Speech API** em "APIs e Serviços" → "Ativar APIs e Serviços".
3. Ative o faturamento do projeto (obrigatório para usar a API, mas você **não é
   cobrado** dentro da cota gratuita: 1 milhão de caracteres/mês em vozes Neural2).
4. Em "APIs e Serviços" → "Credenciais", crie uma **Chave de API** e cole em
   `GOOGLE_TTS_API_KEY` no `.env`.
5. (Opcional) Restrinja a chave para funcionar apenas com a Cloud Text-to-Speech API.

As variáveis `GOOGLE_TTS_VOICE`, `GOOGLE_TTS_PITCH`, `GOOGLE_TTS_RATE`,
`GOOGLE_TTS_SENTENCE_PAUSE_MS`, `GOOGLE_TTS_COMMA_PAUSE_MS` e `MINEIRO_ACCENT` no `.env`
são apenas os **valores padrão do servidor** — o card "Voz" na interface (ver seção 3)
permite escolher a voz e ajustar tudo isso direto pelo navegador, com override por
requisição, sem precisar mexer no `.env` nem reiniciar o backend.

### Frontend

Em outro terminal, a partir da raiz do repositório:

```bash
cp .env.example .env   # aponta para http://localhost:3001 por padrão
npm run dev
```

Abra o endereço mostrado (geralmente http://localhost:5173) no **Chrome** — é o navegador
com melhor suporte à Web Speech API em português.

## 2. Avatar 3D

Por padrão o app usa um avatar 3D procedural (cabeça com textura de pele gerada, olhos,
piscar, boca sincronizada com a fala) — funciona sem nenhuma configuração extra.

Para usar um avatar humano realista com textura completa:

1. Acesse https://readyplayer.me e crie um avatar gratuito (personalize rosto, roupa, etc).
2. Copie a URL do arquivo `.glb` do avatar (ex: `https://models.readyplayer.me/SEU_ID.glb`).
3. No app, clique em **"Configurar avatar"** (canto superior direito) e cole a URL.

O avatar RPM já vem com blend shapes (visemes) de boca, que o app usa automaticamente para
sincronizar a fala.

## 3. Como funciona a conversa por voz

- **Ouvir**: `SpeechRecognition` do navegador (gratuito, pt-BR).
- **Responder**: a pergunta vai para `POST /api/ask` no backend, que injeta o conteúdo de
  CX Preditivo como contexto (`server/knowledge.js`) e chama a Groq (`openai/gpt-oss-120b`,
  tier gratuito).
- **Falar**: o texto vai para `POST /api/tts` no backend, que gera áudio com uma voz
  neural do Google (`GOOGLE_TTS_API_KEY`); sem essa chave, cai automaticamente para a
  `SpeechSynthesis` do navegador. Em ambos os casos o avatar sincroniza a boca com a
  amplitude real do áudio enquanto fala (análise em tempo real via Web Audio API).

Para atualizar o conteúdo sobre o qual a IA responde, edite `server/knowledge.js`.

### Configurar a voz pela interface

Clique em **"Voz"** na barra superior do app para abrir o card de configuração:

- **Voz**: mais de 40 opções gratuitas do Google (Chirp3-HD, Neural2, Wavenet e Standard).
- **Tom (pitch)**, **velocidade**, **pausa entre frases** e **pausa em vírgulas**.
- **Sotaque mineiro** (liga/desliga o dicionário de `server/mineiro.js`).
- Botão **"Testar voz"** para ouvir a combinação atual na hora.

Tudo fica salvo no `localStorage` do navegador — persiste mesmo fechando e reabrindo o app.
As vozes Chirp3-HD (mais novas e naturais) não aceitam ajuste de tom; o campo fica desabilitado
automaticamente quando uma delas é selecionada. Historicamente as vozes Standard têm a cota
gratuita mais alta e Neural2/Wavenet uma cota menor e compartilhada — mas não confirmamos o
valor exato para Chirp3-HD (é uma categoria nova), então antes de um uso intenso vale checar a
cota atual em https://cloud.google.com/text-to-speech/pricing.

## 4. Deploy gratuito (Render + Vercel)

### Backend no Render

1. Suba este repositório no GitHub.
2. No Render, crie um **Web Service** apontando para a pasta `server/`.
   - Build command: `npm install`
   - Start command: `npm start`
3. Em Environment, adicione **todas** as variáveis abaixo (sem elas o servidor recusa
   iniciar o login ou fica com a API aberta pra qualquer origem):
   - `GROQ_API_KEY` (sua chave) e, opcionalmente, `GROQ_MODEL`.
   - Para voz neural: `GOOGLE_TTS_API_KEY` e `GOOGLE_TTS_VOICE`.
   - `ACCESS_CODE` — o código que as pessoas vão digitar pra entrar. **Obrigatório**:
     sem essa variável, o login fica bloqueado (não há mais valor padrão no código).
   - `SESSION_SECRET` — string aleatória usada pra assinar a sessão de quem já
     logou. Gere uma com `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   - `ALLOWED_ORIGIN` — a URL do seu front-end no Vercel (ex:
     `https://seu-app.vercel.app`). Sem essa variável, **qualquer site** pode chamar
     sua API.
4. Anote a URL pública gerada (ex: `https://cx-preditivo-api.onrender.com`).

> No plano free do Render o serviço "dorme" após alguns minutos sem uso — a primeira
> pergunta após um tempo ocioso pode demorar alguns segundos a mais para responder.

### Frontend no Vercel

1. Importe o mesmo repositório no Vercel — o front-end fica na raiz do repositório,
   então não precisa configurar "Root Directory" (deixe `./`).
2. Em Environment Variables, adicione `VITE_API_URL` com a URL do backend no Render.
3. Deploy. O Vercel detecta automaticamente o projeto Vite (`npm run build`, saída em `dist/`).
4. Volte no Render e confira se `ALLOWED_ORIGIN` bate exatamente com a URL que o
   Vercel gerou (protocolo + domínio, sem barra no final).

### Como funciona a proteção por código de acesso

A tela de login (`AccessScreen.jsx`) não é a única barreira — ela só decide se o
front-end mostra o chat ou não. Quem realmente protege as rotas de IA é o backend:

- `POST /api/auth/verify` confere o código contra `ACCESS_CODE` e, se bater, devolve
  um token assinado (válido por 12h).
- `POST /api/ask` e `POST /api/tts` exigem esse token em
  `Authorization: Bearer <token>` — sem ele (ou com um token forjado/expirado), a
  API recusa com `401`, mesmo que a pessoa nunca tenha passado pela tela de login.
- `/api/auth/verify` tem limite de 8 tentativas a cada 15 minutos por IP, e
  `/api/ask`/`/api/tts` têm limite de 30 requisições por minuto por IP.

Isso significa que ninguém consegue usar sua IA/voz (e consumir sua cota paga) só
copiando a URL pública do backend — precisa primeiro passar pelo código.

## 5. Personalizações rápidas

- Trocar as perguntas sugeridas: `src/App.jsx` → array `SUGGESTIONS`.
- Ajustar tom/estilo das respostas: `server/knowledge.js` → `SYSTEM_CONTEXT`.
- Trocar a cor de pele/textura do avatar procedural: `src/utils/skinTexture.js`.
