# Checklist de Deploy — Render + Vercel

Guia direto do que configurar antes de colocar o app no ar. Backend vai pro
Render, front-end vai pro Vercel — os dois gratuitos.

## 0. Antes de começar

Tenha em mãos:

- [ ] Repositório no GitHub com este projeto (crie um se ainda não tiver — o
      Render e o Vercel importam direto do GitHub).
- [ ] Chave da Groq (`console.groq.com/keys`).
- [ ] Chave do Google Cloud Text-to-Speech (ver passo a passo no `README.md`,
      seção "Voz neural").
- [ ] Um código de acesso escolhido por você (o que as pessoas vão digitar pra
      entrar no app — ex: `IALAB2026`).

Como a URL do Vercel só existe depois de fazer o deploy do front-end, e o
Render precisa dessa URL pra liberar o CORS, a ordem abaixo evita ida e volta:
**1) deploy do backend sem `ALLOWED_ORIGIN` → 2) deploy do front-end → 3) volta
no backend e preenche `ALLOWED_ORIGIN`.**

## 1. Backend no Render

1. No Render, **New +** → **Web Service** → conecte o repositório do GitHub.
2. Configurações do serviço:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free
3. Em **Environment**, adicione as variáveis:

   | Variável | Obrigatória | Valor |
   |---|---|---|
   | `GROQ_API_KEY` | ✅ | sua chave da Groq |
   | `GROQ_MODEL` | opcional | `openai/gpt-oss-120b` (padrão já usado) |
   | `GOOGLE_TTS_API_KEY` | recomendada* | sua chave do Google Cloud |
   | `GOOGLE_TTS_VOICE` | opcional | `pt-BR-Chirp3-HD-Erinome` (ou outra da lista no README) |
   | `GOOGLE_TTS_PITCH` | opcional | `-4.0` |
   | `GOOGLE_TTS_RATE` | opcional | `0.92` |
   | `GOOGLE_TTS_SENTENCE_PAUSE_MS` | opcional | `480` |
   | `GOOGLE_TTS_COMMA_PAUSE_MS` | opcional | `200` |
   | `MINEIRO_ACCENT` | opcional | `true` |
   | `ACCESS_CODE` | ✅ | o código de acesso que você escolheu |
   | `SESSION_SECRET` | ✅ | string aleatória — gere com o comando abaixo |
   | `ALLOWED_ORIGIN` | ✅ (preencher no passo 3) | URL do Vercel, sem barra no final |

   \* sem `GOOGLE_TTS_API_KEY`, a voz cai automaticamente pra síntese do
   navegador (mais robótica, mas funciona).

   Gere o `SESSION_SECRET` rodando localmente:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

4. Deploy. Anote a URL gerada, algo como
   `https://cx-preditivo-api.onrender.com`.
5. Teste: `curl https://SUA-URL.onrender.com/api/health` deve responder
   `{"ok":true}`.

> Plano free do Render "dorme" após alguns minutos sem uso — a primeira
> requisição depois de um tempo ocioso demora alguns segundos a mais.

## 2. Frontend no Vercel

1. No Vercel, **Add New** → **Project** → importe o mesmo repositório.
2. **Root Directory**: `frontend`.
3. Em **Environment Variables**, adicione:

   | Variável | Valor |
   |---|---|
   | `VITE_API_URL` | a URL do Render do passo 1 (ex: `https://cx-preditivo-api.onrender.com`) |

4. Deploy. O Vercel detecta o projeto Vite automaticamente (`npm run build`,
   saída em `dist/`). Anote a URL gerada, algo como
   `https://seu-app.vercel.app`.

## 3. Voltar no Render e travar o CORS

1. No serviço do Render, edite a variável `ALLOWED_ORIGIN` com a URL exata do
   Vercel (protocolo + domínio, **sem barra no final**), ex:
   `https://seu-app.vercel.app`.
2. Se você tiver mais de um domínio (ex: um preview do Vercel e o domínio
   final), separe por vírgula: `https://seu-app.vercel.app,https://preview-x.vercel.app`.
3. Salve — o Render reinicia o serviço sozinho.

## 4. Checklist de verificação pós-deploy

- [ ] Abrir a URL do Vercel → deve pedir o código de acesso.
- [ ] Digitar o `ACCESS_CODE` errado → deve recusar.
- [ ] Digitar o `ACCESS_CODE` certo → deve entrar no app.
- [ ] Fazer uma pergunta pelo microfone → deve responder com voz.
- [ ] Testar direto pelo terminal que a API recusa sem login (troque a URL):
  ```
  curl -X POST https://SUA-URL.onrender.com/api/ask \
    -H "Content-Type: application/json" \
    -d '{"question":"teste"}'
  ```
  Deve devolver `401` (sessão inválida) — se devolver uma resposta da IA,
  algo ficou mal configurado (confira se o deploy pegou o código mais
  recente do `server/index.js`).
- [ ] Testar a tela de exibição: com o app já logado, clicar em
  **"🖥️ Tela de exibição"** na barra superior — deve abrir uma segunda janela
  só com o avatar. Fazer uma pergunta na janela original e confirmar que a
  voz/animação aparecem na janela nova, não na original.

## 5. Duas telas (apresentação no Meet)

Não precisa configurar nada extra — a mesma URL do Vercel funciona pras duas
telas:

- **Janela de controle**: a URL normal (`https://seu-app.vercel.app`) — fica
  com você, com os roteiros e configurações.
- **Janela de exibição**: mesma URL com `?display=1` no final
  (`https://seu-app.vercel.app?display=1`) — só o avatar, sem nenhum
  controle. É essa que você compartilha no Google Meet.

Abra a janela de exibição pelo botão **"🖥️ Tela de exibição"** no topo do
painel de controle (abre automaticamente com o link certo). As duas janelas
precisam estar abertas **no mesmo navegador, no mesmo computador** — a
comunicação entre elas não passa pela internet, só entre abas locais.

## 6. Variáveis de ambiente — referência completa

### `server/.env` (Render)

```
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-120b
GOOGLE_TTS_API_KEY=
GOOGLE_TTS_VOICE=pt-BR-Chirp3-HD-Erinome
GOOGLE_TTS_PITCH=-4.0
GOOGLE_TTS_RATE=0.92
GOOGLE_TTS_SENTENCE_PAUSE_MS=480
GOOGLE_TTS_COMMA_PAUSE_MS=200
MINEIRO_ACCENT=true
ACCESS_CODE=
SESSION_SECRET=
ALLOWED_ORIGIN=
PORT=3001
```

### `frontend/.env` (Vercel)

```
VITE_API_URL=
```
