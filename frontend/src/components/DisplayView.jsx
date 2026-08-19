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
    </div>
  );
}
