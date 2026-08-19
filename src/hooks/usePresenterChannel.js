import { useCallback, useEffect, useRef } from "react";

// Canal de comunicação entre a janela de controle (roteiros/config) e a janela
// de exibição (só o avatar, pra compartilhar no Meet). Funciona só entre abas/
// janelas da MESMA origem no MESMO navegador — não sai da máquina do apresentador.
const CHANNEL_NAME = "cx-preditivo-presenter";

export function usePresenterChannel(onMessage) {
  const channelRef = useRef(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(CHANNEL_NAME);
    channelRef.current = channel;
    channel.onmessage = (event) => onMessageRef.current?.(event.data);
    return () => {
      channel.close();
      channelRef.current = null;
    };
  }, []);

  const send = useCallback((message) => {
    channelRef.current?.postMessage(message);
  }, []);

  return { send };
}
