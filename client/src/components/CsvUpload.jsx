import { useRef, useState } from "react";

// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields, commas inside quotes, escaped quotes
// ---------------------------------------------------------------------------
function parseCsv(text) {
  const lines = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const rows = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }
  return rows;
}

const TEMPLATE_CSV = `story_number,title,description,acceptance_criteria
"US-001","User login","As a user I want to log in so I can access my account","Given valid credentials, when I submit the form, then I am redirected to the dashboard"
"US-002","Password reset","As a user I want to reset my password via email","Given I enter my email, when I click reset, then I receive a reset link within 1 minute"
`;

function downloadTemplate() {
  const blob = new Blob([TEMPLATE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "stories-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function CsvUpload({ onImport, onClose }) {
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null); // array of story objects
  const [parseError, setParseError] = useState("");

  function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processText(ev.target.result);
    reader.readAsText(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => processText(ev.target.result);
    reader.readAsText(file);
  }

  function processText(text) {
    setParseError("");
    setPreview(null);

    const rows = parseCsv(text);
    if (rows.length < 2) {
      setParseError("CSV must have a header row and at least one story.");
      return;
    }

    // Normalise headers
    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, "_"));
    const titleIdx = headers.indexOf("title");

    if (titleIdx === -1) {
      setParseError(
        'CSV must have a "title" column. Download the template to see the expected format.'
      );
      return;
    }

    const storyNumIdx = headers.findIndex((h) =>
      ["story_number", "story number", "story#", "number", "id"].includes(h)
    );
    const descIdx = headers.findIndex((h) => h === "description");
    const acIdx = headers.findIndex((h) =>
      ["acceptance_criteria", "acceptance criteria", "ac"].includes(h)
    );

    const stories = rows
      .slice(1)
      .map((row) => ({
        storyNumber: storyNumIdx !== -1 ? row[storyNumIdx] || "" : "",
        title: row[titleIdx] || "",
        description: descIdx !== -1 ? row[descIdx] || "" : "",
        acceptanceCriteria: acIdx !== -1 ? row[acIdx] || "" : "",
      }))
      .filter((s) => s.title.trim());

    if (stories.length === 0) {
      setParseError("No valid stories found — make sure the title column is filled in.");
      return;
    }

    setPreview(stories);
  }

  function handleImport() {
    if (!preview?.length) return;
    onImport(preview);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Import Stories from CSV</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Template download */}
          <div className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-200">Need a template?</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Columns: <span className="font-mono">story_number, title, description, acceptance_criteria</span>
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="px-3 py-1.5 text-xs font-medium bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg transition-colors"
            >
              Download template
            </button>
          </div>

          {/* Drop zone */}
          {!preview && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-slate-600 hover:border-indigo-500 rounded-xl p-10 text-center cursor-pointer transition-colors"
            >
              <div className="text-3xl mb-2">📂</div>
              <p className="text-sm font-medium text-slate-300">
                Drop your CSV here, or click to browse
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Accepts .csv files
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className="hidden"
              />
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div className="bg-red-900/40 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-300">
              {parseError}
            </div>
          )}

          {/* Preview table */}
          {preview && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-300">
                  Preview —{" "}
                  <span className="text-indigo-400">{preview.length} stories</span>
                </p>
                <button
                  onClick={() => { setPreview(null); setParseError(""); }}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Upload different file
                </button>
              </div>

              <div className="rounded-lg border border-slate-600 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-700 text-slate-300 text-left">
                      <th className="px-3 py-2 font-medium w-24">#</th>
                      <th className="px-3 py-2 font-medium">Title</th>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-3 py-2 font-medium">Acceptance Criteria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((story, i) => (
                      <tr
                        key={i}
                        className={`border-t border-slate-700 align-top ${
                          i % 2 === 0 ? "bg-slate-800" : "bg-slate-800/50"
                        }`}
                      >
                        <td className="px-3 py-2 font-mono text-indigo-400 text-xs">
                          {story.storyNumber || (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white font-medium">
                          {story.title}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {story.description || (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-400">
                          {story.acceptanceCriteria || (
                            <span className="italic text-slate-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-5 py-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="flex-1 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!preview?.length}
            className="flex-1 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            Import {preview?.length ? `${preview.length} stories` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
