const Hand = require("../pokersolver").Hand;

// made hands
test("returns highcard", () => {
  let hand1 = ["AH", "5C", "KC", "3H", "TD"];

  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("High Card");
});

test("returns pair", () => {
  let hand1 = ["AH", "AC", "KC", "3H", "TD"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Pair");
});

test("returns two pair", () => {
  let hand1 = ["AH", "AC", "3C", "3H", "TD"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Two Pair");
});

test("returns trips", () => {
  let hand1 = ["AH", "AC", "AC", "JH", "TD"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Three of a Kind"
  );
});

test("returns straight", () => {
  let hand1 = ["AH", "KC", "QC", "JH", "TD"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Straight");
});

test("returns flush", () => {
  let hand1 = ["AH", "5H", "7H", "JH", "2H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Flush");
});

test("returns full house", () => {
  let hand1 = ["AH", "AC", "AD", "JH", "JS"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Full House");
});

test("returns quads", () => {
  let hand1 = ["AH", "AC", "AD", "AH", "JS"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Four of a Kind"
  );
});

test("returns straight flush", () => {
  let hand1 = ["AH", "2H", "4H", "3H", "5H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Straight Flush"
  );
});

// draws
test("returns Flush draw", () => {
  let hand1 = ["AH", "KC", "3H", "JH", "5H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Flush Draw No Pair"
  );
});

test("returns Straight draw", () => {
  let hand1 = ["AH", "KC", "3D", "JH", "TH"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Draw No Pair"
  );
});

test("returns Flush draw with pair", () => {
  let hand1 = ["AH", "KC", "KH", "JH", "5H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Flush Draw With Pair"
  );
});

test("returns Gutshot Straight draw with pair", () => {
  let hand1 = ["AH", "KC", "JD", "JH", "TH"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Draw With Pair"
  );
});

test("returns Straight draw with pair", () => {
  let hand1 = ["QH", "QC", "JD", "TH", "9H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Straight Draw With Pair"
  );
});

test("returns Gutshot Straight Flush Draw", () => {
  let hand1 = ["AH", "KH", "3D", "JH", "TH"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Flush Draw No Pair"
  );
});

// this isn't right because it's still a gutshot
test("returns Gutshot Straight Flush Draw", () => {
  let hand1 = ["AH", "KH", "QD", "JH", "3H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Flush Draw No Pair"
  );
});

test("returns Gutshot Straight Flush Draw With Pair", () => {
  let hand1 = ["AH", "KH", "JD", "JH", "TH"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Flush Draw With Pair"
  );
});

test("returns Straight Flush Draw With Pair", () => {
  let hand1 = ["KH", "QH", "JH", "TH", "TS"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Straight Flush Draw With Pair"
  );
});

// edge cases
test("returns wheel straight", () => {
  let hand1 = ["AH", "2C", "3C", "4H", "5D"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Straight");
});

test("returns gutshot wheel straight draw", () => {
  let hand1 = ["AH", "2C", "3C", "4H", "7D"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Gutshot Straight Draw No Pair"
  );
});

test("returns wheel straight draw", () => {
  let hand1 = ["2C", "3C", "4H", "5D", "8H"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe(
    "Straight Draw No Pair"
  );
});

test("returns royal flush", () => {
  let hand1 = ["AC", "QC", "TC", "JC", "KC"];
  expect(Hand.solve({ cards: hand1, game: "boss" }).name).toBe("Royal Flush");
});
