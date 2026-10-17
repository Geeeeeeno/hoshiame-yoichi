/**
 * ほしあめ夜市 — ひとり用ローグライク・ポーカー風カードゲーム
 * 純粋関数は Node からも読める。DOM 処理は document があるときだけ。
 */

// ---------------------------------------------------------------------------
// 定数・データ
// ---------------------------------------------------------------------------

var SUITS = [
  { id: 'ame', name: '飴', icon: 'assets/suit-ame.svg', color: '#ff4fd8' },
  { id: 'hoshi', name: '星', icon: 'assets/suit-hoshi.svg', color: '#ffc43d' },
  { id: 'suzu', name: '鈴', icon: 'assets/suit-suzu.svg', color: '#3ff3ff' },
  { id: 'tsuki', name: '月', icon: 'assets/suit-tsuki.svg', color: '#9b5cff' }
];

/** 伝統的ピップ配置（％座標・カード中央エリア基準） */
var PIP_LAYOUTS = {
  2: [[50, 18], [50, 82]],
  3: [[50, 18], [50, 50], [50, 82]],
  4: [[28, 22], [72, 22], [28, 78], [72, 78]],
  5: [[28, 22], [72, 22], [50, 50], [28, 78], [72, 78]],
  6: [[28, 22], [72, 22], [28, 50], [72, 50], [28, 78], [72, 78]],
  7: [[28, 18], [72, 18], [50, 42], [28, 50], [72, 50], [28, 82], [72, 82]],
  8: [[28, 16], [72, 16], [28, 38], [72, 38], [28, 62], [72, 62], [28, 84], [72, 84]],
  9: [[28, 16], [72, 16], [28, 38], [50, 38], [72, 38], [28, 62], [72, 62], [28, 84], [72, 84]],
  10: [[28, 14], [72, 14], [28, 32], [72, 32], [50, 40], [50, 60], [28, 68], [72, 68], [28, 86], [72, 86]]
};

var FACE_ART = {
  11: 'assets/faces/jack.svg',
  12: 'assets/faces/queen.svg',
  13: 'assets/faces/king.svg'
};

var OMAMORI_RARITY = {
  high_inori: 'common',
  amedama: 'uncommon',
  hoshikuzu: 'uncommon',
  ame_bell: 'rare',
  tsukiakari: 'rare',
  straight_toro: 'rare',
  pair_musubi: 'rare',
  flush_chochin: 'rare',
  manten_hoshi: 'epic',
  yotsu_hoshi: 'epic'
};

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
    icon: 'assets/omamori/hoshikuzu.svg',
    effect: { type: 'add_mult', value: 4 }
  },
  {
    id: 'amedama',
    name: '飴玉のおまもり',
    desc: '役を出すたびチップ +30',
    price: 4,
    icon: 'assets/omamori/amedama.svg',
    effect: { type: 'add_chips', value: 30 }
  },
  {
    id: 'ame_bell',
    name: 'ほしあめの鈴',
    desc: '得点カードの飴1枚につきチップ +15',
    price: 6,
    icon: 'assets/omamori/ame_bell.svg',
    effect: { type: 'suit_chips', suit: 'ame', value: 15 }
  },
  {
    id: 'tsukiakari',
    name: '月あかりのおまもり',
    desc: '得点カードの月1枚につきチップ +15',
    price: 6,
    icon: 'assets/omamori/tsukiakari.svg',
    effect: { type: 'suit_chips', suit: 'tsuki', value: 15 }
  },
  {
    id: 'pair_musubi',
    name: 'ペア結び',
    desc: 'ワンペア・ツーペアのとき倍率 ×2',
    price: 7,
    icon: 'assets/omamori/pair_musubi.svg',
    effect: { type: 'hand_mult_mul', hands: ['pair', 'two_pair'], value: 2 }
  },
  {
    id: 'straight_toro',
    name: 'ストレート灯籠',
    desc: 'ストレート系のときチップ +40',
    price: 6,
    icon: 'assets/omamori/straight_toro.svg',
    effect: { type: 'hand_chips', hands: ['straight', 'straight_flush'], value: 40 }
  },
  {
    id: 'flush_chochin',
    name: 'フラッシュ提灯',
    desc: 'フラッシュ系のとき倍率 +4',
    price: 7,
    icon: 'assets/omamori/flush_chochin.svg',
    effect: { type: 'hand_mult', hands: ['flush', 'straight_flush'], value: 4 }
  },
  {
    id: 'manten_hoshi',
    name: '満天ほし',
    desc: 'フルハウスのとき倍率 ×2',
    price: 8,
    icon: 'assets/omamori/manten_hoshi.svg',
    effect: { type: 'hand_mult_mul', hands: ['full_house'], value: 2 }
  },
  {
    id: 'yotsu_hoshi',
    name: '四つ星おまもり',
    desc: 'フォーカードのときチップ +50・倍率 +5',
    price: 9,
    icon: 'assets/omamori/yotsu_hoshi.svg',
    effect: { type: 'four_bonus', chips: 50, mult: 5 }
  },
  {
    id: 'high_inori',
    name: 'ハイカードの祈り',
    desc: 'ハイカードのときチップ +20・倍率 +2',
    price: 3,
    icon: 'assets/omamori/high_inori.svg',
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
  return s.name + RANK_LABELS[card.rank];
}

function omamoriRarity(id) {
  return OMAMORI_RARITY[id] || 'common';
}

function suitIconHtml(suitId, cls) {
  var s = suitInfo(suitId);
  return '<img class="' + (cls || 'suit-icon') + '" src="' + s.icon + '" alt="' + s.name + '" draggable="false" />';
}

function cardCenterHtml(card) {
  var s = suitInfo(card.suit);
  if (card.rank === 14) {
    return (
      '<span class="card-ace">' +
      '<img src="' + s.icon + '" alt="' + s.name + '" draggable="false" />' +
      '</span>'
    );
  }
  if (FACE_ART[card.rank]) {
    return (
      '<span class="card-face-art">' +
      '<img src="' + FACE_ART[card.rank] + '" alt="' + RANK_LABELS[card.rank] + '" draggable="false" />' +
      '</span>'
    );
  }
  var layout = PIP_LAYOUTS[card.rank] || PIP_LAYOUTS[2];
  var html = '<span class="card-pips" aria-hidden="true">';
  for (var i = 0; i < layout.length; i++) {
    html +=
      '<img class="pip" src="' + s.icon + '" alt="" draggable="false" style="left:' +
      layout[i][0] + '%;top:' + layout[i][1] + '%" />';
  }
  html += '</span>';
  return html;
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

/**
 * 選択中カードをすべて解除する（純粋関数）。
 * @param {Object} selectedMap id→truthy の選択マップ
 * @returns {{ selected: Object, cleared: number }}
 */
function clearSelection(selectedMap) {
  var cleared = 0;
  var key;
  if (selectedMap) {
    for (key in selectedMap) {
      if (Object.prototype.hasOwnProperty.call(selectedMap, key) && selectedMap[key]) {
        cleared += 1;
      }
    }
  }
  return { selected: {}, cleared: cleared };
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
    isStraight: isStraight,
    clearSelection: clearSelection
  };
}

// ---------------------------------------------------------------------------
// UI / ゲーム状態（ブラウザのみ）
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  (function () {
    var state = null;
    var animBusy = false;
    var knownHandIds = {};
    var displayedScore = 0;
    var scoreAnimToken = 0;
    var dealAllNext = false;
    var shopEnterNext = false;
    var pendingOmamoriGlow = [];
    var BIG_SCORE = 80;
    var lastPhase = null;

    function sfx(name) {
      if (typeof window === 'undefined' || !window.HoshiameAudio) return;
      try { window.HoshiameAudio.play(name); } catch (e) { /* ignore */ }
    }

    function audioApi() {
      return (typeof window !== 'undefined' && window.HoshiameAudio) ? window.HoshiameAudio : null;
    }

    function setAudioBgmMode(mode) {
      var a = audioApi();
      if (!a) return;
      try {
        a.setBgmMode(mode);
        if (a.isStarted && a.isStarted()) a.startBgm(mode);
      } catch (e) { /* ignore */ }
    }

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

    function reduceMotion() {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function after(ms, fn) {
      if (reduceMotion()) {
        fn();
        return;
      }
      setTimeout(fn, ms);
    }

    function startRound(opts) {
      opts = opts || {};
      state.score = 0;
      displayedScore = 0;
      state.target = getTargetScore(state.ante, state.roundType);
      state.playsLeft = START_PLAYS;
      state.discardsLeft = START_DISCARDS;
      state.deck = shuffleDeck(createDeck());
      state.hand = [];
      state.selected = {};
      state.lastScore = null;
      state.message = '';
      state.phase = 'play';
      knownHandIds = {};
      dealAllNext = opts.deal !== false;
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

    function setActionsEnabled(on) {
      var playBtn = el('btn-play');
      var discardBtn = el('btn-discard');
      if (playBtn) playBtn.disabled = !on || !state || state.playsLeft <= 0 || state.phase !== 'play';
      if (discardBtn) discardBtn.disabled = !on || !state || state.discardsLeft <= 0 || state.phase !== 'play';
      updateDeselectButton(on);
    }

    function selectedCount() {
      return state ? Object.keys(state.selected).length : 0;
    }

    function updateDeselectButton(actionsOn) {
      var btn = el('btn-deselect');
      if (!btn) return;
      var can = !!(state && state.phase === 'play' && selectedCount() > 0 && actionsOn !== false && !animBusy);
      btn.hidden = !can;
      btn.disabled = !can;
      var playBtn = el('btn-play');
      if (playBtn) {
        if (can) playBtn.classList.add('has-selection');
        else playBtn.classList.remove('has-selection');
      }
    }

    /**
     * 選択をすべて解除。何も選んでいなければ SE も再描画もしない。
     * @returns {number} 解除した枚数
     */
    function deselectAllCards() {
      if (!state || state.phase !== 'play' || animBusy) return 0;
      var result = clearSelection(state.selected);
      if (result.cleared === 0) return 0;
      state.selected = result.selected;
      sfx('deselectAll');
      state.message = '';
      render({ skipDeal: true });
      return result.cleared;
    }

    function toggleSelect(cardId) {
      if (state.phase !== 'play' || animBusy) return;
      if (state.selected[cardId]) {
        delete state.selected[cardId];
        sfx('deselect');
      } else {
        var n = Object.keys(state.selected).length;
        if (n >= MAX_SELECT) {
          state.message = '選べるのは最大' + MAX_SELECT + '枚です';
          render({ skipDeal: true });
          return;
        }
        state.selected[cardId] = true;
        sfx('select');
      }
      state.message = '';
      render({ skipDeal: true });
    }

    /**
     * 得点反映・手札更新。クリア処理は呼び出し側で行う（演出タイミング用）。
     * @returns {'clear'|'lost'|'continue'}
     */
    function applyPlayResult(result) {
      state.score += result.score;
      state.playsLeft -= 1;
      state.lastScore = result;
      removeSelectedFromHand();
      drawToHand();

      if (state.score >= state.target) {
        state.message = result.hand.name + 'で ' + result.score + ' 点！ クリア！';
        return 'clear';
      }
      if (state.playsLeft <= 0) {
        state.phase = 'lost';
        state.message = '目標に届きませんでした…ゲームオーバー';
        return 'lost';
      }
      state.message = result.hand.name + 'で ' + result.score + ' 点！';
      return 'continue';
    }

    function playHand() {
      if (state.phase !== 'play' || state.playsLeft <= 0 || animBusy) return;
      var cards = selectedCards();
      if (cards.length === 0) {
        state.message = 'カードを選んでください';
        render({ skipDeal: true });
        return;
      }
      if (cards.length > MAX_SELECT) return;

      var result = calculateScore(cards, state.omamori);
      var scoreBefore = state.score;
      var selectedIds = cards.map(function (c) { return c.id; });
      var bigHit = result.score >= BIG_SCORE ||
        result.hand.type === 'four' ||
        result.hand.type === 'straight_flush' ||
        result.hand.type === 'full_house';

      pendingOmamoriGlow = [];
      if (result.omamoriBreakdown && result.omamoriBreakdown.length) {
        for (var i = 0; i < result.omamoriBreakdown.length; i++) {
          pendingOmamoriGlow.push(result.omamoriBreakdown[i].name);
        }
      }

      sfx('play');

      if (reduceMotion()) {
        var quick = applyPlayResult(result);
        playScoreSfx(result, bigHit, quick);
        if (quick === 'clear') onRoundClear();
        displayedScore = state.score;
        if (state.phase === 'shop') shopEnterNext = true;
        render({ skipDeal: true, popEq: true, shakeEq: bigHit, handFlash: result.hand.type });
        return;
      }

      animBusy = true;
      setActionsEnabled(false);
      flyCardsToScore(selectedIds, function () {
        var outcome = applyPlayResult(result);
        playScoreSfx(result, bigHit, outcome);
        render({
          dealNew: true,
          popEq: true,
          shakeEq: bigHit || outcome === 'clear',
          scoreFrom: scoreBefore,
          flashBig: bigHit || outcome === 'clear',
          handFlash: result.hand.type,
          screenShake: bigHit || outcome === 'clear'
        });
        after(bigHit || outcome === 'clear' ? 850 : 600, function () {
          if (outcome === 'clear') {
            onRoundClear();
            var bannerText = state.phase === 'won' ? '夜市優勝！' : 'ラウンドクリア！';
            sfx('roundClear');
            showRoundBanner(bannerText, function () {
              animBusy = false;
              if (state.phase === 'shop') shopEnterNext = true;
              render({ skipDeal: true });
            });
          } else if (outcome === 'lost') {
            sfx('fail');
            after(200, function () { sfx('gameOver'); });
            animBusy = false;
            render({ skipDeal: true });
          } else {
            animBusy = false;
            setActionsEnabled(true);
          }
        });
      });
    }

    function playScoreSfx(result, bigHit, outcome) {
      var ticks = Math.min(12, 4 + Math.floor((result.chips || 10) / 20));
      if (audioApi() && audioApi().sfx && audioApi().sfx.chipCount) {
        audioApi().sfx.chipCount(ticks);
      } else {
        sfx('chipTick');
      }
      setTimeout(function () { sfx('multHit'); }, ticks * 55 + 40);
      if (bigHit) {
        setTimeout(function () { sfx('bigScore'); }, ticks * 55 + 120);
      }
      if (outcome === 'lost' && reduceMotion()) {
        sfx('fail');
        setTimeout(function () { sfx('gameOver'); }, 250);
      }
      if (outcome === 'clear' && reduceMotion()) {
        setTimeout(function () { sfx('roundClear'); }, 200);
      }
    }

    function discardHand() {
      if (state.phase !== 'play' || state.discardsLeft <= 0 || animBusy) return;
      var cards = selectedCards();
      if (cards.length === 0) {
        state.message = '捨てるカードを選んでください';
        render({ skipDeal: true });
        return;
      }

      var selectedIds = cards.map(function (c) { return c.id; });
      sfx('discard');

      function finishDiscard() {
        state.discardsLeft -= 1;
        removeSelectedFromHand();
        drawToHand();
        state.lastScore = null;
        state.message = 'カードを捨てました（残り捨て回数 ' + state.discardsLeft + '）';
        render({ dealNew: true });
        animBusy = false;
        setActionsEnabled(true);
      }

      if (reduceMotion()) {
        finishDiscard();
        return;
      }

      animBusy = true;
      setActionsEnabled(false);
      flyCardsDiscard(selectedIds, function () {
        after(80, finishDiscard);
      });
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
      setAudioBgmMode('shop');
      state.message =
        'クリア！ 報酬 +' + reward.total +
        '（基本' + reward.base + '・出す残り' + reward.playBonus + '・利子' + reward.interest + '）';
    }

    function phaseTransition(kind) {
      if (reduceMotion()) return;
      var layout = document.querySelector('.layout');
      if (!layout) return;
      layout.classList.remove('phase-enter', 'phase-exit');
      void layout.offsetWidth;
      layout.classList.add(kind === 'exit' ? 'phase-exit' : 'phase-enter');
      setTimeout(function () {
        layout.classList.remove('phase-enter', 'phase-exit');
      }, kind === 'exit' ? 300 : 420);
    }

    function triggerScreenShake() {
      if (reduceMotion()) return;
      document.body.classList.remove('screen-shake');
      void document.body.offsetWidth;
      document.body.classList.add('screen-shake');
      setTimeout(function () {
        document.body.classList.remove('screen-shake');
      }, 480);
    }

    function buyOmamori(offerIndex) {
      if (state.phase !== 'shop' || animBusy) return;
      var offer = state.shopOffers[offerIndex];
      if (!offer) return;
      if (state.omamori.length >= MAX_OMAMORI) {
        state.message = 'おまもりは最大' + MAX_OMAMORI + '個までです。売却してから買ってください';
        render({ skipDeal: true });
        return;
      }
      if (state.money < offer.price) {
        state.message = 'お金が足りません';
        render({ skipDeal: true });
        return;
      }
      state.money -= offer.price;
      state.omamori.push(offer.id);
      state.shopOffers.splice(offerIndex, 1);
      state.message = offer.name + 'を買いました';
      pendingOmamoriGlow = [offer.name];
      sfx('buy');
      render({ skipDeal: true });
    }

    function sellOmamori(ownedIndex) {
      if (state.phase !== 'shop' || animBusy) return;
      var id = state.omamori[ownedIndex];
      if (!id) return;
      var price = sellPrice(id);
      state.omamori.splice(ownedIndex, 1);
      state.money += price;
      state.message = (getOmamoriDef(id).name) + 'を' + price + 'で売却';
      sfx('sell');
      render({ skipDeal: true });
    }

    function rerollShop() {
      if (state.phase !== 'shop' || animBusy) return;
      if (state.money < REROLL_COST) {
        state.message = 'リロールには' + REROLL_COST + '必要です';
        render({ skipDeal: true });
        return;
      }
      state.money -= REROLL_COST;
      state.shopOffers = pickShopOffers(state.omamori);
      state.message = '商品を入れ替えました（-' + REROLL_COST + '）';
      shopEnterNext = true;
      sfx('reroll');
      render({ skipDeal: true });
    }

    function leaveShop() {
      if (state.phase !== 'shop' || animBusy) return;
      setAudioBgmMode('play');
      var shopArea = el('shop');
      if (!reduceMotion() && shopArea && !shopArea.hidden) {
        animBusy = true;
        shopArea.classList.remove('shop-enter');
        shopArea.classList.add('shop-exit');
        phaseTransition('exit');
        after(280, function () {
          shopArea.classList.remove('shop-exit');
          startRound({ deal: true });
          animBusy = false;
          render();
          phaseTransition('enter');
        });
        return;
      }
      startRound({ deal: true });
      render();
    }

    function restart() {
      animBusy = false;
      knownHandIds = {};
      displayedScore = 0;
      pendingOmamoriGlow = [];
      lastPhase = null;
      hideRoundBanner();
      clearFx();
      state = freshState();
      setAudioBgmMode('play');
      startRound({ deal: true });
      render();
    }

    // ---- 演出ヘルパー ----

    function el(id) {
      return document.getElementById(id);
    }

    function clearFx() {
      var layer = el('fx-layer');
      if (layer) layer.innerHTML = '';
      var canvas = el('fx-canvas');
      if (canvas) {
        var ctx = canvas.getContext && canvas.getContext('2d');
        if (ctx) {
          canvas.width = canvas.clientWidth || 1;
          canvas.height = canvas.clientHeight || 1;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    }

    function getDeckOrigin() {
      var deck = el('deck-pile');
      if (!deck) return { x: 40, y: 120 };
      var r = deck.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    function spawnTrail(x, y, color) {
      var layer = el('fx-layer');
      if (!layer || reduceMotion()) return;
      var trail = document.createElement('span');
      trail.className = 'fly-trail';
      trail.style.left = x + 'px';
      trail.style.top = y + 'px';
      trail.style.color = color || '#3ff3ff';
      trail.style.background = color || '#3ff3ff';
      layer.appendChild(trail);
      setTimeout(function () {
        if (trail.parentNode) trail.parentNode.removeChild(trail);
      }, 360);
    }

    function flyCardsToScore(cardIds, done) {
      var handArea = el('hand');
      var target = el('scoreboard') || el('breakdown');
      var layer = el('fx-layer');
      if (!handArea || !target || !layer || reduceMotion()) {
        done();
        return;
      }
      var tRect = target.getBoundingClientRect();
      var tx = tRect.left + tRect.width * 0.55;
      var ty = tRect.top + tRect.height * 0.45;
      var count = 0;
      var total = 0;
      var trailColors = ['#ff4fd8', '#3ff3ff', '#ffc43d', '#9b5cff'];

      for (var i = 0; i < cardIds.length; i++) {
        var btn = handArea.querySelector('[data-card="' + cardIds[i] + '"]');
        if (!btn) continue;
        total++;
        (function (src, delay, color) {
          var rect = src.getBoundingClientRect();
          src.classList.add('playing-out');
          var ghost = src.cloneNode(true);
          ghost.className = 'card fly-ghost';
          ghost.style.left = rect.left + 'px';
          ghost.style.top = rect.top + 'px';
          ghost.style.width = rect.width + 'px';
          ghost.style.height = rect.height + 'px';
          layer.appendChild(ghost);
          setTimeout(function () {
            ghost.style.left = (tx - rect.width * 0.2) + 'px';
            ghost.style.top = (ty - rect.height * 0.2) + 'px';
            ghost.classList.add('fly-to-score');
            var steps = 3;
            for (var t = 1; t <= steps; t++) {
              (function (step) {
                setTimeout(function () {
                  var gx = rect.left + ((tx - rect.width * 0.2) - rect.left) * (step / (steps + 1));
                  var gy = rect.top + ((ty - rect.height * 0.2) - rect.top) * (step / (steps + 1));
                  spawnTrail(gx + rect.width / 2, gy + rect.height / 2, color);
                }, step * 70);
              })(t);
            }
          }, delay);
          setTimeout(function () {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
            count++;
            if (count >= total) done();
          }, delay + 480);
        })(btn, i * 55, trailColors[i % trailColors.length]);
      }

      if (total === 0) done();
    }

    function flyCardsDiscard(cardIds, done) {
      var handArea = el('hand');
      var layer = el('fx-layer');
      if (!handArea || !layer || reduceMotion()) {
        done();
        return;
      }
      var count = 0;
      var total = 0;
      for (var i = 0; i < cardIds.length; i++) {
        var btn = handArea.querySelector('[data-card="' + cardIds[i] + '"]');
        if (!btn) continue;
        total++;
        (function (src, delay) {
          var rect = src.getBoundingClientRect();
          src.classList.add('playing-out');
          var ghost = src.cloneNode(true);
          ghost.className = 'card fly-ghost';
          ghost.style.left = rect.left + 'px';
          ghost.style.top = rect.top + 'px';
          ghost.style.width = rect.width + 'px';
          ghost.style.height = rect.height + 'px';
          layer.appendChild(ghost);
          setTimeout(function () {
            ghost.style.top = (rect.top + 60) + 'px';
            ghost.classList.add('discard-out');
          }, delay);
          setTimeout(function () {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
            count++;
            if (count >= total) done();
          }, delay + 380);
        })(btn, i * 40);
      }
      if (total === 0) done();
    }

    function spawnDomParticles(cx, cy, amount) {
      var layer = el('fx-layer');
      if (!layer || reduceMotion()) return;
      var colors = ['#ff2d95', '#2de2e6', '#b967ff', '#ffe566', '#39ffb6'];
      var n = Math.min(amount || 14, 16);
      for (var i = 0; i < n; i++) {
        var p = document.createElement('span');
        p.className = 'fx-particle';
        var angle = (Math.PI * 2 * i) / n + Math.random() * 0.4;
        var dist = 48 + Math.random() * 70;
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.color = colors[i % colors.length];
        p.style.background = colors[i % colors.length];
        p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
        p.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
        layer.appendChild(p);
        (function (node) {
          setTimeout(function () {
            if (node.parentNode) node.parentNode.removeChild(node);
          }, 750);
        })(p);
      }
    }

    function spawnCanvasBurst(cx, cy) {
      var canvas = el('fx-canvas');
      if (!canvas || reduceMotion() || !canvas.getContext) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var w = window.innerWidth;
      var h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      var ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var dots = [];
      var colors = ['#ff2d95', '#2de2e6', '#ffe566', '#b967ff'];
      for (var i = 0; i < 12; i++) {
        var ang = Math.random() * Math.PI * 2;
        var spd = 2 + Math.random() * 4;
        dots.push({
          x: cx,
          y: cy,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 1,
          life: 1,
          color: colors[i % colors.length]
        });
      }
      var frames = 0;
      function tick() {
        frames++;
        ctx.clearRect(0, 0, w, h);
        for (var j = 0; j < dots.length; j++) {
          var d = dots[j];
          d.x += d.vx;
          d.y += d.vy;
          d.vy += 0.12;
          d.life -= 0.04;
          if (d.life <= 0) continue;
          ctx.globalAlpha = Math.max(0, d.life);
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.arc(d.x, d.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        if (frames < 28) {
          requestAnimationFrame(tick);
        } else {
          ctx.clearRect(0, 0, w, h);
        }
      }
      requestAnimationFrame(tick);
    }

    function triggerFlash(big, handType) {
      var layer = el('fx-layer');
      if (!layer || reduceMotion()) return;
      var flash = document.createElement('div');
      flash.className = 'fx-flash';
      if (handType) flash.className += ' hand-' + handType;
      if (!big) flash.style.opacity = '0.5';
      layer.appendChild(flash);
      setTimeout(function () {
        if (flash.parentNode) flash.parentNode.removeChild(flash);
      }, 560);
    }

    function animateScoreCount(from, to) {
      var scoreEl = el('score');
      if (!scoreEl) return;
      scoreAnimToken++;
      var token = scoreAnimToken;
      if (reduceMotion() || from === to) {
        displayedScore = to;
        scoreEl.textContent = to;
        return;
      }
      scoreEl.classList.remove('score-bounce');
      void scoreEl.offsetWidth;
      scoreEl.classList.add('score-bounce');
      var start = performance.now();
      var dur = Math.min(700, 280 + Math.abs(to - from) * 2);
      function step(now) {
        if (token !== scoreAnimToken) return;
        var t = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = Math.round(from + (to - from) * eased);
        displayedScore = val;
        scoreEl.textContent = val;
        scoreEl.classList.add('counting');
        if (t < 1) {
          requestAnimationFrame(step);
        } else {
          scoreEl.classList.remove('counting');
          displayedScore = to;
          scoreEl.textContent = to;
        }
      }
      requestAnimationFrame(step);
    }

    function showRoundBanner(text, done) {
      var banner = el('round-banner');
      var label = el('round-banner-text');
      if (!banner || reduceMotion()) {
        if (done) done();
        return;
      }
      if (label) label.textContent = text;
      banner.hidden = false;
      banner.setAttribute('aria-hidden', 'false');
      var board = el('scoreboard');
      var rect = board ? board.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      triggerFlash(true);
      spawnDomParticles(cx, cy, 16);
      spawnCanvasBurst(cx, cy);
      after(1100, function () {
        hideRoundBanner();
        if (done) done();
      });
    }

    function hideRoundBanner() {
      var banner = el('round-banner');
      if (banner) {
        banner.hidden = true;
        banner.setAttribute('aria-hidden', 'true');
      }
    }

    function glowOmamori(names) {
      if (!names || !names.length) return;
      sfx('omamori');
      if (reduceMotion()) return;
      var chips = el('omamori-list').querySelectorAll('.omamori-chip');
      for (var i = 0; i < chips.length; i++) {
        var strong = chips[i].querySelector('strong');
        if (!strong) continue;
        for (var n = 0; n < names.length; n++) {
          if (strong.textContent === names[n]) {
            chips[i].classList.add('omamori-glow', 'omamori-bounce');
            (function (node) {
              setTimeout(function () {
                node.classList.remove('omamori-glow', 'omamori-bounce');
              }, 900);
            })(chips[i]);
          }
        }
      }
    }

    // ---- DOM 描画 ----

    function renderCard(card, selectable, dealClass, delayMs, dealX, dealY) {
      var s = suitInfo(card.suit);
      var selected = !!state.selected[card.id];
      var cls = 'card card--' + s.id +
        (selected ? ' selected' : '') +
        (selectable ? ' selectable' : '') +
        (dealClass ? ' ' + dealClass : '');
      var style = '--suit:' + s.color;
      if (dealClass) {
        style += ';--deal-x:' + (dealX || -80) + 'px;--deal-y:' + (dealY || -40) + 'px';
        style += ';animation-delay:' + (delayMs || 0) + 'ms';
      }
      var corner =
        '<span class="card-corner">' +
        '<span class="card-rank">' + RANK_LABELS[card.rank] + '</span>' +
        suitIconHtml(card.suit, 'card-suit-mini') +
        '</span>';
      return (
        '<button type="button" class="' + cls + '" data-card="' + card.id + '"' +
        ' style="' + style + '" aria-pressed="' + selected + '"' +
        ' aria-label="' + s.name + RANK_LABELS[card.rank] + '">' +
        corner +
        '<span class="card-center">' + cardCenterHtml(card) + '</span>' +
        '<span class="card-corner card-corner--br">' +
        '<span class="card-rank">' + RANK_LABELS[card.rank] + '</span>' +
        suitIconHtml(card.suit, 'card-suit-mini') +
        '</span>' +
        '</button>'
      );
    }

    function renderOmamoriChip(def, sellIndex) {
      var rarity = omamoriRarity(def.id);
      var html =
        '<div class="omamori-chip rarity-' + rarity + '" data-omamori-name="' + def.name + '" title="' + def.desc + '">' +
        '<img class="omamori-art" src="' + def.icon + '" alt="" draggable="false" />' +
        '<div class="omamori-meta">' +
        '<strong>' + def.name + '</strong><span>' + def.desc + '</span>';
      if (typeof sellIndex === 'number') {
        html +=
          '<button type="button" class="btn tiny" data-sell="' + sellIndex + '">売却(' +
          sellPrice(def.id) + ')</button>';
      }
      html += '</div></div>';
      return html;
    }

    function render(opts) {
      if (!state) return;
      opts = opts || {};

      el('ante').textContent = state.ante;
      el('round-type').textContent = roundTypeName(state.roundType);
      el('target').textContent = state.target;

      if (typeof opts.scoreFrom === 'number' && !reduceMotion()) {
        animateScoreCount(opts.scoreFrom, state.score);
      } else {
        displayedScore = state.score;
        el('score').textContent = state.score;
      }

      var progress = Math.min(100, Math.floor((state.score / state.target) * 100) || 0);
      el('score-bar').style.width = progress + '%';

      var scoreboard = el('scoreboard');
      if (scoreboard) {
        scoreboard.classList.remove('score-hit');
        if (opts.popEq) {
          void scoreboard.offsetWidth;
          scoreboard.classList.add('score-hit');
        }
      }

      // おまもり所持
      var omaHtml = '';
      if (state.omamori.length === 0) {
        omaHtml = '<p class="muted">まだおまもりはありません</p>';
      } else {
        for (var i = 0; i < state.omamori.length; i++) {
          var d = getOmamoriDef(state.omamori[i]);
          omaHtml += renderOmamoriChip(d, state.phase === 'shop' ? i : undefined);
        }
      }
      el('omamori-list').innerHTML = omaHtml;

      var moneyEl = el('money');
      if (moneyEl) {
        moneyEl.innerHTML =
          '<img class="hud-icon" src="assets/ui/coin.svg" alt="" draggable="false" />' +
          '<span>' + state.money + '</span>';
      }
      var playsEl = el('plays');
      if (playsEl) {
        playsEl.innerHTML =
          '<img class="hud-icon" src="assets/ui/play.svg" alt="" draggable="false" />' +
          '<span>' + state.playsLeft + '</span>';
      }
      var discardsEl = el('discards');
      if (discardsEl) {
        discardsEl.innerHTML =
          '<img class="hud-icon" src="assets/ui/discard.svg" alt="" draggable="false" />' +
          '<span>' + state.discardsLeft + '</span>';
      }

      var handArea = el('hand');
      var shopArea = el('shop');
      var actions = el('actions');
      var overlay = el('overlay');
      var deckPile = el('deck-pile');

      if (state.phase === 'play') {
        handArea.hidden = false;
        shopArea.hidden = true;
        shopArea.classList.remove('shop-enter', 'shop-exit');
        actions.hidden = false;
        overlay.hidden = true;
        if (deckPile) deckPile.style.visibility = 'visible';

        var origin = getDeckOrigin();
        var doDeal = !opts.skipDeal && (dealAllNext || opts.dealNew) && !reduceMotion();
        var h = '';
        var newIds = {};
        for (var c = 0; c < state.hand.length; c++) {
          var card = state.hand[c];
          newIds[card.id] = true;
          var isNew = doDeal && (dealAllNext || !knownHandIds[card.id]);
          var dealClass = '';
          var delay = 0;
          var dx = 0;
          var dy = 0;
          if (isNew) {
            dealClass = dealAllNext ? 'flipping' : 'dealing';
            delay = c * 55;
            var handRect = handArea.getBoundingClientRect();
            var approxLeft = handRect.left + (c % 8) * 72 + 30;
            var approxTop = handRect.top + 40;
            dx = origin.x - approxLeft;
            dy = origin.y - approxTop;
            (function (d, flip) {
              setTimeout(function () {
                sfx('deal');
                if (flip) sfx('flip');
              }, d);
            })(delay, dealClass === 'flipping');
          }
          h += renderCard(card, true, dealClass, delay, dx, dy);
        }
        handArea.innerHTML = h || '<p class="muted">手札がありません</p>';
        knownHandIds = newIds;
        dealAllNext = false;

        if (!animBusy) {
          el('btn-play').disabled = state.playsLeft <= 0;
          el('btn-discard').disabled = state.discardsLeft <= 0;
        }
      } else if (state.phase === 'shop') {
        handArea.hidden = true;
        shopArea.hidden = false;
        actions.hidden = true;
        overlay.hidden = true;
        if (deckPile) deckPile.style.visibility = 'hidden';
        knownHandIds = {};
        var enteringShop = shopEnterNext || lastPhase !== 'shop';

        var sh =
          '<div class="shop-noren" aria-hidden="true"><span>夜市ショップ</span></div>' +
          '<p class="shop-intro">次は アンテ' + state.ante + '・' +
          roundTypeName(state.roundType) +
          '（目標 ' + getTargetScore(state.ante, state.roundType) + '）</p>' +
          '<div class="shop-grid">';
        for (var o = 0; o < state.shopOffers.length; o++) {
          var offer = state.shopOffers[o];
          var rarity = omamoriRarity(offer.id);
          sh +=
            '<div class="shop-item rarity-' + rarity + '">' +
            '<img class="shop-omamori-art" src="' + offer.icon + '" alt="" draggable="false" />' +
            '<div class="shop-item-body">' +
            '<h3>' + offer.name + '</h3>' +
            '<p>' + offer.desc + '</p>' +
            '<button type="button" class="btn neon-pulse neon-sign-btn" data-buy="' + o + '">' +
            '<span class="price-tag">' +
            '<img src="assets/ui/coin.svg" alt="" draggable="false" />' +
            offer.price + '</span> で買う</button></div></div>';
        }
        if (state.shopOffers.length === 0) {
          sh += '<p class="muted">売り切れです。リロールするか次へ進んでください。</p>';
        }
        sh += '</div>';
        sh +=
          '<div class="shop-actions">' +
          '<button type="button" class="btn neon-pulse neon-sign-btn" id="btn-reroll">リロール（' +
          '<img class="inline-icon" src="assets/ui/coin.svg" alt="" draggable="false" />' +
          REROLL_COST + '）</button>' +
          '<button type="button" class="btn primary neon-pulse neon-sign-btn" id="btn-leave-shop">夜市を出て次のラウンドへ</button>' +
          '</div>';
        shopArea.innerHTML = sh;
        shopArea.classList.remove('shop-exit');
        if (shopEnterNext && !reduceMotion()) {
          shopArea.classList.remove('shop-enter');
          void shopArea.offsetWidth;
          shopArea.classList.add('shop-enter');
          phaseTransition('enter');
        }
        shopEnterNext = false;
        if (enteringShop) {
          requestAnimationFrame(function () {
            shopArea.scrollIntoView({
              behavior: reduceMotion() ? 'auto' : 'smooth',
              block: 'start'
            });
          });
        }
      } else {
        handArea.hidden = true;
        shopArea.hidden = true;
        actions.hidden = true;
        overlay.hidden = false;
        if (deckPile) deckPile.style.visibility = 'hidden';
        var title = state.phase === 'won' ? '勝利！' : 'ゲームオーバー';
        el('overlay-title').textContent = title;
        el('overlay-msg').textContent = state.message;
        if (lastPhase !== state.phase && !reduceMotion()) {
          overlay.classList.remove('overlay-enter');
          void overlay.offsetWidth;
          overlay.classList.add('overlay-enter');
          phaseTransition('enter');
        }
      }

      if (lastPhase !== state.phase) {
        lastPhase = state.phase;
      }

      // 得点内訳
      var breakdown = el('breakdown');
      if (state.lastScore) {
        var ls = state.lastScore;
        var eqClass = 'eq';
        if (opts.popEq) eqClass += ' pop';
        if (opts.shakeEq) eqClass += ' shake';
        var lines =
          '<div class="breakdown-main">' +
          '<span class="hand-name">' + ls.hand.name + '</span>' +
          '<span class="' + eqClass + '">' +
          '<span class="chips-part badge-chip">' +
          '<img src="assets/ui/chip.svg" alt="" draggable="false" />' + ls.chips + '</span> × ' +
          '<span class="mult-part badge-mult">' +
          '<img src="assets/ui/mult.svg" alt="" draggable="false" />' + ls.mult + '</span> = <strong>' + ls.score + '</strong></span>' +
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

      var status = el('status-msg');
      status.textContent = state.message || '';
      status.classList.remove('pulse-in');
      if (state.message) {
        void status.offsetWidth;
        status.classList.add('pulse-in');
      }

      var sel = selectedCards();
      var preview = el('preview');
      if (state.phase === 'play' && sel.length > 0) {
        var prev = calculateScore(sel, state.omamori);
        preview.textContent =
          '選択中: ' + prev.hand.name + ' → ' + prev.chips + ' × ' + prev.mult + ' = ' + prev.score;
      } else {
        preview.textContent = '';
      }
      updateDeselectButton(!animBusy);

      if (pendingOmamoriGlow.length) {
        var glowNames = pendingOmamoriGlow.slice();
        pendingOmamoriGlow = [];
        after(40, function () { glowOmamori(glowNames); });
      }

      if ((opts.flashBig || opts.handFlash) && !reduceMotion()) {
        var board = el('scoreboard');
        var br = board ? board.getBoundingClientRect() : null;
        var cx = br ? br.left + br.width / 2 : window.innerWidth / 2;
        var cy = br ? br.top + br.height / 2 : window.innerHeight / 3;
        triggerFlash(!!opts.flashBig, opts.handFlash || (state.lastScore && state.lastScore.hand.type));
        spawnDomParticles(cx, cy, opts.flashBig ? 14 : 8);
        if (opts.flashBig) spawnCanvasBurst(cx, cy);
      }
      if (opts.screenShake) triggerScreenShake();
    }

    function bind() {
      var tableArea = document.querySelector('.table-area');

      el('hand').addEventListener('click', function (e) {
        var btn = e.target.closest('[data-card]');
        if (!btn || animBusy) return;
        toggleSelect(btn.getAttribute('data-card'));
      });

      // 右クリックで全選択解除（ブラウザメニューは出さない）
      if (tableArea) {
        tableArea.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          deselectAllCards();
        });
        // モバイル等: カード／ボタン以外の卓タップで解除
        tableArea.addEventListener('click', function (e) {
          if (e.target.closest('[data-card]') || e.target.closest('button')) return;
          deselectAllCards();
        });
      }

      el('btn-play').addEventListener('click', playHand);
      el('btn-discard').addEventListener('click', discardHand);
      el('btn-deselect').addEventListener('click', function () {
        deselectAllCards();
      });
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
