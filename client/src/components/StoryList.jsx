import { useState } from "react";
import CsvUpload from "./CsvUpload.jsx";

// Combine a story's separate fields into a single text field for export.
function combineStoryText(story) {
  const parts = [story.title];
  if (story.description) parts.push(story.description);
  if (story.acceptanceCriteria) {
    parts.push(`Acceptance Criteria: ${story.acceptanceCriteria}`);
  }
  return parts.join("\n\n");
}

function escapeCsvField(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildStoriesCsv(stories) {
  const header = ["story_number", "story", "final_estimate"];
  const rows = stories.map((story) => [
    story.storyNumber || "",
    combineStoryText(story),
    story.finalEstimate || "",
  ]);
  return [header, ...rows]
    .map((row) => row.map(escapeCsvField).join(","))
    .join("\n");
}

function downloadStoriesCsv(stories) {
  const csv = buildStoriesCsv(stories);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stories-export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function StoryList({
  stories,
  currentStoryId,
  isFacilitator,
  onSelect,
  onAdd,
  onBulkAdd,
}) {
  const [newTitle, setNewTitle] = useState("");
  const [showCsvUpload, setShowCsvUpload] = useState(false);

  function handleAdd(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    onAdd(newTitle.trim());
    setNewTitle("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Stories
        </h3>
        <div className="flex items-center gap-1.5">
          {stories.length > 0 && (
            <button
              onClick={() => downloadStoriesCsv(stories)}
              title="Export stories as CSV"
              className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              Export
            </button>
          )}
          {isFacilitator && (
            <button
              onClick={() => setShowCsvUpload(true)}
              title="Import from CSV"
              className="text-xs px-2 py-0.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded transition-colors"
            >
              CSV
            </button>
          )}
        </div>
      </div>

      {/* Progress summary */}
      {stories.length > 0 && (
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 bg-slate-700 rounded-full h-1.5 overflow-hidden">
            <div
              className="h-1.5 bg-emerald-500 rounded-full transition-all duration-500"
              style={{
                width: `${(stories.filter((s) => s.finalEstimate).length / stories.length) * 100}%`,
              }}
            />
          </div>
          <span className="text-xs text-slate-400 shrink-0">
            {stories.filter((s) => s.finalEstimate).length}/{stories.length}
          </span>
        </div>
      )}

      <ul className="space-y-1.5 flex-1 overflow-y-auto min-h-0">
        {stories.length === 0 && (
          <li className="text-xs text-slate-500 italic">No stories yet.</li>
        )}
        {stories.map((story) => {
          const isCurrent = story.id === currentStoryId;
          const isDone = !!story.finalEstimate;
          return (
            <li key={story.id}>
              <button
                onClick={() => isFacilitator && onSelect(story.id)}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors flex items-start gap-2 ${
                  isCurrent
                    ? "bg-indigo-600/30 border border-indigo-500 text-indigo-200"
                    : isDone
                    ? "bg-emerald-900/20 border border-emerald-800/50 text-slate-400"
                    : isFacilitator
                    ? "hover:bg-slate-700 text-slate-300 border border-transparent"
                    : "text-slate-300 border border-transparent"
                }`}
              >
                {/* Status dot */}
                <span className="mt-1 shrink-0">
                  {isDone ? (
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" title="Estimated" />
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse inline-block" title="Voting now" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" title="Pending" />
                  )}
                </span>

                <span className="flex-1 min-w-0">
                  {story.storyNumber && (
                    <span className={`text-xs font-mono block ${isCurrent ? "text-indigo-400" : "text-slate-500"}`}>
                      {story.storyNumber}
                    </span>
                  )}
                  <span className={`truncate block ${isDone && !isCurrent ? "line-through decoration-slate-600" : ""}`}>
                    {story.title}
                  </span>
                  {isDone && (
                    <span className="text-xs font-mono text-emerald-400">
                      Est: {story.finalEstimate}
                    </span>
                  )}
                </span>
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

      {showCsvUpload && (
        <CsvUpload
          onImport={onBulkAdd}
          onClose={() => setShowCsvUpload(false)}
        />
      )}
    </div>
  );
}
