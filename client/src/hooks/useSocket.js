import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const RECONNECT_KEY = "planningPoker:reconnect";

// Reconnect tokens prove a rejoining socket is the same person who left,
// not just someone who knows their display name — without this, anyone
// could reclaim another participant's slot (and any facilitator powers
// that came with it) during a brief disconnect just by joining with the
// same name. Persisted in sessionStorage so it survives a page refresh
// within the same tab, but not a stolen name from a different tab/device.
function loadReconnectToken(sessionId, name) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(RECONNECT_KEY) || "null");
    if (
      stored &&
      stored.sessionId === sessionId &&
      stored.name.toLowerCase() === name.trim().toLowerCase()
    ) {
      return stored.token;
    }
  } catch {
    // ignore malformed storage
  }
  return undefined;
}

function saveReconnectToken(sessionId, name, token) {
  sessionStorage.setItem(
    RECONNECT_KEY,
    JSON.stringify({ sessionId, name, token })
  );
}

export function useSocket(sessionInfo) {
  const socketRef = useRef(null);
  const pendingTokenRef = useRef(null);
  // Set once the server confirms which session we're in. Reused so that a
  // dropped connection re-joins that same session instead of blindly
  // resending the original request — which, for whoever created the
  // session, has createNew: true and would otherwise spin up a brand new
  // empty session on every reconnect instead of resuming theirs.
  const resolvedSessionIdRef = useRef(null);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      const isReconnect = !!resolvedSessionIdRef.current;
      const sessionId = isReconnect
        ? resolvedSessionIdRef.current
        : (sessionInfo.sessionId || "").toUpperCase();
      const createNew = sessionInfo.createNew && !isReconnect;
      const reconnectToken = createNew
        ? undefined
        : loadReconnectToken(sessionId, sessionInfo.name);
      socket.emit("join", { ...sessionInfo, sessionId, createNew, reconnectToken });
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("joined", ({ reconnectToken }) => {
      pendingTokenRef.current = reconnectToken || null;
    });

    socket.on("session-state", (state) => {
      setSession(state);
      setError(null);
      resolvedSessionIdRef.current = state.id;
      if (pendingTokenRef.current) {
        saveReconnectToken(state.id, sessionInfo.name, pendingTokenRef.current);
        pendingTokenRef.current = null;
      }
    });

    socket.on("error", ({ message }) => setError(message));

    socket.on("session-ended", () => setSessionEnded(true));

    return () => socket.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function emit(event, data) {
    socketRef.current?.emit(event, data);
  }

  const myId = socketRef.current?.id;

  return { session, error, connected, myId, emit, sessionEnded };
}
