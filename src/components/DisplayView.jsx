import { useEffect, useState } from "react";
import Scene from "./Scene";
import SpeakingBubble from "./SpeakingBubble";
import AccessScreen from "./AccessScreen";
import { useNeuralVoice } from "../hooks/useNeuralVoice";
import { usePresenterChannel } from "../hooks/usePresenterChannel";
import { DEFAULT_VOICE_SETTINGS } from "../voices";

// Tela de exibição: só o avatar falando, sem nenhum controle — pensada pra ser a
// janela/aba compartilhada no Google Meet. Recebe comandos ("fale isso", "pare",
// "troque de avatar") da janela de controle via BroadcastChannel e reporta de
// volta quando começa/termina de falar.
export default function DisplayView() {
  const { isSpeaking, amplitudeRef, speak, cancel } = useNeuralVoice();
  const [authed, setAuthed] = useState(() => localStorage.getItem("magalu_authed") === "1");
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState(() => ({
    avatarUrl: localStorage.getItem("avatarUrl") || "",
    avatarMode: localStorage.getItem("avatarMode") || "jarvis",
    glbModel: localStorage.getItem("glbModel") || "bear",
  }));

  const { send } = usePresenterChannel((msg) => {
    if (!msg || typeof msg !== "object") return;
    switch (msg.type) {
      case "speak":
        speak(msg.text, msg.voiceSettings);
        break;
      case "cancel":
        cancel();
        break;
      case "avatar-config":
        setAvatarConfig({
          avatarUrl: msg.avatarUrl || "",
          avatarMode: msg.avatarMode || "jarvis",
          glbModel: msg.glbModel || "bear",
        });
        break;
      default:
        break;
    }
  });

  // Avisa a janela de controle que a exibição está pronta — se o controle já
  // tiver um avatar configurado, ele responde com o estado atual.
  useEffect(() => {
    if (authed) send({ type: "display-ready" });
  }, [authed, send]);

  useEffect(() => {
    if (authed) send({ type: "speaking-status", isSpeaking });
  }, [authed, isSpeaking, send]);

  // O comando de fala chega por mensagem entre janelas, não por um clique direto
  // nesta aba — os navegadores bloqueiam áudio/Web Audio programático nesse caso
  // até haver uma interação real do usuário na própria página. Esse clique único
  // "destrava" o áudio pro resto da sessão desta janela.
  function unlockAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      const ctx = new AudioCtx();
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
      ctx.resume();
    } catch {
      // best-effort — se falhar, o navegador pode já não precisar do desbloqueio
    }
    setAudioUnlocked(true);
  }

  if (!authed) {
    return (
      <AccessScreen
        isSpeaking={isSpeaking}
        amplitudeRef={amplitudeRef}
        speak={speak}
        voiceSettings={DEFAULT_VOICE_SETTINGS}
        onUnlock={() => {
          localStorage.setItem("magalu_authed", "1");
          setAuthed(true);
        }}
      />
    );
  }

  return (
    <div className="app">
      <div className="brand-bar brand-bar-top" />
      <div className="brand-bar brand-bar-bottom" />
      <div className="scene-wrap">
        <Scene
          avatarUrl={avatarConfig.avatarUrl}
          avatarMode={avatarConfig.avatarMode}
          glbModel={avatarConfig.glbModel}
          isSpeaking={isSpeaking}
          isListening={false}
          amplitudeRef={amplitudeRef}
        />
      </div>
      <SpeakingBubble
        visible={isSpeaking && !(!avatarConfig.avatarUrl && avatarConfig.avatarMode === "jarvis")}
      />

      <header className="topbar">
        <div className="brand">
          <div className="brand-logo">
            <span className="brand-logo-text">magalu</span>
            <span className="brand-logo-bar" />
          </div>
          <span className="brand-assistant-name">
            <span className="brand-dot" />
            Rogéria · IA LAB
          </span>
        </div>
      </header>

      {!audioUnlocked && (
        <div className="access-content">
          <div className="access-card">
            <div className="brand-logo access-logo">
              <span className="brand-logo-text">magalu</span>
              <span className="brand-logo-bar" />
            </div>
            <p className="access-subtitle">
              Clique para ativar o áudio desta tela antes de compartilhar no Meet
            </p>
            <div className="access-form">
              <button type="button" onClick={unlockAudio}>
                🔊 Ativar áudio
              </button>
            </div>
            <p className="access-hint">
              Só precisa clicar uma vez — o navegador bloqueia som iniciado por
              comando da outra janela até essa confirmação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
