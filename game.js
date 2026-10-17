/**
 * ほしあめ夜市 — ひとり用ローグライク・ポーカー風カードゲーム
 * 純粋関数は Node からも読める。DOM 処理は document があるときだけ。
 */

// ---------------------------------------------------------------------------
// 定数・データ
// ---------------------------------------------------------------------------

var SUITS = [
  { id: 'ame', name: '飴', emoji: '🍬', color: '#e85d4c' },
  { id: 'hoshi', name: '星', emoji: '⭐', color: '#d4a017' },
  { id: 'suzu', name: '鈴', emoji: '🔔', color: '#2a9d8f' },
  { id: 'tsuki', name: '月', emoji: '🌙', color: '#4a6fa5' }
];

var RANK_LABELS = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
  11: 'J', 12: 'Q', 13: 'K', 14: 'A'
};

var HAND_DEFS = {
  high_card: { id: 'high_card', name: 'ハイカード', chips: 5, mult: 1 },
  pair: { id: 'pair', name: 'ワンペア', chips: 10, mult: 2 },
  two_pair: { id: 'two_pair', name: 'ツーペア', chips: 20, mult: 2 },
  three: { id: 'three', name: 'スリーカード', chips: 30, mult: 3 },
  straight: { id: 'straight', name: 'ストレート', chips: 30, mult: 4 },
  flush: { id: 'flush', name: 'フラッシュ', chips: 35, mult: 4 },
  full_house: { id: 'full_house', name: 'フルハウス', chips: 40, mult: 4 },
  four: { id: 'four', name: 'フォーカード', chips: 60, mult: 7 },
  straight_flush: { id: 'straight_flush', name: 'ストレートフラッシュ', chips: 100, mult: 8 }
};

var HAND_ORDER = [
  'straight_flush', 'four', 'full_house', 'flush', 'straight',
  'three', 'two_pair', 'pair', 'high_card'
];

/** おまもり定義（10種） */
var OMAMORI_DEFS = [
  {
    id: 'hoshikuzu',
    name: '星くずのおまもり',
    desc: '役を出すたび倍率 +4',
    price: 5,
    effect: { type: 'add_mult', value: 4 }
  },
  {
    id: 'amedama',
    name: '飴玉のおまもり',
    desc: '役を出すたびチップ +30',
    price: 4,
    effect: { type: 'add_chips', value: 30 }
  },
  {
    id: 'ame_bell',
    name: 'ほしあめの鈴',
    desc: '得点カードの飴1枚につきチップ +15',
    price: 6,
    effect: { type: 'suit_chips', suit: 'ame', value: 15 }
  },
  {
    id: 'tsukiakari',
    name: '月あかりのおまもり',
    desc: '得点カードの月1枚につきチップ +15',
    price: 6,
    effect: { type: 'suit_chips', suit: 'tsuki', value: 15 }
  },
  {
    id: 'pair_musubi',
    name: 'ペア結び',
    desc: 'ワンペア・ツーペアのとき倍率 ×2',
    price: 7,
    effect: { type: 'hand_mult_mul', hands: ['pair', 'two_pair'], value: 2 }
  },
  {
    id: 'straight_toro',
    name: 'ストレート灯籠',
    desc: 'ストレート系のときチップ +40',
    price: 6,
    effect: { type: 'hand_chips', hands: ['straight', 'straight_flush'], value: 40 }
  },
  {
    id: 'flush_chochin',
    name: 'フラッシュ提灯',
    desc: 'フラッシュ系のとき倍率 +4',
    price: 7,
    effect: { type: 'hand_mult', hands: ['flush', 'straight_flush'], value: 4 }
  },
  {
    id: 'manten_hoshi',
    name: '満天ほし',
    desc: 'フルハウスのとき倍率 ×2',
    price: 8,
    effect: { type: 'hand_mult_mul', hands: ['full_house'], value: 2 }
  },
  {
    id: 'yotsu_hoshi',
    name: '四つ星おまもり',
    desc: 'フォーカードのときチップ +50・倍率 +5',
    price: 9,
    effect: { type: 'four_bonus', chips: 50, mult: 5 }
  },
  {
    id: 'high_inori',
    name: 'ハイカードの祈り',
    desc: 'ハイカードのときチップ +20・倍率 +2',
    price: 3,
    effect: { type: 'hand_chips_mult', hands: ['high_card'], chips: 20, mult: 2 }
  }
];

var MAX_OMAMORI = 5;
var HAND_SIZE = 8;
var MAX_SELECT = 5;
var START_PLAYS = 4;
var START_DISCARDS = 3;
var START_MONEY = 4;
var REROLL_COST = 2;
var MAX_ANTE = 8;

// ---------------------------------------------------------------------------
// デッキ・カード
// ---------------------------------------------------------------------------

function createDeck() {
  var deck = [];
  var id = 0;
  for (var s = 0; s < SUITS.length; s++) {
    for (var r = 2; r <= 14; r++) {
      deck.push({
        id: 'c' + (id++),
        suit: SUITS[s].id,
        rank: r
      });
    }
  }
  return deck;
}

function shuffleDeck(deck, rng) {
  var a = deck.slice();
  var random = rng || Math.random;
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(random() * (i + 1));
    var t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

function suitInfo(suitId) {
  for (var i = 0; i < SUITS.length; i++) {
    if (SUITS[i].id === suitId) return SUITS[i];
  }
  return SUITS[0];
}

function cardLabel(card) {
  var s = suitInfo(card.suit);
  return s.emoji + RANK_LABELS[card.rank];
}

// ---------------------------------------------------------------------------
// 役判定（純粋関数）
// ---------------------------------------------------------------------------

function isFlush(cards) {
  if (cards.length < 5) return false;
  var suit = cards[0].suit;
  for (var i = 1; i < cards.length; i++) {
    if (cards[i].suit !== suit) return false;
  }
  return true;
}

function uniqueSortedRanks(cards) {
  var ranks = [];
  for (var i = 0; i < cards.length; i++) {
    if (ranks.indexOf(cards[i].rank) === -1) ranks.push(cards[i].rank);
  }
  ranks.sort(function (a, b) { return a - b; });
  return ranks;
}

function isStraightRanks(ranks) {
  if (ranks.length < 5) return false;
  // 通常の連続
  var consecutive = true;
  for (var i = 1; i < ranks.length; i++) {
    if (ranks[i] !== ranks[i - 1] + 1) {
      consecutive = false;
      break;
    }
  }
  if (consecutive && ranks.length === 5) return true;

  // A-2-3-4-5（ホイール）: ranks に 14,2,3,4,5
  if (ranks.length === 5 &&
      ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 4 &&
      ranks[3] === 5 && ranks[4] === 14) {
    return true;
  }
  return false;
}

function isStraight(cards) {
  if (cards.length !== 5) return false;
  return isStraightRanks(uniqueSortedRanks(cards));
}

function rankCounts(cards) {
  var map = {};
  for (var i = 0; i < cards.length; i++) {
    var r = cards[i].rank;
    map[r] = (map[r] || 0) + 1;
  }
  return map;
}

function cardsOfRank(cards, rank) {
  var out = [];
  for (var i = 0; i < cards.length; i++) {
    if (cards[i].rank === rank) out.push(cards[i]);
  }
  return out;
}

function highestCard(cards) {
  var best = cards[0];
  for (var i = 1; i < cards.length; i++) {
    if (cards[i].rank > best.rank) best = cards[i];
  }
  return best;
}

/**
 * 選んだカード（1〜5枚）から役を判定する。
 * @returns {{ type: string, name: string, chips: number, mult: number, scoringCards: Array }}
 */
function evaluateHand(cards) {
  if (!cards || cards.length === 0) {
    return {
      type: 'high_card',
      name: HAND_DEFS.high_card.name,
      chips: HAND_DEFS.high_card.chips,
      mult: HAND_DEFS.high_card.mult,
      scoringCards: []
    };
  }

  var flush = isFlush(cards);
  var straight = isStraight(cards);
  var counts = rankCounts(cards);
  var ranksByCount = Object.keys(counts).map(Number);
  ranksByCount.sort(function (a, b) {
    if (counts[b] !== counts[a]) return counts[b] - counts[a];
    return b - a;
  });

  var fours = [];
  var threes = [];
  var pairs = [];
  for (var i = 0; i < ranksByCount.length; i++) {
    var rk = ranksByCount[i];
    if (counts[rk] === 4) fours.push(rk);
    else if (counts[rk] === 3) threes.push(rk);
    else if (counts[rk] === 2) pairs.push(rk);
  }

  var type;
  var scoringCards;

  if (straight && flush) {
    type = 'straight_flush';
    scoringCards = cards.slice();
  } else if (fours.length >= 1) {
    type = 'four';
    scoringCards = cardsOfRank(cards, fours[0]);
  } else if (threes.length >= 1 && pairs.length >= 1) {
    type = 'full_house';
    scoringCards = cardsOfRank(cards, threes[0]).concat(cardsOfRank(cards, pairs[0]));
  } else if (flush) {
    type = 'flush';
    scoringCards = cards.slice();
  } else if (straight) {
    type = 'straight';
    scoringCards = cards.slice();
  } else if (threes.length >= 1) {
    type = 'three';
    scoringCards = cardsOfRank(cards, threes[0]);
  } else if (pairs.length >= 2) {
    type = 'two_pair';
    pairs.sort(function (a, b) { return b - a; });
    scoringCards = cardsOfRank(cards, pairs[0]).concat(cardsOfRank(cards, pairs[1]));
  } else if (pairs.length === 1) {
    type = 'pair';
    scoringCards = cardsOfRank(cards, pairs[0]);
  } else {
    type = 'high_card';
    scoringCards = [highestCard(cards)];
  }

  var def = HAND_DEFS[type];
  return {
    type: type,
    name: def.name,
    chips: def.chips,
    mult: def.mult,
    scoringCards: scoringCards
  };
}

// ---------------------------------------------------------------------------
// おまもり適用・得点計算（純粋関数）
// ---------------------------------------------------------------------------

function sumRankValues(cards) {
  var sum = 0;
  for (var i = 0; i < cards.length; i++) sum += cards[i].rank;
  return sum;
}

/**
 * おまもり効果をチップ・倍率に適用する。
 * @returns {{ chips: number, mult: number, breakdown: Array }}
 */
function applyOmamori(baseChips, baseMult, handType, scoringCards, omamoriList) {
  var chips = baseChips;
  var mult = baseMult;
  var breakdown = [];
  var list = omamoriList || [];

  for (var i = 0; i < list.length; i++) {
    var o = list[i];
    var def = typeof o === 'string' ? getOmamoriDef(o) : (o.effect ? o : getOmamoriDef(o.id));
    if (!def) continue;
    var e = def.effect;
    var applied = false;

    if (e.type === 'add_mult') {
      mult += e.value;
      applied = true;
      breakdown.push({ name: def.name, detail: '倍率 +' + e.value });
    } else if (e.type === 'add_chips') {
      chips += e.value;
      applied = true;
      breakdown.push({ name: def.name, detail: 'チップ +' + e.value });
    } else if (e.type === 'suit_chips') {
      var n = 0;
      for (var c = 0; c < scoringCards.length; c++) {
        if (scoringCards[c].suit === e.suit) n++;
      }
      if (n > 0) {
        var add = n * e.value;
        chips += add;
        applied = true;
        breakdown.push({ name: def.name, detail: 'チップ +' + add + '（' + n + '枚）' });
      }
    } else if (e.type === 'hand_mult_mul') {
      if (e.hands.indexOf(handType) !== -1) {
        mult *= e.value;
        applied = true;
        breakdown.push({ name: def.name, detail: '倍率 ×' + e.value });
      }
    } else if (e.type === 'hand_chips') {
      if (e.hands.indexOf(handType) !== -1) {
        chips += e.value;
        applied = true;
        breakdown.push({ name: def.name, detail: 'チップ +' + e.value });
      }
    } else if (e.type === 'hand_mult') {
      if (e.hands.indexOf(handType) !== -1) {
        mult += e.value;
        applied = true;
        breakdown.push({ name: def.name, detail: '倍率 +' + e.value });
      }
    } else if (e.type === 'four_bonus') {
      if (handType === 'four') {
        chips += e.chips;
        mult += e.mult;
        applied = true;
        breakdown.push({ name: def.name, detail: 'チップ +' + e.chips + '・倍率 +' + e.mult });
      }
    } else if (e.type === 'hand_chips_mult') {
      if (e.hands.indexOf(handType) !== -1) {
        chips += e.chips;
        mult += e.mult;
        applied = true;
        breakdown.push({ name: def.name, detail: 'チップ +' + e.chips + '・倍率 +' + e.mult });
      }
    }

    if (!applied) { /* skip */ }
  }

  return { chips: chips, mult: mult, breakdown: breakdown };
}

function getOmamoriDef(id) {
  for (var i = 0; i < OMAMORI_DEFS.length; i++) {
    if (OMAMORI_DEFS[i].id === id) return OMAMORI_DEFS[i];
  }
  return null;
}

/**
 * 得点＝(役の基本チップ＋役を構成するカードのランク値)×倍率（おまもり適用後）
 * @returns {{ score: number, chips: number, mult: number, hand: object, omamoriBreakdown: Array, rankSum: number }}
 */
function calculateScore(cards, omamoriList) {
  var hand = evaluateHand(cards);
  var rankSum = sumRankValues(hand.scoringCards);
  var baseChips = hand.chips + rankSum;
  var applied = applyOmamori(baseChips, hand.mult, hand.type, hand.scoringCards, omamoriList);
  return {
    score: applied.chips * applied.mult,
    chips: applied.chips,
    mult: applied.mult,
    hand: hand,
    omamoriBreakdown: applied.breakdown,
    rankSum: rankSum
  };
}

// ---------------------------------------------------------------------------
// 目標スコア・報酬（純粋関数）
// ---------------------------------------------------------------------------

/**
 * @param {number} ante 1〜8
 * @param {string} roundType 'small' | 'big' | 'boss'
 */
function getTargetScore(ante, roundType) {
  var a = Math.max(1, Math.min(MAX_ANTE, ante | 0));
  var base;
  if (roundType === 'small') base = 100;
  else if (roundType === 'big') base = 200;
  else base = 300; // boss

  // アンテが上がるほど急上昇
  var scale = Math.pow(1.55, a - 1);
  return Math.floor(base * scale);
}

function getRoundReward(ante, roundType, playsLeft, money) {
  var base;
  if (roundType === 'small') base = 3;
  else if (roundType === 'big') base = 4;
  else base = 5;
  base += Math.floor((ante - 1) / 2);

  var playBonus = playsLeft;
  var interest = Math.min(5, Math.floor(money / 5));
  return {
    total: base + playBonus + interest,
    base: base,
    playBonus: playBonus,
    interest: interest
  };
}

function roundTypeName(roundType) {
  if (roundType === 'small') return '小ラウンド';
  if (roundType === 'big') return '大ラウンド';
  return 'ボスラウンド';
}

function nextRound(ante, roundType) {
  if (roundType === 'small') return { ante: ante, roundType: 'big' };
  if (roundType === 'big') return { ante: ante, roundType: 'boss' };
  if (ante >= MAX_ANTE) return { ante: ante, roundType: 'boss', won: true };
  return { ante: ante + 1, roundType: 'small' };
}

function pickShopOffers(ownedIds, rng) {
  var random = rng || Math.random;
  var pool = [];
  for (var i = 0; i < OMAMORI_DEFS.length; i++) {
    var id = OMAMORI_DEFS[i].id;
    var count = 0;
    for (var j = 0; j < ownedIds.length; j++) {
      if (ownedIds[j] === id) count++;
    }
    // 同じおまもりは所持1つまで（ショップに重複出品しない）
    if (count === 0) pool.push(OMAMORI_DEFS[i]);
  }
  var offers = [];
  var copy = pool.slice();
  while (offers.length < 3 && copy.length > 0) {
    var idx = Math.floor(random() * copy.length);
    offers.push(copy[idx]);
    copy.splice(idx, 1);
  }
  return offers;
}

function sellPrice(omamoriId) {
  var def = getOmamoriDef(omamoriId);
  if (!def) return 1;
  return Math.max(1, Math.floor(def.price / 2));
}

// ---------------------------------------------------------------------------
// Node 用エクスポート
// ---------------------------------------------------------------------------

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SUITS: SUITS,
    RANK_LABELS: RANK_LABELS,
    HAND_DEFS: HAND_DEFS,
    OMAMORI_DEFS: OMAMORI_DEFS,
    MAX_OMAMORI: MAX_OMAMORI,
    MAX_ANTE: MAX_ANTE,
    createDeck: createDeck,
    shuffleDeck: shuffleDeck,
    evaluateHand: evaluateHand,
    calculateScore: calculateScore,
    applyOmamori: applyOmamori,
    getTargetScore: getTargetScore,
    getRoundReward: getRoundReward,
    getOmamoriDef: getOmamoriDef,
    nextRound: nextRound,
    pickShopOffers: pickShopOffers,
    sellPrice: sellPrice,
    sumRankValues: sumRankValues,
    isFlush: isFlush,
    isStraight: isStraight
  };
}

// ---------------------------------------------------------------------------
// UI / ゲーム状態（ブラウザのみ）
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  (function () {
    var state = null;

    function freshState() {
      return {
        phase: 'play', // play | shop | won | lost
        ante: 1,
        roundType: 'small',
        money: START_MONEY,
        score: 0,
        target: getTargetScore(1, 'small'),
        playsLeft: START_PLAYS,
        discardsLeft: START_DISCARDS,
        deck: [],
        hand: [],
        selected: {},
        omamori: [],
        shopOffers: [],
        lastScore: null,
        message: '',
        rewardPreview: null
      };
    }

    function startRound() {
      state.score = 0;
      state.target = getTargetScore(state.ante, state.roundType);
      state.playsLeft = START_PLAYS;
      state.discardsLeft = START_DISCARDS;
      state.deck = shuffleDeck(createDeck());
      state.hand = [];
      state.selected = {};
      state.lastScore = null;
      state.message = '';
      state.phase = 'play';
      drawToHand();
    }

    function drawToHand() {
      while (state.hand.length < HAND_SIZE && state.deck.length > 0) {
        state.hand.push(state.deck.pop());
      }
    }

    function selectedCards() {
      var out = [];
      for (var i = 0; i < state.hand.length; i++) {
        if (state.selected[state.hand[i].id]) out.push(state.hand[i]);
      }
      return out;
    }

    function removeSelectedFromHand() {
      var kept = [];
      for (var i = 0; i < state.hand.length; i++) {
        if (!state.selected[state.hand[i].id]) kept.push(state.hand[i]);
      }
      state.hand = kept;
      state.selected = {};
    }

    function toggleSelect(cardId) {
      if (state.phase !== 'play') return;
      if (state.selected[cardId]) {
        delete state.selected[cardId];
      } else {
        var n = Object.keys(state.selected).length;
        if (n >= MAX_SELECT) {
          state.message = '選べるのは最大' + MAX_SELECT + '枚です';
          render();
          return;
        }
        state.selected[cardId] = true;
      }
      state.message = '';
      render();
    }

    function playHand() {
      if (state.phase !== 'play' || state.playsLeft <= 0) return;
      var cards = selectedCards();
      if (cards.length === 0) {
        state.message = 'カードを選んでください';
        render();
        return;
      }
      if (cards.length > MAX_SELECT) return;

      var result = calculateScore(cards, state.omamori);
      state.score += result.score;
      state.playsLeft -= 1;
      state.lastScore = result;
      removeSelectedFromHand();
      drawToHand();

      if (state.score >= state.target) {
        onRoundClear();
      } else if (state.playsLeft <= 0) {
        state.phase = 'lost';
        state.message = '目標に届きませんでした…ゲームオーバー';
      } else {
        state.message = result.hand.name + 'で ' + result.score + ' 点！';
      }
      render();
    }

    function discardHand() {
      if (state.phase !== 'play' || state.discardsLeft <= 0) return;
      var cards = selectedCards();
      if (cards.length === 0) {
        state.message = '捨てるカードを選んでください';
        render();
        return;
      }
      state.discardsLeft -= 1;
      removeSelectedFromHand();
      drawToHand();
      state.lastScore = null;
      state.message = 'カードを捨てました（残り捨て回数 ' + state.discardsLeft + '）';
      render();
    }

    function onRoundClear() {
      var reward = getRoundReward(state.ante, state.roundType, state.playsLeft, state.money);
      state.money += reward.total;
      state.rewardPreview = reward;

      var nxt = nextRound(state.ante, state.roundType);
      if (nxt.won) {
        state.phase = 'won';
        state.message = 'アンテ' + MAX_ANTE + 'クリア！夜市の優勝です！';
        return;
      }

      state.ante = nxt.ante;
      state.roundType = nxt.roundType;
      state.phase = 'shop';
      state.shopOffers = pickShopOffers(state.omamori);
      state.message =
        'クリア！ 報酬 +' + reward.total +
        '（基本' + reward.base + '・出す残り' + reward.playBonus + '・利子' + reward.interest + '）';
    }

    function buyOmamori(offerIndex) {
      if (state.phase !== 'shop') return;
      var offer = state.shopOffers[offerIndex];
      if (!offer) return;
      if (state.omamori.length >= MAX_OMAMORI) {
        state.message = 'おまもりは最大' + MAX_OMAMORI + '個までです。売却してから買ってください';
        render();
        return;
      }
      if (state.money < offer.price) {
        state.message = 'お金が足りません';
        render();
        return;
      }
      state.money -= offer.price;
      state.omamori.push(offer.id);
      state.shopOffers.splice(offerIndex, 1);
      state.message = offer.name + 'を買いました';
      render();
    }

    function sellOmamori(ownedIndex) {
      if (state.phase !== 'shop') return;
      var id = state.omamori[ownedIndex];
      if (!id) return;
      var price = sellPrice(id);
      state.omamori.splice(ownedIndex, 1);
      state.money += price;
      state.message = (getOmamoriDef(id).name) + 'を' + price + 'で売却';
      render();
    }

    function rerollShop() {
      if (state.phase !== 'shop') return;
      if (state.money < REROLL_COST) {
        state.message = 'リロールには' + REROLL_COST + '必要です';
        render();
        return;
      }
      state.money -= REROLL_COST;
      state.shopOffers = pickShopOffers(state.omamori);
      state.message = '商品を入れ替えました（-' + REROLL_COST + '）';
      render();
    }

    function leaveShop() {
      if (state.phase !== 'shop') return;
      startRound();
      render();
    }

    function restart() {
      state = freshState();
      startRound();
      render();
    }

    // ---- DOM ----

    function el(id) {
      return document.getElementById(id);
    }

    function renderCard(card, selectable) {
      var s = suitInfo(card.suit);
      var selected = !!state.selected[card.id];
      var cls = 'card' + (selected ? ' selected' : '') + (selectable ? ' selectable' : '');
      return (
        '<button type="button" class="' + cls + '" data-card="' + card.id + '"' +
        ' style="--suit:' + s.color + '" aria-pressed="' + selected + '">' +
        '<span class="card-rank">' + RANK_LABELS[card.rank] + '</span>' +
        '<span class="card-suit">' + s.emoji + '</span>' +
        '<span class="card-suit-name">' + s.name + '</span>' +
        '</button>'
      );
    }

    function render() {
      if (!state) return;

      el('ante').textContent = state.ante;
      el('round-type').textContent = roundTypeName(state.roundType);
      el('money').textContent = state.money;
      el('score').textContent = state.score;
      el('target').textContent = state.target;
      el('plays').textContent = state.playsLeft;
      el('discards').textContent = state.discardsLeft;

      var progress = Math.min(100, Math.floor((state.score / state.target) * 100));
      el('score-bar').style.width = progress + '%';

      // おまもり所持
      var omaHtml = '';
      if (state.omamori.length === 0) {
        omaHtml = '<p class="muted">まだおまもりはありません</p>';
      } else {
        for (var i = 0; i < state.omamori.length; i++) {
          var d = getOmamoriDef(state.omamori[i]);
          omaHtml +=
            '<div class="omamori-chip" title="' + d.desc + '">' +
            '<strong>' + d.name + '</strong><span>' + d.desc + '</span>';
          if (state.phase === 'shop') {
            omaHtml +=
              '<button type="button" class="btn tiny" data-sell="' + i + '">売却(' +
              sellPrice(d.id) + ')</button>';
          }
          omaHtml += '</div>';
        }
      }
      el('omamori-list').innerHTML = omaHtml;

      // 手札
      var handArea = el('hand');
      var shopArea = el('shop');
      var actions = el('actions');
      var overlay = el('overlay');

      if (state.phase === 'play') {
        handArea.hidden = false;
        shopArea.hidden = true;
        actions.hidden = false;
        overlay.hidden = true;

        var h = '';
        for (var c = 0; c < state.hand.length; c++) {
          h += renderCard(state.hand[c], true);
        }
        handArea.innerHTML = h || '<p class="muted">手札がありません</p>';

        el('btn-play').disabled = state.playsLeft <= 0;
        el('btn-discard').disabled = state.discardsLeft <= 0;
      } else if (state.phase === 'shop') {
        handArea.hidden = true;
        shopArea.hidden = false;
        actions.hidden = true;
        overlay.hidden = true;

        var sh =
          '<p class="shop-intro">次は アンテ' + state.ante + '・' +
          roundTypeName(state.roundType) +
          '（目標 ' + getTargetScore(state.ante, state.roundType) + '）</p>' +
          '<div class="shop-grid">';
        for (var o = 0; o < state.shopOffers.length; o++) {
          var offer = state.shopOffers[o];
          sh +=
            '<div class="shop-item">' +
            '<h3>' + offer.name + '</h3>' +
            '<p>' + offer.desc + '</p>' +
            '<button type="button" class="btn" data-buy="' + o + '">' +
            offer.price + ' で買う</button></div>';
        }
        if (state.shopOffers.length === 0) {
          sh += '<p class="muted">売り切れです。リロールするか次へ進んでください。</p>';
        }
        sh += '</div>';
        sh +=
          '<div class="shop-actions">' +
          '<button type="button" class="btn" id="btn-reroll">リロール（' + REROLL_COST + '）</button>' +
          '<button type="button" class="btn primary" id="btn-leave-shop">夜市を出て次のラウンドへ</button>' +
          '</div>';
        shopArea.innerHTML = sh;
      } else {
        handArea.hidden = true;
        shopArea.hidden = true;
        actions.hidden = true;
        overlay.hidden = false;
        var title = state.phase === 'won' ? '勝利！' : 'ゲームオーバー';
        el('overlay-title').textContent = title;
        el('overlay-msg').textContent = state.message;
      }

      // 得点内訳
      var breakdown = el('breakdown');
      if (state.lastScore) {
        var ls = state.lastScore;
        var lines =
          '<div class="breakdown-main">' +
          '<span class="hand-name">' + ls.hand.name + '</span>' +
          '<span class="eq">' + ls.chips + ' × ' + ls.mult + ' = <strong>' + ls.score + '</strong></span>' +
          '</div>' +
          '<div class="breakdown-detail muted">基本チップ ' + ls.hand.chips +
          ' + ランク合計 ' + ls.rankSum;
        if (ls.omamoriBreakdown.length) {
          for (var b = 0; b < ls.omamoriBreakdown.length; b++) {
            lines += ' / ' + ls.omamoriBreakdown[b].name + '（' + ls.omamoriBreakdown[b].detail + '）';
          }
        }
        lines += '</div>';
        breakdown.innerHTML = lines;
      } else {
        breakdown.innerHTML = '<p class="muted">カードを選んで「役を出す」か「捨てる」</p>';
      }

      el('status-msg').textContent = state.message || '';

      // プレビュー
      var sel = selectedCards();
      var preview = el('preview');
      if (state.phase === 'play' && sel.length > 0) {
        var prev = calculateScore(sel, state.omamori);
        preview.textContent =
          '選択中: ' + prev.hand.name + ' → ' + prev.chips + ' × ' + prev.mult + ' = ' + prev.score;
      } else {
        preview.textContent = '';
      }
    }

    function bind() {
      el('hand').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-card]');
        if (!btn) return;
        toggleSelect(btn.getAttribute('data-card'));
      });

      el('btn-play').addEventListener('click', playHand);
      el('btn-discard').addEventListener('click', discardHand);
      el('btn-restart').addEventListener('click', restart);
      el('btn-restart-overlay').addEventListener('click', restart);

      el('shop').addEventListener('click', function (e) {
        var buy = e.target.closest('[data-buy]');
        if (buy) {
          buyOmamori(parseInt(buy.getAttribute('data-buy'), 10));
          return;
        }
        if (e.target.id === 'btn-reroll') {
          rerollShop();
          return;
        }
        if (e.target.id === 'btn-leave-shop') {
          leaveShop();
        }
      });

      el('omamori-list').addEventListener('click', function (e) {
        var sell = e.target.closest('[data-sell]');
        if (sell) sellOmamori(parseInt(sell.getAttribute('data-sell'), 10));
      });
    }

    document.addEventListener('DOMContentLoaded', function () {
      bind();
      restart();
    });
  })();
}
