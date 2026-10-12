/* Visual layer: image stream, work gallery, parallax, depth, tilt and scroll 3D. */
(function () {
  'use strict';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var IMG = 'assets/img/';

  /* ---------- image stream ---------- */
  var STREAM = [
    ['retail-payment', 'Retail', 'Sales answers with sources'],
    ['property-keys', 'Property', 'Lease admin from documents'],
    ['blueprints', 'Trades', 'Quotes from plans and photos'],
    ['paper-stack', 'Admin', 'Invoices into the accounts app'],
    ['research-desk', 'Research', 'Weekly reports with sources'],
    ['freight', 'Logistics', 'Carrier portals with no API'],
    ['call-agent', 'Calls', 'Answers on screen in seconds'],
    ['warehouse', 'Wholesale', 'Stock checks in desktop apps'],
    ['bookkeeping', 'Bookkeeping', 'Reconciliations, every figure linked'],
    ['open-office', 'Your office', 'One PC runs it all']
  ];
  function tile(d) {
    return '<figure class="tile"><img src="' + IMG + d[0] + '.jpg" alt="' + d[1] + '" loading="lazy">' +
      '<figcaption><b>' + d[1] + '</b><span>' + d[2] + '</span></figcaption></figure>';
  }
  document.querySelectorAll('.stream-track').forEach(function (track) {
    var row = +track.dataset.row;
    var items = row ? STREAM.slice(5).concat(STREAM.slice(0, 5)) : STREAM;
    var html = items.map(tile).join('');
    track.innerHTML = '<div class="stream-run">' + html + '</div><div class="stream-run" aria-hidden="true">' + html + '</div>';
  });

  /* ---------- work gallery (masonry) ---------- */
  var WORK = [
    { img: 'retail-payment', ws: 'A', wsn: 'Coastal Retail', t: 'Sales this month', d: 'A$48,320.40 from the sales ledger, cross-checked with the POS export.', s: 'ok', st: 'Verified &middot; 2 sources', h: 'tall' },
    { img: 'paper-stack', ws: 'B', wsn: 'Harbour Property', t: 'Supplier invoices', d: '4 of 5 bills entered. INV-2291 photo too blurred to read the amount.', s: 'fail', st: '1 passed to a person', h: 'mid' },
    { img: 'site-works', ws: 'C', wsn: 'Red Gum Trades', t: 'Quote from site photos', d: 'Measurements read from 6 photos. Quote drafted from the price list.', s: 'wait', st: 'Held for approval', h: 'mid' },
    { img: 'property-keys', ws: 'B', wsn: 'Harbour Property', t: 'Lease renewals', d: '3 renewal letters prepared from tenancy records.', s: 'ok', st: 'Verified', h: 'short' },
    { img: 'research-desk', ws: 'F', wsn: 'Bayside Logistics', t: 'Weekly market report', d: '12 sources gathered and summarised, every claim linked.', s: 'ok', st: 'Scheduled &middot; Mon 07:00', h: 'tall' },
    { img: 'freight', ws: 'F', wsn: 'Bayside Logistics', t: 'Book freight', d: 'Carrier portal has no API, so it books in the browser like a staff member.', s: 'ok', st: 'Verified &middot; booking ref on file', h: 'mid' },
    { img: 'call-agent', ws: 'A', wsn: 'Coastal Retail', t: 'Live call assist', d: 'Suggested answers on screen in 1.9 s on average, from your own policies.', s: 'ok', st: 'Local &middot; GPU priority', h: 'mid' },
    { img: 'blueprints', ws: 'E', wsn: 'Wattle Tenders', t: 'Tender response', d: 'Response drafted. The A$25 tender pack is over the per-action limit.', s: 'wait', st: 'Parked &middot; sent to phone', h: 'short' },
    { img: 'warehouse', ws: 'H', wsn: 'Ironbark Supply', t: 'Stock check', d: '214 lines checked in a desktop app with no integration.', s: 'ok', st: 'Verified', h: 'tall' }
  ];
  var mas = document.getElementById('masonry');
  if (mas) {
    mas.innerHTML = WORK.map(function (w, i) {
      return '<article class="m-card ' + w.h + '" data-tilt="7" style="--i:' + i + '">' +
        '<div class="m-img"><img src="' + IMG + w.img + '.jpg" alt="' + w.t + '" loading="lazy"></div>' +
        '<div class="m-body"><div class="m-ws"><span class="m-id">' + w.ws + '</span>' + w.wsn + '</div>' +
        '<h3>' + w.t + '</h3><p>' + w.d + '</p>' +
        '<span class="m-st ' + w.s + '">' + w.st + '</span></div></article>';
    }).join('');
  }

  /* ---------- tilt + spotlight ---------- */
  function bindTilt(n) {
    if (n._tilt) return;
    n._tilt = true;
    var max = +n.dataset.tilt || 8;
    n.addEventListener('pointermove', function (e) {
      var r = n.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      n.style.setProperty('--mx', (x * 100) + '%');
      n.style.setProperty('--my', (y * 100) + '%');
      if (!reduce) n.style.transform = 'perspective(900px) rotateY(' + (x - 0.5) * max + 'deg) rotateX(' + (0.5 - y) * max + 'deg) translateZ(0)';
      n.querySelectorAll('[data-depth]').forEach(function (d) {
        var k = +d.dataset.depth;
        d.style.transform = 'translate3d(' + (x - 0.5) * 40 * k + 'px,' + (y - 0.5) * 30 * k + 'px,' + 60 * k + 'px)';
      });
    });
    n.addEventListener('pointerleave', function () {
      n.style.transform = '';
      n.querySelectorAll('[data-depth]').forEach(function (d) { d.style.transform = ''; });
    });
  }
  function scanTilt() { document.querySelectorAll('[data-tilt], .phase').forEach(bindTilt); }
  scanTilt();
  new MutationObserver(scanTilt).observe(document.body, { childList: true, subtree: true });

  /* ---------- AU band depth on pointer ---------- */
  var band = document.querySelector('.au-band');
  if (band && !reduce) {
    band.addEventListener('pointermove', function (e) {
      var r = band.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      band.querySelectorAll('.au-inner [data-depth]').forEach(function (d) {
        var k = +d.dataset.depth;
        d.style.transform = 'translate3d(' + x * 200 * k + 'px,' + y * 120 * k + 'px,0) rotateY(' + x * 60 * k + 'deg) rotateX(' + -y * 40 * k + 'deg)';
      });
    });
    band.addEventListener('pointerleave', function () {
      band.querySelectorAll('.au-inner [data-depth]').forEach(function (d) { d.style.transform = ''; });
    });
  }

  /* ---------- scroll: parallax and 3D entrances ---------- */
  var par = [].slice.call(document.querySelectorAll('[data-parallax]'));
  var consoleEl = document.querySelector('.console');
  var stream = document.querySelector('.stream');
  var ticking = false;
  function onScroll() {
    ticking = false;
    var vh = window.innerHeight;
    par.forEach(function (img) {
      var r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      img.style.transform = 'translate3d(0,' + (p * +img.dataset.parallax * 100) + '%,0) scale(1.25)';
    });
    if (consoleEl) {
      var r = consoleEl.getBoundingClientRect();
      var k = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.75)));
      consoleEl.style.transform = 'perspective(1600px) rotateX(' + (1 - k) * 22 + 'deg) scale(' + (0.9 + k * 0.1) + ')';
      consoleEl.style.opacity = 0.35 + k * 0.65;
    }
    if (stream) {
      var sr = stream.getBoundingClientRect();
      var sp = (sr.top + sr.height / 2 - vh / 2) / vh;
      stream.style.setProperty('--tilt', (sp * 14 + 8) + 'deg');
    }
  }
  if (!reduce) {
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
    }, { passive: true });
    onScroll();
  }

  /* ---------- staggered card entrances ---------- */
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('shown'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.m-card, .phase, .ws, .au-facts .glass, .demo-card').forEach(function (n, i) {
    n.classList.add('enter3d');
    if (!n.style.getPropertyValue('--i')) n.style.setProperty('--i', i % 5);
    io.observe(n);
  });
})();
