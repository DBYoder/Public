import { useState } from "react";
import { useSocket } from "../hooks/useSocket.js";
import CardDeck from "../components/CardDeck.jsx";
import ParticipantList from "../components/ParticipantList.jsx";
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
      <header className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h1 className="font-bold text-white text-lg">Planning Poker</h1>
        <div className="flex items-center gap-3">
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
        <aside className="w-56 shrink-0 bg-slate-800 border-r border-slate-700 p-4 flex flex-col gap-6 overflow-y-auto">
          <StoryList
            stories={session.stories}
            currentStoryId={session.currentStoryId}
            isFacilitator={isFacilitator}
            onSelect={(id) => emit("select-story", { storyId: id })}
            onAdd={(title) => emit("add-story", { title })}
          />
          <div className="border-t border-slate-700 pt-4">
            <ParticipantList
              participants={session.participants}
              phase={session.phase}
              myId={myId}
            />
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col items-center justify-start p-6 overflow-y-auto">
          {/* Current story title */}
          <div className="w-full max-w-2xl mb-6 text-center">
            {currentStory ? (
              <h2 className="text-xl font-semibold text-white">
                {currentStory.title}
              </h2>
            ) : (
              <p className="text-slate-400 italic">
                {isFacilitator
                  ? "Add a story in the sidebar to get started."
                  : "Waiting for the facilitator to select a story…"}
              </p>
            )}
            {currentStory?.finalEstimate && (
              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-700 text-emerald-200 text-xs rounded font-mono">
                Final: {currentStory.finalEstimate}
              </span>
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
