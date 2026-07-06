function toNumber(card) {
  if (card === "½") return 0.5;
  const n = parseFloat(card);
  return isNaN(n) ? null : n;
}

function calcStats(votes, special) {
  const numeric = votes
    .filter((v) => !special.includes(v))
    .map(toNumber)
    .filter((n) => n !== null);

  if (numeric.length === 0) return null;

  const avg = numeric.reduce((a, b) => a + b, 0) / numeric.length;
  const min = Math.min(...numeric);
  const max = Math.max(...numeric);
  const consensus = min === max;

  return { avg: avg.toFixed(1), min, max, consensus };
}

function tally(votes) {
  const counts = {};
  for (const v of votes) {
    counts[v] = (counts[v] || 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default function ResultsPanel({
  participants,
  deckInfo,
  currentStoryId,
  isFacilitator,
  onSetEstimate,
  onReset,
}) {
  const { cards = [], special = [], isNonNumeric = false } = deckInfo || {};
  const votes = participants
    .filter((p) => !p.isObserver && p.vote)
    .map((p) => p.vote);

  const noVotes = votes.length === 0;
  const estimateOptions = cards.filter((c) => !special.includes(c));

  return (
    <div className="bg-slate-700/50 border border-slate-600 rounded-xl p-4 mt-4">
      <h3 className="text-sm font-semibold text-slate-200 mb-3">Results</h3>

      {noVotes ? (
        <p className="text-sm text-slate-400">No votes cast.</p>
      ) : !isNonNumeric ? (
        <NumericResults votes={votes} special={special} />
      ) : (
        <TallyResults votes={votes} />
      )}

      {isFacilitator && (
        <FacilitatorControls
          estimateOptions={estimateOptions}
          currentStoryId={currentStoryId}
          onSetEstimate={onSetEstimate}
          onReset={onReset}
        />
      )}
    </div>
  );
}

function NumericResults({ votes, special }) {
  const stats = calcStats(votes, special);
  const specials = votes.filter((v) => special.includes(v));

  return (
    <div className="space-y-3">
      {/* Individual votes */}
      <div className="flex flex-wrap gap-1.5">
        {votes.map((v, i) => (
          <span
            key={i}
            className={`px-2.5 py-1 rounded-lg text-sm font-mono font-bold ${
              special.includes(v)
                ? "bg-slate-600 text-slate-300"
                : "bg-indigo-600 text-white"
            }`}
          >
            {v}
          </span>
        ))}
      </div>

      {stats && (
        <div className="flex gap-4 text-sm">
          <Stat label="Average" value={stats.avg} />
          <Stat label="Low" value={stats.min} />
          <Stat label="High" value={stats.max} />
          {stats.consensus && (
            <span className="flex items-center gap-1 text-emerald-400 font-medium text-xs">
              ✓ Consensus
            </span>
          )}
        </div>
      )}

      {specials.length > 0 && (
        <p className="text-xs text-slate-400">
          {specials.length} voter{specials.length > 1 ? "s" : ""} abstained (
          {specials.join(", ")})
        </p>
      )}
    </div>
  );
}

function TallyResults({ votes }) {
  const entries = tally(votes);
  const total = votes.length;

  return (
    <div className="space-y-2">
      {entries.map(([card, count]) => (
        <div key={card} className="flex items-center gap-2">
          <span className="w-10 text-sm font-mono font-bold text-indigo-300 text-right">
            {card}
          </span>
          <div className="flex-1 bg-slate-600 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-2.5 bg-indigo-500 rounded-full"
              style={{ width: `${(count / total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-slate-400 w-6">{count}</span>
        </div>
      ))}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="text-center">
      <div className="text-lg font-bold font-mono text-white">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

function FacilitatorControls({
  estimateOptions,
  currentStoryId,
  onSetEstimate,
  onReset,
}) {
  return (
    <div className="mt-4 pt-3 border-t border-slate-600">
      <p className="text-xs text-slate-400 mb-2 font-medium">
        Set final estimate
      </p>
      <div className="flex flex-wrap gap-1.5">
        {estimateOptions.map((c) => (
          <button
            key={c}
            onClick={() => onSetEstimate(currentStoryId, c)}
            className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-600 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
      <button
        onClick={onReset}
        className="mt-3 w-full py-1.5 text-sm font-medium bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
      >
        Reset & Vote Again
      </button>
    </div>
  );
}
