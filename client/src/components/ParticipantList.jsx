export default function ParticipantList({ participants, phase, myId }) {
  const voters = participants.filter((p) => !p.isObserver);
  const observers = participants.filter((p) => p.isObserver);

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Participants
      </h3>
      <ul className="space-y-1.5">
        {voters.map((p) => (
          <li
            key={p.id}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-1.5 truncate">
              {p.isFacilitator && (
                <span title="Facilitator" className="text-amber-400 text-xs">★</span>
              )}
              <span className={p.id === myId ? "text-indigo-300 font-medium" : "text-slate-300"}>
                {p.name}
                {p.id === myId && " (you)"}
              </span>
            </span>
            <VoteIndicator participant={p} phase={phase} />
          </li>
        ))}
      </ul>

      {observers.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mt-4 mb-2">
            Observers
          </h3>
          <ul className="space-y-1.5">
            {observers.map((p) => (
              <li key={p.id} className="text-sm text-slate-500 italic">
                {p.name}
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
    if (participant.vote) {
      return (
        <span className="px-2 py-0.5 bg-indigo-600 text-white text-xs font-bold rounded font-mono">
          {participant.vote}
        </span>
      );
    }
    return <span className="text-xs text-slate-500">—</span>;
  }

  // Voting phase — only show has-voted status
  if (participant.hasVoted) {
    return (
      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" title="Voted" />
    );
  }
  return (
    <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" title="Waiting..." />
  );
}
