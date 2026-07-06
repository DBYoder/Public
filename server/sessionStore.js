const crypto = require("crypto");
const { customAlphabet } = require("nanoid");
const { DECKS } = require("./decks");

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

// Map<sessionId, Session>
const sessions = new Map();

// Sessions where all participants have been offline for longer than this are
// eligible for cleanup. Default: 2 hours.
const SESSION_TTL_MS = 2 * 60 * 60 * 1000;

function generateId() {
  let id;
  do {
    id = nanoid();
  } while (sessions.has(id));
  return id;
}

function createSession({ facilitatorId, facilitatorName, deck }) {
  if (!DECKS[deck]) throw new Error(`Unknown deck: ${deck}`);
  const id = generateId();
  const session = {
    id,
    facilitatorId,
    deck,
    stories: [],
    currentStoryId: null,
    participants: [
      {
        id: facilitatorId,
        name: facilitatorName,
        vote: null,
        isObserver: false,
        isFacilitator: true,
        online: true,
        disconnectedAt: null,
        reconnectToken: crypto.randomUUID(),
      },
    ],
    phase: "voting",
  };
  sessions.set(id, session);
  return session;
}

function getSession(id) {
  return sessions.get(id) || null;
}

function deleteSession(id) {
  sessions.delete(id);
}

function addParticipant(sessionId, { id, name, isObserver }) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  // Same socket ID reconnect (rare but safe to handle)
  const existing = session.participants.find((p) => p.id === id);
  if (existing) {
    existing.online = true;
    existing.disconnectedAt = null;
    return session;
  }
  session.participants.push({
    id,
    name,
    vote: null,
    isObserver,
    isFacilitator: false,
    online: true,
    disconnectedAt: null,
    reconnectToken: crypto.randomUUID(),
  });
  return session;
}

/**
 * Attempt to reconnect an offline participant. Requires both a case-insensitive
 * name match AND the reconnect token issued to that participant on their
 * original join — name alone is not proof of identity, since anyone in the
 * room can see another participant's display name (including the
 * facilitator's) and would otherwise be able to steal their slot, and with it
 * facilitator privileges, during a brief disconnect.
 * Returns the session on success, null if no matching offline participant was found.
 */
function reconnectParticipant(sessionId, name, newSocketId, token) {
  const session = sessions.get(sessionId);
  if (!session || !token) return null;

  const existing = session.participants.find(
    (p) =>
      !p.online &&
      p.name.toLowerCase() === name.trim().toLowerCase() &&
      p.reconnectToken === token
  );
  if (!existing) return null;

  const oldId = existing.id;
  existing.id = newSocketId;
  existing.online = true;
  existing.disconnectedAt = null;

  // Keep facilitatorId in sync
  if (session.facilitatorId === oldId) {
    session.facilitatorId = newSocketId;
  }

  return session;
}

/**
 * Soft-delete: mark a participant as offline instead of removing them.
 * Their vote and story contributions are preserved.
 */
function markParticipantOffline(sessionId, socketId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const participant = session.participants.find((p) => p.id === socketId);
  if (participant) {
    participant.online = false;
    participant.disconnectedAt = new Date();
  }
  return session;
}

function castVote(sessionId, participantId, card) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const participant = session.participants.find((p) => p.id === participantId);
  if (participant && !participant.isObserver) {
    participant.vote = card;
  }
  return session;
}

function revealVotes(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.phase = "revealed";
  return session;
}

function resetVotes(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.phase = "voting";
  session.participants.forEach((p) => (p.vote = null));
  return session;
}

function addStory(sessionId, { title, storyNumber = "", description = "", acceptanceCriteria = "" }) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const story = {
    id: nanoid(),
    storyNumber,
    title,
    description,
    acceptanceCriteria,
    finalEstimate: null,
  };
  session.stories.push(story);
  if (!session.currentStoryId) session.currentStoryId = story.id;
  return session;
}

function addStoriesBulk(sessionId, stories) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  for (const { title, storyNumber = "", description = "", acceptanceCriteria = "" } of stories) {
    if (!title?.trim()) continue;
    const story = {
      id: nanoid(),
      storyNumber: storyNumber.trim(),
      title: title.trim(),
      description: description.trim(),
      acceptanceCriteria: acceptanceCriteria.trim(),
      finalEstimate: null,
    };
    session.stories.push(story);
    if (!session.currentStoryId) session.currentStoryId = story.id;
  }
  return session;
}

function selectStory(sessionId, storyId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const exists = session.stories.find((s) => s.id === storyId);
  if (!exists) return session;
  session.currentStoryId = storyId;
  // Reset votes when switching story
  session.phase = "voting";
  session.participants.forEach((p) => (p.vote = null));
  return session;
}

function setEstimate(sessionId, storyId, estimate) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const story = session.stories.find((s) => s.id === storyId);
  if (story) story.finalEstimate = estimate;
  return session;
}

// Build client-safe state (hide votes unless revealed)
function publicState(session) {
  return {
    id: session.id,
    deck: session.deck,
    stories: session.stories,
    currentStoryId: session.currentStoryId,
    phase: session.phase,
    facilitatorId: session.facilitatorId,
    participants: session.participants.map((p) => ({
      id: p.id,
      name: p.name,
      isObserver: p.isObserver,
      isFacilitator: p.isFacilitator,
      hasVoted: p.vote !== null,
      vote: session.phase === "revealed" ? p.vote : null,
      online: p.online,
    })),
  };
}

/**
 * Purge sessions where every participant has been offline for longer than
 * SESSION_TTL_MS. Called on an interval — not invoked per-request.
 */
function cleanupStaleSessions() {
  const now = Date.now();
  for (const [id, session] of sessions) {
    const allOffline = session.participants.every((p) => !p.online);
    if (!allOffline) continue;

    // Find the most-recent disconnect time; if all are null use now
    const latestDisconnect = session.participants.reduce((latest, p) => {
      const t = p.disconnectedAt ? p.disconnectedAt.getTime() : 0;
      return Math.max(latest, t);
    }, 0);

    if (latestDisconnect > 0 && now - latestDisconnect > SESSION_TTL_MS) {
      console.log(`[cleanup] Deleting stale session ${id}`);
      sessions.delete(id);
    }
  }
}

/** Start the background cleanup job (call once at server startup). */
function startCleanupJob() {
  // Run every 10 minutes
  setInterval(cleanupStaleSessions, 10 * 60 * 1000);
  console.log("[cleanup] Session cleanup job started (runs every 10 min, TTL 2 h)");
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  addParticipant,
  reconnectParticipant,
  markParticipantOffline,
  castVote,
  revealVotes,
  resetVotes,
  addStory,
  addStoriesBulk,
  selectStory,
  setEstimate,
  publicState,
  startCleanupJob,
};
