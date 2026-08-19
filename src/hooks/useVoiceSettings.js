import { useEffect, useState } from "react";
import { DEFAULT_VOICE_SETTINGS } from "../voices";

const STORAGE_KEY = "voiceSettings";

function loadInitial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VOICE_SETTINGS;
    return { ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_VOICE_SETTINGS;
  }
}

export function useVoiceSettings() {
  const [voiceSettings, setVoiceSettings] = useState(loadInitial);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  function updateVoiceSettings(patch) {
    setVoiceSettings((prev) => ({ ...prev, ...patch }));
  }

  function resetVoiceSettings() {
    setVoiceSettings(DEFAULT_VOICE_SETTINGS);
  }

  return { voiceSettings, updateVoiceSettings, resetVoiceSettings };
}
