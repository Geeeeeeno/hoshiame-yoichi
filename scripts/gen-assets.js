/**
 * One-shot SVG asset generator for ほしあめ夜市
 * Run: node scripts/gen-assets.js
 */
var fs = require('fs');
var path = require('path');
var root = path.join(__dirname, '..', 'assets');

function write(rel, content) {
  var p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.trim() + '\n');
  console.log('wrote', rel);
}

function glow(id) {
  return (
    '<filter id="' + id + '" x="-40%" y="-40%" width="180%" height="180%">' +
    '<feGaussianBlur stdDeviation="1.2" result="b"/>' +
    '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>'
  );
}

function lantern(x, y, color, cls) {
  return (
    '<g class="' + cls + '" transform="translate(' + x + ' ' + y + ')">' +
    '<line x1="0" y1="-18" x2="0" y2="0" stroke="#ffc43d" stroke-width="2"/>' +
    '<ellipse cx="0" cy="22" rx="14" ry="20" fill="' + color + '"/>' +
    '<path d="M-10 -2h20l3 6H-13z" fill="#ffc43d"/>' +
    '<circle cx="-4" cy="18" r="2.5" fill="#fff" opacity=".55"/>' +
    '</g>'
  );
}

function omamoriBase(border, body, motif) {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 96" fill="none">',
    '<defs>' + glow('og') + '</defs>',
    '<g filter="url(#og)" stroke="#120a2e" stroke-width="2.5" stroke-linejoin="round">',
    '<path d="M14 20h44v8l-4 6H18l-4-6z" fill="' + border + '"/>',
    '<path d="M12 28h48c3 0 6 3 6 7v42c0 8-8 14-30 14S6 85 6 77V35c0-4 3-7 6-7z" fill="' + body + '"/>',
    '<path d="M24 12c0-6 24-6 24 0v8H24z" fill="#ffc43d"/>',
    '<line x1="36" y1="4" x2="36" y2="12" stroke="#ffc43d" stroke-width="3" stroke-linecap="round"/>',
    motif,
    '<rect x="18" y="70" width="36" height="8" rx="2" fill="#120a2e" opacity=".25" stroke="none"/>',
    '</g></svg>'
  ].join('');
}

// ---- Suit icons（64×64・共通光源左上・明カード面向け弱グロー）----
var SUIT_OUTLINE = '#120a2e';
var SUIT_SW = '2.75';

function suitSoftGlow(id, color) {
  return (
    '<filter id="' + id + '" x="-50%" y="-50%" width="200%" height="200%" color-interpolation-filters="sRGB">' +
    '<feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="b"/>' +
    '<feFlood flood-color="' + color + '" flood-opacity="0.45" result="c"/>' +
    '<feComposite in="c" in2="b" operator="in" result="g"/>' +
    '<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>' +
    '</filter>'
  );
}

function suitGrad(id, c1, c2, c3) {
  return (
    '<linearGradient id="' + id + '" x1="18%" y1="12%" x2="82%" y2="88%">' +
    '<stop offset="0%" stop-color="' + c1 + '"/>' +
    '<stop offset="48%" stop-color="' + c2 + '"/>' +
    '<stop offset="100%" stop-color="' + c3 + '"/>' +
    '</linearGradient>'
  );
}

/** 飴: 雫型ハードキャンディ＋太めのねじり縞 */
function suitAmeSvg() {
  var drop =
    'M32 7C26 16 16 26 16 38c0 10 7 17 16 17s16-7 16-17C48 26 38 16 32 7z';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    '<defs>',
    suitGrad('ame-base', '#ff9ae8', '#ff4fd8', '#c2189a'),
    suitSoftGlow('ame-glow', '#ff4fd8'),
    '<clipPath id="ame-clip"><path d="' + drop + '"/></clipPath>',
    '<radialGradient id="ame-gloss" cx="34%" cy="28%" r="42%">',
    '<stop offset="0%" stop-color="#fff" stop-opacity=".9"/>',
    '<stop offset="55%" stop-color="#fff" stop-opacity=".15"/>',
    '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>',
    '</radialGradient>',
    '</defs>',
    '<g class="glow" filter="url(#ame-glow)" opacity=".55">',
    '<path d="' + drop + '" fill="#ff4fd8"/>',
    '</g>',
    '<g class="base">',
    '<path d="' + drop + '" fill="url(#ame-base)" stroke="' + SUIT_OUTLINE + '" stroke-width="' + SUIT_SW + '" stroke-linejoin="round"/>',
    '</g>',
    '<g class="inner-shadow" clip-path="url(#ame-clip)">',
    '<path d="M40 18c8 10 10 22 4 32-4 6-12 10-20 8 14-2 22-14 16-40z" fill="#9a0f72" opacity=".35"/>',
    '</g>',
    // ねじり飴の太い斜め縞（白／濃ピンク交互・帯を広く）
    '<g class="detail" clip-path="url(#ame-clip)">',
    '<path d="M4 32L38 6l12 14L16 46z" fill="#ffffff" opacity=".88"/>',
    '<path d="M6 48L42 18l11 13L17 61z" fill="#d01090" opacity=".55"/>',
    '<path d="M12 60L46 32l10 12L22 72z" fill="#ffffff" opacity=".7"/>',
    '</g>',
    '<g class="rim" fill="none" stroke="#ffb8ef" stroke-width="1.4" stroke-linecap="round" opacity=".55">',
    '<path d="M44 34c1 6-2 14-10 18"/>',
    '</g>',
    '<g class="gloss">',
    '<ellipse cx="26" cy="26" rx="7" ry="9" fill="url(#ame-gloss)" transform="rotate(-18 26 26)"/>',
    '<circle cx="38" cy="22" r="1.6" fill="#fff" opacity=".85"/>',
    '<circle cx="42" cy="30" r="1" fill="#fff" opacity=".65"/>',
    '</g>',
    '</svg>'
  ].join('');
}

/** 星: ふっくら5尖＋5面の面取り（右のはみ出し線なし） */
function suitHoshiSvg() {
  // やや丸みのある五芒星（光学中心を少し下げ）
  var star =
    'M32 8.5l5.2 12.4 13.3.6-10.3 8.4 3.5 12.8L32 35.8 18.3 42.7l3.5-12.8-10.3-8.4 13.3-.6z';
  // 中心から各尖へ広がる5ファセット（輪郭の二重星にしない）
  var c = '32 31';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    '<defs>',
    suitGrad('hoshi-base', '#ffe9a0', '#ffc43d', '#c88608'),
    suitSoftGlow('hoshi-glow', '#ffc43d'),
    '<clipPath id="hoshi-clip"><path d="' + star + '"/></clipPath>',
    '</defs>',
    '<g class="glow" filter="url(#hoshi-glow)" opacity=".5">',
    '<path d="' + star + '" fill="#ffc43d"/>',
    '</g>',
    '<g class="base">',
    '<path d="' + star + '" fill="url(#hoshi-base)" stroke="' + SUIT_OUTLINE + '" stroke-width="' + SUIT_SW + '" stroke-linejoin="round"/>',
    '</g>',
    '<g class="detail" clip-path="url(#hoshi-clip)">',
    // 尖→隣の谷→中心の5面（輪郭線なし・明暗のみ）
    '<path d="M' + c + 'L26.8 20.9 32 8.5 37.2 20.9Z" fill="#fff8d8" opacity=".65"/>',
    '<path d="M' + c + 'L37.2 20.9 50.5 21.5 40.2 29.9Z" fill="#ffe08a" opacity=".38"/>',
    '<path d="M' + c + 'L40.2 29.9 43.5 42.7 32 35.8Z" fill="#a86a00" opacity=".42"/>',
    '<path d="M' + c + 'L32 35.8 20.5 42.7 23.8 29.9Z" fill="#7a4a00" opacity=".36"/>',
    '<path d="M' + c + 'L23.8 29.9 13.5 21.5 26.8 20.9Z" fill="#fff1b8" opacity=".42"/>',
    '</g>',
    '<g class="gloss">',
    '<ellipse cx="26" cy="20" rx="5.5" ry="4" fill="#fff" opacity=".55" transform="rotate(-25 26 20)"/>',
    '<circle cx="38" cy="18" r="1.5" fill="#fff" opacity=".9"/>',
    '</g>',
    '</svg>'
  ].join('');
}

/** 鈴: 丸鈴＋太め頂ループ＋横帯＋口のスリット（両端の丸穴） */
function suitSuzuSvg() {
  var body = 'M14 30c0-11 8-18 18-18s18 7 18 18c0 12-8 22-18 22S14 42 14 30z';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    '<defs>',
    suitGrad('suzu-base', '#b8fbff', '#3ff3ff', '#1498a8'),
    suitSoftGlow('suzu-glow', '#3ff3ff'),
    '<clipPath id="suzu-clip"><path d="' + body + '"/></clipPath>',
    '<radialGradient id="suzu-gloss" cx="32%" cy="30%" r="45%">',
    '<stop offset="0%" stop-color="#fff" stop-opacity=".85"/>',
    '<stop offset="60%" stop-color="#fff" stop-opacity=".1"/>',
    '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>',
    '</radialGradient>',
    '</defs>',
    '<g class="glow" filter="url(#suzu-glow)" opacity=".5">',
    '<path d="' + body + '" fill="#3ff3ff"/>',
    '<path d="M32 5c-5 0-8.5 3.5-8.5 8.5V15h17v-1.5C40.5 8.5 37 5 32 5z" fill="#3ff3ff"/>',
    '</g>',
    '<g class="base">',
    // 頂ループ（塗りで太さを確保）
    '<path d="M32 4.5c-4.8 0-8.5 3.7-8.5 8.5V16h5V12.5c0-2 1.5-3.5 3.5-3.5s3.5 1.5 3.5 3.5V16h5v-3C40.5 8.2 36.8 4.5 32 4.5z" fill="#7af7ff" stroke="' + SUIT_OUTLINE + '" stroke-width="' + SUIT_SW + '" stroke-linejoin="round"/>',
    '<path d="' + body + '" fill="url(#suzu-base)" stroke="' + SUIT_OUTLINE + '" stroke-width="' + SUIT_SW + '" stroke-linejoin="round"/>',
    '</g>',
    '<g class="inner-shadow" clip-path="url(#suzu-clip)">',
    '<path d="M38 20c10 8 12 22 4 32-6 7-16 10-24 6 16-2 26-16 20-38z" fill="#0d6e7a" opacity=".32"/>',
    '</g>',
    '<g class="detail">',
    '<path d="M16 31h32" stroke="' + SUIT_OUTLINE + '" stroke-width="2.2" stroke-linecap="round" opacity=".35"/>',
    '<rect x="17" y="28.5" width="30" height="5" rx="2" fill="#9ef8ff" stroke="' + SUIT_OUTLINE + '" stroke-width="1.4" opacity=".75"/>',
    // 口: 暗いスリット＋両端の丸穴（小サイズでも読める）
    '<rect x="26" y="45" width="12" height="3.6" rx="1.2" fill="#0a4a55"/>',
    '<circle cx="26" cy="46.8" r="2.6" fill="#062830"/>',
    '<circle cx="38" cy="46.8" r="2.6" fill="#062830"/>',
    '<circle cx="26" cy="46.8" r="1.3" fill="#041820"/>',
    '<circle cx="38" cy="46.8" r="1.3" fill="#041820"/>',
    '</g>',
    '<g class="rim" fill="none" stroke="#b8fbff" stroke-width="1.3" stroke-linecap="round" opacity=".5">',
    '<path d="M46 34c0 8-5 16-12 19"/>',
    '</g>',
    '<g class="gloss">',
    '<ellipse cx="24" cy="26" rx="8" ry="10" fill="url(#suzu-gloss)"/>',
    '<circle cx="40" cy="24" r="1.5" fill="#fff" opacity=".85"/>',
    '</g>',
    '</svg>'
  ].join('');
}

/** 月: ふっくら三日月（最厚部≈24–26／64）＋クレーター */
function suitTsukiSvg() {
  // ベジェで太いクレセント（左が厚い・先端丸・開口は右）
  // 中央付近: 外縁 x≈6 → 内縁 x≈31 → 厚さ≈25
  var crescent =
    'M51 10C26 5 5 13 5 32C5 51 26 59 51 54C37 50 33 42 33 32C33 22 37 14 51 10z';
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">',
    '<defs>',
    suitGrad('tsuki-base', '#c9b6ff', '#a894ff', '#8a6cff'),
    suitSoftGlow('tsuki-glow', '#9b5cff'),
    '<clipPath id="tsuki-clip"><path d="' + crescent + '"/></clipPath>',
    '<radialGradient id="tsuki-gloss" cx="28%" cy="30%" r="48%">',
    '<stop offset="0%" stop-color="#fff" stop-opacity=".85"/>',
    '<stop offset="55%" stop-color="#fff" stop-opacity=".12"/>',
    '<stop offset="100%" stop-color="#fff" stop-opacity="0"/>',
    '</radialGradient>',
    '</defs>',
    '<g class="glow" filter="url(#tsuki-glow)" opacity=".5">',
    '<path d="' + crescent + '" fill="#a894ff"/>',
    '</g>',
    '<g class="base">',
    '<path d="' + crescent + '" fill="url(#tsuki-base)" stroke="' + SUIT_OUTLINE + '" stroke-width="' + SUIT_SW + '" stroke-linejoin="round"/>',
    '</g>',
    '<g class="inner-shadow" clip-path="url(#tsuki-clip)">',
    '<path d="M20 22c2 14 12 26 28 28-16-1-26-14-28-28 0-5 1-9 3-13-1 3-3 8-3 13z" fill="#5a48b0" opacity=".42"/>',
    '</g>',
    '<g class="detail" clip-path="url(#tsuki-clip)">',
    '<circle cx="18" cy="26" r="4.2" fill="#6e5ad0" opacity=".7"/>',
    '<circle cx="16" cy="40" r="3.2" fill="#5a48b0" opacity=".65"/>',
    '<circle cx="24" cy="48" r="2.6" fill="#6e5ad0" opacity=".6"/>',
    '</g>',
    '<g class="rim" fill="none" stroke="#e4d8ff" stroke-width="1.8" stroke-linecap="round" opacity=".7">',
    '<path d="M34 18c-1 5-1 12 1 18 2 6 6 11 11 14"/>',
    '</g>',
    '<g class="gloss">',
    '<ellipse cx="16" cy="22" rx="7" ry="11" fill="url(#tsuki-gloss)" transform="rotate(-6 16 22)"/>',
    '<circle cx="20" cy="15" r="1.7" fill="#fff" opacity=".9"/>',
    '</g>',
    '</svg>'
  ].join('');
}

function writeSuitIcons() {
  write('suit-ame.svg', suitAmeSvg());
  write('suit-hoshi.svg', suitHoshiSvg());
  write('suit-suzu.svg', suitSuzuSvg());
  write('suit-tsuki.svg', suitTsukiSvg());
}

writeSuitIcons();

write('card-back.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 200" fill="none">',
  '<defs>',
  '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">',
  '<stop offset="0%" stop-color="#1a0a3a"/><stop offset="50%" stop-color="#2a1458"/><stop offset="100%" stop-color="#0e2040"/>',
  '</linearGradient>',
  '<pattern id="geo" width="28" height="28" patternUnits="userSpaceOnUse">',
  '<path d="M14 2l4 10h10l-8 6 3 10-9-6-9 6 3-10-8-6h10z" fill="none" stroke="#9b5cff" stroke-width="1" opacity=".35"/>',
  '</pattern>',
  glow('lg'),
  '</defs>',
  '<rect width="140" height="200" rx="12" fill="url(#bg)"/>',
  '<rect x="8" y="8" width="124" height="184" rx="8" fill="url(#geo)" stroke="#ff4fd8" stroke-width="2"/>',
  '<rect x="16" y="16" width="108" height="168" rx="6" fill="none" stroke="#3ff3ff" stroke-width="1.5" opacity=".6"/>',
  '<g filter="url(#lg)" transform="translate(70 100)">',
  '<ellipse cx="0" cy="8" rx="22" ry="28" fill="#ff4fd8" stroke="#120a2e" stroke-width="3"/>',
  '<path d="M-10 -18h20l4 8H-14z" fill="#ffc43d" stroke="#120a2e" stroke-width="2.5" stroke-linejoin="round"/>',
  '<path d="M-18 -22c6-10 30-10 36 0" stroke="#ffc43d" stroke-width="3" stroke-linecap="round" fill="none"/>',
  '<circle cx="-6" cy="4" r="3" fill="#ffc43d"/><circle cx="6" cy="10" r="2.5" fill="#3ff3ff"/><circle cx="0" cy="18" r="2" fill="#fff" opacity=".8"/>',
  '</g>',
  '<g fill="#ffc43d" opacity=".9">',
  '<path d="M28 36l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z"/>',
  '<path d="M108 36l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z"/>',
  '<path d="M28 160l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z"/>',
  '<path d="M108 160l2 5h5l-4 3 1.5 5-4.5-3-4.5 3 1.5-5-4-3h5z"/>',
  '</g>',
  '</svg>'
].join(''));

write('logo.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 580 132" fill="none" role="img" aria-label="ほしあめ夜市">',
  '<defs>',
  '<filter id="neon" x="-20%" y="-45%" width="140%" height="190%">',
  '<feGaussianBlur stdDeviation="3" result="b"/>',
  '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>',
  '</filter>',
  '</defs>',
  '<g transform="translate(10 24) scale(.82)">',
  '<path d="M8 12c0-5 5-8 12-8s12 3 12 8v3H8v-3z" fill="#ff4fd8" stroke="#120a2e" stroke-width="3"/>',
  '<path d="M6 15h28c2 0 3 2 3 4v14c0 5-5 9-17 9S3 38 3 33V19c0-2 1-4 3-4z" fill="#ff8ae8" stroke="#120a2e" stroke-width="3"/>',
  '</g>',
  '<g transform="translate(528 18)">',
  '<path d="M16 0l4 10h11l-9 7 3.5 11L16 21l-9.5 7 3.5-11-9-7h11z" fill="#ffc43d" stroke="#120a2e" stroke-width="2.5" stroke-linejoin="round"/>',
  '</g>',
  '<g filter="url(#neon)" font-family="Hiragino Maru Gothic ProN, Yu Gothic, Meiryo, sans-serif" font-weight="900" letter-spacing="2">',
  '<text x="290" y="82" text-anchor="middle" fill="none" stroke="#3ff3ff" stroke-width="11" stroke-linejoin="round" opacity=".9">',
  '<tspan font-size="64">ほしあめ</tspan><tspan font-size="60" dx="2">夜市</tspan></text>',
  '<text x="290" y="82" text-anchor="middle" fill="none" stroke="#ff4fd8" stroke-width="6" stroke-linejoin="round">',
  '<tspan font-size="64">ほしあめ</tspan><tspan font-size="60" dx="2">夜市</tspan></text>',
  '<text x="290" y="82" text-anchor="middle" fill="#fff0fc" stroke="#120a2e" stroke-width="1.8" paint-order="stroke fill">',
  '<tspan font-size="64">ほしあめ</tspan><tspan font-size="60" dx="2">夜市</tspan></text>',
  '</g>',
  '<circle cx="58" cy="104" r="3.4" fill="#3ff3ff"/><circle cx="522" cy="100" r="3" fill="#ff4fd8"/>',
  '</svg>'
].join(''));

write('bg.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice" fill="none">',
  '<defs>',
  '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
  '<stop offset="0%" stop-color="#08041a"/><stop offset="55%" stop-color="#120a2e"/><stop offset="100%" stop-color="#1a0a28"/>',
  '</linearGradient>',
  '<style>',
  '@keyframes sway{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(3deg)}}',
  '@keyframes twinkle{0%,100%{opacity:.4}50%{opacity:1}}',
  '.lan{transform-origin:center top;animation:sway 3.5s ease-in-out infinite}',
  '.lan2{animation-duration:4.2s;animation-delay:-1s}',
  '.lan3{animation-duration:3.1s;animation-delay:-2s}',
  '.st{animation:twinkle 2.8s ease-in-out infinite}',
  '@media (prefers-reduced-motion:reduce){.lan,.lan2,.lan3,.st{animation:none}}',
  '</style>',
  '</defs>',
  '<rect width="1200" height="800" fill="url(#sky)"/>',
  '<g fill="#fff">',
  '<circle class="st" cx="80" cy="60" r="1.5"/><circle class="st" cx="200" cy="120" r="1" style="animation-delay:.4s"/>',
  '<circle class="st" cx="340" cy="40" r="1.8" fill="#ffc43d" style="animation-delay:.8s"/>',
  '<circle class="st" cx="520" cy="90" r="1.2" style="animation-delay:1.2s"/>',
  '<circle class="st" cx="700" cy="50" r="1.5" fill="#3ff3ff" style="animation-delay:.2s"/>',
  '<circle class="st" cx="880" cy="110" r="1" style="animation-delay:1.6s"/>',
  '<circle class="st" cx="1040" cy="70" r="1.6" fill="#ff4fd8" style="animation-delay:.6s"/>',
  '<circle class="st" cx="150" cy="200" r="1"/><circle class="st" cx="980" cy="180" r="1.3"/>',
  '<circle class="st" cx="600" cy="160" r="1" fill="#9b5cff"/>',
  '</g>',
  '<path d="M1080 90c-28 4-48 28-48 56s20 52 48 56c-36-4-64-32-64-68s28-64 64-68z" fill="#ffc43d" stroke="#120a2e" stroke-width="3" opacity=".95"/>',
  '<g fill="#0a0618" opacity=".92">',
  '<path d="M0 560h180l20-80h140l20 80h200l-30-120h160l-20 120h200l40-140h180l20 140H1200V800H0z"/>',
  '<rect x="40" y="500" width="100" height="60"/><rect x="280" y="480" width="120" height="80"/>',
  '<rect x="520" y="490" width="140" height="70"/><rect x="780" y="470" width="110" height="90"/>',
  '<rect x="1000" y="500" width="130" height="60"/>',
  '<path d="M30 500h120l-10-30H40z" fill="#1a1030"/><path d="M270 480h140l-15-35H285z" fill="#1a1030"/>',
  '<path d="M510 490h160l-12-32H522z" fill="#1a1030"/><path d="M770 470h130l-10-28H780z" fill="#1a1030"/>',
  '</g>',
  '<g stroke="#120a2e" stroke-width="2.5" stroke-linejoin="round">',
  // 提灯は屋台の直前に限定。左端シアンは置かず、UI帯と重ならない高さへ
  lantern(280, 528, '#ff4fd8', 'lan'),
  lantern(440, 518, '#ffc43d', 'lan2'),
  lantern(600, 522, '#ff4fd8', 'lan3'),
  lantern(760, 515, '#9b5cff', 'lan'),
  lantern(920, 525, '#ffc43d', 'lan2'),
  lantern(1080, 532, '#3ff3ff', 'lan3'),
  '</g>',
  '</svg>'
].join(''));

write('faces/jack.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" fill="none">',
  '<g stroke="#120a2e" stroke-width="2.2" stroke-linejoin="round">',
  '<ellipse cx="40" cy="78" rx="22" ry="10" fill="#3ff3ff" opacity=".35"/>',
  '<circle cx="40" cy="32" r="14" fill="#ffdbb8"/>',
  '<path d="M28 44c2 18 22 18 24 0" fill="#ff4fd8"/>',
  '<path d="M26 28c4-12 24-12 28 0" fill="#9b5cff"/>',
  '<circle cx="35" cy="32" r="2" fill="#120a2e"/><circle cx="45" cy="32" r="2" fill="#120a2e"/>',
  '<path d="M36 38c2 3 6 3 8 0" stroke="#120a2e" stroke-width="1.5" fill="none"/>',
  '<path d="M52 48l18 8" stroke="#ffc43d" stroke-width="2.5"/>',
  '<ellipse cx="72" cy="58" rx="8" ry="6" fill="#b8fbff" opacity=".7" stroke="#3ff3ff"/>',
  '<ellipse cx="28" cy="72" rx="10" ry="6" fill="#ff4fd8"/>',
  '<path d="M18 72l-6-5v10z" fill="#ff8ae8"/>',
  '<circle cx="32" cy="70" r="1.5" fill="#120a2e"/>',
  '</g></svg>'
].join(''));

write('faces/queen.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" fill="none">',
  '<g stroke="#120a2e" stroke-width="2.2" stroke-linejoin="round">',
  '<path d="M22 88c4-28 32-28 36 0" fill="#9b5cff"/>',
  '<circle cx="40" cy="36" r="15" fill="#ffdbb8"/>',
  '<path d="M22 28c6-16 30-16 36 0l-6 8H28z" fill="#ffc43d"/>',
  '<path d="M26 34c4-10 24-10 28 0v10c-4 8-24 8-28 0z" fill="#fff0e0" stroke="#120a2e"/>',
  '<path d="M32 40l4 6 4-6M40 40l4 6 4-6" fill="#ff4fd8" stroke="#120a2e" stroke-width="1.5"/>',
  '<circle cx="34" cy="38" r="2" fill="#120a2e"/><circle cx="46" cy="38" r="2" fill="#120a2e"/>',
  '<path d="M40 44v6" stroke="#ff4fd8" stroke-width="2"/>',
  '<path d="M18 22l8 12M62 22l-8 12" stroke="#ffc43d" stroke-width="3" stroke-linecap="round"/>',
  '<circle cx="16" cy="18" r="4" fill="#ff4fd8"/><circle cx="64" cy="18" r="4" fill="#ff4fd8"/>',
  '</g></svg>'
].join(''));

write('faces/king.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 100" fill="none">',
  '<g stroke="#120a2e" stroke-width="2.2" stroke-linejoin="round">',
  '<path d="M20 90c6-30 34-30 40 0" fill="#1a3a6e"/>',
  '<circle cx="40" cy="34" r="14" fill="#ffdbb8"/>',
  '<path d="M26 28c2-14 26-14 28 0" fill="#120a2e"/>',
  '<path d="M24 20h32l-4 10H28z" fill="#ffc43d"/>',
  '<path d="M28 20l4-8 4 8 4-8 4 8 4-8 4 8" fill="#ff4fd8"/>',
  '<circle cx="35" cy="34" r="2" fill="#120a2e"/><circle cx="45" cy="34" r="2" fill="#120a2e"/>',
  '<path d="M35 40c2 3 8 3 10 0" fill="none" stroke-width="1.8"/>',
  '<line x1="58" y1="48" x2="66" y2="58" stroke="#ffc43d" stroke-width="2.5"/>',
  '<ellipse cx="68" cy="68" rx="10" ry="14" fill="#ff4fd8"/>',
  '<path d="M60 56h16l2 5H58z" fill="#ffc43d"/>',
  '<circle cx="66" cy="66" r="2.5" fill="#ffc43d"/>',
  '</g></svg>'
].join(''));

write('omamori/hoshikuzu.svg', omamoriBase('#ffc43d', '#3a2060',
  '<path d="M36 42l3 8h8l-6.5 5 2.5 8L36 58l-7 5 2.5-8-6.5-5h8z" fill="#ffc43d"/>' +
  '<circle cx="22" cy="50" r="2" fill="#3ff3ff"/><circle cx="50" cy="48" r="1.5" fill="#ff4fd8"/>'));

write('omamori/amedama.svg', omamoriBase('#ff4fd8', '#4a1840',
  '<circle cx="36" cy="52" r="14" fill="#ff4fd8"/>' +
  '<path d="M28 44c8-4 16 0 16 8" stroke="#fff" stroke-width="2" fill="none" opacity=".5"/>' +
  '<path d="M24 52h24" stroke="#120a2e" stroke-width="2" opacity=".3"/>'));

write('omamori/ame_bell.svg', omamoriBase('#3ff3ff', '#143848',
  '<path d="M28 40c0 0 2-4 8-4s8 4 8 4c4 2 6 8 6 12 0 6-4 12-14 12S22 58 22 52c0-4 2-10 6-12z" fill="#3ff3ff"/>' +
  '<circle cx="36" cy="64" r="3.5" fill="#ffc43d"/>' +
  '<circle cx="48" cy="46" r="5" fill="#ff4fd8" opacity=".85"/>'));

write('omamori/tsukiakari.svg', omamoriBase('#9b5cff', '#241848',
  '<path d="M42 38c-10 2-16 10-16 20s6 18 16 20c-12-2-22-12-22-26S30 40 42 38z" fill="#9b5cff"/>' +
  '<circle cx="48" cy="48" r="2" fill="#ffc43d"/><circle cx="52" cy="58" r="1.5" fill="#3ff3ff"/>'));

write('omamori/pair_musubi.svg', omamoriBase('#ff4fd8', '#3a1840',
  '<path d="M24 48c0-8 8-12 12-4 4-8 12-4 12 4 0 10-12 18-12 18S24 58 24 48z" fill="#ff4fd8"/>' +
  '<path d="M28 52c4 2 12 2 16 0" stroke="#fff" stroke-width="2" fill="none" opacity=".4"/>'));

write('omamori/straight_toro.svg', omamoriBase('#ffc43d', '#3a2810',
  '<rect x="26" y="40" width="20" height="28" rx="3" fill="#ffc43d"/>' +
  '<path d="M24 40h24l-4-6H28z" fill="#9b5cff"/>' +
  '<rect x="30" y="46" width="12" height="8" fill="#ff4fd8" opacity=".7"/>' +
  '<line x1="36" y1="68" x2="36" y2="74" stroke="#ffc43d" stroke-width="3"/>'));

write('omamori/flush_chochin.svg', omamoriBase('#ff4fd8', '#401828',
  '<ellipse cx="36" cy="54" rx="14" ry="18" fill="#ff4fd8"/>' +
  '<path d="M26 38h20l3 6H23z" fill="#ffc43d"/>' +
  '<circle cx="32" cy="50" r="2.5" fill="#ffc43d"/><circle cx="42" cy="56" r="2" fill="#3ff3ff"/>'));

write('omamori/manten_hoshi.svg', omamoriBase('#9b5cff', '#201040',
  '<g fill="#ffc43d">' +
  '<path d="M36 38l2 5h5l-4 3 1.5 5L36 48l-4.5 3 1.5-5-4-3h5z"/>' +
  '<path d="M22 52l1.5 4h4l-3.2 2.4 1.2 4L22 60l-3.5 2.4 1.2-4-3.2-2.4h4z"/>' +
  '<path d="M50 52l1.5 4h4l-3.2 2.4 1.2 4L50 60l-3.5 2.4 1.2-4-3.2-2.4h4z"/>' +
  '<path d="M28 64l1.2 3h3.2l-2.6 1.8.9 3L28 70l-2.7 1.8.9-3-2.6-1.8h3.2z"/>' +
  '<path d="M44 64l1.2 3h3.2l-2.6 1.8.9 3L44 70l-2.7 1.8.9-3-2.6-1.8h3.2z"/>' +
  '</g>'));

write('omamori/yotsu_hoshi.svg', omamoriBase('#3ff3ff', '#102838',
  '<g fill="#ffc43d">' +
  '<path d="M24 46l2.5 6h6.5l-5 4 2 6.5L24 58l-6 4.5 2-6.5-5-4h6.5z"/>' +
  '<path d="M48 46l2.5 6h6.5l-5 4 2 6.5L48 58l-6 4.5 2-6.5-5-4h6.5z"/>' +
  '</g>' +
  '<g fill="#3ff3ff">' +
  '<path d="M24 68l2 5h5.5l-4.2 3.2 1.6 5.2L24 78l-4.9 3.4 1.6-5.2-4.2-3.2H24z"/>' +
  '<path d="M48 68l2 5h5.5l-4.2 3.2 1.6 5.2L48 78l-4.9 3.4 1.6-5.2-4.2-3.2H48z"/>' +
  '</g>'));

write('omamori/high_inori.svg', omamoriBase('#9b5cff', '#281848',
  '<path d="M36 40c-8 10-14 18-14 26 0 8 6 12 14 12s14-4 14-12c0-8-6-16-14-26z" fill="#c4a0ff"/>' +
  '<circle cx="36" cy="58" r="5" fill="#ffc43d"/>' +
  '<path d="M36 42v-6M30 46l-4-4M42 46l4-4" stroke="#ffc43d" stroke-width="2" stroke-linecap="round"/>'));

write('ui/chip.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">',
  '<circle cx="20" cy="20" r="16" fill="#1a5080" stroke="#120a2e" stroke-width="2.5"/>',
  '<circle cx="20" cy="20" r="11" fill="none" stroke="#3ff3ff" stroke-width="2" stroke-dasharray="3 2"/>',
  '<circle cx="20" cy="20" r="6" fill="#3ff3ff" stroke="#120a2e" stroke-width="2"/>',
  '<text x="20" y="23" text-anchor="middle" font-size="8" font-weight="700" fill="#120a2e" font-family="sans-serif">C</text>',
  '</svg>'
].join(''));

write('ui/mult.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">',
  '<circle cx="20" cy="20" r="16" fill="#801040" stroke="#120a2e" stroke-width="2.5"/>',
  '<circle cx="20" cy="20" r="11" fill="none" stroke="#ff4fd8" stroke-width="2" stroke-dasharray="3 2"/>',
  '<circle cx="20" cy="20" r="6" fill="#ff4fd8" stroke="#120a2e" stroke-width="2"/>',
  '<path d="M16 16l8 8M24 16l-8 8" stroke="#120a2e" stroke-width="2.5" stroke-linecap="round"/>',
  '</svg>'
].join(''));

write('ui/coin.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">',
  '<circle cx="20" cy="20" r="16" fill="#ffc43d" stroke="#120a2e" stroke-width="2.5"/>',
  '<circle cx="20" cy="20" r="11" fill="#ffe9a0" stroke="#b8860b" stroke-width="1.5"/>',
  '<path d="M20 12v16M15 16c0-2 2.5-3.5 5-3.5s5 1.2 5 3.5-2 3-5 3.5-5 1.5-5 3.5 2.5 3.5 5 3.5 5-1.5 5-3.5" stroke="#120a2e" stroke-width="2" stroke-linecap="round" fill="none"/>',
  '</svg>'
].join(''));

write('ui/play.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">',
  '<rect x="4" y="6" width="20" height="28" rx="3" fill="#f8f4ff" stroke="#120a2e" stroke-width="2.5"/>',
  '<path d="M22 14l12 6-12 6V14z" fill="#ff4fd8" stroke="#120a2e" stroke-width="2.5" stroke-linejoin="round"/>',
  '</svg>'
].join(''));

write('ui/discard.svg', [
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" fill="none">',
  '<rect x="8" y="4" width="18" height="26" rx="3" fill="#f8f4ff" stroke="#120a2e" stroke-width="2.5" transform="rotate(-12 17 17)"/>',
  '<path d="M14 22l12 12M26 22L14 34" stroke="#ff4fd8" stroke-width="3.5" stroke-linecap="round"/>',
  '</svg>'
].join(''));

console.log('done');
