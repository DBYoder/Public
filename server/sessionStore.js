const { customAlphabet } = require("nanoid");
const { DECKS } = require("./decks");

const nanoid = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);

// Map<sessionId, Session>
const sessions = new Map();

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
  // Reconnect if already exists
  const existing = session.participants.find((p) => p.id === id);
  if (existing) return session;
  session.participants.push({
    id,
    name,
    vote: null,
    isObserver,
    isFacilitator: false,
  });
  return session;
}

function removeParticipant(sessionId, participantId) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  session.participants = session.participants.filter(
    (p) => p.id !== participantId
  );
  // If facilitator left, promote next non-observer participant
  if (
    session.facilitatorId === participantId &&
    session.participants.length > 0
  ) {
    const next = session.participants.find((p) => !p.isObserver);
    if (next) {
      next.isFacilitator = true;
      session.facilitatorId = next.id;
    }
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

function addStory(sessionId, title) {
  const session = sessions.get(sessionId);
  if (!session) return null;
  const story = {
    id: nanoid(),
    title,
    finalEstimate: null,
  };
  session.stories.push(story);
  if (!session.currentStoryId) session.currentStoryId = story.id;
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
    })),
  };
}

module.exports = {
  createSession,
  getSession,
  deleteSession,
  addParticipant,
  removeParticipant,
  castVote,
  revealVotes,
  resetVotes,
  addStory,
  selectStory,
  setEstimate,
  publicState,
};
