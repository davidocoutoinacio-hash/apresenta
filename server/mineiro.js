// Camada leve de "sotaque" para a fala da IA: troca palavras por suas formas
// coloquiais típicas da fala informal mineira antes de enviar ao TTS. Isso muda
// a pronúncia (porque muda o texto lido), mas não o timbre/prosódia da voz —
// o Google TTS não expõe controle de sotaque regional.
//
// Só entram aqui trocas 1-para-1 que não quebram concordância de gênero/número
// (ex: "coisa" → "trem" foi propositalmente deixado de fora, porque "trem" é
// masculino e quebraria frases como "uma coisa boa"). Interjeições como "uai",
// "sô" e "trem" ficam a cargo do modelo de linguagem, que sabe encaixar de forma
// gramatical — ver server/knowledge.js.
const DICTIONARY = {
  "você": "cê",
  "vocês": "cêis",
  "está": "tá",
  "estás": "tá",
  "estão": "tão",
  "estou": "tô",
  "estamos": "tamo",
  "estava": "tava",
  "estavam": "tavam",
  "não": "num",
  "também": "tamém",
  "até": "té",
  "bom": "bão",
  "muito": "muinto",
  "ainda": "inda",
  "nós": "nóis",
};

// Contrações de "para" — tratadas antes do dicionário por palavra, pra virar
// "pro"/"pras" em vez do genérico "pra o"/"pra as".
const PHRASES = [
  [/\bpara os\b/giu, "pros"],
  [/\bpara as\b/giu, "pras"],
  [/\bpara o\b/giu, "pro"],
  [/\bpara a\b/giu, "pra"],
];

function preserveCase(original, replacement) {
  if (original.length > 1 && original === original.toUpperCase()) {
    return replacement.toUpperCase();
  }
  if (original[0] === original[0].toUpperCase()) {
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export function applyMineiroAccent(text) {
  let result = text;

  for (const [regex, replacement] of PHRASES) {
    result = result.replace(regex, (match) => preserveCase(match, replacement));
  }

  result = result.replace(/\p{L}+/gu, (word) => {
    const replacement = DICTIONARY[word.toLowerCase()];
    return replacement ? preserveCase(word, replacement) : word;
  });

  // "para" isolado (não capturado pelas contrações acima) vira "pra".
  result = result.replace(/\bpara\b/giu, (word) => preserveCase(word, "pra"));

  return result;
}
