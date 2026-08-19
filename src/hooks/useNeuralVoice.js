import { useCallback, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

function pickPtVoice() {
  const voices = window.speechSynthesis.getVoices();
  return voices.find((v) => v.lang === "pt-BR") || voices.find((v) => v.lang?.startsWith("pt"));
}

export function useNeuralVoice() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const amplitudeRef = useRef(0);
  const audioCtxRef = useRef(null);
  const audioElRef = useRef(null);
  const rafRef = useRef(null);
  const activeFinishRef = useRef(null);

  const stopAnalyser = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    amplitudeRef.current = 0;
  };

  const browserSpeak = useCallback((text) => {
    return new Promise((resolve) => {
      if (!("speechSynthesis" in window) || !text) {
        resolve();
        return;
      }

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "pt-BR";
      utterance.rate = 1;
      utterance.pitch = 1.05;

      const voice = pickPtVoice();
      if (voice) utterance.voice = voice;
      else
        window.speechSynthesis.onvoiceschanged = () => {
          const v = pickPtVoice();
          if (v) utterance.voice = v;
        };

      let raf;
      const pulse = () => {
        amplitudeRef.current = 0.2 + Math.abs(Math.sin(performance.now() / 90)) * 0.5;
        raf = requestAnimationFrame(pulse);
      };

      const finish = () => {
        setIsSpeaking(false);
        cancelAnimationFrame(raf);
        amplitudeRef.current = 0;
        activeFinishRef.current = null;
        resolve();
      };
      activeFinishRef.current = finish;

      utterance.onstart = () => {
        setIsSpeaking(true);
        pulse();
      };
      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    });
  }, []);

  const speak = useCallback(
    async (text, voiceSettings) => {
      if (!text) return;

      try {
        const res = await fetch(`${API_URL}/api/tts`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("magalu_token") || ""}`,
          },
          body: JSON.stringify({ text, ...voiceSettings }),
        });
        if (!res.ok) throw new Error("tts_unavailable");

        const { audioContent } = await res.json();
        if (!audioContent) throw new Error("tts_empty");

        const audio = new Audio(`data:audio/mp3;base64,${audioContent}`);
        audioElRef.current = audio;

        if (!audioCtxRef.current) {
          audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") await ctx.resume();

        const source = ctx.createMediaElementSource(audio);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyser.connect(ctx.destination);

        const freqData = new Uint8Array(analyser.frequencyBinCount);
        const tick = () => {
          analyser.getByteFrequencyData(freqData);
          const avg = freqData.reduce((a, b) => a + b, 0) / freqData.length;
          amplitudeRef.current = Math.min(1, avg / 90);
          rafRef.current = requestAnimationFrame(tick);
        };

        return await new Promise((resolve) => {
          const finish = () => {
            setIsSpeaking(false);
            stopAnalyser();
            activeFinishRef.current = null;
            resolve();
          };
          activeFinishRef.current = finish;

          audio.onplay = () => {
            setIsSpeaking(true);
            tick();
          };
          audio.onended = finish;
          audio.onerror = finish;
          audio.play().catch(finish);
        });
      } catch (err) {
        console.warn(
          "TTS neural indisponível, usando voz do navegador como alternativa:",
          err.message
        );
        return browserSpeak(text);
      }
    },
    [browserSpeak]
  );

  const cancel = useCallback(() => {
    audioElRef.current?.pause();
    window.speechSynthesis?.cancel();
    if (activeFinishRef.current) {
      activeFinishRef.current();
    } else {
      setIsSpeaking(false);
      stopAnalyser();
    }
  }, []);

  return { isSpeaking, amplitudeRef, speak, browserSpeak, cancel };
}
