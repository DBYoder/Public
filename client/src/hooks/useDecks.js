import { useEffect, useState } from "react";

// Fetches deck definitions from the server so card lists, special
// (non-estimate) cards, and numeric/non-numeric behavior live in one place
// (server/decks.js) instead of being hand-copied across client components.
export function useDecks() {
  const [decks, setDecks] = useState(null);

  useEffect(() => {
    fetch("/api/decks")
      .then((res) => res.json())
      .then((list) => {
        const byKey = {};
        for (const deck of list) byKey[deck.key] = deck;
        setDecks(byKey);
      })
      .catch(() => setDecks({}));
  }, []);

  return decks;
}
