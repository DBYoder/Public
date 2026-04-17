import { useState } from "react";
import { useSocket } from "../hooks/useSocket.js";
import CardDeck from "../components/CardDeck.jsx";
import StoryList from "../components/StoryList.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";

export default function Session({ sessionInfo, onLeave }) {
  const { session, error, connected, myId, emit } = useSocket(sessionInfo);
  const [copied, setCopied] = useState(false);

  if (!connected || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 mb-2 animate-pulse">
            {!connected ? "Connecting…" : "Loading session…"}
          </div>
          {error && (
            <div className="text-red-400 mt-2">
              {error}{" "}
              <button onClick={onLeave} className="underline text-indigo-400">
                Go back
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const me = session.participants.find((p) => p.id === myId);
  const isFacilitator = session.facilitatorId === myId;
  const currentStory = session.stories.find(
    (s) => s.id === session.currentStoryId
  );
  const myVote = me?.vote ?? null;
  const allVoted = session.participants
    .filter((p) => !p.isObserver)
    .every((p) => p.hasVoted || p.vote);

  function copySessionId() {
    navigator.clipboard.writeText(session.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700 gap-4">
        <h1 className="font-bold text-white text-lg shrink-0">Planning Poker</h1>

        {/* Participant chips */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1 justify-center overflow-hidden">
          {session.participants.filter((p) => !p.isObserver).map((p) => {
            const voted = session.phase === "revealed" ? !!p.vote : p.hasVoted;
            const isMe = p.id === myId;
            return (
              <span
                key={p.id}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border transition-colors ${
                  voted
                    ? "bg-emerald-900/50 border-emerald-700 text-emerald-300"
                    : "bg-slate-700 border-slate-600 text-slate-300"
                } ${isMe ? "ring-1 ring-indigo-400" : ""}`}
              >
                {p.isFacilitator && <span className="text-amber-400">★</span>}
                {p.name}{isMe ? " (you)" : ""}
                {session.phase === "revealed"
                  ? p.vote
                    ? <span className="font-mono font-bold text-indigo-300 ml-0.5">{p.vote}</span>
                    : <span className="text-slate-500 ml-0.5">—</span>
                  : voted
                    ? <span className="text-emerald-400 ml-0.5">✓</span>
                    : <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse inline-block ml-0.5" />
                }
              </span>
            );
          })}
          {session.participants.filter((p) => p.isObserver).map((p) => (
            <span key={p.id} className="inline-flex items-center px-2 py-1 rounded-full text-xs border border-slate-700 text-slate-500 italic">
              {p.name}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={copySessionId}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-mono font-semibold text-slate-200 transition-colors"
            title="Copy session ID"
          >
            {session.id}
            <span className="text-xs text-slate-400 font-sans">
              {copied ? "✓ Copied" : "Copy"}
            </span>
          </button>
          <button
            onClick={onLeave}
            className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            Leave
          </button>
        </div>
      </header>

      {error && (
        <div className="bg-red-900/40 border-b border-red-700 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-80 shrink-0 bg-slate-800 border-r border-slate-700 p-4 flex flex-col overflow-y-auto">
          <StoryList
            stories={session.stories}
            currentStoryId={session.currentStoryId}
            isFacilitator={isFacilitator}
            onSelect={(id) => emit("select-story", { storyId: id })}
            onAdd={(title) => emit("add-story", { title })}
            onBulkAdd={(stories) => emit("add-stories-bulk", { stories })}
          />
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
          {/* Current story */}
          <div className="w-full max-w-2xl mb-6">
            {currentStory ? (
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    {currentStory.storyNumber && (
                      <p className="text-xs font-mono text-indigo-400 mb-0.5">
                        {currentStory.storyNumber}
                      </p>
                    )}
                    <h2 className="text-lg font-semibold text-white leading-snug">
                      {currentStory.title}
                    </h2>
                  </div>
                  {currentStory.finalEstimate && (
                    <span className="shrink-0 px-2 py-0.5 bg-emerald-700 text-emerald-200 text-xs rounded font-mono">
                      Final: {currentStory.finalEstimate}
                    </span>
                  )}
                </div>

                {currentStory.description && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Description
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {currentStory.description}
                    </p>
                  </div>
                )}

                {currentStory.acceptanceCriteria && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                      Acceptance Criteria
                    </p>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {currentStory.acceptanceCriteria}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-400 italic text-center">
                {isFacilitator
                  ? "Add a story in the sidebar to get started."
                  : "Waiting for the facilitator to select a story…"}
              </p>
            )}
          </div>

          {/* Card deck */}
          {!me?.isObserver && currentStory && (
            <div className="w-full max-w-2xl">
              <p className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wider font-medium">
                {session.phase === "revealed"
                  ? "Votes revealed"
                  : myVote
                  ? `Your vote: ${myVote}`
                  : "Pick a card"}
              </p>
              <CardDeck
                deck={session.deck}
                myVote={myVote}
                phase={session.phase}
                onVote={(card) => emit("vote", { card })}
              />
            </div>
          )}

          {/* Facilitator controls */}
          {isFacilitator && currentStory && session.phase === "voting" && (
            <div className="mt-6">
              <button
                onClick={() => emit("reveal")}
                disabled={!allVoted}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-bold rounded-xl transition-colors"
              >
                {allVoted ? "Reveal Cards" : "Reveal Cards (waiting for votes…)"}
              </button>
            </div>
          )}

          {/* Results */}
          {session.phase === "revealed" && (
            <div className="w-full max-w-2xl mt-4">
              <ResultsPanel
                participants={session.participants}
                deck={session.deck}
                currentStoryId={session.currentStoryId}
                isFacilitator={isFacilitator}
                onSetEstimate={(storyId, estimate) =>
                  emit("set-estimate", { storyId, estimate })
                }
                onReset={() => emit("reset")}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
