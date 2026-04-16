const DECKS = {
  hours: {
    label: "Hours",
    cards: ["½", "1", "2", "4", "8", "16", "24", "40", "?", "☕"],
    special: ["?", "☕"],
  },
  fibonacci: {
    label: "Fibonacci",
    cards: ["0", "1", "2", "3", "5", "8", "13", "21", "34", "?", "∞", "☕"],
    special: ["?", "∞", "☕"],
  },
  tshirt: {
    label: "T-Shirt",
    cards: ["XS", "S", "M", "L", "XL", "XXL", "?", "☕"],
    special: ["?", "☕"],
    isNonNumeric: true,
  },
};

module.exports = { DECKS };
