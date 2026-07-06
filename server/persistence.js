const fs = require("fs");
const path = require("path");
const { getSnapshot, restoreSnapshot } = require("./sessionStore");

// Override via SNAPSHOT_PATH to point at a mounted volume in production —
// without one, this file lives in the container's writable layer and is
// lost on redeploy (though it does survive an in-place process restart).
const SNAPSHOT_PATH = process.env.SNAPSHOT_PATH || path.join(__dirname, "data", "sessions.json");
const SNAPSHOT_INTERVAL_MS = 10 * 1000;

function loadSnapshot() {
  let raw;
  try {
    raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error(`[persistence] Failed to read snapshot: ${err.message}`);
    }
    return;
  }
  try {
    restoreSnapshot(JSON.parse(raw));
    console.log(`[persistence] Restored sessions from ${SNAPSHOT_PATH}`);
  } catch (err) {
    console.error(`[persistence] Failed to parse snapshot, starting fresh: ${err.message}`);
  }
}

function writeSnapshot() {
  const dir = path.dirname(SNAPSHOT_PATH);
  const tmpPath = `${SNAPSHOT_PATH}.tmp`;
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(tmpPath, JSON.stringify(getSnapshot()));
    // Rename is atomic on the same filesystem, so a crash mid-write can
    // never leave behind a truncated/corrupt snapshot for the next boot.
    fs.renameSync(tmpPath, SNAPSHOT_PATH);
  } catch (err) {
    console.error(`[persistence] Failed to write snapshot: ${err.message}`);
  }
}

/** Load any existing snapshot, then start periodically saving. */
function startPersistence() {
  loadSnapshot();
  setInterval(writeSnapshot, SNAPSHOT_INTERVAL_MS);

  const saveAndExit = () => {
    writeSnapshot();
    process.exit(0);
  };
  process.on("SIGTERM", saveAndExit);
  process.on("SIGINT", saveAndExit);

  console.log(`[persistence] Snapshotting sessions to ${SNAPSHOT_PATH} every ${SNAPSHOT_INTERVAL_MS / 1000}s`);
}

module.exports = { startPersistence, writeSnapshot };
