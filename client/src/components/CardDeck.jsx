export default function CardDeck({ cards, myVote, phase, onVote }) {
  const disabled = phase === "revealed";

  return (
    <div className="flex flex-wrap gap-3 justify-center">
      {cards.map((card) => {
        const selected = myVote === card;
        return (
          <button
            key={card}
            onClick={() => !disabled && onVote(card)}
            disabled={disabled}
            className={`
              relative w-14 h-20 rounded-xl border-2 font-bold text-lg
              flex flex-col items-center justify-center gap-0.5
              transition-all duration-150 select-none focus:outline-none
              ${selected
                ? "border-emerald-400 bg-emerald-600 text-white shadow-xl shadow-emerald-500/40 scale-110 ring-2 ring-emerald-300/50 cursor-default"
                : disabled
                  ? "opacity-40 cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                  : "border-slate-600 bg-slate-800 text-slate-200 hover:border-indigo-400 hover:bg-slate-700 hover:scale-105 cursor-pointer"
              }
            `}
          >
            <span>{card}</span>
            {selected && (
              <span className="text-xs leading-none text-emerald-200">✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
