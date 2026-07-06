const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
const {
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
  editStory,
  deleteStory,
  selectStory,
  setEstimate,
  publicState,
  startCleanupJob,
} = require("./sessionStore");
const { DECKS } = require("./decks");

const app = express();
const server = http.createServer(app);

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"],
  },
});

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

// Serve built client in production
const clientDist = path.join(__dirname, "../client/dist");
app.use(express.static(clientDist));

// REST: get session metadata (for join validation before socket connect)
app.get("/api/session/:id", (req, res) => {
  const session = getSession(req.params.id.toUpperCase());
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({ id: session.id, deck: session.deck, participantCount: session.participants.length });
});

// REST: list available decks
app.get("/api/decks", (_req, res) => {
  res.json(
    Object.entries(DECKS).map(([key, val]) => ({
      key,
      label: val.label,
      cards: val.cards,
      special: val.special,
      isNonNumeric: !!val.isNonNumeric,
    }))
  );
});

// Fallback to React app
app.get("*", (_req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

// Socket.io
io.on("connection", (socket) => {
  let currentSessionId = null;

  function broadcast(session) {
    io.to(session.id).emit("session-state", publicState(session));
  }

  function guardFacilitator(sessionId) {
    const session = getSession(sessionId);
    if (!session) return null;
    if (session.facilitatorId !== socket.id) {
      socket.emit("error", { message: "Only the facilitator can do that." });
      return null;
    }
    return session;
  }

  // --- Join ---
  socket.on("join", ({ sessionId, name, isObserver, createNew, deck, reconnectToken }) => {
    try {
      let session;
      if (createNew) {
        session = createSession({ facilitatorId: socket.id, facilitatorName: name, deck: deck || "hours" });
      } else {
        const id = (sessionId || "").toUpperCase();
        session = getSession(id);
        if (!session) {
          socket.emit("error", { message: "Session not found. Check your session ID." });
          return;
        }

        // Try to reconnect as an existing offline participant with the same
        // name AND reconnect token. This handles page-refresh / network-drop
        // without losing vote state, while requiring proof of identity so a
        // name match alone can't be used to steal someone else's slot.
        const reconnected = reconnectToken
          ? reconnectParticipant(id, name, socket.id, reconnectToken)
          : null;
        if (reconnected) {
          session = reconnected;
        } else {
          session = addParticipant(id, { id: socket.id, name, isObserver: !!isObserver });
        }
      }
      currentSessionId = session.id;
      socket.join(session.id);
      const me = session.participants.find((p) => p.id === socket.id);
      socket.emit("joined", { reconnectToken: me?.reconnectToken });
      broadcast(session);
    } catch (err) {
      socket.emit("error", { message: err.message });
    }
  });

  // --- Vote ---
  socket.on("vote", ({ card }) => {
    if (!currentSessionId) return;
    const session = getSession(currentSessionId);
    if (!session || session.phase === "revealed") return;
    if (!DECKS[session.deck]?.cards.includes(card)) return;
    const updated = castVote(currentSessionId, socket.id, card);
    if (updated) broadcast(updated);
  });

  // --- Reveal ---
  socket.on("reveal", () => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    const updated = revealVotes(currentSessionId);
    if (updated) broadcast(updated);
  });

  // --- Reset ---
  socket.on("reset", () => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    const updated = resetVotes(currentSessionId);
    if (updated) broadcast(updated);
  });

  // --- Add story ---
  socket.on("add-story", ({ title, description, acceptanceCriteria }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    if (!title || !title.trim()) return;
    const updated = addStory(currentSessionId, { title, description, acceptanceCriteria });
    if (updated) broadcast(updated);
  });

  // --- Bulk add stories from CSV ---
  socket.on("add-stories-bulk", ({ stories }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    if (!Array.isArray(stories) || stories.length === 0) return;
    const updated = addStoriesBulk(currentSessionId, stories);
    if (updated) broadcast(updated);
  });

  // --- Edit story ---
  socket.on("edit-story", ({ storyId, title, storyNumber, description, acceptanceCriteria }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    const updated = editStory(currentSessionId, storyId, { title, storyNumber, description, acceptanceCriteria });
    if (updated) broadcast(updated);
  });

  // --- Delete story ---
  socket.on("delete-story", ({ storyId }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    const updated = deleteStory(currentSessionId, storyId);
    if (updated) broadcast(updated);
  });

  // --- Select story ---
  socket.on("select-story", ({ storyId }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    const updated = selectStory(currentSessionId, storyId);
    if (updated) broadcast(updated);
  });

  // --- Set estimate ---
  socket.on("set-estimate", ({ storyId, estimate }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    if (!DECKS[session.deck]?.cards.includes(estimate)) return;
    const updated = setEstimate(currentSessionId, storyId, estimate);
    if (updated) broadcast(updated);
  });

  // --- End session (facilitator only) ---
  socket.on("end-session", () => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    // Notify everyone in the room before deleting
    io.to(session.id).emit("session-ended");
    deleteSession(session.id);
    currentSessionId = null;
  });

  // --- Disconnect ---
  // Soft-delete: mark the participant offline rather than removing them.
  // The session lives on so reconnecting participants rejoin their existing slot.
  // A background job (startCleanupJob) purges sessions where everyone has been
  // offline for more than 2 hours.
  socket.on("disconnect", () => {
    if (!currentSessionId) return;
    const updated = markParticipantOffline(currentSessionId, socket.id);
    if (updated) broadcast(updated);
  });
});

// Start background session cleanup job
startCleanupJob();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});
