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
  removeParticipant,
  castVote,
  revealVotes,
  resetVotes,
  addStory,
  selectStory,
  setEstimate,
  publicState,
} = require("./sessionStore");
const { DECKS } = require("./decks");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
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
  socket.on("join", ({ sessionId, name, isObserver, createNew, deck }) => {
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
        session = addParticipant(id, { id: socket.id, name, isObserver: !!isObserver });
      }
      currentSessionId = session.id;
      socket.join(session.id);
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
  socket.on("add-story", ({ title }) => {
    const session = guardFacilitator(currentSessionId);
    if (!session) return;
    if (!title || !title.trim()) return;
    const updated = addStory(currentSessionId, title.trim());
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
    const updated = setEstimate(currentSessionId, storyId, estimate);
    if (updated) broadcast(updated);
  });

  // --- Disconnect ---
  socket.on("disconnect", () => {
    if (!currentSessionId) return;
    const updated = removeParticipant(currentSessionId, socket.id);
    if (updated) {
      if (updated.participants.length === 0) {
        deleteSession(currentSessionId);
      } else {
        broadcast(updated);
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Planning Poker server running on port ${PORT}`);
});
