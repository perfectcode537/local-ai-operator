/* Motion, smooth scrolling and small interactions. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!window.gsap && !!window.ScrollTrigger;
  if (reduced || !hasGsap) root.classList.add('reduced');

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- text splitting (keeps <em> styling) ---------- */
  function splitWords(node, wrapClass) {
    var out = document.createDocumentFragment();
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      if (child.nodeType === 3) {
        child.textContent.split(/(\s+)/).forEach(function (part) {
          if (!part) return;
          if (/^\s+$/.test(part)) { out.appendChild(document.createTextNode(' ')); return; }
          out.appendChild(wrapClass(part));
        });
      } else if (child.nodeType === 1) {
        var clone = child.cloneNode(false);
        clone.appendChild(splitWords(child, wrapClass));
        out.appendChild(clone);
      }
    });
    return out;
  }
  $$('[data-split]').forEach(function (n) {
    var frag = splitWords(n, function (w) {
      var o = document.createElement('span'); o.className = 'split-line';
      var i = document.createElement('span'); i.textContent = w; o.appendChild(i);
      return o;
    });
    n.innerHTML = ''; n.appendChild(frag);
    n.querySelectorAll('.split-line').forEach(function (s) { s.style.display = 'inline-block'; });
  });
  $$('[data-words]').forEach(function (n) {
    var frag = splitWords(n, function (w) {
      var s = document.createElement('span'); s.className = 'w'; s.textContent = w; return s;
    });
    n.innerHTML = ''; n.appendChild(frag);
  });

  /* ---------- nav, menu, toast ---------- */
  var nav = $('.nav');
  function onScrollNav(y) { nav.classList.toggle('scrolled', y > 40); }
  $('.burger').addEventListener('click', function () { document.body.classList.toggle('menu-open'); });
  $$('.menu a').forEach(function (a) { a.addEventListener('click', function () { document.body.classList.remove('menu-open'); }); });

  var toast = document.createElement('div');
  toast.className = 'toast';
  document.body.appendChild(toast);
  var toastTimer;
  function showToast(html) {
    toast.innerHTML = '<i></i>' + html;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.classList.remove('show'); }, 2600);
  }

  /* ---------- smooth scroll ---------- */
  var lenis = null;
  if (!reduced && hasGsap && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true });
    lenis.on('scroll', function (e) { ScrollTrigger.update(); onScrollNav(e.scroll); });
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    window.addEventListener('scroll', function () { onScrollNav(window.scrollY); }, { passive: true });
  }
  $$('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id = a.getAttribute('href');
      var t = id.length > 1 ? $(id) : null;
      if (!t && id !== '#top') return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(id === '#top' ? 0 : t, { offset: -40, duration: 1.6 });
      else (id === '#top' ? window.scrollTo({ top: 0, behavior: 'smooth' }) : t.scrollIntoView({ behavior: 'smooth' }));
    });
  });

  /* ---------- loader ---------- */
  var loadNum = $('#loadNum');
  function finishLoad() {
    document.body.classList.remove('is-loading');
    if (!hasGsap || reduced) { $('.loader').remove(); return; }
    var tl = gsap.timeline();
    tl.to('.title-card > *, .loader-count', { opacity: 0, filter: 'blur(10px)', duration: .6, ease: 'power2.in', stagger: .05 }, '+=.5')
      .to('.lb-bar.top', { yPercent: -100, duration: 1.1, ease: 'expo.inOut' }, '-=.1')
      .to('.lb-bar.bot', { yPercent: 100, duration: 1.1, ease: 'expo.inOut' }, '<')
      .to('.loader', { clipPath: 'inset(50% 0% 50% 0%)', duration: 1.1, ease: 'expo.inOut' }, '<')
      .set('.loader', { display: 'none' })
      .to('.hero-title .line > span', { y: 0, duration: 1.35, ease: 'expo.out', stagger: .1 }, '-=.55')
      .fromTo('.pill', { scale: 0 }, { scale: 1, duration: 1.1, ease: 'expo.out', stagger: .15 }, '-=1.0')
      .fromTo('[data-hero-fade]', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: .08 }, '-=1.1');
  }
  (function runLoader() {
    var start = performance.now(), minT = reduced ? 0 : 2400, video = $('.pill-video video'), ready = false;
    function mark() { ready = true; }
    if (video.readyState >= 3) mark(); else { video.addEventListener('canplay', mark, { once: true }); setTimeout(mark, 2600); }
    (function step() {
      var t = performance.now() - start;
      var pct = Math.min(ready ? 100 : 92, Math.round(Math.min(1, t / minT) * 100));
      loadNum.textContent = pct;
      if (pct >= 100 && t >= minT) return finishLoad();
      requestAnimationFrame(step);
    })();
  })();

  /* ---------- motion (GSAP) ---------- */
  if (hasGsap && !reduced) {
    gsap.registerPlugin(ScrollTrigger);

    // hero: the film folds into a framed shot as you scroll
    gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
      .to('.hero-title', { transformPerspective: 900, rotateX: 28, z: -220, transformOrigin: '50% 100%', ease: 'none' }, 0)
      .to('.hero-title .l1', { xPercent: -10, ease: 'none' }, 0)
      .to('.hero-title .l2', { xPercent: 8, ease: 'none' }, 0)
      .to('.hero-title .l3', { xPercent: -6, ease: 'none' }, 0)
      .to('.hero-title .l4', { xPercent: 9, ease: 'none' }, 0)
      .to('.pill', { scale: 1.6, ease: 'none' }, 0)
      .to('.hero-foot, .hero-top', { opacity: 0, ease: 'none' }, 0);

    var narrow = window.innerWidth < 900;
    gsap.timeline({ scrollTrigger: { trigger: '.film', start: 'top top', end: 'bottom bottom', scrub: true } })
      .fromTo('.film-frame', { clipPath: narrow ? 'inset(30% 7% 30% 7% round 24px)' : 'inset(24% 27% 24% 27% round 36px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'power2.inOut', duration: .6 }, 0)
      .fromTo('.film-frame video', { scale: 1.3 }, { scale: 1, ease: 'none', duration: 1 }, 0)
      .fromTo('.film-cap', { opacity: 0, y: 60 }, { opacity: 1, y: 0, ease: 'power2.out', duration: .3 }, .45);

    // marquee leans with scroll speed
    var skew = gsap.quickTo('.mq-track', 'skewX', { duration: .5, ease: 'power3' });
    ScrollTrigger.create({
      trigger: '.marquee', start: 'top bottom', end: 'bottom top',
      onUpdate: function (self) { skew(gsap.utils.clamp(-12, 12, self.getVelocity() / -260)); }
    });

    // split headings
    $$('[data-split]').forEach(function (h) {
      gsap.fromTo(h.querySelectorAll('.split-line > span'), { yPercent: 110, rotateX: -70, filter: 'blur(8px)', transformPerspective: 600, transformOrigin: '50% 100%' }, {
        yPercent: 0, rotateX: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: .05,
        scrollTrigger: { trigger: h, start: 'top 86%' }
      });
    });

    // statement: words light up as you read
    $$('[data-words]').forEach(function (n) {
      gsap.to(n.querySelectorAll('.w'), {
        opacity: 1, ease: 'none', stagger: .1,
        scrollTrigger: { trigger: n, start: 'top 78%', end: 'bottom 42%', scrub: .6 }
      });
    });

    // generic reveals
    ScrollTrigger.batch('[data-reveal]', {
      start: 'top 90%', once: true,
      onEnter: function (els) { gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: .08, overwrite: true }); }
    });

    // images unveil like a film wipe
    $$('[data-img-reveal]').forEach(function (img) {
      gsap.timeline({ scrollTrigger: { trigger: img, start: 'top 88%' } })
        .fromTo(img, { clipPath: 'inset(100% 0% 0% 0% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.4, ease: 'expo.inOut' })
        .fromTo(img, { scale: 1.35 }, { scale: 1, duration: 1.8, ease: 'expo.out' }, 0);
    });

    // parallax figures
    $$('[data-parallax]').forEach(function (f) {
      gsap.fromTo(f, { yPercent: -(+f.dataset.parallax) }, {
        yPercent: +f.dataset.parallax, ease: 'none',
        scrollTrigger: { trigger: f, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });

    // counters
    $$('[data-count]').forEach(function (n) {
      var to = +n.dataset.count, o = { v: 0 };
      ScrollTrigger.create({
        trigger: n, start: 'top 90%', once: true,
        onEnter: function () { gsap.to(o, { v: to, duration: 1.8, ease: 'power3.out', onUpdate: function () { var v = Math.round(o.v); n.textContent = n.dataset.format === 'thousands' ? v.toLocaleString('en-AU') : v; } }); }
      });
    });

    // how it works: pinned 3D story in four chapters
    var chapters = $$('.chapter'), chList = $$('.ch-list li'), bar = $('.ch-progress i'), lastCh = -1;
    ScrollTrigger.create({
      trigger: '.how', start: 'top top', end: '+=320%', pin: '.how-pin', scrub: true,
      onUpdate: function (self) {
        var p = self.progress;
        window.__howProgress = p;
        window.dispatchEvent(new CustomEvent('how:progress', { detail: p }));
        bar.style.transform = 'scaleX(' + p + ')';
        var ch = Math.min(3, Math.floor(p * 4));
        if (ch !== lastCh) {
          chapters.concat(chList).forEach(function (c) { var i = +(c.dataset.ch || chList.indexOf(c)); c.classList.toggle('is-active', i === ch); c.classList.toggle('is-past', i < ch); });
          lastCh = ch;
        }
      }
    });

    // phases stack: earlier cards settle back as the next one arrives
    var cards = $$('.stage');
    cards.forEach(function (c, k) {
      var nxt = cards[k + 1];
      if (!nxt) return;
      gsap.to(c, {
        scale: .93, ease: 'none',
        scrollTrigger: { trigger: nxt, start: 'top bottom', end: 'top 30%', scrub: true }
      });
    });

    // gallery columns drift at different speeds
    $$('.g-col').forEach(function (c) {
      var s = +c.dataset.speed;
      gsap.fromTo(c, { y: s * .6 }, { y: -s * .9, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    // console tips forward in 3D as it arrives
    gsap.fromTo('.console', { rotateX: 14, transformPerspective: 1600, transformOrigin: '50% 0%', scale: .94 }, {
      rotateX: 0, scale: 1, ease: 'none',
      scrollTrigger: { trigger: '.console-wrap', start: 'top 95%', end: 'top 35%', scrub: true }
    });

    // bento photo, call film and closing film breathe on scroll
    gsap.fromTo('.b-photo video', { scale: 1.2 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.b-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.call-media', { clipPath: window.innerWidth < 900 ? 'inset(4% 4% 4% 4% round 28px)' : 'inset(12% 10% 12% 10% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 28px)', ease: 'none', scrollTrigger: { trigger: '.call-media', start: 'top 95%', end: 'top 35%', scrub: true } });
    gsap.fromTo('.start-video', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.start', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.fromTo('.foot-word', { yPercent: 50 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: true } });
    gsap.fromTo('.ws-card img', { scale: 1.25 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.ws-cards', start: 'top bottom', end: 'bottom 40%', scrub: true } });

    // nav turns dark over dark sections
    var darkCount = 0;
    $$('.film, .how, .week, .workspaces, .start, .foot').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec, start: 'top 60px', end: 'bottom 60px',
        onToggle: function (self) { darkCount += self.isActive ? 1 : -1; nav.classList.toggle('on-dark', darkCount > 0); }
      });
    });

    // 3D camera moves: media swing in from depth
    $$('[data-3d]').forEach(function (m, i) {
      var side = i % 2 ? 1 : -1;
      gsap.fromTo(m, { transformPerspective: 1400, rotateX: 18, rotateY: side * 14, z: -260, yPercent: 8, opacity: .25 }, {
        rotateX: 0, rotateY: 0, z: 0, yPercent: 0, opacity: 1, ease: 'none',
        scrollTrigger: { trigger: m, start: 'top 98%', end: 'top 45%', scrub: .6 }
      });
    });

    // scene cuts: dark sections open like a widening film window
    $$('.workspaces, .start').forEach(function (sec) {
      gsap.fromTo(sec, { clipPath: 'inset(0% 7% 0% 7% round 40px)' }, {
        clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top bottom', end: 'top 15%', scrub: true }
      });
    });

    // letterbox during the reel and the 3D story
    var cineCount = 0;
    $$('.film, .how-pin, .week, .credits').forEach(function (sec) {
      ScrollTrigger.create({
        trigger: sec.classList.contains('how-pin') ? '.how' : sec,
        start: sec.classList.contains('film') ? 'top 20%' : 'top top',
        end: sec.classList.contains('how-pin') ? '+=320%' : 'bottom bottom',
        onToggle: function (self) { cineCount += self.isActive ? 1 : -1; document.body.classList.toggle('cinema', cineCount > 0); }
      });
    });

    // week: the cylinder turns one day per step
    var ring = $('.cy-ring'), dayTags = $$('.week-days span');
    if (ring) {
      gsap.fromTo(ring, { rotateY: 0, rotateX: -6 }, {
        rotateY: -300, rotateX: 4, ease: 'none',
        scrollTrigger: {
          trigger: '.week', start: 'top top', end: 'bottom bottom', scrub: .8,
          onUpdate: function (self) {
            var d = Math.min(5, Math.round(self.progress * 5));
            dayTags.forEach(function (t, i) { t.classList.toggle('is-on', i === d); });
          }
        }
      });
      gsap.fromTo('.cy-stage', { scale: .82, opacity: .3 }, { scale: 1, opacity: 1, ease: 'none', scrollTrigger: { trigger: '.week', start: 'top 80%', end: 'top top', scrub: true } });
    }

    // end credits roll
    var roll = $('.cr-roll');
    gsap.fromTo(roll, { y: function () { return window.innerHeight * .55; } }, {
      y: function () { return -(roll.offsetHeight - window.innerHeight * .5); }, ease: 'none',
      scrollTrigger: { trigger: '.credits', start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true }
    });

    // HUD: scene number and running timecode
    var hud = $('.hud'), hudScene = $('#hudScene'), hudName = $('#hudName'), hudTc = $('#hudTc');
    $$('[data-scene]').forEach(function (sec) {
      var parts = sec.dataset.scene.split(' '), num = parts.shift(), name = parts.join(' ');
      ScrollTrigger.create({
        trigger: sec, start: 'top 50%', end: 'bottom 50%',
        onToggle: function (self) { if (self.isActive) { hudScene.textContent = 'SC ' + num; hudName.textContent = name; } }
      });
    });
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        var f = Math.round(self.progress * 24 * 60 * 4), fr = f % 24, s = Math.floor(f / 24);
        var pad = function (n) { return String(n).padStart(2, '0'); };
        hudTc.textContent = '00:' + pad(Math.floor(s / 60)) + ':' + pad(s % 60) + ':' + pad(fr);
      }
    });

    window.addEventListener('load', function () { ScrollTrigger.refresh(); });
    if (document.fonts) document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  } else {
    $$('.w').forEach(function (w) { w.style.opacity = 1; });
    $$('.chapter').forEach(function (c, i) { c.classList.toggle('is-active', i === 0); });
  }

  /* ---------- magnetic buttons ---------- */
  if (finePointer && !reduced) {
    $$('.magnetic').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        var x = e.clientX - r.left - r.width / 2, y = e.clientY - r.top - r.height / 2;
        b.style.transform = 'translate(' + x * .22 + 'px,' + y * .32 + 'px)';
        b.firstElementChild.style.transform = 'translate(' + x * .1 + 'px,' + y * .12 + 'px)';
      });
      b.addEventListener('pointerleave', function () { b.style.transform = ''; b.firstElementChild.style.transform = ''; });
    });
  }

  /* ---------- cursor ---------- */
  var cursor = $('.cursor');
  if (finePointer && hasGsap && !reduced) {
    var cx = gsap.quickTo(cursor, 'x', { duration: .35, ease: 'power3' });
    var cy = gsap.quickTo(cursor, 'y', { duration: .35, ease: 'power3' });
    window.addEventListener('pointermove', function (e) { cx(e.clientX); cy(e.clientY); cursor.classList.add('show'); });
    document.addEventListener('pointerleave', function () { cursor.classList.remove('show'); });
    document.addEventListener('pointerover', function (e) {
      cursor.classList.toggle('big', !!e.target.closest('a, button, summary, .preset'));
    });
  }

  /* ---------- abilities: floating image preview ---------- */
  var prev = $('.ab-preview');
  if (prev && finePointer && hasGsap && !reduced) {
    var pimg = prev.firstElementChild;
    var px = gsap.quickTo(prev, 'x', { duration: .55, ease: 'power3' });
    var py = gsap.quickTo(prev, 'y', { duration: .55, ease: 'power3' });
    var rot = gsap.quickTo(prev, 'rotation', { duration: .8, ease: 'power3' });
    var lastX = 0;
    $$('.ab-row').forEach(function (r) {
      var im = new Image(); im.src = r.dataset.img;
      r.addEventListener('pointerenter', function () {
        pimg.src = r.dataset.img;
        gsap.to(prev, { opacity: 1, scale: 1, duration: .5, ease: 'expo.out', overwrite: 'auto' });
      });
    });
    $('.ab-list').addEventListener('pointermove', function (e) {
      px(e.clientX + 40); py(e.clientY); rot(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * .6)); lastX = e.clientX;
    });
    $('.ab-list').addEventListener('pointerleave', function () {
      gsap.to(prev, { opacity: 0, scale: .6, duration: .4, ease: 'power3.in', overwrite: 'auto' });
    });
  }

  /* ---------- hero spotlight follows the cursor ---------- */
  var heroEl = $('.hero'), glow = $('.hero-glow');
  if (heroEl && glow && finePointer && !reduced) {
    heroEl.addEventListener('pointermove', function (e) {
      var r = heroEl.getBoundingClientRect();
      glow.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100) + '%');
      glow.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100) + '%');
    });
  }

  /* ---------- emergency stop demo ---------- */
  var stop = $('#demoStop'), stopped = false;
  stop.addEventListener('click', function () {
    stopped = !stopped;
    stop.classList.toggle('down', stopped);
    stop.firstElementChild.textContent = stopped ? 'RE-ARM' : 'STOP';
    showToast(stopped ? 'Emergency stop &middot; all tasks halted &middot; tools locked' : 'Re-armed &middot; tools unlocked &middot; parked tasks resume');
  });

  /* ---------- workspaces ---------- */
  var EXTRA = [['E', 'tenders'], ['F', 'freight'], ['G', 'clinic'], ['H', 'wholesale'], ['I', 'events'], ['J', 'farms'], ['K', 'legal'], ['L', 'rentals']];
  var wsCount = 4, wsMsg = $('#wsResult');
  $('#addWsBtn').addEventListener('click', function () {
    var w = EXTRA.shift();
    if (!w) { wsMsg.innerHTML = '<span class="ok">12 workspaces &middot; 1 model server &middot; idle ones use almost no memory</span>'; this.disabled = true; return; }
    wsCount++;
    window.dispatchEvent(new CustomEvent('ws:add', { detail: { id: w[0], kind: w[1] } }));
    wsMsg.innerHTML = '<span class="ok">workspace ' + w[0] + ' created &middot; ' + wsCount + ' on one PC, no VM each</span>';
  });
  $('#crossBtn').addEventListener('click', function () {
    window.dispatchEvent(new CustomEvent('ws:cross'));
    wsMsg.innerHTML = '<span class="err">DENIED ws_scope_violation &middot; ws:A asked for ws:B/invoices</span>';
  });

  /* ---------- live call captions ---------- */
  var CAPS = [
    ['When will order 50213 be delivered?', 'Thursday 16/10, between 8 am and 12 pm. The driver texts 30 minutes before.', 'orders #50213', '1.9 s'],
    ['Is there a fee if I change the time?', 'Free more than 48 hours before delivery. After that, a A$45 rebooking fee applies.', 'delivery.pdf p.2', '2.3 s'],
    ['Can I return the chairs if they don’t match?', 'Yes, unused items within 30 days with proof of purchase. Change-of-mind returns pay freight.', 'returns.pdf s.3', '1.6 s']
  ];
  var capBox = $('#captions'), capIdx = 0, capTimer = null, capOn = false;
  function capCycle() {
    var c = CAPS[capIdx++ % CAPS.length];
    capBox.innerHTML = '<div class="cap caller"><small>CALLER</small>' + c[0] + '</div>';
    capTimer = setTimeout(function () {
      capBox.insertAdjacentHTML('beforeend', '<div class="cap suggest"><small>SUGGESTED &middot; ' + c[3] + ' &middot; ' + c[2] + '</small>' + c[1] + '</div>');
      capTimer = setTimeout(function () {
        $$('.cap', capBox).forEach(function (n) { n.classList.add('out'); });
        capTimer = setTimeout(capCycle, 520);
      }, 4200);
    }, parseFloat(c[3]) * 1000);
  }
  new IntersectionObserver(function (en) {
    var vis = en[0].isIntersecting;
    if (vis && !capOn) { capOn = true; capCycle(); }
    if (!vis && capOn) { capOn = false; clearTimeout(capTimer); }
  }, { threshold: .3 }).observe($('.call-media'));

  /* ---------- play videos only when visible ---------- */
  var vio = new IntersectionObserver(function (en) {
    en.forEach(function (e) {
      var v = e.target;
      if (e.isIntersecting) { if (v.preload === 'none') v.preload = 'auto'; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: .05 });
  $$('video').forEach(function (v) { vio.observe(v); });
})();
