import { useEffect, useRef, useState } from "react";
import Scene from "./components/Scene";
import OrbitDock from "./components/OrbitDock";
import ScriptPanel from "./components/ScriptPanel";
import AccessScreen from "./components/AccessScreen";
import SpeakingBubble from "./components/SpeakingBubble";
import DisplayView from "./components/DisplayView";
import { useVoice } from "./hooks/useVoice";
import { useNeuralVoice } from "./hooks/useNeuralVoice";
import { useVoiceSettings } from "./hooks/useVoiceSettings";
import { useScripts } from "./hooks/useScripts";
import { usePresenterChannel } from "./hooks/usePresenterChannel";
import { VOICE_GROUPS, voiceSupportsPitch } from "./voices";
import "./App.css";

const IS_DISPLAY_WINDOW = new URLSearchParams(window.location.search).get("display") === "1";

const TEST_PHRASE = "Oi, uai, tudo bão? Esse é um teste de voz.";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

const SUGGESTIONS = [
  "O que é CX Preditivo?",
  "Qual a diferença entre CX reativo, proativo e preditivo?",
  "Como a Amazon usa CX Preditivo?",
];

export default function App() {
  // A janela de exibição (?display=1) é um componente totalmente à parte — sem
  // roteiro, sem configurações, só o avatar. Retorna antes de qualquer hook do
  // painel de controle (a flag não muda durante a vida desta página).
  if (IS_DISPLAY_WINDOW) {
    return <DisplayView />;
  }

  const { isListening, supported, listen } = useVoice();
  const { isSpeaking, amplitudeRef, speak, cancel: cancelSpeaking } = useNeuralVoice();
  const { voiceSettings, updateVoiceSettings, resetVoiceSettings } = useVoiceSettings();
  const {
    scripts,
    addScript,
    removeScript,
    renameScript,
    toggleMinimized,
    addLine,
    updateLine,
    removeLine,
    setCurrentIndex,
    setLastPlayedId,
    resizeScript,
    resetProgress,
    exportScripts,
    importScripts,
  } = useScripts();
  const importInputRef = useRef(null);
  const [importMessage, setImportMessage] = useState("");

  function handleImportFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = importScripts(String(reader.result || ""));
      setImportMessage(
        result.ok
          ? `${result.count} roteiro${result.count > 1 ? "s" : ""} importado${result.count > 1 ? "s" : ""}!`
          : result.error
      );
      setTimeout(() => setImportMessage(""), 4000);
    };
    reader.readAsText(file);
  }
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking | error
  const [avatarUrl, setAvatarUrl] = useState(() => localStorage.getItem("avatarUrl") || "");
  const [avatarMode, setAvatarMode] = useState(
    () => localStorage.getItem("avatarMode") || "jarvis"
  );
  const [glbModel, setGlbModel] = useState(() => localStorage.getItem("glbModel") || "bear");
  const [showSettings, setShowSettings] = useState(false);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [authed, setAuthed] = useState(
    () => localStorage.getItem("magalu_authed") === "1"
  );
  const busyRef = useRef(false);

  // Coordenação com a janela de exibição (?display=1): quando ela avisa que está
  // pronta, o controle passa a delegar a fala pra lá (áudio só toca na tela
  // compartilhada) em vez de tocar localmente.
  const [hasDisplay, setHasDisplay] = useState(false);
  const [remoteIsSpeaking, setRemoteIsSpeaking] = useState(false);
  const pendingSpeakResolveRef = useRef(null);
  const effectiveIsSpeaking = hasDisplay ? remoteIsSpeaking : isSpeaking;

  const { send: sendToDisplay } = usePresenterChannel((msg) => {
    if (!msg || typeof msg !== "object") return;
    if (msg.type === "display-ready") {
      setHasDisplay(true);
      sendToDisplay({ type: "avatar-config", avatarUrl, avatarMode, glbModel });
    } else if (msg.type === "speaking-status") {
      setHasDisplay(true);
      setRemoteIsSpeaking(msg.isSpeaking);
      if (!msg.isSpeaking && pendingSpeakResolveRef.current) {
        pendingSpeakResolveRef.current();
        pendingSpeakResolveRef.current = null;
      }
    }
  });

  function openDisplayWindow() {
    const url = `${window.location.origin}${window.location.pathname}?display=1`;
    window.open(url, "cx-preditivo-display", "width=1280,height=800");
  }

  function doSpeak(text, settings) {
    if (hasDisplay) {
      return new Promise((resolve) => {
        pendingSpeakResolveRef.current = resolve;
        sendToDisplay({ type: "speak", text, voiceSettings: settings });
      });
    }
    return speak(text, settings);
  }

  function doCancel() {
    if (hasDisplay) {
      sendToDisplay({ type: "cancel" });
      if (pendingSpeakResolveRef.current) {
        pendingSpeakResolveRef.current();
        pendingSpeakResolveRef.current = null;
      }
      setRemoteIsSpeaking(false);
    } else {
      cancelSpeaking();
    }
  }

  function closePanelsExcept(which) {
    setShowSettings(which === "settings");
    setShowVoicePanel(which === "voice");
  }

  function handleLogout() {
    doCancel();
    localStorage.removeItem("magalu_authed");
    localStorage.removeItem("magalu_token");
    setAuthed(false);
  }

  useEffect(() => {
    if (isListening) setStatus("listening");
    else if (effectiveIsSpeaking) setStatus("speaking");
  }, [isListening, effectiveIsSpeaking]);

  useEffect(() => {
    sendToDisplay({ type: "avatar-config", avatarUrl, avatarMode, glbModel });
  }, [avatarUrl, avatarMode, glbModel, sendToDisplay]);

  useEffect(() => {
    localStorage.setItem("avatarUrl", avatarUrl || "");
  }, [avatarUrl]);

  useEffect(() => {
    localStorage.setItem("avatarMode", avatarMode);
  }, [avatarMode]);

  useEffect(() => {
    localStorage.setItem("glbModel", glbModel);
  }, [glbModel]);

  async function ask(text) {
    if (!text || busyRef.current) return;
    busyRef.current = true;
    setStatus("thinking");

    try {
      const res = await fetch(`${API_URL}/api/ask`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("magalu_token") || ""}`,
        },
        body: JSON.stringify({ question: text }),
      });
      const data = await res.json();

      if (res.status === 401) {
        handleLogout();
        throw new Error("Sessão expirada. Faça login de novo.");
      }
      if (!res.ok) throw new Error(data?.error || "Erro ao consultar a IA.");

      await doSpeak(data.answer, voiceSettings);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }

  async function playLine(scriptId, line, index) {
    if (!line?.text?.trim() || busyRef.current) return;
    busyRef.current = true;
    doCancel();
    setLastPlayedId(scriptId, line.id);
    setCurrentIndex(scriptId, index + 1);

    try {
      await doSpeak(line.text, voiceSettings);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }

  async function testVoice() {
    if (busyRef.current) return;
    busyRef.current = true;
    doCancel();

    try {
      await doSpeak(TEST_PHRASE, voiceSettings);
      setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    } finally {
      busyRef.current = false;
    }
  }

  async function handleMicClick() {
    if (effectiveIsSpeaking) {
      doCancel();
      setStatus("idle");
      return;
    }
    if (busyRef.current) return;

    try {
      setStatus("listening");
      const transcript = await listen();
      if (transcript) await ask(transcript);
      else setStatus("idle");
    } catch (err) {
      console.error(err);
      setStatus("error");
    }
  }

  if (!authed) {
    return (
      <AccessScreen
        isSpeaking={isSpeaking}
        amplitudeRef={amplitudeRef}
        speak={speak}
        voiceSettings={voiceSettings}
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

      {hasDisplay ? (
        <div className="display-connected-card">
          <span className="display-connected-dot" />
          Transmitindo na tela de exibição
          <span className="display-connected-status">
            {effectiveIsSpeaking ? "falando…" : "em espera"}
          </span>
        </div>
      ) : (
        <div className="scene-wrap">
          <Scene
            avatarUrl={avatarUrl}
            avatarMode={avatarMode}
            glbModel={glbModel}
            isSpeaking={isSpeaking}
            isListening={isListening}
            amplitudeRef={amplitudeRef}
          />
        </div>
      )}

      {!hasDisplay && (
        <SpeakingBubble visible={isSpeaking && !(!avatarUrl && avatarMode === "jarvis")} />
      )}

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
        <div className="topbar-actions">
          <button className="settings-btn" onClick={openDisplayWindow}>
            🖥️ Tela de exibição
          </button>
          <button className="settings-btn" onClick={() => addScript()}>
            + Roteiro
          </button>
          <button
            className="settings-btn"
            onClick={exportScripts}
            title="Baixa todos os roteiros como arquivo .json"
          >
            ⬇️ Exportar
          </button>
          <button
            className="settings-btn"
            onClick={() => importInputRef.current?.click()}
            title="Carrega roteiros de um arquivo .json exportado"
          >
            ⬆️ Importar
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={handleImportFile}
          />
          <button
            className="settings-btn"
            onClick={() => closePanelsExcept(showVoicePanel ? null : "voice")}
          >
            Voz
          </button>
          <button
            className="settings-btn"
            onClick={() => closePanelsExcept(showSettings ? null : "settings")}
          >
            Configurar avatar
          </button>
          <button className="settings-btn logout-btn" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </header>

      {importMessage && (
        <div
          style={{
            position: "fixed",
            top: 72,
            right: 20,
            zIndex: 50,
            background: "rgba(15, 23, 42, 0.95)",
            color: "#fff",
            padding: "10px 16px",
            borderRadius: 8,
            fontSize: 14,
            boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {importMessage}
        </div>
      )}

      {showSettings && (
        <div className="settings-panel">
          <label>
            <span className="field-label">Estilo do avatar</span>
            <div className="avatar-mode-toggle">
              <button
                type="button"
                className={avatarMode === "jarvis" ? "active" : ""}
                onClick={() => setAvatarMode("jarvis")}
                disabled={!!avatarUrl}
              >
                Holograma (Jarvis)
              </button>
              <button
                type="button"
                className={avatarMode === "procedural" ? "active" : ""}
                onClick={() => setAvatarMode("procedural")}
                disabled={!!avatarUrl}
              >
                Avatar 3D
              </button>
            </div>
          </label>

          {avatarMode === "procedural" && !avatarUrl && (
            <label>
              <span className="field-label">Modelo do avatar 3D</span>
              <div className="avatar-mode-toggle">
                <button
                  type="button"
                  className={glbModel === "bear" ? "active" : ""}
                  onClick={() => setGlbModel("bear")}
                >
                  Urso
                </button>
                <button
                  type="button"
                  className={glbModel === "parrot" ? "active" : ""}
                  onClick={() => setGlbModel("parrot")}
                >
                  Papagaio
                </button>
              </div>
            </label>
          )}

          <label>
            <span className="field-label">Avatar Ready Player Me (.glb)</span>
            <input
              type="text"
              placeholder="https://models.readyplayer.me/SEU_ID.glb"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value.trim())}
            />
          </label>
          <p className="hint">
            O holograma reage em tempo real ao volume da voz enquanto a IA fala — clique nele
            para ver a ondulação. Deixe o campo abaixo vazio para usar o estilo escolhido
            acima, ou cole o link .glb de um avatar humano criado em readyplayer.me.
          </p>
        </div>
      )}

      {showVoicePanel && (
        <div className="voice-panel">
          <label>
            <span className="field-label">Voz (tier gratuito do Google)</span>
            <select
              value={voiceSettings.voice}
              onChange={(e) => updateVoiceSettings({ voice: e.target.value })}
            >
              {VOICE_GROUPS.map((group) => (
                <optgroup key={group.label} label={group.label}>
                  {group.voices.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label>
            <span className="field-label">
              Tom (pitch): {voiceSettings.pitch}
              {!voiceSupportsPitch(voiceSettings.voice) && " · não suportado nessa voz"}
            </span>
            <input
              type="range"
              min={-20}
              max={20}
              step={1}
              value={voiceSettings.pitch}
              disabled={!voiceSupportsPitch(voiceSettings.voice)}
              onChange={(e) => updateVoiceSettings({ pitch: Number(e.target.value) })}
            />
          </label>

          <label>
            <span className="field-label">Velocidade: {voiceSettings.rate.toFixed(2)}x</span>
            <input
              type="range"
              min={0.5}
              max={1.5}
              step={0.02}
              value={voiceSettings.rate}
              onChange={(e) => updateVoiceSettings({ rate: Number(e.target.value) })}
            />
          </label>

          <label>
            <span className="field-label">
              Pausa entre frases: {voiceSettings.sentencePauseMs}ms
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              step={20}
              value={voiceSettings.sentencePauseMs}
              onChange={(e) => updateVoiceSettings({ sentencePauseMs: Number(e.target.value) })}
            />
          </label>

          <label>
            <span className="field-label">Pausa em vírgulas: {voiceSettings.commaPauseMs}ms</span>
            <input
              type="range"
              min={0}
              max={500}
              step={10}
              value={voiceSettings.commaPauseMs}
              onChange={(e) => updateVoiceSettings({ commaPauseMs: Number(e.target.value) })}
            />
          </label>

          <label className="voice-toggle-row">
            <span className="field-label">Sotaque mineiro</span>
            <input
              type="checkbox"
              checked={voiceSettings.mineiroAccent}
              onChange={(e) => updateVoiceSettings({ mineiroAccent: e.target.checked })}
            />
          </label>

          <div className="voice-panel-actions">
            <button className="script-next-btn" onClick={testVoice} disabled={status === "thinking"}>
              ▶ Testar voz
            </button>
            <button className="script-reset-btn" onClick={resetVoiceSettings}>
              Restaurar padrão
            </button>
          </div>

          <p className="hint">
            As configurações ficam salvas neste navegador e continuam valendo mesmo se você
            fechar e abrir o app de novo.
          </p>
        </div>
      )}

      <OrbitDock
        scripts={scripts.filter((s) => s.minimized)}
        onOpen={(id) => toggleMinimized(id, false)}
      />

      {scripts
        .filter((s) => !s.minimized)
        .map((script, i) => (
          <ScriptPanel
            key={script.id}
            script={script}
            index={i}
            status={status}
            onMinimize={() => toggleMinimized(script.id, true)}
            onDelete={() => removeScript(script.id)}
            onRename={(name) => renameScript(script.id, name)}
            onAddLine={() => addLine(script.id)}
            onUpdateLine={(lineId, patch) => updateLine(script.id, lineId, patch)}
            onRemoveLine={(lineId) => removeLine(script.id, lineId)}
            onPlayLine={(line, idx) => playLine(script.id, line, idx)}
            onResetProgress={() => resetProgress(script.id)}
            onResize={(size) => resizeScript(script.id, size)}
          />
        ))}

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} onClick={() => ask(s)} disabled={status === "thinking"}>
            {s}
          </button>
        ))}
      </div>

      <div className="controls">
        {!supported && (
          <p className="warning">
            Reconhecimento de voz não suportado neste navegador. Use o Chrome no desktop ou
            Android.
          </p>
        )}
        <button
          className={`mic-btn status-${status}`}
          onClick={handleMicClick}
          disabled={status === "thinking"}
        >
          {status === "listening" && "Ouvindo…"}
          {status === "thinking" && "Pensando…"}
          {status === "speaking" && "Falando (toque p/ parar)"}
          {(status === "idle" || status === "error") && "🎤 Perguntar"}
        </button>
      </div>
    </div>
  );
}
