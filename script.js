/* PILOT ONE demo page: theme toggle, header shadow, looping logo rails, scroll reveals, number count-up.
   Every feature checks its elements first; anything that moves respects prefers-reduced-motion. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (id) { return document.getElementById(id); };
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;

  /* theme: follows the device until the visitor chooses */
  var tb = $('theme-btn'), dark = mm('(prefers-color-scheme: dark)');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : dark.matches; }
  function sync() { if (!tb) return; var d = isDark(); tb.setAttribute('aria-pressed', String(d)); tb.querySelector('.tl').textContent = d ? 'Light mode' : 'Dark mode'; tb.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); }
  if (tb) { sync(); tb.addEventListener('click', function () { var n = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('p1-theme', n); } catch (e) {} sync(); }); if (dark.addEventListener) dark.addEventListener('change', sync); }

  /* header shadow once scrolled */
  var head = document.querySelector('.head');
  if (head) { var on = function () { head.classList.toggle('js-scrolled', scrollY > 4); }; addEventListener('scroll', on, { passive: true }); on(); }

  /* logo rails: duplicate each row once so the loop is seamless (the copy is hidden from screen readers) */
  if (!reduce) document.querySelectorAll('[data-marquee] .row').forEach(function (row) {
    [].slice.call(row.children).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); var im = c.querySelector('img'); if (im) im.alt = ''; row.appendChild(c); });
    row.classList.add('js-dup');
  });

  /* scroll reveals (CSS does the motion where scroll timelines exist) */
  var main = document.querySelector('main');
  if (main) main.querySelectorAll('.note>*,.statement,.side,.svc-list li,.start,.plogos li,.partners-in>div,.contact-in>*,.photos').forEach(function (el) { el.classList.add('js-reveal'); });

  /* the three numbers count up once when they come into view */
  if (!reduce && 'IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        var el = en.target, to = +el.getAttribute('data-count'), t0 = performance.now(), dur = 1400;
        (function step(t) { var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + '+'; if (k < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: .6 });
    document.querySelectorAll('[data-count]').forEach(function (el) { io.observe(el); });
  }
})();
