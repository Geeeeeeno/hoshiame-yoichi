/* ほしあめ夜市 — AdSense 自動広告の読み込み
 * パブリッシャー ID は ads-config.js だけが持つ。
 * 手動の広告枠は置かない。ID が空、または GitHub Pages では何もしない。
 */
(function () {
  "use strict";

  var cfg = window.HOSHIAME_ADS || {};
  var id = cfg.publisherId == null ? "" : String(cfg.publisherId);
  id = id.replace(/^\s+|\s+$/g, "");
  if (!id) return;

  var host = "";
  try {
    host = String(window.location.hostname || "").toLowerCase();
  } catch (e) {
    host = "";
  }
  if (host === "github.io" || host.slice(-10) === ".github.io") return;

  var doc = window.document;
  if (!doc || typeof doc.createElement !== "function") return;
  var head = doc.head || (doc.getElementsByTagName && doc.getElementsByTagName("head")[0]);
  if (!head) return;

  var script = doc.createElement("script");
  script.async = true;
  script.setAttribute("crossorigin", "anonymous");
  script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + encodeURIComponent(id);
  head.appendChild(script);
})();
