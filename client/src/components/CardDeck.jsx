const DECKS = {
  hours:     ["½", "1", "2", "4", "8", "16", "24", "40", "?", "☕"],
  fibonacci: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "∞", "☕"],
  tshirt:    ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
};

export default function CardDeck({ deck, myVote, phase, onVote }) {
  const cards = DECKS[deck] || DECKS.hours;
  const disabled = phase === "revealed";

  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {cards.map((card) => {
        const selected = myVote === card;
        return (
          <button
            key={card}
            onClick={() => !disabled && onVote(card)}
            disabled={disabled}
            className={`
              w-14 h-20 rounded-xl border-2 font-bold text-lg
              flex items-center justify-center
              transition-all duration-150 select-none
              ${disabled
                ? "opacity-40 cursor-not-allowed border-slate-600 bg-slate-800 text-slate-500"
                : selected
                  ? "border-indigo-400 bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                  : "border-slate-600 bg-slate-800 text-slate-200 hover:border-indigo-400 hover:bg-slate-700 cursor-pointer"
              }
            `}
          >
            {card}
          </button>
        );
      })}
    </div>
  );
}
