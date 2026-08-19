import { useEffect, useState } from "react";
import { SCRIPT } from "../script";

const STORAGE_KEY = "scripts";

function uid() {
  return crypto.randomUUID();
}

function seedDefaultScripts() {
  return [
    {
      id: uid(),
      name: "CX Preditivo — IA LAB",
      minimized: true,
      currentIndex: 0,
      lastPlayedId: null,
      width: 400,
      height: 480,
      lines: SCRIPT.map((line) => ({
        id: uid(),
        label: `${line.slide} · ${line.title}`,
        note: line.cue,
        text: line.text,
      })),
    },
  ];
}

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedDefaultScripts();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : seedDefaultScripts();
  } catch {
    return seedDefaultScripts();
  }
}

export function useScripts() {
  const [scripts, setScripts] = useState(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
  }, [scripts]);

  function addScript(name) {
    const id = uid();
    setScripts((prev) => [
      ...prev,
      {
        id,
        name: name || `Novo roteiro ${prev.length + 1}`,
        minimized: false,
        currentIndex: 0,
        lastPlayedId: null,
        width: 400,
        height: 480,
        lines: [{ id: uid(), label: "", note: "", text: "" }],
      },
    ]);
    return id;
  }

  function removeScript(id) {
    setScripts((prev) => prev.filter((s) => s.id !== id));
  }

  function renameScript(id, name) {
    setScripts((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)));
  }

  function toggleMinimized(id, value) {
    setScripts((prev) =>
      prev.map((s) => (s.id === id ? { ...s, minimized: value ?? !s.minimized } : s))
    );
  }

  function addLine(scriptId) {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === scriptId
          ? { ...s, lines: [...s.lines, { id: uid(), label: "", note: "", text: "" }] }
          : s
      )
    );
  }

  function updateLine(scriptId, lineId, patch) {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === scriptId
          ? { ...s, lines: s.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) }
          : s
      )
    );
  }

  function removeLine(scriptId, lineId) {
    setScripts((prev) =>
      prev.map((s) =>
        s.id === scriptId ? { ...s, lines: s.lines.filter((l) => l.id !== lineId) } : s
      )
    );
  }

  function setCurrentIndex(scriptId, index) {
    setScripts((prev) => prev.map((s) => (s.id === scriptId ? { ...s, currentIndex: index } : s)));
  }

  function setLastPlayedId(scriptId, lineId) {
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, lastPlayedId: lineId } : s))
    );
  }

  function resizeScript(scriptId, { width, height }) {
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, width, height } : s))
    );
  }

  function resetProgress(scriptId) {
    setScripts((prev) =>
      prev.map((s) => (s.id === scriptId ? { ...s, currentIndex: 0, lastPlayedId: null } : s))
    );
  }

  // Roteiros só existem no localStorage deste navegador — exportar/importar é o
  // jeito de levá-los pra outro navegador ou computador sem precisar de conta.
  function exportScripts() {
    const data = JSON.stringify(scripts, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roteiros-cx-preditivo-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importScripts(jsonText) {
    let parsed;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      return { ok: false, error: "Arquivo não é um JSON válido." };
    }
    if (!Array.isArray(parsed) || !parsed.length) {
      return { ok: false, error: "Arquivo não contém nenhum roteiro." };
    }

    const imported = parsed.map((s) => ({
      id: uid(),
      name: s.name || "Roteiro importado",
      minimized: true,
      currentIndex: 0,
      lastPlayedId: null,
      width: s.width || 400,
      height: s.height || 480,
      lines: Array.isArray(s.lines)
        ? s.lines.map((l) => ({
            id: uid(),
            label: l.label || "",
            note: l.note || "",
            text: l.text || "",
          }))
        : [],
    }));

    setScripts((prev) => [...prev, ...imported]);
    return { ok: true, count: imported.length };
  }

  return {
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
  };
}
