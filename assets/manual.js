/* PCM Software Manual — navigation, search and interactive figures. No dependencies. */
(function () {
  'use strict';
  var D = JSON.parse(document.getElementById('manual-data').textContent);
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var order = ['contents'].concat(D.order);
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem('pcm-manual:' + k)); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('pcm-manual:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } }
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return '&#' + c.charCodeAt(0) + ';'; }); }

  /* ---------- routing: #section or #section:anchor */
  var current = null;
  function show(hash) {
    var raw = decodeURIComponent((hash || '').replace(/^#/, '')) || 'contents';
    var parts = raw.split(':');
    var id = parts[0], anchor = parts.slice(1).join(':');
    var page = document.getElementById(id);
    if (!page || !page.classList.contains('page')) {
      if (current && page) { page.focus(); return; }          // in-page anchor such as the skip link
      id = 'contents'; page = document.getElementById('contents'); anchor = '';
    }
    if (current !== id) {
      $$('.page.shown').forEach(function (p) { p.classList.remove('shown'); });
      page.classList.add('shown');
      current = id;
      initPage(page);
    }
    $$('[data-nav]').forEach(function (a) {
      var on = a.getAttribute('data-nav') === id;
      a.classList.toggle('current', on);
      if (on) { a.setAttribute('aria-current', 'page'); } else { a.removeAttribute('aria-current'); }
    });
    var g = D.groups[id];
    if (g !== undefined) { openGroup(g, true); }
    var i = order.indexOf(id);
    $('#prev').href = '#' + (order[i - 1] || 'contents');
    $('#next').href = '#' + (order[i + 1] || order[order.length - 1]);
    $('#pageno').textContent = id === 'contents' ? '—' : id;
    document.title = (page.getAttribute('data-title') || 'Contents') + ' · PCM Software Manual';
    var target = anchor ? document.getElementById(id + '--' + anchor) : null;
    if (target) {
      target.scrollIntoView({ block: 'center' });
      target.classList.add('flash-target');
      setTimeout(function () { target.classList.remove('flash-target'); }, 1600);
    } else {
      window.scrollTo(0, 0);
    }
    closeSide();
  }
  window.addEventListener('hashchange', function () { show(location.hash); });

  /* ---------- contents panel */
  function openGroup(num, open) {
    var li = $('.toc .grp[data-group="' + num + '"]');
    if (!li) { return; }
    li.classList.toggle('open', open);
    $('button', li).setAttribute('aria-expanded', String(open));
    $('.chev', li).textContent = open ? '▾' : '▸';
    var saved = store.get('open') || {};
    saved[num] = open;
    store.set('open', saved);
  }
  $$('.toc .grp > button').forEach(function (b) {
    b.addEventListener('click', function () {
      var li = b.parentNode;
      openGroup(li.getAttribute('data-group'), !li.classList.contains('open'));
    });
  });
  var saved = store.get('open') || {};
  Object.keys(saved).forEach(function (k) { if (saved[k]) { openGroup(k, true); } });
  var side = $('#side'), menu = $('.bar .menu');
  function closeSide() { side.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); }
  menu.addEventListener('click', function () {
    var open = !side.classList.contains('open');
    side.classList.toggle('open', open);
    menu.setAttribute('aria-expanded', String(open));
  });
  $('#print').addEventListener('click', function () { window.print(); });

  /* ---------- search */
  var q = $('#q'), results = $('#results');
  function search(term) {
    term = term.trim();
    if (term.length < 2) { return []; }
    var out = [], lower = term.toLowerCase(), hex = term.toUpperCase().replace(/^0X/, '');
    if (/^[0-9A-F]{4,6}$/.test(hex)) {
      var addr = ('000000' + hex).slice(-6);
      if (D.search.routines[addr]) { out.push({ href: '#10-3:r-' + addr, t: 'Routine ' + addr, s: D.search.routines[addr] }); }
      if (D.search.atlas[addr]) { out.push({ href: '#' + D.search.atlas[addr][1] + ':fig-atlas-' + addr, t: D.search.atlas[addr][0], s: 'Calibration structure at ROM ' + addr }); }
    }
    Object.keys(D.search.atlas).forEach(function (a) {
      var e = D.search.atlas[a];
      if (out.length < 40 && e[0].toLowerCase().indexOf(lower) >= 0) {
        out.push({ href: '#' + e[1] + ':fig-atlas-' + a, t: e[0], s: e[1] + ' · ROM ' + a });
      }
    });
    var titled = [], texted = [];
    D.search.sections.forEach(function (s) {
      var title = s.t.toLowerCase().indexOf(lower) >= 0, at = s.x.toLowerCase().indexOf(lower);
      if (title || at >= 0) {
        var snip = at >= 0 ? '…' + s.x.slice(Math.max(0, at - 50), at + 90) + '…' : s.x.slice(0, 120);
        (title ? titled : texted).push({ href: '#' + s.id, t: s.id + ' ' + s.t, s: snip });
      }
    });
    return titled.concat(out, texted).slice(0, 30);
  }
  var hits = [], active = -1;
  function render() {
    hits = search(q.value);
    active = -1;
    results.innerHTML = hits.map(function (h, i) {
      return '<li role="option" id="hit' + i + '"><a href="' + h.href + '"><b>' + esc(h.t) + '</b><small>' + esc(h.s) + '</small></a></li>';
    }).join('') || (q.value.trim().length > 1 ? '<li><a href="#contents"><small>No matches</small></a></li>' : '');
    results.hidden = !results.innerHTML;
  }
  q.addEventListener('input', render);
  q.addEventListener('keydown', function (e) {
    var links = $$('a', results);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(0, Math.min(links.length - 1, active + (e.key === 'ArrowDown' ? 1 : -1)));
      links.forEach(function (a, i) { a.classList.toggle('on', i === active); });
    } else if (e.key === 'Enter' && links.length) {
      location.hash = links[Math.max(active, 0)].getAttribute('href');
      results.hidden = true;
    } else if (e.key === 'Escape') {
      results.hidden = true;
    }
  });
  results.addEventListener('click', function () { results.hidden = true; q.blur(); });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search')) { results.hidden = true; } });

  /* ---------- per-page widgets (initialised on first view) */
  function initPage(page) {
    if (page.getAttribute('data-ready')) { return; }
    page.setAttribute('data-ready', '1');
    $$('table.heat', page).forEach(heat);
    $$('table.sortable', page).forEach(sortable);
    $$('input.filter', page).forEach(filter);
    $$('[data-widget="flash-map"]', page).forEach(flashMap);
    $$('[data-widget="tuning"]', page).forEach(tuning);
  }

  function heat(table) {
    var readout = table.closest('.atlas-body') ? $('.readout', table.closest('.atlas-body')) : null;
    $$('td', table).forEach(function (td) {
      if (parseFloat(td.style.getPropertyValue('--h')) > 0.62) { td.classList.add('dark'); }
    });
    function say(td) {
      if (!readout || !td || td.tagName !== 'TD') { return; }
      var tr = td.parentNode, r = tr.rowIndex - 1, c = td.cellIndex - 1;
      readout.textContent = 'Row ' + r + ', column ' + c + ' · ROM ' + td.getAttribute('data-addr') + ' · stored ' + td.getAttribute('data-raw') + ' · shown ' + td.textContent;
    }
    table.addEventListener('mouseover', function (e) { say(e.target.closest('td')); });
    table.addEventListener('click', function (e) {
      var td = e.target.closest('td');
      $$('td.on', table).forEach(function (x) { x.classList.remove('on'); });
      if (td) { td.classList.add('on'); say(td); }
    });
  }

  function sortable(table) {
    $$('thead th', table).forEach(function (th, col) {
      th.setAttribute('tabindex', '0');
      function sort() {
        var asc = th.getAttribute('aria-sort') !== 'ascending';
        $$('thead th', table).forEach(function (x) { x.removeAttribute('aria-sort'); });
        th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        var body = table.tBodies[0], rows = $$('tr', body);
        rows.sort(function (a, b) {
          var x = a.cells[col] ? a.cells[col].textContent.trim() : '', y = b.cells[col] ? b.cells[col].textContent.trim() : '';
          var nx = parseFloat(x.replace(/,/g, '')), ny = parseFloat(y.replace(/,/g, ''));
          var cmp = (!isNaN(nx) && !isNaN(ny) && /^[-\d.,]+$/.test(x) && /^[-\d.,]+$/.test(y)) ? nx - ny : x.localeCompare(y, undefined, { numeric: true });
          return asc ? cmp : -cmp;
        });
        rows.forEach(function (r) { body.appendChild(r); });
      }
      th.addEventListener('click', sort);
      th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sort(); } });
    });
  }

  function filter(input) {
    var scope = input.getAttribute('data-target') === 'pins' ? $$('table.pins', input.closest('.body'))
      : [input.nextElementSibling && input.nextElementSibling.querySelector ? (input.nextElementSibling.matches('table') ? input.nextElementSibling : $('table', input.nextElementSibling)) : null].filter(Boolean);
    input.addEventListener('input', function () {
      var t = input.value.trim().toLowerCase();
      scope.forEach(function (table) {
        $$('tbody tr', table).forEach(function (tr) {
          tr.hidden = !!t && tr.textContent.toLowerCase().indexOf(t) < 0;
        });
      });
    });
  }

  var FLASH = {
    fuel: ['#C8102E', 'Fuel and starting'], spark: ['#F08A24', 'Spark and ignition'], trans: ['#2A6FBF', 'Transmission'],
    diag: ['#7E57C2', 'Diagnostics'], sched: ['#1A9E9E', 'Schedules and configuration'], sens: ['#D4B106', 'Sensors and temperature'], idle: ['#B0607E', 'Idle air'], misf: ['#3C8D2F', 'Misfire'],
    data: ['#B5B5B5', 'Other data'], code: ['#2E2E2E', 'Program code'], ff: ['#F4F4F2', 'Unused fill (FF)']
  };
  function hex6(n) { return ('00000' + n.toString(16).toUpperCase()).slice(-6); }
  function flashMap(host) {
    var W = D.widgets.flash, size = W.blockSize, blocks = W.blocks;
    function kind(m) {
      var best = null, cal = null;
      Object.keys(m).forEach(function (k) {
        if (!best || m[k] > m[best]) { best = k; }
        if (['fuel', 'spark', 'trans', 'diag', 'sched', 'sens', 'idle', 'misf'].indexOf(k) >= 0 && (!cal || m[k] > m[cal])) { cal = k; }
      });
      return cal && m[cal] >= 64 ? cal : best;
    }
    var sel = store.get('flash-sel');
    if (typeof sel !== 'number' || sel < 0 || sel >= blocks.length) { sel = 10; }
    var cols = 16, rows = blocks.length / cols;
    var grid = '<div class="flash-grid" role="group" aria-label="Flash memory map"><div class="row"><span class="lab"></span>';
    for (var c = 0; c < cols; c++) { grid += '<span class="col">' + c.toString(16).toUpperCase() + '</span>'; }
    grid += '</div>';
    for (var r = 0; r < rows; r++) {
      grid += '<div class="row"><span class="lab">' + hex6(r * cols * size) + '</span>';
      for (c = 0; c < cols; c++) {
        var i = r * cols + c, k = kind(blocks[i].m);
        grid += '<button type="button" data-b="' + i + '" style="background:' + FLASH[k][0] + (k === 'ff' ? ';border-color:#c9c9c6' : '') + '" aria-label="' +
          hex6(i * size) + ' to ' + hex6(i * size + size - 1) + ', ' + FLASH[k][1] + (blocks[i].e.length ? ', ' + blocks[i].e.length + ' structures' : '') + '" title="' + hex6(i * size) + '"></button>';
      }
      grid += '</div>';
    }
    grid += '</div>';
    var legend = '<div class="flash-legend">' + Object.keys(FLASH).map(function (k) {
      return '<span><i style="background:' + FLASH[k][0] + (k === 'ff' ? ';outline:1px solid #c9c9c6' : '') + '"></i>' + FLASH[k][1] + '</span>';
    }).join('') + '</div>';
    host.innerHTML = '<div class="flash">' + grid + '<aside class="flash-detail" aria-live="polite"></aside></div>' + legend;
    var detail = $('.flash-detail', host);
    function pick(i) {
      sel = i;
      store.set('flash-sel', i);
      $$('.flash-grid button', host).forEach(function (b) {
        var on = +b.getAttribute('data-b') === i;
        b.classList.toggle('sel', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var b = blocks[i], k = kind(b.m), mix = Object.keys(b.m).sort(function (x, y) { return b.m[y] - b.m[x]; });
      detail.innerHTML = '<span class="k">SELECTED BLOCK</span><span class="r">' + hex6(i * size) + ' – ' + hex6(i * size + size - 1) + '</span>' +
        '<span class="l">' + FLASH[k][1] + '</span>' +
        mix.map(function (m) {
          var pct = Math.round(b.m[m] * 100 / size);
          return '<div><div style="display:flex;justify-content:space-between"><span>' + FLASH[m][1] + '</span><span class="mono">' + b.m[m] + ' bytes</span></div>' +
            '<div class="bar"><i style="width:' + pct + '%;background:' + FLASH[m][0] + (m === 'ff' ? ';outline:1px solid #c9c9c6' : '') + '"></i></div></div>';
        }).join('') +
        (b.e.length ? '<span class="k">CALIBRATION STRUCTURES · ' + b.e.length + '</span><ul>' + b.e.map(function (e) {
          return '<li><a href="#' + e[2] + ':fig-atlas-' + e[0] + '">' + esc(e[1]) + '</a> <span class="mono">' + e[0] + '</span></li>';
        }).join('') + '</ul>' : '');
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-b]');
      if (b) { pick(+b.getAttribute('data-b')); }
    });
    pick(sel);
  }

  /* ---------- tuning workbench (9-10): edits stay in this browser; the image never leaves it */
  function tuning(host) {
    var T = D.widgets.tuning, NR = T.rpm.length, NC = T.kpa.length;
    var saved = store.get('tune') || {};
    var st = { maps: saved.maps || {}, words: saved.words || {}, keepSum: saved.keepSum !== false, tab: saved.tab || 'fuel' };
    T.maps.forEach(function (m) { if (!st.maps[m.key]) { st.maps[m.key] = {}; } });
    if (!T.maps.some(function (m) { return m.key === st.tab; })) { st.tab = T.maps[0].key; }
    var image = null, imageSum = null;
    var base = {};                      // map key -> flat baseline values (reference, or the loaded image)
    function resetBase() {
      T.maps.forEach(function (m) { base[m.key] = [].concat.apply([], m.cells); });
      T.words.forEach(function (w) { base['w' + w.addr] = w.raw; });
    }
    resetBase();
    var sel = {}, anchor = null, dragging = false;
    function save() { store.set('tune', st); }
    function mapBy(k) { return T.maps.filter(function (m) { return m.key === k; })[0]; }
    function val(m, i) { var e = st.maps[m.key]; return Object.prototype.hasOwnProperty.call(e, i) ? e[i] : base[m.key][i]; }
    function setVal(m, i, v) {
      v = Math.max(m.min, Math.min(m.max, Math.round(v)));
      if (v === base[m.key][i]) { delete st.maps[m.key][i]; } else { st.maps[m.key][i] = v; }
    }
    function shown(m, v) { return m.key === 'spark' ? (v / 2).toFixed(1).replace('-', '−') : String(v); }
    function rpm(i) { return Math.round(T.rpm[i]); }
    function encode(m, v) {
      if (m.width === 2) { return [(v >> 8) & 0xFF, v & 0xFF]; }
      return [v & 0xFF];
    }
    function decode(bytes, a, m) {
      var v = m.width === 2 ? (bytes[a] << 8) | bytes[a + 1] : bytes[a];
      return m.signed && v >= 0x80 ? v - 0x100 : v;
    }
    function sum16(b) { var s = 0; for (var i = 0; i < b.length; i++) { s = (s + b[i]) & 0xFFFF; } return s; }
    function h(n, w) { return ('00000' + n.toString(16).toUpperCase()).slice(-(w || 6)); }

    host.innerHTML =
      '<div class="tune">' +
      '<div class="tune-tabs" role="tablist">' + T.maps.map(function (m) {
        return '<button type="button" role="tab" data-tab="' + m.key + '">' + esc(m.title.toUpperCase()) + '<small></small></button>';
      }).join('') + '</div>' +
      '<div class="tune-main"><div class="scroll"><table class="tune-grid"></table></div>' +
      '<p class="readout" aria-live="polite"></p>' +
      '<div class="tune-tools">' +
      '<span class="tune-group"><span class="k">SELECTION</span><span class="tune-selinfo"></span>' +
      '<button type="button" data-q="all">All</button><button type="button" data-q="none">None</button></span>' +
      '<span class="tune-group"><label class="tune-op"><span class="op-a"></span><input type="number" class="in-a" step="any"></label><button type="button" data-op="a">APPLY</button></span>' +
      '<span class="tune-group"><label class="tune-op"><span class="op-b"></span><input type="number" class="in-b" step="any"></label><button type="button" data-op="b">APPLY</button></span>' +
      '<span class="tune-group"><button type="button" data-op="revert">Revert</button><button type="button" data-op="revert-map">Revert map</button></span>' +
      '</div></div>' +
      '<div class="tune-panels">' +
      '<section><span class="k">ENGINE SPEED LIMIT</span>' + T.words.map(function (w) {
        return '<label class="tune-op"><span>' + esc(w.title) + ' <small class="mono">' + h(w.addr) + ' · stock ' + (w.raw / 8) + ' rpm</small></span>' +
          '<input type="number" min="0" max="8191" step="1" data-word="' + w.addr + '"> <i>rpm</i></label>';
      }).join('') + '</section>' +
      '<section><span class="k">IMAGE</span>' +
      '<label class="tune-file"><span>Load PCM image (' + (T.size / 1024) + ' KiB)</span><input type="file" accept=".bin,.ori,.rom,application/octet-stream"></label>' +
      '<p class="tune-status" aria-live="polite"></p>' +
      '<label class="tune-check"><input type="checkbox" class="keep-sum"> Keep the image sum</label>' +
      '<div class="tune-quick"><button type="button" data-dl="image">DOWNLOAD IMAGE</button><button type="button" data-dl="csv">DOWNLOAD CHANGE LIST</button>' +
      '<button type="button" data-dl="clear">Revert all</button></div>' +
      '<p class="tune-summary"></p></section></div></div>';

    var grid = $('.tune-grid', host), readout = $('.readout', host), status = $('.tune-status', host);
    var inA = $('.in-a', host), inB = $('.in-b', host);
    readout.textContent = 'Drag across cells, or select a row or column heading, then apply a change.';
    $('.keep-sum', host).checked = st.keepSum;

    function drawGrid() {
      var m = mapBy(st.tab), vals = [], i, r, c;
      for (i = 0; i < NR * NC; i++) { vals.push(val(m, i)); }
      var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
      var out = '<thead><tr><th><button type="button" data-q="all" title="Select all">rpm \\ kPa</button></th>';
      for (c = 0; c < NC; c++) { out += '<th><button type="button" data-col="' + c + '">' + T.kpa[c] + '</button></th>'; }
      out += '</tr></thead><tbody>';
      for (r = 0; r < NR; r++) {
        out += '<tr><th><button type="button" data-row="' + r + '">' + rpm(r) + '</button></th>';
        for (c = 0; c < NC; c++) {
          i = r * NC + c;
          var v = vals[i], heat = (v - lo) / (hi - lo || 1), mod = Object.prototype.hasOwnProperty.call(st.maps[m.key], i);
          out += '<td data-i="' + i + '" class="' + (mod ? 'mod ' : '') + (sel[i] ? 'sel ' : '') + (heat > 0.62 ? 'dark' : '') +
            '" style="--h:' + heat.toFixed(3) + '">' + shown(m, v) + '</td>';
        }
        out += '</tr>';
      }
      grid.innerHTML = out + '</tbody>';
      $$('.tune-tabs button', host).forEach(function (b) {
        var k = b.getAttribute('data-tab'), n = Object.keys(st.maps[k]).length;
        b.setAttribute('aria-selected', String(k === st.tab));
        $('small', b).textContent = n ? ' · ' + n + ' changed' : '';
      });
      var spark = m.key === 'spark';
      $('.op-a', host).textContent = spark ? 'Add °' : 'Scale %';
      $('.op-b', host).textContent = spark ? 'Set °' : 'Set';
      inA.step = '0.5'; inB.step = spark ? '0.5' : '1';
      selInfo();
      summary();
    }
    function selInfo() {
      var n = Object.keys(sel).length;
      $('.tune-selinfo', host).textContent = n ? n + ' cell' + (n === 1 ? '' : 's') : 'none';
    }
    function say(i) {
      var m = mapBy(st.tab), r = Math.floor(i / NC), c = i % NC, b = base[m.key][i], v = val(m, i);
      var delta = v === b ? 'stock' : (m.key === 'spark' ? ((v - b) / 2 > 0 ? '+' : '') + ((v - b) / 2).toFixed(1) + '°'
        : (b ? ((v - b) * 100 / b > 0 ? '+' : '') + ((v - b) * 100 / b).toFixed(1) + ' %' : 'from 0'));
      readout.textContent = rpm(r) + ' rpm · ' + T.kpa[c] + ' kPa · stock ' + shown(m, b) + ' · now ' + shown(m, v) + ' (' + delta + ') · ROM ' +
        m.starts.map(function (s) { return h(s + i * m.width); }).join(', ');
    }
    function selectRect(a, b) {
      sel = {};
      var r0 = Math.min(Math.floor(a / NC), Math.floor(b / NC)), r1 = Math.max(Math.floor(a / NC), Math.floor(b / NC));
      var c0 = Math.min(a % NC, b % NC), c1 = Math.max(a % NC, b % NC);
      for (var r = r0; r <= r1; r++) { for (var c = c0; c <= c1; c++) { sel[r * NC + c] = true; } }
      $$('td', grid).forEach(function (td) { td.classList.toggle('sel', !!sel[+td.getAttribute('data-i')]); });
      selInfo();
    }
    grid.addEventListener('mousedown', function (e) {
      var td = e.target.closest('td');
      if (!td) { return; }
      e.preventDefault();
      var i = +td.getAttribute('data-i');
      if (e.shiftKey && anchor !== null) { selectRect(anchor, i); } else { anchor = i; selectRect(i, i); }
      dragging = true; say(i);
    });
    grid.addEventListener('mouseover', function (e) {
      var td = e.target.closest('td');
      if (!td) { return; }
      var i = +td.getAttribute('data-i');
      if (dragging && anchor !== null) { selectRect(anchor, i); }
      say(i);
    });
    document.addEventListener('mouseup', function () { dragging = false; });
    grid.addEventListener('touchstart', function (e) {
      var td = e.target.closest('td');
      if (td) { var i = +td.getAttribute('data-i'); if (sel[i] && Object.keys(sel).length === 1) { delete sel[i]; } else { sel[i] = true; } td.classList.toggle('sel', !!sel[i]); selInfo(); say(i); e.preventDefault(); }
    }, { passive: false });
    function quick(q) {
      var i;
      if (q === 'none') { sel = {}; }
      if (q === 'all') { sel = {}; for (i = 0; i < NR * NC; i++) { sel[i] = true; } }
      drawGrid();
    }
    host.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) { return; }
      var i, k = Object.keys(sel).map(Number), m = mapBy(st.tab);
      if (b.hasAttribute('data-tab')) { st.tab = b.getAttribute('data-tab'); save(); drawGrid(); return; }
      if (b.hasAttribute('data-q')) { quick(b.getAttribute('data-q')); return; }
      if (b.hasAttribute('data-row')) { sel = {}; for (i = 0; i < NC; i++) { sel[+b.getAttribute('data-row') * NC + i] = true; } drawGrid(); return; }
      if (b.hasAttribute('data-col')) { sel = {}; for (i = 0; i < NR; i++) { sel[i * NC + +b.getAttribute('data-col')] = true; } drawGrid(); return; }
      var op = b.getAttribute('data-op');
      if (op === 'revert-map') { st.maps[m.key] = {}; save(); drawGrid(); return; }
      if (op && !k.length) { readout.textContent = 'Select one or more cells first.'; return; }
      if (op === 'revert') { k.forEach(function (j) { delete st.maps[m.key][j]; }); }
      if (op === 'a' || op === 'b') {
        var x = parseFloat((op === 'a' ? inA : inB).value);
        if (isNaN(x)) { readout.textContent = 'Enter a value first.'; return; }
        k.forEach(function (j) {
          var v = val(m, j);
          if (m.key === 'spark') { setVal(m, j, op === 'a' ? v + Math.round(x * 2) : Math.round(x * 2)); }
          else { setVal(m, j, op === 'a' ? v * (1 + x / 100) : x); }
        });
      }
      if (op) { save(); drawGrid(); if (k.length === 1) { say(k[0]); } return; }
      var dl = b.getAttribute('data-dl');
      if (dl === 'clear') {
        if (window.confirm('Revert every map and the speed limit to the stock values?')) {
          T.maps.forEach(function (mm) { st.maps[mm.key] = {}; }); st.words = {}; save(); drawWords(); drawGrid();
        }
      }
      if (dl === 'csv') { download(csv(), 'text/csv', 'calibration-changes.csv'); }
      if (dl === 'image') { buildImage(); }
    });

    function drawWords() {
      $$('input[data-word]', host).forEach(function (inp) {
        var a = inp.getAttribute('data-word'), raw = Object.prototype.hasOwnProperty.call(st.words, a) ? st.words[a] : base['w' + a];
        inp.value = raw / 8;
        inp.classList.toggle('mod', raw !== base['w' + a]);
      });
    }
    host.addEventListener('change', function (e) {
      var inp = e.target;
      if (inp.hasAttribute('data-word')) {
        var a = inp.getAttribute('data-word'), raw = Math.max(0, Math.min(0xFFFF, Math.round(parseFloat(inp.value) * 8)));
        if (isNaN(raw) || raw === base['w' + a]) { delete st.words[a]; } else { st.words[a] = raw; }
        save(); drawWords(); summary();
      }
      if (inp.classList.contains('keep-sum')) { st.keepSum = inp.checked; save(); }
      if (inp.type === 'file' && inp.files[0]) { loadImage(inp.files[0]); }
    });

    function changes() {             // every byte that differs from the baseline, in address order
      var out = [];
      T.maps.forEach(function (m) {
        Object.keys(st.maps[m.key]).map(Number).forEach(function (i) {
          var nb = encode(m, st.maps[m.key][i]), ob = encode(m, base[m.key][i]);
          m.starts.forEach(function (s, copy) {
            nb.forEach(function (x, j) {
              var a = s + i * m.width + j, old = image ? image[a] : ob[j];
              if (old !== x) { out.push({ a: a, o: old, n: x, what: m.title + ' ' + 'AB'[copy] + ' r' + Math.floor(i / NC) + ' c' + (i % NC) }); }
            });
          });
        });
      });
      T.words.forEach(function (w) {
        if (!Object.prototype.hasOwnProperty.call(st.words, w.addr)) { return; }
        var nb = [(st.words[w.addr] >> 8) & 0xFF, st.words[w.addr] & 0xFF], ob = [(base['w' + w.addr] >> 8) & 0xFF, base['w' + w.addr] & 0xFF];
        nb.forEach(function (x, j) { var a = w.addr + j, old = image ? image[a] : ob[j]; if (old !== x) { out.push({ a: a, o: old, n: x, what: w.title }); } });
      });
      return out.sort(function (x, y) { return x.a - y.a; });
    }
    function summary() {
      var ch = changes(), cells = T.maps.reduce(function (n, m) { return n + Object.keys(st.maps[m.key]).length; }, 0);
      $('.tune-summary', host).textContent = cells + ' map cell' + (cells === 1 ? '' : 's') + ' and ' + Object.keys(st.words).length +
        ' limit setting' + (Object.keys(st.words).length === 1 ? '' : 's') + ' changed · ' + ch.length + ' byte' + (ch.length === 1 ? '' : 's') + ' to write';
      $('[data-dl="image"]', host).disabled = !image;
    }
    function csv() {
      return 'address,stock,new,structure\n' + changes().map(function (c) { return h(c.a) + ',' + h(c.o, 2) + ',' + h(c.n, 2) + ',' + c.what; }).join('\n') + '\n';
    }
    function download(data, type, name) {
      var url = URL.createObjectURL(new Blob([data], { type: type })), a = document.createElement('a');
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }
    function setStatus(text, bad) { status.textContent = text; status.classList.toggle('bad', !!bad); }
    setStatus('No image loaded. Edits are kept in this browser; load the image to write a file.');

    function loadImage(file) {
      var fr = new FileReader();
      fr.onload = function () {
        var b = new Uint8Array(fr.result), id = T.ident, i, j;
        if (b.length !== T.size) { setStatus(file.name + ': ' + b.length + ' bytes; the PCM image is ' + T.size + ' bytes.', true); return; }
        for (i = 0; i < id.hex.length / 2; i++) {
          if (b[id.addr + i] !== parseInt(id.hex.substr(i * 2, 2), 16)) { setStatus(file.name + ': the calibration identifier at ' + h(id.addr) + ' differs; the map addresses belong to calibration 04848703AF.', true); return; }
        }
        image = b; imageSum = sum16(b);
        var notes = [], differ = 0;
        T.maps.forEach(function (m) {
          var flat = [];
          for (j = 0; j < NR * NC; j++) { flat.push(decode(b, m.starts[0] + j * m.width, m)); }
          for (j = 0; j < NR * NC; j++) {
            if (m.starts.some(function (s) { return decode(b, s + j * m.width, m) !== flat[j]; })) { notes.push(m.title + ' copies differ; copy A is the starting point'); break; }
          }
          flat.forEach(function (v, k) { if (v !== base[m.key][k]) { differ++; } });
          base[m.key] = flat;
          Object.keys(st.maps[m.key]).forEach(function (k) { if (st.maps[m.key][k] === flat[k]) { delete st.maps[m.key][k]; } });
        });
        T.words.forEach(function (w) { base['w' + w.addr] = (b[w.addr] << 8) | b[w.addr + 1]; if (st.words[w.addr] === base['w' + w.addr]) { delete st.words[w.addr]; } });
        if (differ) { notes.push(differ + ' map cells differ from the reference image and now count as stock'); }
        var blank = true;
        for (i = T.comp[0]; i < T.comp[1]; i++) { if (b[i] !== 0xFF) { blank = false; break; } }
        if (!blank) { notes.push('the sum area ' + h(T.comp[0]) + '–' + h(T.comp[1] - 1) + ' already holds sum adjustments'); }
        setStatus(file.name + ' · calibration 04848703AF · sum ' + h(imageSum, 4) + (imageSum === T.sum ? ' (reference)' : '') + (notes.length ? ' · ' + notes.join('; ') : ''));
        save(); drawWords(); drawGrid();
      };
      fr.readAsArrayBuffer(file);
    }
    function buildImage() {
      if (!image) { return; }
      var out = new Uint8Array(image), ch = changes(), i;
      ch.forEach(function (c) { out[c.a] = c.n; });
      var msg = ch.length + ' bytes written';
      if (st.keepSum) {
        for (i = T.comp[0]; i < T.comp[1]; i++) { out[i] = 0xFF; }
        var d = (sum16(out) - imageSum) & 0xFFFF;
        for (i = T.comp[1] - 1; d > 0 && i >= T.comp[0]; i--) { var take = Math.min(d, out[i]); out[i] -= take; d -= take; }
        msg += ' · sum ' + h(sum16(out), 4) + ' kept';
      } else {
        msg += ' · sum ' + h(sum16(out), 4) + ' (was ' + h(imageSum, 4) + ')';
      }
      download(out, 'application/octet-stream', 'VIP_04848703AF_modified.bin');
      setStatus(msg + '. Program the file into the flash device and keep the original image.');
    }

    drawWords();
    drawGrid();
  }

  /* ---------- start */
  show(location.hash);
})();
