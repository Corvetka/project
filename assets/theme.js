(function () {
  'use strict';
  var root = document.documentElement;
  var KEY = 'pb-scheme';
  var fileDefault = root.getAttribute('data-palette') || 'porto';
  var fileMode = root.getAttribute('data-theme') || 'dark';
  var isIndex = !root.hasAttribute('data-file');

  function readStore() {
    try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }

  function apply(palette, mode, save) {
    root.setAttribute('data-palette', palette);
    root.setAttribute('data-theme', mode);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      var probe = getComputedStyle(root).getPropertyValue('--ink').trim();
      if (probe) meta.setAttribute('content', probe);
    }
    document.querySelectorAll('[data-pal]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-pal') === palette));
    });
    document.querySelectorAll('[data-mode]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === mode));
    });
    if (save) {
      try { localStorage.setItem(KEY, JSON.stringify({ p: palette, m: mode })); } catch (e) {}
    }
  }

  var stored = readStore();
  var startPalette = fileDefault;
  var startMode = fileMode;
  if (isIndex && stored) {
    startPalette = stored.p || fileDefault;
    startMode = stored.m || fileMode;
  } else if (!isIndex && stored && stored.m) {
    startMode = stored.m;
  }
  apply(startPalette, startMode, false);

  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-pal]');
    if (p) { apply(p.getAttribute('data-pal'), root.getAttribute('data-theme'), true); return; }
    var m = e.target.closest('[data-mode]');
    if (m) { apply(root.getAttribute('data-palette'), m.getAttribute('data-mode'), true); }
  });
})();
