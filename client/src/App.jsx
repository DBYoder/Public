import { useState } from "react";
import Landing from "./pages/Landing.jsx";
import Session from "./pages/Session.jsx";

export default function App() {
  const [sessionInfo, setSessionInfo] = useState(null);
  // sessionInfo: { sessionId, name, isObserver, createNew, deck }

  if (sessionInfo) {
    return (
      <Session
        sessionInfo={sessionInfo}
        onLeave={() => setSessionInfo(null)}
      />
    );
  }

  return <Landing onJoin={setSessionInfo} />;
}
