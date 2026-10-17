/**
 * ほしあめ夜市 — 純粋関数のユニットテスト
 * 実行: node test.js
 */

var assert = require('assert');
var g = require('./game.js');

function card(suit, rank) {
  return { id: suit + rank, suit: suit, rank: rank };
}

var passed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('✓ ' + name);
  } catch (e) {
    console.error('✗ ' + name);
    console.error('  ' + e.message);
    process.exitCode = 1;
  }
}

// ---- 役判定 ----

test('ハイカード', function () {
  var cards = [card('ame', 14), card('hoshi', 9), card('suzu', 5)];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'high_card');
  assert.strictEqual(h.scoringCards.length, 1);
  assert.strictEqual(h.scoringCards[0].rank, 14);
});

test('ワンペア', function () {
  var cards = [card('ame', 10), card('hoshi', 10), card('suzu', 3)];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'pair');
  assert.strictEqual(h.scoringCards.length, 2);
});

test('ツーペア', function () {
  var cards = [
    card('ame', 8), card('hoshi', 8),
    card('suzu', 4), card('tsuki', 4),
    card('ame', 2)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'two_pair');
  assert.strictEqual(h.scoringCards.length, 4);
});

test('スリーカード', function () {
  var cards = [card('ame', 7), card('hoshi', 7), card('suzu', 7), card('tsuki', 2)];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'three');
  assert.strictEqual(h.scoringCards.length, 3);
});

test('ストレート', function () {
  var cards = [
    card('ame', 5), card('hoshi', 6), card('suzu', 7),
    card('tsuki', 8), card('ame', 9)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'straight');
  assert.strictEqual(h.scoringCards.length, 5);
});

test('ストレート（A-2-3-4-5）', function () {
  var cards = [
    card('ame', 14), card('hoshi', 2), card('suzu', 3),
    card('tsuki', 4), card('ame', 5)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'straight');
});

test('フラッシュ', function () {
  var cards = [
    card('hoshi', 2), card('hoshi', 5), card('hoshi', 9),
    card('hoshi', 11), card('hoshi', 13)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'flush');
});

test('フルハウス', function () {
  var cards = [
    card('ame', 12), card('hoshi', 12), card('suzu', 12),
    card('tsuki', 3), card('ame', 3)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'full_house');
  assert.strictEqual(h.scoringCards.length, 5);
});

test('フォーカード', function () {
  var cards = [
    card('ame', 11), card('hoshi', 11), card('suzu', 11),
    card('tsuki', 11), card('ame', 2)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'four');
  assert.strictEqual(h.scoringCards.length, 4);
});

test('ストレートフラッシュ', function () {
  var cards = [
    card('suzu', 9), card('suzu', 10), card('suzu', 11),
    card('suzu', 12), card('suzu', 13)
  ];
  var h = g.evaluateHand(cards);
  assert.strictEqual(h.type, 'straight_flush');
});

// ---- 得点計算 ----

test('得点 = (基本チップ + ランク合計) × 倍率（ワンペア）', function () {
  // ペアの10×2 → scoring 10+10=20, chips=10+20=30, mult=2 → 60
  var cards = [card('ame', 10), card('hoshi', 10), card('suzu', 3)];
  var r = g.calculateScore(cards, []);
  assert.strictEqual(r.hand.type, 'pair');
  assert.strictEqual(r.rankSum, 20);
  assert.strictEqual(r.chips, 10 + 20);
  assert.strictEqual(r.mult, 2);
  assert.strictEqual(r.score, 60);
});

test('得点（ハイカードA）', function () {
  var cards = [card('ame', 14), card('hoshi', 2)];
  var r = g.calculateScore(cards, []);
  assert.strictEqual(r.hand.type, 'high_card');
  assert.strictEqual(r.rankSum, 14);
  assert.strictEqual(r.chips, 5 + 14);
  assert.strictEqual(r.mult, 1);
  assert.strictEqual(r.score, 19);
});

test('得点（ストレートフラッシュ）', function () {
  var cards = [
    card('tsuki', 10), card('tsuki', 11), card('tsuki', 12),
    card('tsuki', 13), card('tsuki', 14)
  ];
  var r = g.calculateScore(cards, []);
  assert.strictEqual(r.hand.type, 'straight_flush');
  var rankSum = 10 + 11 + 12 + 13 + 14;
  assert.strictEqual(r.rankSum, rankSum);
  assert.strictEqual(r.chips, 100 + rankSum);
  assert.strictEqual(r.mult, 8);
  assert.strictEqual(r.score, (100 + rankSum) * 8);
});

// ---- おまもり効果 ----

test('おまもり: 星くず（常時倍率+4）', function () {
  var cards = [card('ame', 9), card('hoshi', 9)];
  var r = g.calculateScore(cards, ['hoshikuzu']);
  assert.strictEqual(r.mult, 2 + 4);
  assert.strictEqual(r.score, (10 + 18) * 6);
});

test('おまもり: 飴玉（常時チップ+30）', function () {
  var cards = [card('ame', 5), card('hoshi', 5)];
  var r = g.calculateScore(cards, ['amedama']);
  assert.strictEqual(r.chips, 10 + 10 + 30);
  assert.strictEqual(r.score, 50 * 2);
});

test('おまもり: ほしあめの鈴（飴スートチップ）', function () {
  var cards = [card('ame', 8), card('ame', 8), card('hoshi', 3)];
  var r = g.calculateScore(cards, ['ame_bell']);
  // scoring pair both ame → +15*2
  assert.strictEqual(r.chips, 10 + 16 + 30);
});

test('おまもり: ペア結び（ペア系倍率×2）', function () {
  var cards = [card('ame', 6), card('hoshi', 6)];
  var r = g.calculateScore(cards, ['pair_musubi']);
  assert.strictEqual(r.mult, 2 * 2);
  assert.strictEqual(r.score, (10 + 12) * 4);
});

test('おまもり: 満天ほし（フルハウス倍率×2）', function () {
  var cards = [
    card('ame', 4), card('hoshi', 4), card('suzu', 4),
    card('tsuki', 9), card('ame', 9)
  ];
  var r = g.calculateScore(cards, ['manten_hoshi']);
  assert.strictEqual(r.hand.type, 'full_house');
  assert.strictEqual(r.mult, 4 * 2);
});

test('おまもり: 四つ星（フォーカードボーナス）', function () {
  var cards = [
    card('ame', 13), card('hoshi', 13), card('suzu', 13),
    card('tsuki', 13)
  ];
  var r = g.calculateScore(cards, ['yotsu_hoshi']);
  assert.strictEqual(r.hand.type, 'four');
  assert.strictEqual(r.chips, 60 + 52 + 50);
  assert.strictEqual(r.mult, 7 + 5);
});

test('おまもり: ハイカードの祈り', function () {
  var cards = [card('suzu', 12)];
  var r = g.calculateScore(cards, ['high_inori']);
  assert.strictEqual(r.hand.type, 'high_card');
  assert.strictEqual(r.chips, 5 + 12 + 20);
  assert.strictEqual(r.mult, 1 + 2);
});

test('おまもり: フラッシュ提灯はペアには効かない', function () {
  var cards = [card('ame', 2), card('hoshi', 2)];
  var r0 = g.calculateScore(cards, []);
  var r1 = g.calculateScore(cards, ['flush_chochin']);
  assert.strictEqual(r0.mult, r1.mult);
  assert.strictEqual(r0.chips, r1.chips);
});

test('おまもり: ストレート灯籠', function () {
  var cards = [
    card('ame', 2), card('hoshi', 3), card('suzu', 4),
    card('tsuki', 5), card('ame', 6)
  ];
  var r = g.calculateScore(cards, ['straight_toro']);
  assert.strictEqual(r.hand.type, 'straight');
  assert.strictEqual(r.chips, 30 + (2 + 3 + 4 + 5 + 6) + 40);
});

// ---- 目標スコア ----

test('目標スコア: アンテ1 小 < 大 < ボス', function () {
  var s = g.getTargetScore(1, 'small');
  var b = g.getTargetScore(1, 'big');
  var o = g.getTargetScore(1, 'boss');
  assert.strictEqual(s, 100);
  assert.strictEqual(b, 200);
  assert.strictEqual(o, 300);
  assert.ok(s < b && b < o);
});

test('目標スコア: アンテが上がると上昇', function () {
  for (var a = 1; a < 8; a++) {
    assert.ok(g.getTargetScore(a + 1, 'small') > g.getTargetScore(a, 'small'));
    assert.ok(g.getTargetScore(a + 1, 'boss') > g.getTargetScore(a, 'boss'));
  }
});

test('目標スコア: アンテ8ボスは十分に高い', function () {
  assert.ok(g.getTargetScore(8, 'boss') > 2000);
});

test('nextRound: 小→大→ボス→次アンテ', function () {
  assert.deepStrictEqual(g.nextRound(1, 'small'), { ante: 1, roundType: 'big' });
  assert.deepStrictEqual(g.nextRound(1, 'big'), { ante: 1, roundType: 'boss' });
  assert.deepStrictEqual(g.nextRound(1, 'boss'), { ante: 2, roundType: 'small' });
});

test('nextRound: アンテ8ボスで勝利', function () {
  var n = g.nextRound(8, 'boss');
  assert.strictEqual(n.won, true);
});

// ---- まとめ ----

console.log('');
if (process.exitCode) {
  console.log('テスト失敗があります');
} else {
  console.log('すべて成功: ' + passed + ' 件');
}
