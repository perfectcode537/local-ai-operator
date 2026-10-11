/* Local AI Operator - concept demo
   Everything here is simulated in the browser to show the planned behaviour. */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var el = function (tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  };
  var money = function (v) { return 'A$' + v.toLocaleString('en-AU', { minimumFractionDigits: v % 1 ? 2 : 0, maximumFractionDigits: 2 }); };

  // simulated office clock, starts 09:12:04 and follows real time
  var t0 = Date.now();
  function clock() {
    var s = 9 * 3600 + 12 * 60 + 4 + Math.floor((Date.now() - t0) / 1000);
    var h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, x = s % 60;
    return [h, m, x].map(function (n) { return String(n).padStart(2, '0'); }).join(':');
  }

  /* ================= AUDIT LOG ================= */
  var logEl = $('log');
  function log(html, cls) {
    var ln = el('div', 'ln');
    ln.appendChild(el('span', 't', clock()));
    ln.appendChild(el('span', 'ev' + (cls ? ' ' + cls : ''), html));
    logEl.appendChild(ln);
    logEl.scrollTop = logEl.scrollHeight;
  }

  /* ================= PRESETS ================= */
  var PRESETS = {
    tender: {
      label: 'Find tenders, prepare, hold for approval',
      ws: 'Business A',
      goal: 'Find new tender listings for Business A since Saturday, prepare a response for each relevant one, and hold everything for my approval. Budget A$40.',
      budget: 40, action: 20, time: '2 h',
      steps: [
        { t: 'Open tender portal', tool: 'browser', dur: 1500, verify: 'signed in with test account from vault' },
        { t: 'Search new listings since 04/10/2026', tool: 'browser', dur: 1700, verify: '6 new listings found' },
        { t: 'Apply Business A rules', tool: 'policy', dur: 1200, verify: '2 of 6 match category, value and region' },
        { t: 'Download tender documents', tool: 'browser', dur: 1900, verify: '4 files saved, checksums stored' },
        { t: 'Draft response documents', tool: 'local LLM', dur: 2500, verify: 'all 7 mandatory sections present' },
        { t: 'Buy tender pack', tool: 'browser', dur: 1300, cost: 25, gate: true, verify: 'receipt TP-55102 on file' },
        { t: 'Hold submission for your review', tool: 'notify', dur: 1000, verify: 'drafts saved, nothing submitted' }
      ]
    },
    invoices: {
      label: 'Enter supplier invoices from email',
      ws: 'Business B',
      goal: 'Enter last week\'s supplier invoices for Business B into the accounting app. Use the written rules. Anything unclear goes to a person.',
      budget: 0, action: 0, time: '1 h',
      steps: [
        { t: 'Read accounts inbox', tool: 'API', dur: 1300, verify: '5 invoices found (3 PDF, 2 photos)' },
        { t: 'Extract fields from PDFs and photos', tool: 'vision', dur: 2200, verify: '4 of 5 read with all fields' },
        { t: 'Check against supplier rules', tool: 'policy', dur: 1200, verify: 'ABN, GST and totals match rules' },
        { t: 'Enter 4 bills in accounting app', tool: 'desktop', dur: 2600, verify: '4 bills listed, total A$9,412.60' },
        { t: 'INV-2291 photo', tool: 'vision', dur: 1400, fail: 'image too blurred to read the amount - passed to a person' },
        { t: 'File source documents', tool: 'desktop', dur: 1100, verify: 'attachments linked to each bill' }
      ]
    },
    question: {
      label: 'Ask: sales this month for Business A',
      ws: 'Business A',
      goal: 'What were sales this month for Business A?',
      budget: 0, action: 0, time: '1 min',
      answer: true,
      steps: [
        { t: 'Understand the question', tool: 'local LLM', dur: 900, verify: 'period 01/10/2026 - 10/10/2026, metric: net sales' },
        { t: 'Query sales ledger (read-only)', tool: 'database', dur: 1200, verify: '214 transactions found' },
        { t: 'Cross-check with POS export', tool: 'API', dur: 1200, verify: 'difference A$0.00' },
        { t: 'Write answer with sources', tool: 'local LLM', dur: 900, verify: 'every figure linked to a source row' }
      ]
    }
  };

  /* ================= CONSOLE STATE ================= */
  var S = {
    key: 'tender', p: null, status: 'idle', cur: -1, spent: 0, ck: 0,
    timers: [], run: '', skipped: 0, rejected: false, waitingCard: null, resumes: 0
  };
  function later(fn, ms) { var id = setTimeout(fn, ms); S.timers.push(id); return id; }
  function clearTimers() { S.timers.forEach(clearTimeout); S.timers = []; }

  var stepsEl = $('steps'), presetsEl = $('presets');
  var runBtn = $('runBtn'), killBtn = $('killBtn'), resumeBtn = $('resumeBtn'), estop = $('estopBtn');

  Object.keys(PRESETS).forEach(function (k) {
    var b = el('button', 'preset', PRESETS[k].label);
    b.dataset.key = k;
    b.onclick = function () { if (S.status === 'idle' || S.status === 'done') select(k); };
    presetsEl.appendChild(b);
  });

  function select(k) {
    S.key = k; S.p = PRESETS[k];
    [].forEach.call(presetsEl.children, function (b) { b.classList.toggle('on', b.dataset.key === k); });
    $('goalText').textContent = S.p.goal;
    $('wsLabel').textContent = S.p.ws;
    $('limBudget').textContent = S.p.budget ? money(S.p.budget) : 'A$0 (no spend)';
    $('limAction').textContent = S.p.action ? money(S.p.action) : '-';
    $('limTime').textContent = S.p.time;
    S.spent = 0; updateSpend();
    stepsEl.innerHTML = '<li class="empty-plan">Press <b>Run task</b> to plan this goal.</li>';
    $('planMeta').textContent = '';
    $('report').className = 'report';
    setStatus('idle');
  }

  function setStatus(s) {
    S.status = s;
    var led = $('statusLed'), txt = $('statusText');
    var map = {
      idle: ['', 'Idle'], planning: ['run', 'Planning'], running: ['run', 'Running'],
      waiting: ['wait', 'Parked - waiting for a person'], killed: ['dead', 'Process killed'],
      stopped: ['dead', 'Emergency stop'], done: ['ok', 'Complete - verified']
    };
    led.className = 'led ' + map[s][0];
    txt.textContent = map[s][1];
    runBtn.disabled = !(s === 'idle' || s === 'done');
    killBtn.disabled = !(s === 'running' || s === 'waiting');
    resumeBtn.disabled = s !== 'killed';
    [].forEach.call(presetsEl.children, function (b) { b.disabled = !(s === 'idle' || s === 'done'); });
    var hint = $('hint');
    if (s === 'running') hint.innerHTML = 'Tip: press <b>Kill process</b> now to test crash recovery.';
    else if (s === 'killed') hint.innerHTML = 'Press <b>Resume</b>. Verified steps will not run again.';
    else if (s === 'waiting') hint.innerHTML = 'Approve or reject on the <b>phone</b> below.';
    else if (s === 'stopped') hint.innerHTML = 'All tools are locked. Press <b>Re-arm</b> to reset.';
    else hint.innerHTML = 'Tip: kill the process while a step is running.';
  }

  function updateSpend() {
    var b = S.p ? S.p.budget : 0;
    $('spendText').textContent = money(S.spent) + ' / ' + money(b);
    var pct = b ? Math.min(100, (S.spent / b) * 100) : 0;
    var bar = $('spendBar');
    bar.style.width = pct + '%';
    bar.style.background = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--gold)' : 'var(--green)';
  }

  function renderSteps() {
    stepsEl.innerHTML = '';
    S.p.steps.forEach(function (st, i) {
      var li = el('li', 'step');
      li.innerHTML = '<span class="si">' + (i + 1) + '</span>' +
        '<div><div class="st-title">' + st.t + (st.cost ? ' &middot; ' + money(st.cost) : '') + '</div>' +
        '<div class="st-sub">' + st.tool + ' &middot; pending</div></div>' +
        '<span class="st-tag">queued</span>';
      stepsEl.appendChild(li);
      st.el = li; st.state = 'queued'; st.ck = null; st.approved = false; st.rejectedNow = false;
    });
  }

  function paint(i, state, sub, tag) {
    var st = S.p.steps[i];
    st.state = state;
    st.el.className = 'step ' + state;
    if (sub != null) st.el.querySelector('.st-sub').innerHTML = sub;
    if (tag != null) st.el.querySelector('.st-tag').textContent = tag;
  }

  function ws() { return '<span class="k">[' + S.p.ws.replace('Business ', 'ws:') + ']</span> '; }

  /* ---------- run ---------- */
  runBtn.onclick = function () {
    clearTimers();
    S.cur = -1; S.spent = 0; S.ck = 0; S.skipped = 0; S.rejected = false; S.resumes = 0;
    S.run = 'R-' + Math.floor(4000 + Math.random() * 5000);
    updateSpend();
    $('report').className = 'report';
    setStatus('planning');
    stepsEl.innerHTML = '<li class="empty-plan">Planning with local model&hellip;</li>';
    log(ws() + 'goal received, run <span class="k">' + S.run + '</span>');
    log(ws() + 'limits loaded: budget ' + money(S.p.budget) + ', per-action ' + (S.p.action ? money(S.p.action) : 'none') + ', time ' + S.p.time);
    later(function () {
      renderSteps();
      $('planMeta').textContent = S.p.steps.length + ' steps · ' + S.run;
      log(ws() + 'plan accepted by policy engine (' + S.p.steps.length + ' steps)', 'ok');
      setStatus('running');
      next();
    }, 1100);
  };

  function next() {
    S.cur++;
    if (S.cur >= S.p.steps.length) return finish();
    runStep(S.cur);
  }

  function runStep(i) {
    var st = S.p.steps[i];
    var ik = 'ik-' + S.run.slice(2) + '-' + (i + 1);
    paint(i, 'running', st.tool + ' &middot; idempotency key ' + ik, 'running');
    log(ws() + 'step ' + (i + 1) + ' start: ' + st.t + ' <span class="t">(' + st.tool + ')</span>');
    later(function () {
      if (st.gate && !st.approved && !st.rejectedNow) {
        if (st.cost > S.p.action) return park(i);
      }
      if (st.rejectedNow) {
        paint(i, 'fail', 'rejected by you on phone &middot; not purchased', 'rejected');
        log(ws() + 'step ' + (i + 1) + ' skipped: rejected by user, nothing purchased', 'warn');
        return later(next, 500);
      }
      if (st.fail) {
        paint(i, 'fail', st.fail, 'needs person');
        log(ws() + 'verify FAILED step ' + (i + 1) + ': ' + st.fail, 'err');
        log(ws() + 'task item parked; other items continue', 'warn');
        phonePush({ title: 'Needs a person: INV-2291', body: 'Photo too blurred to read the amount. Please check the original.', info: true });
        return later(next, 700);
      }
      if (st.cost) { S.spent += st.cost; updateSpend(); log(ws() + 'spend ' + money(st.cost) + ' committed (' + money(S.spent) + ' of ' + money(S.p.budget) + ')'); }
      S.ck++;
      st.ck = 'ckpt-' + String(S.ck).padStart(4, '0');
      paint(i, 'done', 'verified: ' + st.verify, 'verified');
      log(ws() + 'verify ok: ' + st.verify, 'ok');
      log(ws() + 'checkpoint <span class="k">' + st.ck + '</span> written');
      later(next, 450);
    }, st.dur);
  }

  function park(i) {
    var st = S.p.steps[i];
    paint(i, 'wait', 'policy: ' + money(st.cost) + ' is over the ' + money(S.p.action) + ' per-action limit', 'approval');
    log(ws() + 'policy gate: ' + money(st.cost) + ' &gt; per-action limit ' + money(S.p.action) + ' - approval required', 'warn');
    log(ws() + 'task parked, notification sent to phone (ntfy, self-hosted)', 'warn');
    log('<span class="k">[scheduler]</span> picking next queued task: ws:C weekly research report');
    setStatus('waiting');
    S.waitingCard = phonePush({
      title: 'Approve purchase',
      body: 'Business A &middot; tender pack for listing NSW-T-2026-118. Over your A$20 per-action limit.',
      amount: money(st.cost),
      onApprove: function () { decide(i, true); },
      onReject: function () { decide(i, false); }
    });
  }

  function decide(i, ok) {
    if (S.status !== 'waiting' || S.cur !== i) return false;
    var st = S.p.steps[i];
    if (ok) { st.approved = true; log(ws() + 'approved on phone by Nick &middot; signed request verified', 'ok'); }
    else { st.rejectedNow = true; S.rejected = true; log(ws() + 'rejected on phone by Nick', 'warn'); }
    S.waitingCard = null;
    setStatus('running');
    runStep(i);
    return true;
  }

  /* ---------- kill & resume ---------- */
  killBtn.onclick = function () {
    clearTimers();
    var i = S.cur;
    var st = S.p.steps[i];
    if (st && st.state === 'running') paint(i, 'halted', 'interrupted mid-step &middot; no commit recorded', 'interrupted');
    log('<span class="err">process killed (SIGKILL, exit 137)</span>');
    setStatus('killed');
    $('crashOverlay').classList.add('show');
  };

  resumeBtn.onclick = function () {
    $('crashOverlay').classList.remove('show');
    resumeBtn.disabled = true;
    S.resumes++;
    log('operator started &middot; loading checkpoint store');
    var done = S.p.steps.filter(function (s) { return s.state === 'done' || s.state === 'skipped'; });
    var last = done.length ? done[done.length - 1].ck : 'none';
    later(function () { log('run <span class="k">' + S.run + '</span> restored from <span class="k">' + last + '</span>', 'ok'); }, 500);
    var d = 900;
    S.p.steps.forEach(function (st, i) {
      if (st.state === 'done') {
        later(function () {
          paint(i, 'skipped', 'already verified at ' + st.ck + ' &middot; not repeated', 'skipped');
          S.skipped++;
        }, d);
        d += 220;
      }
    });
    later(function () {
      var i = S.cur, st = S.p.steps[i];
      if (!st) return finish();
      if (st.state === 'skipped' || st.state === 'fail') { setStatus('running'); return next(); }
      if (st.state === 'wait') {
        log(ws() + 'step ' + (i + 1) + ' still waiting for approval - request kept on phone', 'warn');
        setStatus('waiting');
        return;
      }
      log(ws() + 'step ' + (i + 1) + ': key ik-' + S.run.slice(2) + '-' + (i + 1) + ' not committed - safe to run again', 'ok');
      setStatus('running');
      runStep(i);
    }, d + 400);
  };

  /* ---------- emergency stop ---------- */
  estop.onclick = function () {
    if (S.status === 'stopped') {
      estop.classList.remove('armed');
      estop.innerHTML = '<span class="estop-ring"></span>Emergency stop';
      log('emergency stop released by user &middot; tools unlocked');
      select(S.key);
      return;
    }
    clearTimers();
    $('crashOverlay').classList.remove('show');
    if (S.p && S.p.steps[S.cur] && S.p.steps[S.cur].el) {
      var st = S.p.steps[S.cur];
      if (st.state === 'running' || st.state === 'wait') paint(S.cur, 'halted', 'halted by emergency stop', 'stopped');
    }
    log('<span class="err">EMERGENCY STOP by user &middot; all tasks halted &middot; tools locked</span>');
    setStatus('stopped');
    estop.classList.add('armed');
    estop.innerHTML = '<span class="estop-ring"></span>Re-arm';
    if (S.waitingCard) { S.waitingCard.resolve('Cancelled by emergency stop', 'err'); S.waitingCard = null; }
  };

  /* ---------- report ---------- */
  function finish() {
    setStatus('done');
    var steps = S.p.steps;
    var ver = steps.filter(function (s) { return s.state === 'done' || s.state === 'skipped'; }).length;
    var failed = steps.filter(function (s) { return s.state === 'fail'; }).length;
    var r = $('report');
    var html = '<div class="report-head"><h4>Result report &middot; ' + S.run + '</h4>' +
      '<span class="muted small">Evidence checked in the target system. Model confidence not used.</span></div>';

    if (S.p.answer) {
      html += '<div class="answer">Net sales for Business A, 01/10/2026 - 10/10/2026<big>A$48,320.40</big>' +
        '<span class="muted small">Sources: sales_ledger rows 1-214 &middot; pos_export_2026-10-10.csv &middot; difference A$0.00</span></div>';
      log(ws() + 'answer delivered with 2 sources', 'ok');
    } else {
      html += '<div class="report-cols">' +
        '<div class="rc g"><label>Verified steps</label><b>' + ver + ' / ' + steps.length + '</b></div>' +
        '<div class="rc r"><label>Failed or rejected</label><b>' + failed + '</b></div>' +
        '<div class="rc y"><label>Skipped after resume</label><b>' + S.skipped + '</b></div>' +
        '<div class="rc"><label>Spent</label><b>' + money(S.spent) + '</b></div></div><ul>';
      steps.forEach(function (s) {
        var tag = s.state === 'fail' ? '<span class="ev-no">FAIL</span>' : '<span class="ev-ok">OK</span>';
        var txt = s.state === 'fail' ? (s.fail || 'rejected by you - not purchased') : s.verify;
        html += '<li>' + tag + '<span><b>' + s.t + '</b> &mdash; ' + txt + '</span></li>';
      });
      html += '</ul>';
      log(ws() + 'report sent: ' + ver + ' verified, ' + failed + ' failed (reported as failed)', failed ? 'warn' : 'ok');
      phonePush({ title: 'Task finished - ' + S.p.ws, body: ver + ' steps verified, ' + failed + ' failed. Full report on the dashboard.', info: true });
    }
    r.innerHTML = html;
    r.className = 'report show';
  }

  /* ================= PHONE ================= */
  var phList = $('phList'), phoneEl = $('phoneEl');
  function phoneClock() { $('phTime').textContent = clock().slice(0, 5); }
  phoneClock(); setInterval(phoneClock, 10000);

  function phonePush(o) {
    var empty = phList.querySelector('.ph-empty');
    if (empty) empty.remove();
    var c = el('div', 'ph-card');
    c.innerHTML = '<div class="ph-meta"><span>OPERATOR</span><span>now</span></div>' +
      '<h6>' + o.title + '</h6><p>' + o.body + '</p>' +
      (o.amount ? '<div class="ph-amt">' + o.amount + '</div>' : '') +
      (o.info ? '' : '<div class="ph-btns"><button class="ph-no">Reject</button><button class="ph-ok">Approve</button></div>');
    phList.insertBefore(c, phList.firstChild);
    while (phList.children.length > 4) phList.lastChild.remove();
    phoneEl.classList.remove('buzz'); void phoneEl.offsetWidth; phoneEl.classList.add('buzz');

    var api = {
      resolve: function (msg, cls) {
        var b = c.querySelector('.ph-btns');
        if (b) b.remove();
        c.classList.add('resolved');
        c.appendChild(el('div', 'ph-done', '<span style="color:' + (cls === 'ok' ? '#4DD68F' : '#FF8A80') + '">' + msg + '</span>'));
      }
    };
    if (!o.info) {
      c.querySelector('.ph-ok').onclick = function () { if (o.onApprove() !== false) api.resolve('Approved - task resumed', 'ok'); };
      c.querySelector('.ph-no').onclick = function () { if (o.onReject() !== false) api.resolve('Rejected - not purchased', 'err'); };
    }
    return api;
  }

  // phone follows the pointer in 3D
  var stage = document.querySelector('.phone-stage');
  stage.addEventListener('pointermove', function (e) {
    if (window.innerWidth < 520) return;
    var r = stage.getBoundingClientRect();
    var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    phoneEl.style.transform = 'rotateY(' + (-18 + x * 22) + 'deg) rotateX(' + (8 - y * 14) + 'deg)';
  });
  stage.addEventListener('pointerleave', function () { phoneEl.style.transform = ''; });

  /* ================= WORKSPACES ================= */
  var WS = [
    ['A', 'Coastal Retail', 'Retail and online store', 1240, 6, 18],
    ['B', 'Harbour Property', 'Property management', 860, 4, 22],
    ['C', 'Red Gum Trades', 'Trades and quoting', 530, 5, 11],
    ['D', 'Southern Admin', 'Bookkeeping services', 2110, 8, 27]
  ];
  var EXTRA = [
    ['E', 'Wattle Tenders', 'Government tenders'], ['F', 'Bayside Logistics', 'Freight and dispatch'],
    ['G', 'Kestrel Health', 'Clinic admin'], ['H', 'Ironbark Supply', 'Wholesale'],
    ['I', 'Banksia Events', 'Event bookings'], ['J', 'Mallee Farms', 'Agriculture'],
    ['K', 'Jarrah Legal', 'Practice admin'], ['L', 'Sandstone Rentals', 'Equipment hire']
  ];
  var wsGrid = $('wsGrid');
  function wsCard(w) {
    var c = el('div', 'ws');
    c.dataset.id = w[0];
    c.innerHTML = '<div class="ws-top"><span class="ws-id">' + w[0] + '</span><span class="pill">isolated</span></div>' +
      '<h3>' + w[1] + '</h3><div class="ws-kind">' + w[2] + '</div>' +
      '<dl><div><dt>Documents</dt><dd>' + w[3].toLocaleString('en-AU') + '</dd></div>' +
      '<div><dt>Vault logins</dt><dd>' + w[4] + '</dd></div>' +
      '<div><dt>Rules</dt><dd>' + w[5] + '</dd></div>' +
      '<div><dt>Schema</dt><dd>ws_' + w[0].toLowerCase() + '</dd></div></dl>';
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = 'rotateY(' + x * 14 + 'deg) rotateX(' + -y * 14 + 'deg) translateZ(10px)';
    });
    c.addEventListener('pointerleave', function () { c.style.transform = ''; });
    wsGrid.appendChild(c);
  }
  WS.forEach(wsCard);

  $('addWsBtn').onclick = function () {
    var w = EXTRA.shift();
    if (!w) {
      $('wsResult').innerHTML = '<span class="ok">12 workspaces &middot; 1 model server &middot; idle workspaces use almost no memory</span>';
      $('addWsBtn').disabled = true;
      return;
    }
    wsCard([w[0], w[1], w[2], 100 + Math.floor(Math.random() * 900), 2 + Math.floor(Math.random() * 6), 5 + Math.floor(Math.random() * 15)]);
    var n = wsGrid.children.length;
    $('wsResult').innerHTML = '<span class="ok">workspace ' + w[0] + ' created &middot; ' + n + ' running on one PC, no VM per workspace</span>';
    log('<span class="k">[admin]</span> workspace ws:' + w[0] + ' created (schema, vault, browser profile)', 'ok');
  };

  $('crossBtn').onclick = function () {
    var b = wsGrid.querySelector('[data-id="B"]');
    b.classList.add('flash');
    setTimeout(function () { b.classList.remove('flash'); }, 1600);
    $('wsResult').innerHTML = '<span class="err">DENIED ws_scope_violation &middot; task in ws:A asked for ws:B/invoices</span>';
    log('<span class="k">[ws:A]</span> <span class="err">tool call denied: ws_scope_violation (requested ws:B/invoices)</span>');
  };

  /* ================= CALL ASSIST ================= */
  var CALL = [
    { w: 'c', t: 'Hi, I ordered a dining table last week, order 50213. When will it be delivered?',
      a: 'Order 50213 is booked for Thursday 16/10, between 8 am and 12 pm. The driver texts 30 minutes before arrival.',
      src: 'orders #50213 &middot; delivery_schedule.xlsx', lat: 1.9 },
    { w: 's', t: 'Let me check... it\'s booked for Thursday morning, between eight and twelve.' },
    { w: 'c', t: 'Great. If I need to change the time, is there a fee?',
      a: 'Changes are free more than 48 hours before delivery. After that, a A$45 rebooking fee applies.',
      src: 'policies/delivery.pdf p.2', lat: 2.3 },
    { w: 's', t: 'No fee as long as you change it before Tuesday morning.' },
    { w: 'c', t: 'Perfect. And can I return the chairs if they don\'t match?',
      a: 'Yes. Unused items can be returned within 30 days with proof of purchase. Change-of-mind returns pay their own freight.',
      src: 'policies/returns.pdf s.3', lat: 1.6 },
    { w: 's', t: 'Yes, within 30 days if they\'re unused. Return freight is on you for change of mind.' }
  ];
  var callOn = false, callTimers = [], talking = 0, lats = [];
  var tr = $('transcript'), sug = $('suggest'), callBtn = $('callBtn');
  function cLater(fn, ms) { callTimers.push(setTimeout(fn, ms)); }

  callBtn.onclick = function () {
    if (callOn) return endCall(true);
    callOn = true; lats = [];
    callBtn.textContent = 'End call';
    tr.innerHTML = '';
    sug.innerHTML = '<p class="muted">Listening&hellip;</p>';
    $('latNow').textContent = '-'; $('latAvg').textContent = '-';
    var at = 600;
    CALL.forEach(function (line) {
      var words = line.t.split(' ');
      var dur = words.length * 230;
      cLater(function () { say(line, words); }, at);
      at += dur + 500;
      if (line.a) {
        cLater(function () {
          sug.innerHTML = '<div class="sg thinking">transcribing &middot; searching Business A documents&hellip;</div>';
        }, at - 400);
        cLater(function () {
          lats.push(line.lat);
          sug.innerHTML = '<div class="sg"><p>' + line.a + '</p><div class="src">Source: <b>' + line.src + '</b></div></div>';
          $('latNow').textContent = line.lat.toFixed(1) + ' s';
          var avg = lats.reduce(function (x, y) { return x + y; }, 0) / lats.length;
          $('latAvg').textContent = avg.toFixed(1) + ' s';
        }, at - 400 + line.lat * 1000);
        at += line.lat * 1000 + 900;
      }
    });
    cLater(function () { endCall(false); }, at + 600);
  };

  function say(line, words) {
    var row = el('div', 'tl ' + line.w);
    row.innerHTML = '<span class="who">' + (line.w === 'c' ? 'CALLER' : 'STAFF') + '</span><span class="typing"></span>';
    tr.appendChild(row);
    var span = row.querySelector('.typing');
    talking = line.w === 'c' ? 1 : 0.7;
    words.forEach(function (w, i) {
      cLater(function () {
        span.textContent += (i ? ' ' : '') + w;
        tr.scrollTop = tr.scrollHeight;
        if (i === words.length - 1) { span.className = ''; talking = 0; }
      }, i * 230);
    });
  }

  function endCall(manual) {
    callTimers.forEach(clearTimeout); callTimers = [];
    callOn = false; talking = 0;
    callBtn.textContent = 'Start call';
    var row = el('div', 'tl');
    row.innerHTML = '<span class="who muted">SYSTEM</span><span class="muted">Call ended' + (manual ? ' by user' : '') + ' &middot; transcript saved to Business A history</span>';
    tr.appendChild(row);
    tr.scrollTop = tr.scrollHeight;
  }

  // waveform
  var wave = $('wave'), wctx = wave.getContext('2d'), level = 0;
  function drawWave() {
    requestAnimationFrame(drawWave);
    var w = wave.clientWidth, h = wave.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (wave.width !== Math.round(w * dpr)) { wave.width = Math.round(w * dpr); wave.height = Math.round(h * dpr); }
    wctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    wctx.clearRect(0, 0, w, h);
    level += ((callOn ? talking : 0) - level) * 0.12;
    var bars = Math.floor(w / 6), now = performance.now() / 1000;
    for (var i = 0; i < bars; i++) {
      var n = Math.sin(i * 0.45 + now * 7) * Math.sin(i * 0.13 + now * 2.3);
      var amp = 2 + Math.abs(n) * (h * 0.42) * level + Math.random() * 3 * level;
      wctx.fillStyle = talking === 1 ? 'rgba(108,180,255,.85)' : talking > 0 ? 'rgba(77,214,143,.85)' : 'rgba(142,163,152,.35)';
      wctx.fillRect(i * 6, h / 2 - amp, 3, amp * 2);
    }
  }
  drawWave();

  /* ================= LEARNING ================= */
  var CASES = [
    { n: 'Wattle Packaging', d: 'INV-3391 &middot; PDF', ok: true, r: 'Entered, total matches' },
    { n: 'Bayside Electrical', d: 'BE-0912 &middot; photo', ok: true, r: 'Entered, total matches' },
    { n: 'Coastal Supplies', d: 'INV-1107 &middot; 2 pages', ok: true, r: 'Entered, both pages attached' },
    { n: 'Kestrel Labs', d: 'new supplier', ok: true, r: 'Stopped and asked - correct' },
    { n: 'Harbour Freight', d: 'after app update', ok: false, r: 'Amount field moved - reported, parked for re-teach' }
  ];
  var testBtn = $('testBtn'), testRow = $('testRow');
  function resetTests() {
    testRow.innerHTML = '';
    CASES.forEach(function (c) { testRow.appendChild(el('div', 'tc', '<b>' + c.n + '</b><span class="muted">' + c.d + '</span>')); });
    $('testSum').innerHTML = '';
  }
  resetTests();
  testBtn.onclick = function () {
    resetTests();
    testBtn.disabled = true;
    var passed = 0;
    CASES.forEach(function (c, i) {
      var box = testRow.children[i];
      setTimeout(function () { box.className = 'tc run'; box.innerHTML = '<b>' + c.n + '</b><span class="muted">running&hellip;</span>'; }, i * 1100);
      setTimeout(function () {
        box.className = 'tc ' + (c.ok ? 'pass' : 'fail');
        box.innerHTML = '<b>' + (c.ok ? 'PASS' : 'FAIL') + ' &middot; ' + c.n + '</b><span>' + c.r + '</span>';
        if (c.ok) passed++;
        if (i === CASES.length - 1) {
          $('testSum').innerHTML = 'Measured: <b>' + passed + ' of 5 passed (' + passed * 20 + '%)</b>. One failure reported as a failure. Nothing was entered wrongly.';
          testBtn.disabled = false;
          testBtn.textContent = 'Run again';
        }
      }, i * 1100 + 900);
    });
  };

  /* ================= ARCHITECTURE STACK ================= */
  var stack = $('stack');
  new IntersectionObserver(function (en) {
    en.forEach(function (e) { stack.classList.toggle('open', e.isIntersecting); });
  }, { threshold: 0.5 }).observe(stack);

  /* ================= REVEAL ================= */
  var rev = document.querySelectorAll('.sec-head, .console, .p-item, .ws-grid, .call, .learn, .phases, .hw, .phone-stage');
  var io = new IntersectionObserver(function (en) {
    en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  [].forEach.call(rev, function (n) { n.classList.add('reveal'); io.observe(n); });

  /* ================= START ================= */
  select('tender');
  log('operator online &middot; local models loaded &middot; cloud AI: off');
  log('policy engine ready &middot; 4 workspaces &middot; audit log append-only', 'ok');
})();
