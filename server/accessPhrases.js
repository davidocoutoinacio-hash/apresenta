// Espelha src/rogeriaPhrases.js — mantido separado porque front-end e back-end
// são dois pacotes/deploys distintos (raiz do repo vs. server/). Usado só pelo
// /api/tts-demo, que nunca aceita texto livre do cliente: apenas um índice
// desta lista, pra dar pra tocar a voz de verdade da Rogéria antes do login
// sem abrir a rota de TTS pra texto arbitrário sem autenticação.
export const ROGERIA_ACCESS_PHRASES = [
  "Oi! Eu sou a Rogéria. Cês tão bão?",
  "Uai, oi! Sô a Rogéria, tô aqui esperando o código.",
  "Égua, chegou visita! Sou a Rogéria, viu.",
  "Oi, sô a Rogéria. Bora bater um papo, uai?",
  "Fala aí! Rogéria na área, trem bão te ver por aqui.",
  "Oi, cê já pegou o código? Tô doida pra conversar.",
  "Sô a Rogéria, e óia, tô demais da conta feliz de te ver.",
  "Uai, digita o código aí que a prosa rende, sô.",
  "Bem capaz que cê chegou sem saber o código, uai!",
  "Oi, gente boa! Sou a Rogéria, a IA mais mineira da Magalu.",
  "Cê já viu trem mais bão que esse hologramazinho, uai?",
  "Fala sério, égua, adoro quando cê passa aqui pra me ver.",
];
