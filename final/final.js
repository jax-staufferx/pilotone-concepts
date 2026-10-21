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

/* Final: flowing logo rows (copied from the original design) and the partner registration form */
(function () {
  'use strict';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) document.querySelectorAll('[data-marquee] .row').forEach(function (row) {
    [].slice.call(row.children).forEach(function (li) { var c = li.cloneNode(true); c.setAttribute('aria-hidden', 'true'); var im = c.querySelector('img'); if (im) im.alt = ''; row.appendChild(c); });
    row.classList.add('js-dup');
  });

  var form = document.getElementById('pform');
  if (!form) return;
  var msg = form.querySelector('.pmsg');
  var TO = 'pilot@pilotone.eu';
  function say(t, bad) { msg.textContent = t; msg.classList.toggle('bad', !!bad); }
  function data() {
    var f = new FormData(form), cats = f.getAll('categories');
    return { name: (f.get('name') || '').trim(), company: (f.get('company') || '').trim(), email: (f.get('email') || '').trim(),
      phone: (f.get('phone') || '').trim(), country: (f.get('country') || '').trim(), role: f.get('role') || '',
      categories: cats.join(', '), message: (f.get('message') || '').trim(), consent: f.get('consent') === 'yes' };
  }
  function check(d) {
    if (!d.name) return ['name', 'Please add your name.'];
    if (!d.company) return ['company', 'Please add your company.'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)) return ['email', 'Please add a valid email address.'];
    if (!d.country) return ['country', 'Please add your country.'];
    if (!d.role) return ['role', 'Please choose selling, buying or both.'];
    if (!d.consent) return ['consent', 'Please tick the box so we can contact you.'];
    return null;
  }
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var d = data(), bad = check(d);
    form.querySelectorAll('[aria-invalid]').forEach(function (x) { x.removeAttribute('aria-invalid'); });
    if (bad) { var el = form.querySelector('[name="' + bad[0] + '"]'); if (el) { el.setAttribute('aria-invalid', 'true'); el.focus(); } say(bad[1], true); return; }
    var endpoint = form.getAttribute('data-endpoint');
    if (endpoint) {
      var btn = form.querySelector('button'); btn.disabled = true; say('Sending...');
      fetch(endpoint, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error(r.status); form.reset(); say('Thank you. We will be in touch about access to our price lists.'); })
        .catch(function () { say('That didn’t send. Please email us at ' + TO + ' instead.', true); })
        .then(function () { btn.disabled = false; });
      return;
    }
    // no form service set up yet: hand the details to the visitor's email app
    var body = ['Partner registration', '', 'Name: ' + d.name, 'Company: ' + d.company, 'Email: ' + d.email,
      'Phone: ' + (d.phone || '-'), 'Country: ' + d.country, 'Business: ' + d.role, 'Categories: ' + (d.categories || '-'),
      '', d.message].join('\n');
    location.href = 'mailto:' + TO + '?subject=' + encodeURIComponent('Partner registration: ' + d.company) + '&body=' + encodeURIComponent(body);
    say('Your email app should open with your details filled in. Send it to finish.');
  });
})();
