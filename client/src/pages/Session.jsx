import { useState, useEffect, useRef } from "react";
import { useSocket } from "../hooks/useSocket.js";
import CardDeck from "../components/CardDeck.jsx";
import StoryList from "../components/StoryList.jsx";
import ResultsPanel from "../components/ResultsPanel.jsx";
import ParticipantList from "../components/ParticipantList.jsx";

export default function Session({ sessionInfo, decks, onLeave }) {
  const { session, error, connected, myId, emit, sessionEnded } = useSocket(sessionInfo);
  const [copied, setCopied] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);

  // ALL hooks must be declared unconditionally before any early returns.
  // Placing them after a conditional return violates React's rules of hooks
  // and causes state (including localMyVote) to reset on reconnects.

  // Track the card the current user picked in local state.
  // The server hides vote values during voting phase so opponents can't peek,
  // which means me.vote is always null until reveal. Local state gives instant,
  // persistent selection feedback regardless of server round-trips.
  const [localMyVote, setLocalMyVote] = useState(null);
  const prevStoryId = useRef(null);
  const prevPhase = useRef(null);

  // Redirect everyone (including the facilitator) when the session is ended
  useEffect(() => {
    if (sessionEnded) onLeave();
  }, [sessionEnded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!session) return;
    const storyChanged = session.currentStoryId !== prevStoryId.current;
    const votesReset =
      session.phase === "voting" && prevPhase.current === "revealed";
    if (storyChanged || votesReset) setLocalMyVote(null);
    prevStoryId.current = session.currentStoryId;
    prevPhase.current = session.phase;
  }, [session?.currentStoryId, session?.phase]);

  // ── Early return for loading / error state ──────────────────────────────
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

  // ── Derived state ────────────────────────────────────────────────────────
  const me = session.participants.find((p) => p.id === myId);
  const isFacilitator = session.facilitatorId === myId;
  const currentStory = session.stories.find(
    (s) => s.id === session.currentStoryId
  );
  // Only require online non-observers to have voted before enabling reveal.
  // Offline participants keep their existing vote (or are skipped if they
  // disconnected before voting), so they shouldn't block the whole room.
  const allVoted = session.participants
    .filter((p) => !p.isObserver && p.online !== false)
    .every((p) => p.hasVoted || p.vote);

  // After reveal use the server's authoritative value (handles reconnects).
  // During voting use local state so selection is instant and stays visible.
  const myVote =
    session.phase === "revealed" ? (me?.vote ?? localMyVote) : localMyVote;

  function copyJoinLink() {
    const url = `${window.location.origin}${window.location.pathname}?join=${session.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
        <h1 className="font-bold text-white text-lg">Planning Poker</h1>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={copyJoinLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-mono font-semibold text-slate-200 transition-colors"
            title="Copy invite link"
          >
            {session.id}
            <span className="text-xs text-slate-400 font-sans">
              {copied ? "✓ Copied link" : "Copy link"}
            </span>
          </button>
          {isFacilitator && (
            confirmEnd ? (
              <span className="flex items-center gap-2">
                <span className="text-xs text-red-400">End session for everyone?</span>
                <button
                  onClick={() => emit("end-session")}
                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-medium transition-colors"
                >
                  Yes, end it
                </button>
                <button
                  onClick={() => setConfirmEnd(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => setConfirmEnd(true)}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                End Session
              </button>
            )
          )}
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
      <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
        {/* Sidebar */}
        <aside className="order-2 lg:order-none w-full lg:w-80 shrink-0 max-h-72 lg:max-h-none bg-slate-800 border-b lg:border-b-0 lg:border-r border-slate-700 p-4 flex flex-col overflow-y-auto">
          <StoryList
            stories={session.stories}
            currentStoryId={session.currentStoryId}
            isFacilitator={isFacilitator}
            onSelect={(id) => emit("select-story", { storyId: id })}
            onAdd={(title) => emit("add-story", { title })}
            onBulkAdd={(stories) => emit("add-stories-bulk", { stories })}
            onEdit={(storyId, updates) => emit("edit-story", { storyId, ...updates })}
            onDelete={(storyId) => emit("delete-story", { storyId })}
          />
        </aside>

        {/* Main */}
        <main className="order-1 lg:order-none flex-1 flex flex-col items-center justify-start p-4 sm:p-6 overflow-y-auto min-w-0">
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
                cards={decks[session.deck]?.cards || []}
                myVote={myVote}
                phase={session.phase}
                onVote={(card) => {
                  setLocalMyVote(card);
                  emit("vote", { card });
                }}
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
                deckInfo={decks[session.deck]}
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

        {/* Right sidebar — participants */}
        <aside className="order-3 lg:order-none w-full lg:w-56 shrink-0 max-h-72 lg:max-h-none bg-slate-800 border-t lg:border-t-0 lg:border-l border-slate-700 p-4 overflow-y-auto">
          <ParticipantList
            participants={session.participants}
            phase={session.phase}
            myId={myId}
          />
        </aside>
      </div>
    </div>
  );
}
