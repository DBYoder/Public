import { useState } from "react";
import Landing from "./pages/Landing.jsx";
import Session from "./pages/Session.jsx";
import { useDecks } from "./hooks/useDecks.js";

export default function App() {
  const [sessionInfo, setSessionInfo] = useState(null);
  // sessionInfo: { sessionId, name, isObserver, createNew, deck }
  const decks = useDecks();

  if (!decks) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-400 animate-pulse">
        Loading…
      </div>
    );
  }

  if (sessionInfo) {
    return (
      <Session
        sessionInfo={sessionInfo}
        decks={decks}
        onLeave={() => setSessionInfo(null)}
      />
    );
  }

  return <Landing decks={decks} onJoin={setSessionInfo} />;
}
