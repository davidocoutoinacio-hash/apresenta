# 🎙️ Rogéria — CX Preditivo · IA LAB

**Assistente de IA com avatar 3D animado e voz neural, feita pra apresentar o tema
_CX Preditivo_ ao vivo** — responde por voz, tem roteiro editável e um modo de
apresentação de duas telas pensado pra compartilhar no Google Meet.

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=0b1220&labelColor=0b1220">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=fff&labelColor=0b1220">
  <img alt="Three.js" src="https://img.shields.io/badge/Three.js-r1-black?logo=threedotjs&logoColor=fff&labelColor=0b1220">
  <img alt="Node" src="https://img.shields.io/badge/Node-Express-339933?logo=node.js&logoColor=fff&labelColor=0b1220">
  <img alt="Groq" src="https://img.shields.io/badge/LLM-Groq-F55036?labelColor=0b1220">
  <img alt="Google Cloud TTS" src="https://img.shields.io/badge/Voz-Google_Cloud_TTS-4285F4?logo=googlecloud&logoColor=fff&labelColor=0b1220">
  <img alt="Custo" src="https://img.shields.io/badge/Custo-100%25_gratuito-22c55e?labelColor=0b1220">
</p>

---

## ✨ O que tem aqui

- **🧑‍🎨 Três estilos de avatar 3D**, trocáveis na hora: um holograma tipo wireframe
  (Jarvis-style, com partículas e ondulação reativa ao som), um urso e um papagaio 3D
  — ou cole a URL de um avatar humano criado no [Ready Player Me](https://readyplayer.me).
- **🗣️ Voz neural gratuita**: mais de 40 vozes do Google Cloud TTS (Chirp3-HD, Neural2,
  Wavenet, Standard), com tom, velocidade, pausas e um **sotaque mineiro opcional**
  ajustáveis direto pela interface — cai pra voz nativa do navegador se faltar a chave.
- **🎙️ Conversa por voz ou texto**: pergunta pelo microfone (Web Speech API) ou clica
  numa sugestão, a resposta vem da Groq (LLM gratuito e rápido) e é narrada pelo avatar,
  com a boca sincronizada à amplitude real do áudio.
- **📜 Roteiros editáveis**: crie quantos roteiros quiser, com falas editáveis linha a
  linha. Minimizados, viram ícones orbitando o avatar; clicados, abrem como painéis
  flutuantes e redimensionáveis.
- **🖥️ Modo apresentação de duas telas**: uma janela de **controle** (roteiros,
  configurações, microfone) e uma janela de **exibição**, só com o avatar — é essa
  que você compartilha no Google Meet, enquanto comanda tudo pela outra.
- **🔒 Acesso protegido de verdade**: login por código com sessão assinada
  (HMAC + expiração), limite de tentativas, e as rotas de IA recusam qualquer chamada
  sem sessão válida — não é só uma tela, a API inteira é protegida.
- **💸 Gratuito de ponta a ponta**: Groq, Google Cloud TTS, Render e Vercel — todo
  mundo tem camada gratuita generosa o suficiente pra isso.

## 📁 Estrutura

```
apresenta/
  src/, public/, index.html, package.json   → front-end (React + Three.js) — raiz do repo, deploy no Vercel
  server/                                   → API Node/Express (Groq + Google TTS + auth) — deploy no Render
  DEPLOY.md                                 → checklist passo a passo de deploy
```

O front-end fica na **raiz** do repositório (não numa subpasta), então o Vercel
detecta o projeto Vite sozinho, sem precisar configurar "Root Directory". Só o
backend fica isolado em `server/`.

## 🚀 Deploy

Checklist completo (Render + Vercel, todas as variáveis de ambiente, ordem certa
pra evitar ida-e-volta) está em **[`DEPLOY.md`](./DEPLOY.md)**.

## 🧑‍💻 Rodando localmente

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

<details>
<summary><strong>Voz neural (opcional, recomendado)</strong></summary>

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
são apenas os **valores padrão do servidor** — o card "Voz" na interface permite
escolher a voz e ajustar tudo isso direto pelo navegador, com override por
requisição, sem precisar mexer no `.env` nem reiniciar o backend.

</details>

### Frontend

Em outro terminal, a partir da raiz do repositório:

```bash
cp .env.example .env   # aponta para http://localhost:3001 por padrão
npm run dev
```

Abra o endereço mostrado (geralmente http://localhost:5173) no **Chrome** — é o navegador
com melhor suporte à Web Speech API em português.

## 🧑‍🎨 Avatar 3D

Clique em **"Configurar avatar"** na barra superior:

- **Holograma (Jarvis)**: wireframe geodésico com partículas, reage à voz sem precisar
  de nenhum modelo externo.
- **Avatar 3D**: escolha entre **urso** e **papagaio** (modelos prontos, já inclusos em
  `public/models/`), com animação de corpo inteiro (balanço, dança espontânea, reação
  ao clique) e uma aura de partículas coloridas ao redor.
- **Ready Player Me**: cole a URL `.glb` de um avatar humano criado gratuitamente em
  [readyplayer.me](https://readyplayer.me) — vem com blend shapes de boca e olho,
  sincronizados automaticamente com a fala.

## 🗣️ Como funciona a conversa por voz

- **Ouvir**: `SpeechRecognition` do navegador (gratuito, pt-BR).
- **Responder**: a pergunta vai para `POST /api/ask` no backend, que injeta o conteúdo de
  CX Preditivo como contexto (`server/knowledge.js`) e chama a Groq (`openai/gpt-oss-120b`,
  tier gratuito).
- **Falar**: o texto vai para `POST /api/tts` no backend, que gera áudio com uma voz
  neural do Google; sem chave configurada, cai automaticamente para a `SpeechSynthesis`
  do navegador. Em ambos os casos o avatar sincroniza a boca/reação com a amplitude
  real do áudio (análise em tempo real via Web Audio API).

Para atualizar o conteúdo sobre o qual a IA responde, edite `server/knowledge.js`.

### Configurar a voz pela interface

Clique em **"Voz"** na barra superior para abrir o card de configuração: mais de 40
vozes gratuitas do Google, tom, velocidade, pausa entre frases/vírgulas, sotaque
mineiro (liga/desliga) e um botão **"Testar voz"**. Tudo fica salvo no navegador.

## 📜 Roteiros

Clique em **"+ Roteiro"** pra criar um roteiro novo, com frases editáveis (rótulo,
nota de contexto e o texto que a IA vai falar). Minimizado, cada roteiro vira um
ícone orbitando o avatar — clique pra abrir como painel flutuante, arrastável e
redimensionável. O botão **"▶ Próxima fala"** avança sequencialmente pelas falas.

## 🖥️ Apresentação em duas telas

Pensado pra apresentar ao vivo (Google Meet, palco, etc.) sem que a plateia veja
seus controles:

- **Janela de controle** (URL normal): roteiros, configurações, microfone — fica com
  você.
- **Janela de exibição** (mesma URL + `?display=1`): só o avatar, sem nenhum controle
  — é essa que você compartilha na chamada.

Abra pelo botão **"🖥️ Tela de exibição"** no topo do painel de controle. As duas
janelas precisam estar abertas no mesmo navegador, no mesmo computador — a
comunicação entre elas é local (`BroadcastChannel`), não passa pela internet. Na
primeira vez, a tela de exibição pede um clique único pra desbloquear o áudio
(exigência dos navegadores para som iniciado por outra janela).

## 🔒 Como funciona a proteção por código de acesso

A tela de login não é a única barreira — ela só decide se o front-end mostra o chat
ou não. Quem realmente protege as rotas de IA é o backend:

- `POST /api/auth/verify` confere o código contra `ACCESS_CODE` e, se bater, devolve
  um token assinado (válido por 12h).
- `POST /api/ask` e `POST /api/tts` exigem esse token em
  `Authorization: Bearer <token>` — sem ele (ou com um token forjado/expirado), a
  API recusa com `401`, mesmo que a pessoa nunca tenha passado pela tela de login.
- `/api/auth/verify` tem limite de 8 tentativas a cada 15 minutos por IP, e
  `/api/ask`/`/api/tts` têm limite de 30 requisições por minuto por IP.
- CORS restrito ao domínio configurado em `ALLOWED_ORIGIN`.

Isso significa que ninguém consegue usar sua IA/voz (e consumir sua cota paga) só
copiando a URL pública do backend — precisa primeiro passar pelo código.

## 🎨 Personalizações rápidas

- Trocar as perguntas sugeridas: `src/App.jsx` → array `SUGGESTIONS`.
- Ajustar tom/estilo das respostas: `server/knowledge.js` → `SYSTEM_CONTEXT`.
- Dicionário do sotaque mineiro: `server/mineiro.js`.
- Trocar/adicionar avatares 3D prontos: `public/models/` + `src/components/Scene.jsx`
  → `BUNDLED_GLB_MODELS`.
