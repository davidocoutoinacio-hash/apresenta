import { useCallback, useEffect, useRef, useState } from "react";

const SpeechRecognitionImpl =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

export function useVoice() {
  const [isListening, setIsListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const speechOk = "speechSynthesis" in window;
    setSupported(Boolean(SpeechRecognitionImpl) && speechOk);
  }, []);

  const listen = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!SpeechRecognitionImpl) {
        reject(new Error("Reconhecimento de voz não suportado neste navegador."));
        return;
      }

      const recognition = new SpeechRecognitionImpl();
      recognition.lang = "pt-BR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => setIsListening(true);
      recognition.onerror = (event) => {
        setIsListening(false);
        reject(new Error(event.error || "Erro no reconhecimento de voz."));
      };
      recognition.onend = () => setIsListening(false);
      recognition.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || "";
        resolve(transcript.trim());
      };

      recognition.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { isListening, supported, listen, stopListening };
}
