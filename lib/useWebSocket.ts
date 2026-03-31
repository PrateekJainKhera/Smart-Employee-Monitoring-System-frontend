"use client";

import { useEffect, useRef, useState } from "react";
import { type WsEvent } from "./api";

export type { WsEvent };

export function useWebSocket(url: string, onMessage: (event: WsEvent) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const socket = new WebSocket(url);
      wsRef.current = socket;

      socket.onopen = () => { if (!cancelled) setConnected(true); };
      socket.onclose = () => {
        if (!cancelled) {
          setConnected(false);
          setTimeout(connect, 3000);
        }
      };
      socket.onerror = () => socket.close();
      socket.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as WsEvent;
          onMessageRef.current(data);
        } catch { /* ignore parse errors */ }
      };
    };

    connect();
    return () => {
      cancelled = true;
      wsRef.current?.close();
    };
  }, [url]);

  return { connected };
}
