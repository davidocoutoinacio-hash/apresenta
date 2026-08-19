// Vozes pt-BR confirmadas disponíveis via texttospeech.googleapis.com/v1/voices
// para o tier gratuito do Google Cloud TTS.
export const VOICE_GROUPS = [
  {
    label: "Chirp3-HD — geração mais nova, mais natural",
    voices: [
      ["Achernar", "F"], ["Achird", "M"], ["Algenib", "M"], ["Algieba", "M"],
      ["Alnilam", "M"], ["Aoede", "F"], ["Autonoe", "F"], ["Callirrhoe", "F"],
      ["Charon", "M"], ["Despina", "F"], ["Enceladus", "M"], ["Erinome", "F"],
      ["Fenrir", "M"], ["Gacrux", "F"], ["Iapetus", "M"], ["Kore", "F"],
      ["Laomedeia", "F"], ["Leda", "F"], ["Orus", "M"], ["Puck", "M"],
      ["Pulcherrima", "F"], ["Rasalgethi", "M"], ["Sadachbia", "M"],
      ["Sadaltager", "M"], ["Schedar", "M"], ["Sulafat", "F"], ["Umbriel", "M"],
      ["Vindemiatrix", "F"], ["Zephyr", "F"], ["Zubenelgenubi", "M"],
    ].map(([name, gender]) => ({
      value: `pt-BR-Chirp3-HD-${name}`,
      label: `${name} · ${gender === "F" ? "feminina" : "masculina"}`,
      pitchSupported: false,
    })),
  },
  {
    label: "Neural2",
    voices: [
      { value: "pt-BR-Neural2-A", label: "Neural2-A · feminina", pitchSupported: true },
      { value: "pt-BR-Neural2-B", label: "Neural2-B · masculina", pitchSupported: true },
      { value: "pt-BR-Neural2-C", label: "Neural2-C · feminina", pitchSupported: true },
    ],
  },
  {
    label: "Wavenet",
    voices: [
      { value: "pt-BR-Wavenet-A", label: "Wavenet-A · feminina", pitchSupported: true },
      { value: "pt-BR-Wavenet-B", label: "Wavenet-B · masculina", pitchSupported: true },
      { value: "pt-BR-Wavenet-C", label: "Wavenet-C · feminina", pitchSupported: true },
      { value: "pt-BR-Wavenet-D", label: "Wavenet-D · feminina", pitchSupported: true },
      { value: "pt-BR-Wavenet-E", label: "Wavenet-E · masculina", pitchSupported: true },
    ],
  },
  {
    label: "Standard — mais econômica (cota gratuita maior)",
    voices: [
      { value: "pt-BR-Standard-A", label: "Standard-A · feminina", pitchSupported: true },
      { value: "pt-BR-Standard-B", label: "Standard-B · masculina", pitchSupported: true },
      { value: "pt-BR-Standard-C", label: "Standard-C · feminina", pitchSupported: true },
      { value: "pt-BR-Standard-D", label: "Standard-D · feminina", pitchSupported: true },
      { value: "pt-BR-Standard-E", label: "Standard-E · masculina", pitchSupported: true },
    ],
  },
];

const ALL_VOICES = VOICE_GROUPS.flatMap((g) => g.voices);

export function voiceSupportsPitch(voiceValue) {
  return ALL_VOICES.find((v) => v.value === voiceValue)?.pitchSupported ?? true;
}

export const DEFAULT_VOICE_SETTINGS = {
  voice: "pt-BR-Chirp3-HD-Erinome",
  pitch: -4,
  rate: 0.92,
  sentencePauseMs: 480,
  commaPauseMs: 200,
  mineiroAccent: true,
};
