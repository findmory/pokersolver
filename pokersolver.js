/**
 * pokersolver v3.0.0
 * Copyright (c) 2016, James Simpson of GoldFire Studios
 * http://goldfirestudios.com
 */

// NOTE: The 'joker' will be denoted with a value of 'O' and any suit.
const values = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "T",
  "J",
  "Q",
  "K",
  "A",
];

/**
 * Base Card class that defines a single card.
 */
class Card {
  constructor(str) {
    this.value = str.substr(0, 1);
    this.suit = str.substr(1, 1).toLowerCase();
    this.rank = values.indexOf(this.value);
  }

  toString() {
    return this.value.replace("T", "10") + this.suit;
  }

  static sort(a, b) {
    if (a.rank > b.rank) {
      return -1;
    } else if (a.rank < b.rank) {
      return 1;
    } else {
      return 0;
    }
  }
}

/**
 * Base Hand class that handles comparisons of full hands.
 */
class Hand {
  constructor(cards, name, game, canDisqualify, id) {
    this.cardPool = [];
    this.cards = [];
    this.suits = {};
    this.values = [];
    this.name = name;
    this.game = game;
    this.sfLength = 0;
    this.alwaysQualifies = true;
    this.id = id;

    // Qualification rules apply for dealer's hand.
    // Also applies for single player games, like video poker.
    if (canDisqualify && this.game.lowestQualified) {
      this.alwaysQualifies = false;
    }

    // Ensure no duplicate cards in standard game.
    if (game.descr === "standard" && new Set(cards).size !== cards.length) {
      throw new Error("Duplicate cards");
    }

    // Get rank based on game.
    let handRank = this.game.handValues.length;
    let i;
    for (i = 0; i < this.game.handValues.length; i++) {
      if (this.game.handValues[i] === this.constructor) {
        break;
      }
    }
    this.rank = handRank - i;

    // Set up the pool of cards.
    this.cardPool = cards.map(function (c) {
      return typeof c === "string" ? new Card(c) : c;
    });

    this.cardPool = this.cardPool.sort(Card.sort);

    // Create the arrays of suits and values.
    let obj, obj1, key, key1, card;
    for (let i = 0; i < this.cardPool.length; i++) {
      card = this.cardPool[i];
      (obj = this.suits)[(key = card.suit)] || (obj[key] = []);
      (obj1 = this.values)[(key1 = card.rank)] || (obj1[key1] = []);

      // Add the value to the array for that type in the object.
      this.suits[card.suit].push(card);
      this.values[card.rank].push(card);
    }

    this.values.reverse();
    this.isPossible = this.solve();
  }

  /**
   * Compare current hand with another to determine which is the winner.
   * @param  {Hand} a Hand to compare to.
   * @return {Number}
   */
  compare(a) {
    if (this.rank < a.rank) {
      return 1;
    } else if (this.rank > a.rank) {
      return -1;
    }

    let result = 0;
    for (let i = 0; i <= 4; i++) {
      if (this.cards[i] && a.cards[i] && this.cards[i].rank < a.cards[i].rank) {
        result = 1;
        break;
      } else if (
        this.cards[i] &&
        a.cards[i] &&
        this.cards[i].rank > a.cards[i].rank
      ) {
        result = -1;
        break;
      }
    }

    return result;
  }

  /**
   * Determine whether a hand loses to another.
   * @param  {Hand} hand Hand to compare to.
   * @return {Boolean}
   */
  loseTo(hand) {
    return this.compare(hand) > 0;
  }

  /**
   * Determine the number of cards in a hand of a rank.
   * @param  {Number} val Index of this.values.
   * @return {Number} Number of cards having the rank.
   */
  getNumCardsByRank(val) {
    const cards = this.values[val];
    return cards ? cards.length : 0;
  }

  /**
   * Determine the cards in a suit for a flush.
   * @param  {String} suit Key for this.suits.
   * @return {Array} Cards having the suit.
   */
  getCardsForFlush(suit) {
    return (this.suits[suit] || []).sort(Card.sort);
  }

  /**
   * Highest card comparison.
   * @return {Array} Highest cards
   */
  nextHighest() {
    let picks;
    let excluding = [];
    excluding = excluding.concat(this.cards);

    picks = this.cardPool.filter(function (card) {
      if (excluding.indexOf(card) < 0) {
        return true;
      }
    });

    return picks;
  }

  /**
   * Return list of contained cards in human readable format.
   * @return {String}
   */
  toString() {
    const cards = this.cards.map(function (c) {
      return c.toString();
    });

    return cards.join(", ");
  }

  /**
   * Return array of contained cards.
   * @return {Array}
   */
  toArray() {
    const cards = this.cards.map(function (c) {
      return c.toString();
    });

    return cards;
  }

  /**
   * Determine if qualifying hand.
   * @return {Boolean}
   */
  qualifiesHigh() {
    if (!this.game.lowestQualified || this.alwaysQualifies) {
      return true;
    }

    return this.compare(Hand.solve(this.game.lowestQualified, this.game)) <= 0;
  }

  /**
   * Find highest ranked hands and remove any that don't qualify or lose to another hand.
   * @param  {Array} hands Hands to evaluate.
   * @return {Array}       Winning hands.
   */
  static winners(hands) {
    hands = hands.filter(function (h) {
      return h.qualifiesHigh();
    });

    const highestRank = Math.max.apply(
      Math,
      hands.map(function (h) {
        return h.rank;
      })
    );

    hands = hands.filter(function (h) {
      return h.rank === highestRank;
    });

    hands = hands.filter(function (h) {
      let lose = false;
      for (let i = 0; i < hands.length; i++) {
        lose = h.loseTo(hands[i]);
        if (lose) {
          break;
        }
      }

      return !lose;
    });

    return hands;
  }

  /**
   * Build and return the best hand.
   * @param  {Array} cards Array of cards (['Ad', '3c', 'Th', ...]).
   * @param  {String} id ID of hand to identify it; eg "Player1"
   * @param  {String} game Game being played.
   * @param  {Boolean} canDisqualify Check for a qualified hand.
   * @return {Hand}       Best hand.
   */
  static solve({
    cards = [""],
    game = "standard",
    canDisqualify = false,
    id = "",
  } = {}) {
    game = game || "standard";
    game = typeof game === "string" ? new Game(game) : game;
    cards = cards || [""];

    const hands = game.handValues;
    let result = null;

    for (let i = 0; i < hands.length; i++) {
      result = new hands[i](cards, game, canDisqualify, id);
      if (result.isPossible) {
        break;
      }
    }

    return result;
  }

  /**
   * Do we have a pair?
   * @return {Bool} pair or no.
   */
  doesHandContainPair() {
    let containsPair = false;

    // check for pair and if found continue
    for (let i = 0; i < this.values.length; i++) {
      if (this.getNumCardsByRank(i) === 2) {
        containsPair = true;
        break;
      }
    }

    return containsPair;
  }
}

/**
 * Helper Functions that are used across classes
 */

/**
 * Get the number of gaps in the straight.
 * @return {Array} Highest potential straight with fewest number of gaps.
 */
function getGaps(checkHandLength, cardPool, game) {
  let cardsToCheck, i, card, gapCards, cardsList, gapCount, prevCard, diff;

  cardsToCheck = cardPool.slice();

  for (i = 0; i < cardsToCheck.length; i++) {
    card = cardsToCheck[i];
    if (card.value === "A") {
      cardsToCheck.push(new Card("1" + card.suit));
    }
  }
  cardsToCheck = cardsToCheck.sort(Card.sort);

  if (checkHandLength) {
    i = cardsToCheck[0].rank + 1;
  } else {
    checkHandLength = game.sfQualify;
    i = values.length;
  }

  gapCards = [];
  for (; i > 0; i--) {
    cardsList = [];
    gapCount = 0;
    for (let j = 0; j < cardsToCheck.length; j++) {
      card = cardsToCheck[j];
      if (card.rank > i) {
        continue;
      }
      prevCard = cardsList[cardsList.length - 1];
      diff = prevCard ? prevCard.rank - card.rank : i - card.rank;

      if (diff === null) {
        cardsList.push(card);
      } else if (checkHandLength < gapCount + diff + cardsList.length) {
        break;
      } else if (diff > 0) {
        cardsList.push(card);
        gapCount += diff - 1;
      }
    }
    if (cardsList.length > gapCards.length) {
      gapCards = cardsList.slice();
    }
  }

  return gapCards;
}

/**
 * Get the number of consecutive cards in straight
 * @return {Boolean} Open-ended straight draw - 4 in a row
 */
function isOpenEnded(cardPool) {
  // handle Bway and Wheel
  // if we have an A (rank:0 or rank: 13)we can't be open ended
  if (cardPool[0].rank === 13 || cardPool[3].rank === 0) {
    return false;
  }

  let count = 0;
  for (let i = 0; i < cardPool.length - 1; i++) {
    if (cardPool[i].rank - 1 === cardPool[i + 1].rank) {
      count++;
    }
  }

  return count === 3;
}

class StraightFlush extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Straight Flush", game, canDisqualify, id);
  }

  solve() {
    let cards;
    let possibleStraight = null;
    let nonCards = [];
    let suit;

    for (suit in this.suits) {
      cards = this.getCardsForFlush(suit);
      if (cards && cards.length >= this.game.sfQualify) {
        possibleStraight = cards;
        break;
      }
    }

    if (possibleStraight) {
      if (this.game.descr !== "standard") {
        for (suit in this.suits) {
          if (possibleStraight[0].suit !== suit) {
            nonCards = nonCards.concat(this.suits[suit] || []);
          }
        }
      }
      const straight = new Straight(possibleStraight, this.game);
      if (straight.isPossible) {
        this.cards = straight.cards;
        this.cards = this.cards.concat(nonCards);
        this.sfLength = straight.sfLength;
      }
    }

    if (this.cards[0] && this.cards[0].rank === 13) {
      this.descr = "Royal Flush";
      this.name = "Royal Flush";
    } else if (this.cards.length >= this.game.sfQualify) {
      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class StraightFlushDrawWithPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Straight Flush Draw With Pair", game, canDisqualify);
  }

  solve() {
    let cards;
    let possibleStraight = null;
    let nonCards = [];
    let suit;

    if (!this.doesHandContainPair()) {
      return false;
    }

    // first make sure we have a 4 to a flush
    for (suit in this.suits) {
      cards = this.getCardsForFlush(suit);
      if (cards && cards.length >= this.game.drawQualify) {
        possibleStraight = cards;
        break;
      }
    }

    if (possibleStraight) {
      const straight = new StraightDrawNoPair(this.cardPool, this.game);
      if (straight.isPossible) {
        this.cards = straight.cards;
        this.cards = this.cards.concat(nonCards);
        this.sfLength = straight.sfLength;
      }
    }

    if (this.sfLength >= this.game.drawQualify) {
      // do we have gutshot ?
      const oe = isOpenEnded(this.cards);
      this.name = oe ? this.name : "Gutshot " + this.name;

      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
    }

    return this.sfLength >= this.game.drawQualify;
  }
}

class StraightFlushDrawNoPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Straight Flush Draw No Pair", game, canDisqualify);
  }

  solve() {
    let cards;
    let possibleStraight = null;
    let nonCards = [];
    let suit;

    // first make sure we have a 4 to a flush
    for (suit in this.suits) {
      cards = this.getCardsForFlush(suit);
      if (cards && cards.length >= this.game.drawQualify) {
        possibleStraight = cards;
        break;
      }
    }

    if (possibleStraight) {
      const straight = new StraightDrawNoPair(this.cardPool, this.game);
      if (straight.isPossible) {
        this.cards = straight.cards;
        this.cards = this.cards.concat(nonCards);
        this.sfLength = straight.sfLength;
      }
    }

    if (this.sfLength >= this.game.drawQualify) {
      // do we have gutshot ?
      const oe = isOpenEnded(this.cards);
      this.name = oe ? this.name : "Gutshot " + this.name;

      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
    }

    return this.sfLength >= this.game.drawQualify;
  }
}

class RoyalFlush extends StraightFlush {
  constructor(cards, game, canDisqualify, id) {
    super(cards, game, canDisqualify, id);
  }

  solve() {
    const result = super.solve();
    return result && this.descr === "Royal Flush";
  }
}

class FourOfAKind extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Four of a Kind", game, canDisqualify, id);
  }

  solve() {
    for (let i = 0; i < this.values.length; i++) {
      if (this.getNumCardsByRank(i) === 4) {
        this.cards = this.values[i] || [];
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - 4)
        );
        break;
      }
    }

    if (this.cards.length >= 4) {
      if (this.game.noKickers) {
        this.cards.length = 4;
      }

      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + "'s";
    }

    return this.cards.length >= 4;
  }
}

class FullHouse extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Full House", game, canDisqualify, id);
  }

  solve() {
    let cards;

    for (let i = 0; i < this.values.length; i++) {
      if (this.getNumCardsByRank(i) === 3) {
        this.cards = this.values[i] || [];
        break;
      }
    }

    if (this.cards.length === 3) {
      for (let i = 0; i < this.values.length; i++) {
        cards = this.values[i];
        if (cards && this.cards[0].value === cards[0].value) {
          continue;
        }
        if (this.getNumCardsByRank(i) >= 2) {
          this.cards = this.cards.concat(cards || []);
          this.cards = this.cards.concat(
            this.nextHighest().slice(0, this.game.cardsInHand - 5)
          );
          break;
        }
      }
    }

    if (this.cards.length >= 5) {
      const type =
        this.cards[0].toString().slice(0, -1) +
        "'s over " +
        this.cards[3].toString().slice(0, -1) +
        "'s";
      this.descr = this.name + ", " + type;
    }

    return this.cards.length >= 5;
  }
}

class Flush extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Flush", game, canDisqualify, id);
  }

  solve() {
    this.sfLength = 0;
    let suit;

    for (suit in this.suits) {
      const cards = this.getCardsForFlush(suit);
      if (cards.length >= this.game.sfQualify) {
        this.cards = cards;
        break;
      }
    }

    if (this.cards.length >= this.game.sfQualify) {
      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length)
        );
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class FlushDrawNoPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Flush Draw No Pair", game, canDisqualify);
  }

  solve() {
    this.sfLength = 0;
    let suit;

    for (suit in this.suits) {
      const cards = this.getCardsForFlush(suit);
      if (cards.length >= this.game.drawQualify) {
        this.cards = cards;
        break;
      }
    }

    if (this.cards.length >= this.game.drawQualify) {
      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length)
        );
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class FlushDrawWithPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Flush Draw With Pair", game, canDisqualify);
  }

  solve() {
    this.sfLength = 0;
    let suit;

    if (!this.doesHandContainPair()) {
      return false;
    }

    for (suit in this.suits) {
      const cards = this.getCardsForFlush(suit);
      if (cards.length >= this.game.drawQualify) {
        this.cards = cards;
        break;
      }
    }

    if (this.cards.length >= this.game.drawQualify) {
      this.descr =
        this.name +
        ", " +
        this.cards[0].toString().slice(0, -1) +
        suit +
        " High";
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - this.cards.length)
        );
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class Straight extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Straight", game, canDisqualify, id);
  }

  solve() {
    this.cards = getGaps(5, this.cardPool, this.game);

    if (this.cards.length >= this.game.sfQualify) {
      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + " High";
      this.cards = this.cards.slice(0, this.game.cardsInHand);
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        if (this.cards[this.sfLength - 1].rank === 0) {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              1,
              this.game.cardsInHand - this.cards.length + 1
            )
          );
        } else {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
          );
        }
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class StraightDrawNoPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Straight Draw No Pair", game, canDisqualify);
  }

  solve() {
    this.cards = getGaps(5, this.cardPool, this.game);

    // do we have enough cards for a draw?
    if (this.cards.length >= this.game.drawQualify) {
      // do we have gutshot ?
      const oe = isOpenEnded(this.cards);
      this.name = oe ? this.name : "Gutshot " + this.name;

      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + " High";
      this.cards = this.cards.slice(0, this.game.cardsInHand);
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        if (this.cards[this.sfLength - 1].rank === 0) {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              1,
              this.game.cardsInHand - this.cards.length + 1
            )
          );
        } else {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
          );
        }
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class StraightDrawWithPair extends Hand {
  constructor(cards, game, canDisqualify) {
    super(cards, "Straight Draw With Pair", game, canDisqualify);
  }

  solve() {
    if (!this.doesHandContainPair()) {
      return false;
    }

    this.cards = getGaps(5, this.cardPool, this.game);

    if (this.cards.length >= this.game.drawQualify) {
      // do we have gutshot ?
      const oe = isOpenEnded(this.cards);
      this.name = oe ? this.name : "Gutshot " + this.name;

      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + " High";
      this.cards = this.cards.slice(0, this.game.cardsInHand);
      this.sfLength = this.cards.length;
      if (this.cards.length < this.game.cardsInHand) {
        if (this.cards[this.sfLength - 1].rank === 0) {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              1,
              this.game.cardsInHand - this.cards.length + 1
            )
          );
        } else {
          this.cards = this.cards.concat(
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
          );
        }
      }
    }

    return this.cards.length >= this.game.sfQualify;
  }
}

class ThreeOfAKind extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Three of a Kind", game, canDisqualify, id);
  }

  solve() {
    for (let i = 0; i < this.values.length; i++) {
      if (this.getNumCardsByRank(i) === 3) {
        this.cards = this.values[i] || [];
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - 3)
        );
        break;
      }
    }

    if (this.cards.length >= 3) {
      if (this.game.noKickers) {
        this.cards.length = 3;
      }

      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + "'s";
    }

    return this.cards.length >= 3;
  }
}

class TwoPair extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Two Pair", game, canDisqualify, id);
  }

  solve() {
    for (let i = 0; i < this.values.length; i++) {
      const cards = this.values[i];
      if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
        this.cards = this.cards.concat(cards || []);
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - 4)
        );
        break;
      } else if (this.getNumCardsByRank(i) === 2) {
        this.cards = this.cards.concat(cards);
      }
    }

    if (this.cards.length >= 4) {
      if (this.game.noKickers) {
        this.cards.length = 4;
      }

      const type =
        this.cards[0].toString().slice(0, -1) +
        "'s & " +
        this.cards[2].toString().slice(0, -1) +
        "'s";
      this.descr = this.name + ", " + type;
    }

    return this.cards.length >= 4;
  }
}

class OnePair extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "Pair", game, canDisqualify, id);
  }

  solve() {
    for (let i = 0; i < this.values.length; i++) {
      if (this.getNumCardsByRank(i) === 2) {
        this.cards = this.cards.concat(this.values[i] || []);
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - 2)
        );
        break;
      }
    }

    if (this.cards.length >= 2) {
      if (this.game.noKickers) {
        this.cards.length = 2;
      }

      this.descr =
        this.name + ", " + this.cards[0].toString().slice(0, -1) + "'s";
    }

    return this.cards.length >= 2;
  }
}

class HighCard extends Hand {
  constructor(cards, game, canDisqualify, id) {
    super(cards, "High Card", game, canDisqualify, id);
  }

  solve() {
    this.cards = this.cardPool.slice(0, this.game.cardsInHand);

    if (this.game.noKickers) {
      this.cards.length = 1;
    }

    this.cards = this.cards.sort(Card.sort);
    this.descr = this.cards[0].toString().slice(0, -1) + " High";

    return true;
  }
}

const gameRules = {
  standard: {
    cardsInHand: 5,
    handValues: [
      RoyalFlush,
      StraightFlush,
      FourOfAKind,
      FullHouse,
      Flush,
      Straight,
      ThreeOfAKind,
      TwoPair,
      OnePair,
      HighCard,
    ],
    wheelStatus: 0,
    sfQualify: 5,
    drawQualify: 4,
    lowestQualified: null,
    noKickers: false,
  },
  boss: {
    cardsInHand: 5,
    handValues: [
      RoyalFlush,
      StraightFlush,
      FourOfAKind,
      FullHouse,
      Flush,
      StraightFlushDrawWithPair,
      Straight,
      StraightFlushDrawNoPair,
      ThreeOfAKind,
      TwoPair,
      FlushDrawWithPair,
      StraightDrawWithPair,
      FlushDrawNoPair,
      OnePair,
      StraightDrawNoPair,
      HighCard,
    ],
    wheelStatus: 0,
    sfQualify: 5,
    drawQualify: 4,
    lowestQualified: null,
    noKickers: false,
  },

  bossAgroDraws: {
    cardsInHand: 5,
    handValues: [
      StraightFlush,
      FourOfAKind,
      FullHouse,
      StraightFlushDrawWithPair,
      StraightFlushDrawNoPair,
      FlushDrawWithPair,
      Flush,
      StraightDrawWithPair,
      Straight,
      FlushDrawNoPair,
      ThreeOfAKind,
      TwoPair,
      StraightDrawNoPair,
      OnePair,
      HighCard,
    ],
    wheelStatus: 0,
    sfQualify: 5,
    drawQualify: 4,
    lowestQualified: null,
    noKickers: false,
  },
};

/**
 * Base Game class that defines the rules of the game.
 */
class Game {
  constructor(descr) {
    this.descr = descr;
    this.cardsInHand = 0;
    this.handValues = [];
    this.wheelStatus = 0;
    this.sfQualify = 5;
    this.drawQualify = 4;
    this.lowestQualified = null;
    this.noKickers = null;

    // Set values based on the game rules.
    if (!this.descr || !gameRules[this.descr]) {
      this.descr = "standard";
    }
    this.cardsInHand = gameRules[this.descr].cardsInHand;
    this.handValues = gameRules[this.descr].handValues;
    this.wheelStatus = gameRules[this.descr].wheelStatus;
    this.sfQualify = gameRules[this.descr].sfQualify;
    this.lowestQualified = gameRules[this.descr].lowestQualified;
    this.noKickers = gameRules[this.descr].noKickers;
  }
}

// ES6 Module Exports
export {
  Card,
  Hand,
  Game,
  RoyalFlush,
  StraightFlush,
  FourOfAKind,
  FullHouse,
  Flush,
  Straight,
  ThreeOfAKind,
  TwoPair,
  FlushDrawNoPair,
  StraightFlushDrawNoPair,
  StraightFlushDrawWithPair,
  FlushDrawWithPair,
  StraightDrawNoPair,
  StraightDrawWithPair,
  OnePair,
  HighCard,
};

// Also export a default object for convenience
export default {
  Card,
  Hand,
  Game,
};
