/**
 * pokersolver v2.1.2
 * Copyright (c) 2016, James Simpson of GoldFire Studios
 * http://goldfirestudios.com
 */

(function () {
  "use strict";

  // NOTE: The 'joker' will be denoted with a value of 'O' and any suit.
  var values = [
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
      this.wildValue = str.substr(0, 1);
    }

    toString() {
      return this.wildValue.replace("T", "10") + this.suit;
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
      this.wilds = [];
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
      var handRank = this.game.handValues.length;
      for (var i = 0; i < this.game.handValues.length; i++) {
        if (this.game.handValues[i] === this.constructor) {
          break;
        }
      }
      this.rank = handRank - i;

      // Set up the pool of cards.
      this.cardPool = cards.map(function (c) {
        return typeof c === "string" ? new Card(c) : c;
      });

      // Fix the card ranks for wild cards, and sort.
      for (var i = 0; i < this.cardPool.length; i++) {
        card = this.cardPool[i];
        if (card.value === this.game.wildValue) {
          card.rank = -1;
        }
      }
      this.cardPool = this.cardPool.sort(Card.sort);

      // Create the arrays of suits and values.
      var obj, obj1, key, key1, card;
      for (var i = 0; i < this.cardPool.length; i++) {
        // Make sure this value already exists in the object.
        card = this.cardPool[i];

        // We do something special if this is a wild card.
        if (card.rank === -1) {
          this.wilds.push(card);
        } else {
          (obj = this.suits)[(key = card.suit)] || (obj[key] = []);
          (obj1 = this.values)[(key1 = card.rank)] || (obj1[key1] = []);

          // Add the value to the array for that type in the object.
          this.suits[card.suit].push(card);
          this.values[card.rank].push(card);
        }
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

      var result = 0;
      for (var i = 0; i <= 4; i++) {
        if (
          this.cards[i] &&
          a.cards[i] &&
          this.cards[i].rank < a.cards[i].rank
        ) {
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
     * @return {Number} Number of cards having the rank, including wild cards.
     */
    getNumCardsByRank(val) {
      var cards = this.values[val];
      var checkCardsLength = cards ? cards.length : 0;

      for (var i = 0; i < this.wilds.length; i++) {
        if (this.wilds[i].rank > -1) {
          continue;
        } else if (cards) {
          if (
            this.game.wildStatus === 1 ||
            cards[0].rank === values.length - 1
          ) {
            checkCardsLength += 1;
          }
        } else if (this.game.wildStatus === 1 || val === values.length - 1) {
          checkCardsLength += 1;
        }
      }

      return checkCardsLength;
    }

    /**
     * Determine the cards in a suit for a flush.
     * @param  {String} suit Key for this.suits.
     * @param  {Boolean} setRanks Whether to set the ranks for the wild cards.
     * @return {Array} Cards having the suit, including wild cards.
     */
    getCardsForFlush(suit, setRanks) {
      var cards = (this.suits[suit] || []).sort(Card.sort);

      for (var i = 0; i < this.wilds.length; i++) {
        var wild = this.wilds[i];

        if (setRanks) {
          var j = 0;
          while (j < values.length && j < cards.length) {
            if (cards[j].rank === values.length - 1 - j) {
              j += 1;
            } else {
              break;
            }
          }
          wild.rank = values.length - 1 - j;
          wild.wildValue = values[wild.rank];
        }

        cards.push(wild);
        cards = cards.sort(Card.sort);
      }

      return cards;
    }

    /**
     * Resets the rank and wild values of the wild cards.
     */
    resetWildCards() {
      for (var i = 0; i < this.wilds.length; i++) {
        this.wilds[i].rank = -1;
        this.wilds[i].wildValue = this.wilds[i].value;
      }
    }

    /**
     * Highest card comparison.
     * @return {Array} Highest cards
     */
    nextHighest() {
      var picks;
      var excluding = [];
      excluding = excluding.concat(this.cards);

      picks = this.cardPool.filter(function (card) {
        if (excluding.indexOf(card) < 0) {
          return true;
        }
      });

      // Account for remaining wild card when it must be ace.
      if (this.game.wildStatus === 0) {
        for (var i = 0; i < picks.length; i++) {
          var card = picks[i];
          if (card.rank === -1) {
            card.wildValue = "A";
            card.rank = values.length - 1;
          }
        }
        picks = picks.sort(Card.sort);
      }

      return picks;
    }

    /**
     * Return list of contained cards in human readable format.
     * @return {String}
     */
    toString() {
      var cards = this.cards.map(function (c) {
        return c.toString();
      });

      return cards.join(", ");
    }

    /**
     * Return array of contained cards.
     * @return {Array}
     */
    toArray() {
      var cards = this.cards.map(function (c) {
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

      return (
        this.compare(Hand.solve(this.game.lowestQualified, this.game)) <= 0
      );
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

      var highestRank = Math.max.apply(
        Math,
        hands.map(function (h) {
          return h.rank;
        })
      );

      hands = hands.filter(function (h) {
        return h.rank === highestRank;
      });

      hands = hands.filter(function (h) {
        var lose = false;
        for (var i = 0; i < hands.length; i++) {
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

      var hands = game.handValues;
      var result = null;

      for (var i = 0; i < hands.length; i++) {
        result = new hands[i](cards, game, canDisqualify, id);
        if (result.isPossible) {
          break;
        }
      }

      return result;
    }

    /**
     * Separate cards based on if they are wild cards.
     * @param  {Array} cards Array of cards (['Ad', '3c', 'Th', ...]).
     * @param  {Game} game Game being played.
     * @return {Array} [wilds, nonWilds] Wild and non-Wild Cards.
     */
    static stripWilds(cards, game) {
      var card, wilds, nonWilds;
      cards = cards || [""];
      wilds = [];
      nonWilds = [];

      for (var i = 0; i < cards.length; i++) {
        card = cards[i];
        if (card.rank === -1) {
          wilds.push(cards[i]);
        } else {
          nonWilds.push(cards[i]);
        }
      }

      return [wilds, nonWilds];
    }

    /**
     * Do we have a pair?
     * @return {Bool} pair or no.
     */
    doesHandContainPair() {
      var containsPair = false;

      // check for pair and if found continue
      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 2) {
          containsPair = true;
          // this.cards = this.cards.concat(this.values[i] || []);
          // for (var j = 0; j < this.wilds.length && this.cards.length < 2; j++) {
          //   var wild = this.wilds[j];
          //   if (this.cards) {
          //     wild.rank = this.cards[0].rank;
          //   } else {
          //     wild.rank = values.length - 1;
          //   }
          //   wild.wildValue = values[wild.rank];
          //   this.cards.push(wild);
          // }
          // this.cards = this.cards.concat(
          //   this.nextHighest().slice(0, this.game.cardsInHand - 2)
          // );
          break;
        }
      }

      return containsPair;
    }
  }

  class StraightFlush extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Straight Flush", game, canDisqualify, id);
    }

    solve() {
      var cards;
      this.resetWildCards();
      var possibleStraight = null;
      var nonCards = [];

      for (var suit in this.suits) {
        cards = this.getCardsForFlush(suit, false);
        if (cards && cards.length >= this.game.sfQualify) {
          possibleStraight = cards;
          break;
        }
      }

      if (possibleStraight) {
        if (this.game.descr !== "standard") {
          for (var suit in this.suits) {
            if (possibleStraight[0].suit !== suit) {
              nonCards = nonCards.concat(this.suits[suit] || []);
              nonCards = Hand.stripWilds(nonCards, this.game)[1];
            }
          }
        }
        var straight = new Straight(possibleStraight, this.game);
        if (straight.isPossible) {
          this.cards = straight.cards;
          this.cards = this.cards.concat(nonCards);
          this.sfLength = straight.sfLength;
        }
      }

      if (this.cards[0] && this.cards[0].rank === 13) {
        this.descr = "Royal Flush";
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
      var cards;
      this.resetWildCards();
      var possibleStraight = null;
      var nonCards = [];

      if (!this.doesHandContainPair()) return false;

      // first make sure we have a 4 to a flush
      for (var suit in this.suits) {
        cards = this.getCardsForFlush(suit, false);
        if (cards && cards.length >= this.game.drawQualify) {
          possibleStraight = cards;
          break;
        }
      }

      if (possibleStraight) {
        var straight = new StraightDrawNoPair(this.cardPool, this.game);
        if (straight.isPossible) {
          this.cards = straight.cards;
          this.cards = this.cards.concat(nonCards);
          this.sfLength = straight.sfLength;
        }
      }

      if (this.sfLength >= this.game.drawQualify) {
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
      var cards;
      this.resetWildCards();
      var possibleStraight = null;
      var nonCards = [];

      // first make sure we have a 4 to a flush
      for (var suit in this.suits) {
        cards = this.getCardsForFlush(suit, false);
        if (cards && cards.length >= this.game.drawQualify) {
          possibleStraight = cards;
          break;
        }
      }

      if (possibleStraight) {
        // if (this.game.descr !== "standard") {
        //   for (var suit in this.suits) {
        //     if (possibleStraight[0].suit !== suit) {
        //       nonCards = nonCards.concat(this.suits[suit] || []);
        //       nonCards = Hand.stripWilds(nonCards, this.game)[1];
        //     }
        //   }
        // }
        var straight = new StraightDrawNoPair(this.cardPool, this.game);
        if (straight.isPossible) {
          this.cards = straight.cards;
          this.cards = this.cards.concat(nonCards);
          this.sfLength = straight.sfLength;
        }
      }

      if (this.sfLength >= this.game.drawQualify) {
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
      this.resetWildCards();
      var result = super.solve();
      return result && this.descr === "Royal Flush";
    }
  }

  class NaturalRoyalFlush extends RoyalFlush {
    constructor(cards, game, canDisqualify, id) {
      super(cards, game, canDisqualify, id);
    }

    solve() {
      var i = 0;
      this.resetWildCards();
      var result = super.solve();
      if (result && this.cards) {
        for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
          if (this.cards[i].value === this.game.wildValue) {
            result = false;
            this.descr = "Wild Royal Flush";
            break;
          }
        }
        if (i === this.game.sfQualify) {
          this.descr = "Royal Flush";
        }
      }
      return result;
    }
  }

  class WildRoyalFlush extends RoyalFlush {
    constructor(cards, game, canDisqualify, id) {
      super(cards, game, canDisqualify, id);
    }

    solve() {
      var i = 0;
      this.resetWildCards();
      var result = super.solve();
      if (result && this.cards) {
        for (i = 0; i < this.game.sfQualify && i < this.cards.length; i++) {
          if (this.cards[i].value === this.game.wildValue) {
            this.descr = "Wild Royal Flush";
            break;
          }
        }
        if (i === this.game.sfQualify) {
          result = false;
          this.descr = "Royal Flush";
        }
      }
      return result;
    }
  }

  class FiveOfAKind extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Five of a Kind", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 5) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 5; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          this.cards = this.cards.concat(
            this.nextHighest().slice(0, this.game.cardsInHand - 5)
          );
          break;
        }
      }

      if (this.cards.length >= 5) {
        this.descr =
          this.name + ", " + this.cards[0].toString().slice(0, -1) + "'s";
      }

      return this.cards.length >= 5;
    }
  }

  class FourOfAKindPairPlus extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(
        cards,
        "Four of a Kind with Pair or Better",
        game,
        canDisqualify,
        id
      );
    }

    solve() {
      var cards;
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 4) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 4; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          break;
        }
      }

      if (this.cards.length === 4) {
        for (i = 0; i < this.values.length; i++) {
          cards = this.values[i];
          if (cards && this.cards[0].wildValue === cards[0].wildValue) {
            continue;
          }
          if (this.getNumCardsByRank(i) >= 2) {
            this.cards = this.cards.concat(cards || []);
            for (var j = 0; j < this.wilds.length; j++) {
              var wild = this.wilds[j];
              if (wild.rank !== -1) {
                continue;
              }
              if (cards) {
                wild.rank = cards[0].rank;
              } else if (
                this.cards[0].rank === values.length - 1 &&
                this.game.wildStatus === 1
              ) {
                wild.rank = values.length - 2;
              } else {
                wild.rank = values.length - 1;
              }
              wild.wildValue = values[wild.rank];
              this.cards.push(wild);
            }
            this.cards = this.cards.concat(
              this.nextHighest().slice(0, this.game.cardsInHand - 6)
            );
            break;
          }
        }
      }

      if (this.cards.length >= 6) {
        var type =
          this.cards[0].toString().slice(0, -1) +
          "'s over " +
          this.cards[4].toString().slice(0, -1) +
          "'s";
        this.descr = this.name + ", " + type;
      }

      return this.cards.length >= 6;
    }
  }

  class FourOfAKind extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Four of a Kind", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 4) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 4; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }

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

  class FourWilds extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Four Wild Cards", game, canDisqualify, id);
    }

    solve() {
      if (this.wilds.length === 4) {
        this.cards = this.wilds;
        this.cards = this.cards.concat(
          this.nextHighest().slice(0, this.game.cardsInHand - 4)
        );
      }

      if (this.cards.length >= 4) {
        if (this.game.noKickers) {
          this.cards.length = 4;
        }

        this.descr = this.name;
      }

      return this.cards.length >= 4;
    }
  }

  class ThreeOfAKindTwoPair extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Three of a Kind with Two Pair", game, canDisqualify, id);
    }

    solve() {
      var cards;
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 3) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          break;
        }
      }

      if (this.cards.length === 3) {
        for (var i = 0; i < this.values.length; i++) {
          var cards = this.values[i];
          if (cards && this.cards[0].wildValue === cards[0].wildValue) {
            continue;
          }
          if (this.cards.length > 5 && this.getNumCardsByRank(i) === 2) {
            this.cards = this.cards.concat(cards || []);
            for (var j = 0; j < this.wilds.length; j++) {
              var wild = this.wilds[j];
              if (wild.rank !== -1) {
                continue;
              }
              if (cards) {
                wild.rank = cards[0].rank;
              } else if (
                this.cards[0].rank === values.length - 1 &&
                this.game.wildStatus === 1
              ) {
                wild.rank = values.length - 2;
              } else {
                wild.rank = values.length - 1;
              }
              wild.wildValue = values[wild.rank];
              this.cards.push(wild);
            }
            this.cards = this.cards.concat(
              this.nextHighest().slice(0, this.game.cardsInHand - 4)
            );
            break;
          } else if (this.getNumCardsByRank(i) === 2) {
            this.cards = this.cards.concat(cards);
            for (var j = 0; j < this.wilds.length; j++) {
              var wild = this.wilds[j];
              if (wild.rank !== -1) {
                continue;
              }
              if (cards) {
                wild.rank = cards[0].rank;
              } else if (
                this.cards[0].rank === values.length - 1 &&
                this.game.wildStatus === 1
              ) {
                wild.rank = values.length - 2;
              } else {
                wild.rank = values.length - 1;
              }
              wild.wildValue = values[wild.rank];
              this.cards.push(wild);
            }
          }
        }
      }

      if (this.cards.length >= 7) {
        var type =
          this.cards[0].toString().slice(0, -1) +
          "'s over " +
          this.cards[3].toString().slice(0, -1) +
          "'s & " +
          this.cards[5].value +
          "'s";
        this.descr = this.name + ", " + type;
      }

      return this.cards.length >= 7;
    }
  }

  class FullHouse extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Full House", game, canDisqualify, id);
    }

    solve() {
      var cards;
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 3) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          break;
        }
      }

      if (this.cards.length === 3) {
        for (i = 0; i < this.values.length; i++) {
          cards = this.values[i];
          if (cards && this.cards[0].wildValue === cards[0].wildValue) {
            continue;
          }
          if (this.getNumCardsByRank(i) >= 2) {
            this.cards = this.cards.concat(cards || []);
            for (var j = 0; j < this.wilds.length; j++) {
              var wild = this.wilds[j];
              if (wild.rank !== -1) {
                continue;
              }
              if (cards) {
                wild.rank = cards[0].rank;
              } else if (
                this.cards[0].rank === values.length - 1 &&
                this.game.wildStatus === 1
              ) {
                wild.rank = values.length - 2;
              } else {
                wild.rank = values.length - 1;
              }
              wild.wildValue = values[wild.rank];
              this.cards.push(wild);
            }
            this.cards = this.cards.concat(
              this.nextHighest().slice(0, this.game.cardsInHand - 5)
            );
            break;
          }
        }
      }

      if (this.cards.length >= 5) {
        var type =
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
      this.resetWildCards();

      for (var suit in this.suits) {
        var cards = this.getCardsForFlush(suit, true);
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
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
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
      this.resetWildCards();

      for (var suit in this.suits) {
        var cards = this.getCardsForFlush(suit, true);
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
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
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
      this.resetWildCards();

      if (!this.doesHandContainPair()) return false;

      for (var suit in this.suits) {
        var cards = this.getCardsForFlush(suit, true);
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
            this.nextHighest().slice(
              0,
              this.game.cardsInHand - this.cards.length
            )
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
      var card, checkCards;
      this.resetWildCards();

      // There are still some games that count the wheel as second highest.
      // These games do not have enough cards/wilds to make AKQJT and 5432A both possible.
      if (this.game.wheelStatus === 1) {
        this.cards = this.getWheel();
        if (this.cards.length) {
          var wildCount = 0;
          for (var i = 0; i < this.cards.length; i++) {
            card = this.cards[i];
            if (card.value === this.game.wildValue) {
              wildCount += 1;
            }
            if (card.rank === 0) {
              card.rank = values.indexOf("A");
              card.wildValue = "A";
              if (card.value === "1") {
                card.value = "A";
              }
            }
          }
          this.cards = this.cards.sort(Card.sort);
          for (
            ;
            wildCount < this.wilds.length &&
            this.cards.length < this.game.cardsInHand;
            wildCount++
          ) {
            card = this.wilds[wildCount];
            card.rank = values.indexOf("A");
            card.wildValue = "A";
            this.cards.push(card);
          }
          this.descr = this.name + ", Wheel";
          this.sfLength = this.sfQualify;
          if (this.cards[0].value === "A") {
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
          return true;
        }
        this.resetWildCards();
      }

      this.cards = this.getGaps();

      // Now add the wild cards, if any, and set the appropriate ranks
      for (var i = 0; i < this.wilds.length; i++) {
        card = this.wilds[i];
        checkCards = this.getGaps(this.cards.length);
        if (this.cards.length === checkCards.length) {
          // This is an "open-ended" straight, the high rank is the highest possible rank.
          if (this.cards[0].rank < values.length - 1) {
            card.rank = this.cards[0].rank + 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          } else {
            card.rank = this.cards[this.cards.length - 1].rank - 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          }
        } else {
          // This is an "inside" straight, the high card doesn't change.
          for (var j = 1; j < this.cards.length; j++) {
            if (this.cards[j - 1].rank - this.cards[j].rank > 1) {
              card.rank = this.cards[j - 1].rank - 1;
              card.wildValue = values[card.rank];
              this.cards.push(card);
              break;
            }
          }
        }
        this.cards = this.cards.sort(Card.sort);
      }
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

    /**
     * Get the number of gaps in the straight.
     * @return {Array} Highest potential straight with fewest number of gaps.
     */
    getGaps(checkHandLength) {
      var wildCards,
        cardsToCheck,
        i,
        card,
        gapCards,
        cardsList,
        gapCount,
        prevCard,
        diff;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      if (checkHandLength) {
        i = cardsToCheck[0].rank + 1;
      } else {
        checkHandLength = this.game.sfQualify;
        i = values.length;
      }

      gapCards = [];
      for (; i > 0; i--) {
        cardsList = [];
        gapCount = 0;
        for (var j = 0; j < cardsToCheck.length; j++) {
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
        if (this.game.sfQualify - gapCards.length <= wildCards.length) {
          break;
        }
      }

      return gapCards;
    }

    getWheel() {
      var wildCards, cardsToCheck, i, card, wheelCards, wildCount, cardFound;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      wheelCards = [];
      wildCount = 0;
      for (i = this.game.sfQualify - 1; i >= 0; i--) {
        cardFound = false;
        for (var j = 0; j < cardsToCheck.length; j++) {
          card = cardsToCheck[j];
          if (card.rank > i) {
            continue;
          }
          if (card.rank < i) {
            break;
          }
          wheelCards.push(card);
          cardFound = true;
          break;
        }
        if (!cardFound) {
          if (wildCount < wildCards.length) {
            wildCards[wildCount].rank = i;
            wildCards[wildCount].wildValue = values[i];
            wheelCards.push(wildCards[wildCount]);
            wildCount += 1;
          } else {
            return [];
          }
        }
      }

      return wheelCards;
    }
  }

  class StraightDrawNoPair extends Hand {
    constructor(cards, game, canDisqualify) {
      super(cards, "Straight Draw No Pair", game, canDisqualify);
    }

    solve() {
      var card, checkCards;
      this.resetWildCards();

      // There are still some games that count the wheel as second highest.
      // These games do not have enough cards/wilds to make AKQJT and 5432A both possible.
      if (this.game.wheelStatus === 1) {
        this.cards = this.getWheel();
        if (this.cards.length) {
          var wildCount = 0;
          for (var i = 0; i < this.cards.length; i++) {
            card = this.cards[i];
            if (card.value === this.game.wildValue) {
              wildCount += 1;
            }
            if (card.rank === 0) {
              card.rank = values.indexOf("A");
              card.wildValue = "A";
              if (card.value === "1") {
                card.value = "A";
              }
            }
          }
          this.cards = this.cards.sort(Card.sort);
          for (
            ;
            wildCount < this.wilds.length &&
            this.cards.length < this.game.cardsInHand;
            wildCount++
          ) {
            card = this.wilds[wildCount];
            card.rank = values.indexOf("A");
            card.wildValue = "A";
            this.cards.push(card);
          }
          this.descr = this.name + ", Wheel";
          this.sfLength = this.sfQualify;
          if (this.cards[0].value === "A") {
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
          return true;
        }
        this.resetWildCards();
      }

      this.cards = this.getGaps();

      // Now add the wild cards, if any, and set the appropriate ranks
      for (var i = 0; i < this.wilds.length; i++) {
        card = this.wilds[i];
        checkCards = this.getGaps(this.cards.length);
        if (this.cards.length === checkCards.length) {
          // This is an "open-ended" straight, the high rank is the highest possible rank.
          if (this.cards[0].rank < values.length - 1) {
            card.rank = this.cards[0].rank + 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          } else {
            card.rank = this.cards[this.cards.length - 1].rank - 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          }
        } else {
          // This is an "inside" straight, the high card doesn't change.
          for (var j = 1; j < this.cards.length; j++) {
            if (this.cards[j - 1].rank - this.cards[j].rank > 1) {
              card.rank = this.cards[j - 1].rank - 1;
              card.wildValue = values[card.rank];
              this.cards.push(card);
              break;
            }
          }
        }
        this.cards = this.cards.sort(Card.sort);
      }
      if (this.cards.length >= this.game.drawQualify) {
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

    /**
     * Get the number of gaps in the straight.
     * @return {Array} Highest potential straight with fewest number of gaps.
     */
    getGaps(checkHandLength) {
      var wildCards,
        cardsToCheck,
        i,
        card,
        gapCards,
        cardsList,
        gapCount,
        prevCard,
        diff;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      if (checkHandLength) {
        i = cardsToCheck[0].rank + 1;
      } else {
        checkHandLength = this.game.sfQualify;
        i = values.length;
      }

      gapCards = [];
      for (; i > 0; i--) {
        cardsList = [];
        gapCount = 0;
        for (var j = 0; j < cardsToCheck.length; j++) {
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
        if (this.game.sfQualify - gapCards.length <= wildCards.length) {
          break;
        }
      }

      return gapCards;
    }

    getWheel() {
      var wildCards, cardsToCheck, i, card, wheelCards, wildCount, cardFound;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      wheelCards = [];
      wildCount = 0;
      for (i = this.game.sfQualify - 1; i >= 0; i--) {
        cardFound = false;
        for (var j = 0; j < cardsToCheck.length; j++) {
          card = cardsToCheck[j];
          if (card.rank > i) {
            continue;
          }
          if (card.rank < i) {
            break;
          }
          wheelCards.push(card);
          cardFound = true;
          break;
        }
        if (!cardFound) {
          if (wildCount < wildCards.length) {
            wildCards[wildCount].rank = i;
            wildCards[wildCount].wildValue = values[i];
            wheelCards.push(wildCards[wildCount]);
            wildCount += 1;
          } else {
            return [];
          }
        }
      }

      return wheelCards;
    }
  }

  class StraightDrawWithPair extends Hand {
    constructor(cards, game, canDisqualify) {
      super(cards, "Straight Draw With Pair", game, canDisqualify);
    }

    solve() {
      var card, checkCards;
      this.resetWildCards();

      // There are still some games that count the wheel as second highest.
      // These games do not have enough cards/wilds to make AKQJT and 5432A both possible.
      if (this.game.wheelStatus === 1) {
        this.cards = this.getWheel();
        if (this.cards.length) {
          var wildCount = 0;
          for (var i = 0; i < this.cards.length; i++) {
            card = this.cards[i];
            if (card.value === this.game.wildValue) {
              wildCount += 1;
            }
            if (card.rank === 0) {
              card.rank = values.indexOf("A");
              card.wildValue = "A";
              if (card.value === "1") {
                card.value = "A";
              }
            }
          }
          this.cards = this.cards.sort(Card.sort);
          for (
            ;
            wildCount < this.wilds.length &&
            this.cards.length < this.game.cardsInHand;
            wildCount++
          ) {
            card = this.wilds[wildCount];
            card.rank = values.indexOf("A");
            card.wildValue = "A";
            this.cards.push(card);
          }
          this.descr = this.name + ", Wheel";
          this.sfLength = this.sfQualify;
          if (this.cards[0].value === "A") {
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
          return true;
        }
        this.resetWildCards();
      }

      if (!this.doesHandContainPair()) return false;

      this.cards = this.getGaps();

      // Now add the wild cards, if any, and set the appropriate ranks
      for (var i = 0; i < this.wilds.length; i++) {
        card = this.wilds[i];
        checkCards = this.getGaps(this.cards.length);
        if (this.cards.length === checkCards.length) {
          // This is an "open-ended" straight, the high rank is the highest possible rank.
          if (this.cards[0].rank < values.length - 1) {
            card.rank = this.cards[0].rank + 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          } else {
            card.rank = this.cards[this.cards.length - 1].rank - 1;
            card.wildValue = values[card.rank];
            this.cards.push(card);
          }
        } else {
          // This is an "inside" straight, the high card doesn't change.
          for (var j = 1; j < this.cards.length; j++) {
            if (this.cards[j - 1].rank - this.cards[j].rank > 1) {
              card.rank = this.cards[j - 1].rank - 1;
              card.wildValue = values[card.rank];
              this.cards.push(card);
              break;
            }
          }
        }
        this.cards = this.cards.sort(Card.sort);
      }
      if (this.cards.length >= this.game.drawQualify) {
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

    /**
     * Get the number of gaps in the straight.
     * @return {Array} Highest potential straight with fewest number of gaps.
     */
    getGaps(checkHandLength) {
      var wildCards,
        cardsToCheck,
        i,
        card,
        gapCards,
        cardsList,
        gapCount,
        prevCard,
        diff;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      if (checkHandLength) {
        i = cardsToCheck[0].rank + 1;
      } else {
        checkHandLength = this.game.sfQualify;
        i = values.length;
      }

      gapCards = [];
      for (; i > 0; i--) {
        cardsList = [];
        gapCount = 0;
        for (var j = 0; j < cardsToCheck.length; j++) {
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
        if (this.game.sfQualify - gapCards.length <= wildCards.length) {
          break;
        }
      }

      return gapCards;
    }

    getWheel() {
      var wildCards, cardsToCheck, i, card, wheelCards, wildCount, cardFound;

      var stripReturn = Hand.stripWilds(this.cardPool, this.game);
      wildCards = stripReturn[0];
      cardsToCheck = stripReturn[1];

      for (i = 0; i < cardsToCheck.length; i++) {
        card = cardsToCheck[i];
        if (card.wildValue === "A") {
          cardsToCheck.push(new Card("1" + card.suit));
        }
      }
      cardsToCheck = cardsToCheck.sort(Card.sort);

      wheelCards = [];
      wildCount = 0;
      for (i = this.game.sfQualify - 1; i >= 0; i--) {
        cardFound = false;
        for (var j = 0; j < cardsToCheck.length; j++) {
          card = cardsToCheck[j];
          if (card.rank > i) {
            continue;
          }
          if (card.rank < i) {
            break;
          }
          wheelCards.push(card);
          cardFound = true;
          break;
        }
        if (!cardFound) {
          if (wildCount < wildCards.length) {
            wildCards[wildCount].rank = i;
            wildCards[wildCount].wildValue = values[i];
            wheelCards.push(wildCards[wildCount]);
            wildCount += 1;
          } else {
            return [];
          }
        }
      }

      return wheelCards;
    }
  }

  class TwoThreeOfAKind extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Two Three Of a Kind", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();
      for (var i = 0; i < this.values.length; i++) {
        var cards = this.values[i];
        if (this.cards.length > 0 && this.getNumCardsByRank(i) === 3) {
          this.cards = this.cards.concat(cards || []);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          this.cards = this.cards.concat(
            this.nextHighest().slice(0, this.game.cardsInHand - 6)
          );
          break;
        } else if (this.getNumCardsByRank(i) === 3) {
          this.cards = this.cards.concat(cards);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
        }
      }

      if (this.cards.length >= 6) {
        var type =
          this.cards[0].toString().slice(0, -1) +
          "'s & " +
          this.cards[3].toString().slice(0, -1) +
          "'s";
        this.descr = this.name + ", " + type;
      }

      return this.cards.length >= 6;
    }
  }

  class ThreeOfAKind extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Three of a Kind", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 3) {
          this.cards = this.values[i] || [];
          for (var j = 0; j < this.wilds.length && this.cards.length < 3; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
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

  class ThreePair extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Three Pair", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        var cards = this.values[i];
        if (this.cards.length > 2 && this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(cards || []);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          this.cards = this.cards.concat(
            this.nextHighest().slice(0, this.game.cardsInHand - 6)
          );
          break;
        } else if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(cards || []);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
        } else if (this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(cards);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
        }
      }

      if (this.cards.length >= 6) {
        var type =
          this.cards[0].toString().slice(0, -1) +
          "'s & " +
          this.cards[2].toString().slice(0, -1) +
          "'s & " +
          this.cards[4].toString().slice(0, -1) +
          "'s";
        this.descr = this.name + ", " + type;
      }

      return this.cards.length >= 6;
    }
  }

  class TwoPair extends Hand {
    constructor(cards, game, canDisqualify, id) {
      super(cards, "Two Pair", game, canDisqualify, id);
    }

    solve() {
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        var cards = this.values[i];
        if (this.cards.length > 0 && this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(cards || []);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
          this.cards = this.cards.concat(
            this.nextHighest().slice(0, this.game.cardsInHand - 4)
          );
          break;
        } else if (this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(cards);
          for (var j = 0; j < this.wilds.length; j++) {
            var wild = this.wilds[j];
            if (wild.rank !== -1) {
              continue;
            }
            if (cards) {
              wild.rank = cards[0].rank;
            } else if (
              this.cards[0].rank === values.length - 1 &&
              this.game.wildStatus === 1
            ) {
              wild.rank = values.length - 2;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
        }
      }

      if (this.cards.length >= 4) {
        if (this.game.noKickers) {
          this.cards.length = 4;
        }

        var type =
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
      this.resetWildCards();

      for (var i = 0; i < this.values.length; i++) {
        if (this.getNumCardsByRank(i) === 2) {
          this.cards = this.cards.concat(this.values[i] || []);
          for (var j = 0; j < this.wilds.length && this.cards.length < 2; j++) {
            var wild = this.wilds[j];
            if (this.cards) {
              wild.rank = this.cards[0].rank;
            } else {
              wild.rank = values.length - 1;
            }
            wild.wildValue = values[wild.rank];
            this.cards.push(wild);
          }
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

      for (var i = 0; i < this.cards.length; i++) {
        var card = this.cards[i];
        if (this.cards[i].value === this.game.wildValue) {
          this.cards[i].wildValue = "A";
          this.cards[i].rank = values.indexOf("A");
        }
      }

      if (this.game.noKickers) {
        this.cards.length = 1;
      }

      this.cards = this.cards.sort(Card.sort);
      this.descr = this.cards[0].toString().slice(0, -1) + " High";

      return true;
    }
  }

  var gameRules = {
    standard: {
      cardsInHand: 5,
      handValues: [
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
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 5,
      lowestQualified: null,
      noKickers: false,
    },
    boss: {
      cardsInHand: 5,
      handValues: [
        StraightFlush,
        FourOfAKind,
        FullHouse,
        Flush,
        StraightFlushDrawWithPair,
        Straight,
        StraightFlushDrawNoPair,
        ThreeOfAKind,
        FlushDrawWithPair,
        StraightDrawWithPair,
        TwoPair,
        FlushDrawNoPair,
        StraightDrawNoPair,
        OnePair,
        HighCard,
      ],
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 5,
      drawQualify: 4,
      lowestQualified: null,
      noKickers: false,
    },
    jacksbetter: {
      cardsInHand: 5,
      handValues: [
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
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 5,
      lowestQualified: ["Jc", "Jd", "4h", "3s", "2c"],
      noKickers: true,
    },
    joker: {
      cardsInHand: 5,
      handValues: [
        NaturalRoyalFlush,
        FiveOfAKind,
        WildRoyalFlush,
        StraightFlush,
        FourOfAKind,
        FullHouse,
        Flush,
        Straight,
        ThreeOfAKind,
        TwoPair,
        HighCard,
      ],
      wildValue: "O",
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 5,
      lowestQualified: ["4c", "3d", "3h", "2s", "2c"],
      noKickers: true,
    },
    deuceswild: {
      cardsInHand: 5,
      handValues: [
        NaturalRoyalFlush,
        FourWilds,
        WildRoyalFlush,
        FiveOfAKind,
        StraightFlush,
        FourOfAKind,
        FullHouse,
        Flush,
        Straight,
        ThreeOfAKind,
        HighCard,
      ],
      wildValue: "2",
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 5,
      lowestQualified: ["5c", "4d", "3h", "3s", "3c"],
      noKickers: true,
    },
    threecard: {
      cardsInHand: 3,
      handValues: [
        StraightFlush,
        ThreeOfAKind,
        Straight,
        Flush,
        OnePair,
        HighCard,
      ],
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 3,
      lowestQualified: ["Qh", "3s", "2c"],
      noKickers: false,
    },
    fourcard: {
      cardsInHand: 4,
      handValues: [
        FourOfAKind,
        StraightFlush,
        ThreeOfAKind,
        Flush,
        Straight,
        TwoPair,
        OnePair,
        HighCard,
      ],
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 4,
      lowestQualified: null,
      noKickers: true,
    },
    fourcardbonus: {
      cardsInHand: 4,
      handValues: [
        FourOfAKind,
        StraightFlush,
        ThreeOfAKind,
        Flush,
        Straight,
        TwoPair,
        OnePair,
        HighCard,
      ],
      wildValue: null,
      wildStatus: 1,
      wheelStatus: 0,
      sfQualify: 4,
      lowestQualified: ["Ac", "Ad", "3h", "2s"],
      noKickers: true,
    },
    paigowpokerfull: {
      cardsInHand: 7,
      handValues: [
        FiveOfAKind,
        FourOfAKindPairPlus,
        StraightFlush,
        Flush,
        Straight,
        FourOfAKind,
        TwoThreeOfAKind,
        ThreeOfAKindTwoPair,
        FullHouse,
        ThreeOfAKind,
        ThreePair,
        TwoPair,
        OnePair,
        HighCard,
      ],
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 5,
      lowestQualified: null,
    },
    paigowpokeralt: {
      cardsInHand: 7,
      handValues: [
        FourOfAKind,
        FullHouse,
        ThreeOfAKind,
        ThreePair,
        TwoPair,
        OnePair,
        HighCard,
      ],
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 5,
      lowestQualified: null,
    },
    paigowpokersf6: {
      cardsInHand: 7,
      handValues: [StraightFlush, Flush, Straight],
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 6,
      lowestQualified: null,
    },
    paigowpokersf7: {
      cardsInHand: 7,
      handValues: [StraightFlush, Flush, Straight],
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 7,
      lowestQualified: null,
    },
    paigowpokerhi: {
      cardsInHand: 5,
      handValues: [
        FiveOfAKind,
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
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 5,
      lowestQualified: null,
    },
    paigowpokerlo: {
      cardsInHand: 2,
      handValues: [OnePair, HighCard],
      wildValue: "O",
      wildStatus: 0,
      wheelStatus: 1,
      sfQualify: 5,
      lowestQualified: null,
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
      this.wildValue = null;
      this.wildStatus = 0;
      this.wheelStatus = 0;
      this.sfQualify = 5;
      this.drawQualify = 4;
      this.lowestQualified = null;
      this.noKickers = null;

      // Set values based on the game rules.
      if (!this.descr || !gameRules[this.descr]) {
        this.descr = "standard";
      }
      this.cardsInHand = gameRules[this.descr]["cardsInHand"];
      this.handValues = gameRules[this.descr]["handValues"];
      this.wildValue = gameRules[this.descr]["wildValue"];
      this.wildStatus = gameRules[this.descr]["wildStatus"];
      this.wheelStatus = gameRules[this.descr]["wheelStatus"];
      this.sfQualify = gameRules[this.descr]["sfQualify"];
      this.lowestQualified = gameRules[this.descr]["lowestQualified"];
      this.noKickers = gameRules[this.descr]["noKickers"];
    }
  }

  function exportToGlobal(global) {
    global.Card = Card;
    global.Hand = Hand;
    global.Game = Game;
    global.RoyalFlush = RoyalFlush;
    global.NaturalRoyalFlush = NaturalRoyalFlush;
    global.WildRoyalFlush = WildRoyalFlush;
    global.FiveOfAKind = FiveOfAKind;
    global.StraightFlush = StraightFlush;
    global.FourOfAKindPairPlus = FourOfAKindPairPlus;
    global.FourOfAKind = FourOfAKind;
    global.FourWilds = FourWilds;
    global.TwoThreeOfAKind = TwoThreeOfAKind;
    global.ThreeOfAKindTwoPair = ThreeOfAKindTwoPair;
    global.FullHouse = FullHouse;
    global.Flush = Flush;
    global.Straight = Straight;
    global.ThreeOfAKind = ThreeOfAKind;
    global.ThreePair = ThreePair;
    global.TwoPair = TwoPair;
    global.FlushDrawNoPair = FlushDrawNoPair;
    global.StraightFlushDrawNoPair = StraightFlushDrawNoPair;
    global.StraightFlushDrawWithPair = StraightFlushDrawWithPair;
    global.FlushDrawWithPair = FlushDrawWithPair;
    global.StraightDrawNoPair = StraightDrawNoPair;
    global.StraightDrawWithPair = StraightDrawWithPair;
    global.OnePair = OnePair;
    global.HighCard = HighCard;
  }

  // Export the classes for node.js use.
  if (typeof exports !== "undefined") {
    exportToGlobal(exports);
  }

  // Add the classes to the window for browser use.
  if (typeof window !== "undefined") {
    exportToGlobal(window);
  }
})();
