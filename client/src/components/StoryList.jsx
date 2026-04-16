import { useState } from "react";

export default function StoryList({
  stories,
  currentStoryId,
  isFacilitator,
  onSelect,
  onAdd,
  onSetEstimate,
}) {
  const [newTitle, setNewTitle] = useState("");

  function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Stories
      </h3>

      <ul className="space-y-1.5 flex-1 overflow-y-auto min-h-0">
        {stories.length === 0 && (
          <li className="text-xs text-slate-500 italic">No stories yet.</li>
        )}
        {stories.map((story) => {
          const isCurrent = story.id === currentStoryId;
          return (
            <li key={story.id}>
              <button
                onClick={() => isFacilitator && onSelect(story.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors ${
                  isCurrent
                    ? "bg-indigo-600/30 border border-indigo-500 text-indigo-200"
                    : isFacilitator
                    ? "hover:bg-slate-700 text-slate-300 border border-transparent"
                    : "text-slate-300 border border-transparent"
                }`}
              >
                <span className="truncate block">{story.title}</span>
                {story.finalEstimate && (
                  <span className="text-xs font-mono text-emerald-400">
                    Est: {story.finalEstimate}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {isFacilitator && (
        <form onSubmit={handleAdd} className="mt-3 flex gap-1.5">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Add story..."
            className="flex-1 px-2 py-1.5 text-sm bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            className="px-2 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg font-medium transition-colors"
          >
            +
          </button>
        </form>
      )}
    </div>
  );
}
