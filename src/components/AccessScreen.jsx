import { useRef, useState } from "react";
import Scene from "./Scene";
import { ROGERIA_ACCESS_PHRASES } from "../rogeriaPhrases";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

export default function AccessScreen({ isSpeaking, amplitudeRef, speakDemo, onUnlock }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const lastPhraseIndexRef = useRef(-1);

  function pickPhraseIndex() {
    if (ROGERIA_ACCESS_PHRASES.length === 1) return 0;

    let index;
    do {
      index = Math.floor(Math.random() * ROGERIA_ACCESS_PHRASES.length);
    } while (index === lastPhraseIndexRef.current);

    lastPhraseIndexRef.current = index;
    return index;
  }

  function handleAvatarActivate() {
    if (isSpeaking) return;
    const index = pickPhraseIndex();
    speakDemo(index, ROGERIA_ACCESS_PHRASES[index]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok || !data.token) {
        throw new Error(data?.error || "Código inválido.");
      }

      localStorage.setItem("magalu_token", data.token);
      onUnlock();
    } catch (err) {
      setError(err.message || "Não foi possível validar o código agora.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app">
      <div className="brand-bar brand-bar-top" />
      <div className="brand-bar brand-bar-bottom" />
      <div className="scene-wrap">
        <Scene
          avatarMode="jarvis"
          isSpeaking={isSpeaking}
          isListening={false}
          amplitudeRef={amplitudeRef}
          onAvatarActivate={handleAvatarActivate}
        />
      </div>

      <div className="access-content">
        <div className="access-card">
          <div className="brand-logo access-logo">
            <span className="brand-logo-text">magalu</span>
            <span className="brand-logo-bar" />
          </div>

          <p className="access-subtitle">Digite o código para conversar com a Rogéria</p>

          <form className="access-form" onSubmit={handleSubmit}>
            <input
              type="password"
              inputMode="text"
              autoComplete="off"
              placeholder="Código de acesso"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={submitting}
            />
            <button type="submit" disabled={submitting || !code.trim()}>
              {submitting ? "Verificando…" : "Entrar"}
            </button>
          </form>

          {error && <p className="access-error">{error}</p>}

          <p className="access-hint">Toque no holograma para ouvir a Rogéria</p>
        </div>
      </div>
    </div>
  );
}
