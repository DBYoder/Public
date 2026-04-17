export default function ParticipantList({ participants, phase, myId }) {
  const voters = participants.filter((p) => !p.isObserver);
  const observers = participants.filter((p) => p.isObserver);

  // Only count online voters for the progress indicator
  const onlineVoters = voters.filter((p) => p.online !== false);
  const votedCount = onlineVoters.filter((p) => p.hasVoted || p.vote).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Participants
        </h3>
        {phase === "voting" && onlineVoters.length > 0 && (
          <span className="text-xs text-slate-400">
            {votedCount}/{onlineVoters.length}
          </span>
        )}
      </div>

      <ul className="space-y-2">
        {voters.map((p) => {
          const offline = p.online === false;
          return (
            <li
              key={p.id}
              className={`flex items-center justify-between gap-2 text-sm ${offline ? "opacity-40" : ""}`}
            >
              <span className="flex items-center gap-1.5 truncate min-w-0">
                {p.isFacilitator && (
                  <span title="Facilitator" className="text-amber-400 text-xs shrink-0">★</span>
                )}
                {offline && (
                  <span title="Disconnected" className="text-slate-500 text-xs shrink-0">⊘</span>
                )}
                <span className={`truncate ${p.id === myId ? "text-indigo-300 font-medium" : "text-slate-300"}`}>
                  {p.name}
                  {p.id === myId && " (you)"}
                </span>
              </span>
              {offline ? (
                <span className="shrink-0 text-xs text-slate-600 italic">away</span>
              ) : (
                <VoteIndicator participant={p} phase={phase} />
              )}
            </li>
          );
        })}
      </ul>

      {observers.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-2">
            Observers
          </h3>
          <ul className="space-y-1.5">
            {observers.map((p) => (
              <li
                key={p.id}
                className={`text-sm text-slate-500 italic ${p.online === false ? "opacity-40" : ""}`}
              >
                {p.name}
                {p.online === false && " (away)"}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function VoteIndicator({ participant, phase }) {
  if (phase === "revealed") {
    return participant.vote
      ? (
        <span className="shrink-0 px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded font-mono">
          {participant.vote}
        </span>
      ) : (
        <span className="shrink-0 text-xs text-slate-500 italic">skipped</span>
      );
  }

  // Voting phase
  const voted = participant.hasVoted || participant.vote;
  return voted ? (
    <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-900/60 border border-emerald-700 text-emerald-400 text-xs font-medium rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
      Voted
    </span>
  ) : (
    <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 bg-slate-700/60 border border-slate-600 text-slate-400 text-xs font-medium rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-500 inline-block animate-pulse" />
      Waiting
    </span>
  );
}
