import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

export function useSocket(sessionInfo) {
  const socketRef = useRef(null);
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);

  useEffect(() => {
    const socket = io({ transports: ["websocket", "polling"] });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join", sessionInfo);
    });

    socket.on("disconnect", () => setConnected(false));

    socket.on("session-state", (state) => {
      setSession(state);
      setError(null);
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
