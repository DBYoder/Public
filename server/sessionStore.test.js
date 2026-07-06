import { describe, it, expect } from "vitest";
import store from "./sessionStore.js";

function makeSession(overrides = {}) {
  return store.createSession({
    facilitatorId: "fac-1",
    facilitatorName: "Alice",
    deck: "hours",
    ...overrides,
  });
}

describe("createSession", () => {
  it("creates a session with the facilitator as the first participant", () => {
    const session = makeSession();
    expect(session.participants).toHaveLength(1);
    expect(session.participants[0]).toMatchObject({
      id: "fac-1",
      name: "Alice",
      isFacilitator: true,
      online: true,
    });
    expect(session.facilitatorId).toBe("fac-1");
    expect(session.phase).toBe("voting");
  });

  it("throws on an unknown deck", () => {
    expect(() => makeSession({ deck: "not-a-real-deck" })).toThrow();
  });

  it("issues a reconnect token that isn't exposed via publicState", () => {
    const session = makeSession();
    expect(session.participants[0].reconnectToken).toBeTruthy();
    const state = store.publicState(session);
    expect(state.participants[0].reconnectToken).toBeUndefined();
  });
});

describe("addStory / addStoriesBulk", () => {
  it("trims and truncates fields, and selects the first story added", () => {
    const session = makeSession();
    store.addStory(session.id, {
      title: "  My story  ",
      storyNumber: " US-1 ",
      description: "x".repeat(6000),
      acceptanceCriteria: "  AC  ",
    });
    const story = session.stories[0];
    expect(story.title).toBe("My story");
    expect(story.storyNumber).toBe("US-1");
    expect(story.description).toHaveLength(5000);
    expect(story.acceptanceCriteria).toBe("AC");
    expect(session.currentStoryId).toBe(story.id);
  });

  it("skips bulk rows with a blank title", () => {
    const session = makeSession();
    store.addStoriesBulk(session.id, [{ title: "  " }, { title: "Real story" }]);
    expect(session.stories).toHaveLength(1);
    expect(session.stories[0].title).toBe("Real story");
  });

  it("caps bulk imports at 500 stories", () => {
    const session = makeSession();
    const many = Array.from({ length: 600 }, (_, i) => ({ title: `story ${i}` }));
    store.addStoriesBulk(session.id, many);
    expect(session.stories).toHaveLength(500);
  });
});

describe("editStory / deleteStory", () => {
  it("updates provided fields and leaves the title alone if blank", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "Original" });
    const storyId = session.stories[0].id;

    store.editStory(session.id, storyId, {
      title: "   ",
      description: "new description",
    });

    expect(session.stories[0].title).toBe("Original");
    expect(session.stories[0].description).toBe("new description");
  });

  it("deleting the current story falls back to the next one and resets voting", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "First" });
    store.addStory(session.id, { title: "Second" });
    const [first, second] = session.stories;

    store.castVote(session.id, "fac-1", "8");
    store.revealVotes(session.id);
    store.deleteStory(session.id, first.id);

    expect(session.stories).toHaveLength(1);
    expect(session.currentStoryId).toBe(second.id);
    expect(session.phase).toBe("voting");
    expect(session.participants[0].vote).toBeNull();
  });

  it("deleting a non-current story leaves selection and phase untouched", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "First" });
    store.addStory(session.id, { title: "Second" });
    const [first, second] = session.stories;

    store.castVote(session.id, "fac-1", "8");
    store.deleteStory(session.id, second.id);

    expect(session.stories).toHaveLength(1);
    expect(session.currentStoryId).toBe(first.id);
    expect(session.participants[0].vote).toBe("8");
  });
});

describe("selectStory / resetVotes", () => {
  it("switching stories resets phase to voting and clears votes", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "First" });
    store.addStory(session.id, { title: "Second" });
    const [first, second] = session.stories;

    store.castVote(session.id, "fac-1", "8");
    store.revealVotes(session.id);
    expect(session.phase).toBe("revealed");

    store.selectStory(session.id, second.id);
    expect(session.currentStoryId).toBe(second.id);
    expect(session.phase).toBe("voting");
    expect(session.participants[0].vote).toBeNull();
  });

  it("selecting an unknown story id is a no-op", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "First" });
    const before = session.currentStoryId;
    store.selectStory(session.id, "does-not-exist");
    expect(session.currentStoryId).toBe(before);
  });
});

describe("castVote", () => {
  it("records a vote for a non-observer", () => {
    const session = makeSession();
    store.castVote(session.id, "fac-1", "8");
    expect(session.participants[0].vote).toBe("8");
  });

  it("ignores votes from observers", () => {
    const session = makeSession();
    store.addParticipant(session.id, { id: "p-2", name: "Bob", isObserver: true });
    store.castVote(session.id, "p-2", "8");
    const bob = session.participants.find((p) => p.id === "p-2");
    expect(bob.vote).toBeNull();
  });
});

describe("reconnectParticipant", () => {
  it("refuses to reconnect without a token", () => {
    const session = makeSession();
    store.markParticipantOffline(session.id, "fac-1");
    const result = store.reconnectParticipant(session.id, "Alice", "new-socket-id", undefined);
    expect(result).toBeNull();
  });

  it("refuses to reconnect with the wrong token — this is the fix for the facilitator-hijack bug", () => {
    const session = makeSession();
    store.markParticipantOffline(session.id, "fac-1");
    const result = store.reconnectParticipant(session.id, "Alice", "attacker-socket-id", "wrong-token");
    expect(result).toBeNull();
    expect(session.facilitatorId).toBe("fac-1");
  });

  it("refuses to reconnect a participant who is still online", () => {
    const session = makeSession();
    const token = session.participants[0].reconnectToken;
    const result = store.reconnectParticipant(session.id, "Alice", "new-socket-id", token);
    expect(result).toBeNull();
  });

  it("reconnects with the correct name (case-insensitive) and token, keeping facilitator status", () => {
    const session = makeSession();
    const token = session.participants[0].reconnectToken;
    store.markParticipantOffline(session.id, "fac-1");

    const result = store.reconnectParticipant(session.id, "ALICE", "new-socket-id", token);

    expect(result).not.toBeNull();
    expect(session.facilitatorId).toBe("new-socket-id");
    expect(session.participants[0].id).toBe("new-socket-id");
    expect(session.participants[0].online).toBe(true);
  });
});

describe("getSnapshot / restoreSnapshot", () => {
  it("round-trips a session through JSON and marks participants offline", () => {
    const session = makeSession();
    store.addStory(session.id, { title: "A story" });
    store.castVote(session.id, "fac-1", "8");

    const roundTripped = JSON.parse(JSON.stringify(store.getSnapshot()));
    store.restoreSnapshot(roundTripped);

    const restored = store.getSession(session.id);
    expect(restored.stories[0].title).toBe("A story");
    expect(restored.participants[0].vote).toBe("8");
    expect(restored.participants[0].online).toBe(false);
    expect(restored.participants[0].disconnectedAt).toBeInstanceOf(Date);
  });

  it("a restored participant can reconnect with their original token", () => {
    const session = makeSession();
    const token = session.participants[0].reconnectToken;

    const roundTripped = JSON.parse(JSON.stringify(store.getSnapshot()));
    store.restoreSnapshot(roundTripped);

    const result = store.reconnectParticipant(session.id, "Alice", "new-socket-after-restart", token);
    expect(result).not.toBeNull();
    expect(store.getSession(session.id).facilitatorId).toBe("new-socket-after-restart");
  });
});

describe("publicState", () => {
  it("hides votes during voting and reveals them after reveal", () => {
    const session = makeSession();
    store.castVote(session.id, "fac-1", "8");

    expect(store.publicState(session).participants[0].vote).toBeNull();
    expect(store.publicState(session).participants[0].hasVoted).toBe(true);

    store.revealVotes(session.id);
    expect(store.publicState(session).participants[0].vote).toBe("8");
  });
});
