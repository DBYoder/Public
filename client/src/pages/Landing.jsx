import { useState } from "react";

// A join link (?join=XKCD42) pre-fills the join form and switches to that
// tab, so sharing a link is one click instead of copying a bare session ID.
const joinParam = new URLSearchParams(window.location.search)
  .get("join")
  ?.trim()
  .toUpperCase();

export default function Landing({ decks, onJoin }) {
  const deckEntries = Object.entries(decks);
  const [tab, setTab] = useState(joinParam ? "join" : "create"); // "create" | "join"
  const [name, setName] = useState("");
  const [sessionId, setSessionId] = useState(joinParam || "");
  const [deck, setDeck] = useState("hours");
  const [isObserver, setIsObserver] = useState(false);
  const [error, setError] = useState("");

  function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    setError("");
    onJoin({ name: name.trim(), createNew: true, deck, isObserver: false });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!name.trim()) return setError("Enter your name.");
    if (!sessionId.trim()) return setError("Enter a session ID.");
    setError("");
    onJoin({
      name: name.trim(),
      sessionId: sessionId.trim().toUpperCase(),
      createNew: false,
      isObserver,
    });
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-white">
          Planning Poker
        </h1>
        <p className="mt-2 text-slate-400">
          Collaborative estimation for agile teams
        </p>
      </div>

      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          {["create", "join"].map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setError(""); }}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {t === "create" ? "Create Session" : "Join Session"}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Shared name field */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alice"
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {tab === "create" ? (
            <form onSubmit={handleCreate}>
              <div className="mb-5">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Card deck
                </label>
                <div className="space-y-2">
                  {deckEntries.map(([key, d]) => {
                    const preview = d.cards
                      .filter((c) => !d.special.includes(c))
                      .join(" ");
                    return (
                      <label
                        key={key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          deck === key
                            ? "border-indigo-500 bg-indigo-500/10"
                            : "border-slate-600 hover:border-slate-500"
                        }`}
                      >
                        <input
                          type="radio"
                          name="deck"
                          value={key}
                          checked={deck === key}
                          onChange={() => setDeck(key)}
                          className="accent-indigo-500"
                        />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {d.label}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {preview}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              >
                Create Session
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Session ID
                </label>
                <input
                  type="text"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value.toUpperCase())}
                  placeholder="e.g. XKCD42"
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 font-mono uppercase tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <label className="flex items-center gap-2 mb-5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isObserver}
                  onChange={(e) => setIsObserver(e.target.checked)}
                  className="accent-indigo-500 w-4 h-4"
                />
                <span className="text-sm text-slate-300">
                  Join as observer (no voting)
                </span>
              </label>

              {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-colors"
              >
                Join Session
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
