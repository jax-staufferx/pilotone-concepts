/* P1-E page logic: theme toggle, header shadow, split-flap boards (flip in once when seen), the board clock, the
   route parcel (its position follows how far you've scrolled through the section; it never holds the page), and the
   flight path (shows where you are; each stop is a normal link). Reduced motion: everything shows its final state. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;

  /* theme */
  var tb = $('#theme-btn'), dark = mm('(prefers-color-scheme: dark)');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : dark.matches; }
  function sync() { if (!tb) return; var d = isDark(); tb.setAttribute('aria-pressed', String(d)); $('.tl', tb).textContent = d ? 'Light mode' : 'Dark mode'; tb.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); }
  if (tb) { sync(); tb.addEventListener('click', function () { var n = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('p1-theme', n); } catch (e) {} sync(); }); }
  var head = $('.head');

  /* reveals */
  $$('.ticket, .svc-card, .note>*, .photos, .plogos li, .partners-in>div, .pass').forEach(function (el) { el.classList.add('js-reveal'); });

  /* split-flap: build the character cells, then flip them in */
  var GLYPHS = 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789+';
  $$('.flap').forEach(function (f) {
    var txt = f.getAttribute('data-flap');
    f.innerHTML = txt.split('').map(function (ch) { return '<span class="c' + (ch === ' ' ? ' sp' : '') + '" data-ch="' + ch + '">' + (reduce ? ch : '&nbsp;') + '</span>'; }).join('');
  });
  function flipIn(f) {
    $$('.c', f).forEach(function (c, i) {
      var target = c.getAttribute('data-ch'); if (target === ' ') return;
      var n = 6 + i * 2 + Math.floor(Math.random() * 4), k = 0;
      (function step() { c.classList.remove('turn'); void c.offsetWidth; c.classList.add('turn');
        c.textContent = k >= n ? target : GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        if (k++ < n) setTimeout(step, 55); })();
    });
  }
  if (!reduce && 'IntersectionObserver' in window) {
    var fio = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { fio.unobserve(e.target); setTimeout(function () { flipIn(e.target); }, (+e.target.dataset.delay || 0)); } }); }, { threshold: .5 });
    $$('.flap').forEach(function (f, i) { f.dataset.delay = (i % 6) * 90; fio.observe(f); });
  }
  /* board clock (the visitor's local time) */
  var clock = $('.clock');
  function tick() { var d = new Date(); clock.textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  if (clock) { tick(); setInterval(tick, 15000); }

  /* route parcel */
  var route = $('#route'), map = $('.map'), path = $('.map-path'), parcel = $('.parcel'), wps = $$('.wp'), legs = $$('.leg');
  var LEN = path ? path.getTotalLength() : 0;
  function placeParcel() {
    if (!map || map.offsetParent === null) return;
    var r = route.getBoundingClientRect(), vh = innerHeight;
    var p = Math.min(1, Math.max(0, (vh * .75 - r.top) / (r.height * .8)));
    if (reduce) p = 1;
    var pt = path.getPointAtLength(LEN * p), w = map.clientWidth, h = map.clientHeight;
    parcel.style.left = (pt.x / 1200 * w) + 'px'; parcel.style.top = (pt.y / 260 * h) + 'px';
    var stops = [.33, .66, .98];
    wps.forEach(function (wp, i) { wp.classList.toggle('on', p >= stops[i]); });
    legs.forEach(function (l, i) { l.classList.toggle('on', p >= (i ? stops[i - 1] : 0) + .02); });
  }

  /* flight path */
  var fp = $('.flightpath'), stopsA = $$('.flightpath a'), secs = stopsA.map(function (a) { return document.getElementById(a.getAttribute('data-for')); });
  function placePath() {
    if (!fp || getComputedStyle(fp).display === 'none') return;  // fixed elements have no offsetParent
    var y = scrollY + innerHeight * .4, on = 0;
    secs.forEach(function (s, i) { if (s && s.getBoundingClientRect().top + scrollY <= y) on = i; });
    stopsA.forEach(function (a, i) { a.classList.toggle('on', i === on); a.classList.toggle('done', i < on); });
    var max = document.documentElement.scrollHeight - innerHeight;
    fp.style.setProperty('--fp', max > 0 ? (scrollY / max).toFixed(3) : 0);
  }

  var busy = false;
  function onScroll() { busy = false; head.classList.toggle('js-scrolled', scrollY > 4); placeParcel(); placePath(); }
  addEventListener('scroll', function () { if (!busy) { busy = true; requestAnimationFrame(onScroll); } }, { passive: true });
  addEventListener('resize', onScroll); onScroll();
})();
