/* P1-D page logic: theme toggle, header shadow, number count-up, brand wall wave, the "how the bureau works" steps
   (scroll position picks the step, the step bar jumps to it; nothing holds the page), and the hero globe
   (three.js, loaded after first paint, only with WebGL). Everything that moves respects reduced motion. */
(function () {
  'use strict';
  var root = document.documentElement, $ = function (s, r) { return (r || document).querySelector(s); }, $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var mm = function (q) { return window.matchMedia ? window.matchMedia(q) : { matches: false }; };
  var reduce = mm('(prefers-reduced-motion: reduce)').matches;

  /* theme: follows the device until the visitor chooses */
  var tb = $('#theme-btn'), dark = mm('(prefers-color-scheme: dark)');
  function isDark() { var t = root.getAttribute('data-theme'); return t ? t === 'dark' : dark.matches; }
  function sync() { if (!tb) return; var d = isDark(); tb.setAttribute('aria-pressed', String(d)); $('.tl', tb).textContent = d ? 'Light mode' : 'Dark mode'; tb.setAttribute('aria-label', d ? 'Switch to light mode' : 'Switch to dark mode'); dispatchEvent(new Event('p1:theme')); }
  if (tb) { sync(); tb.addEventListener('click', function () { var n = isDark() ? 'light' : 'dark'; root.setAttribute('data-theme', n); try { localStorage.setItem('p1-theme', n); } catch (e) {} sync(); }); if (dark.addEventListener) dark.addEventListener('change', sync); }

  /* header shadow */
  var head = $('.head');
  addEventListener('scroll', function () { head.classList.toggle('js-scrolled', scrollY > 4); }, { passive: true });

  /* reveals (CSS scroll timelines where supported) */
  $$('.door, .svc-card, .note>*, .photos, .plogos li, .partners-in>div, .contact-in>*').forEach(function (el) { el.classList.add('js-reveal'); });

  /* numbers count up once; the brand wall arrives in a wave */
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return; io.unobserve(en.target);
        var el = en.target;
        if (el.classList.contains('wall')) { el.classList.add('in'); return; }
        var to = +el.getAttribute('data-count'), t0 = performance.now();
        (function step(t) { var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3); el.textContent = Math.round(to * e) + '+'; if (k < 1) requestAnimationFrame(step); })(t0);
      });
    }, { threshold: 0, rootMargin: '0px 0px -15% 0px' });   // any part on screen: a tall wall can never be 40% visible on a phone
    $$('[data-count]').forEach(function (el) { io.observe(el); });
    var wall = $('.wall'); if (wall) { wall.classList.add('js-wave'); $$('li', wall).forEach(function (li, i) { li.style.transitionDelay = (i % 5) * 60 + Math.floor(i / 5) * 90 + 'ms'; }); io.observe(wall); }
  }

  /* how the bureau works */
  var stage = $('.stage'), steps = $$('.step-d'), bar = $$('.stepbar button'), visual = $('.how-visual');
  var NAMES = ['Connect', 'Terms', 'Flow'], cur = -1;
  var narrow = function () { return mm('(max-width: 1080px)').matches; };
  function setStep(i) {
    if (i === cur) return; cur = i;
    stage.setAttribute('data-stage', i);
    steps.forEach(function (s, k) { s.classList.toggle('on', k === i); });
    bar.forEach(function (b, k) { b.removeAttribute('aria-current'); if (k === i) b.setAttribute('aria-current', 'step'); b.classList.toggle('done', k < i); });
    $('.sl-k', stage).textContent = 'Step 0' + (i + 1); $('.sl-v', stage).textContent = NAMES[i];
  }
  function line() { return narrow() ? head.offsetHeight + visual.offsetHeight + 80 : innerHeight * .5; }
  function pick() { var y = line(), i = 0; steps.forEach(function (s, k) { if (s.getBoundingClientRect().top <= y) i = k; }); setStep(i); }
  if (stage) {
    bar.forEach(function (b, i) { b.addEventListener('click', function () {
      var top = steps[i].getBoundingClientRect().top + scrollY - (narrow() ? head.offsetHeight + visual.offsetHeight - 1 : innerHeight * .5 - steps[i].offsetHeight / 2);
      scrollTo({ top: top, behavior: reduce ? 'auto' : 'smooth' }); setStep(i);
    }); });
    var tick = false;
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(function () { tick = false; pick(); }); } }, { passive: true });
    addEventListener('resize', pick); pick();
  }

  /* hero globe */
  var g = $('.globe');
  if (!g) return;
  var ok = (function () { try { var c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } })();
  if (!ok) return;
  var src = new URL('globe.js', document.currentScript.src).href;
  var go = function () { import(src).then(function (m) { m.initGlobe(g); }).catch(function (e) { console.error(e); }); };
  ('requestIdleCallback' in window) ? requestIdleCallback(go, { timeout: 900 }) : setTimeout(go, 250);
})();
