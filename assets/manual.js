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

  /* ---------- start */
  show(location.hash);
})();
