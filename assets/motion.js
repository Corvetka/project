(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) { return; }

  var folder = document.querySelector('.sect--folders .folder');
  var decor = document.querySelectorAll('.decor__item');
  var ticking = false;

  // Сброс will-change после окончания движения, чтобы не держать слои в памяти
  function hintOn(el) { el.style.willChange = 'transform'; }
  function hintOff(el) { el.style.willChange = ''; }
  if (folder) {
    folder.querySelectorAll('.folder__tab').forEach(function (tab) {
      tab.addEventListener('pointerenter', function () { hintOn(tab); });
      tab.addEventListener('pointerleave', function () { hintOff(tab); });
    });
  }

  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  // Один цикл обновления на кадр: камера для папки и параллакс для декора
  function update() {
    ticking = false;
    var vh = window.innerHeight || 1;

    if (folder) {
      var r = folder.getBoundingClientRect();
      // 0 — низ папки только входит в экран, 1 — верх папки у 35% высоты экрана
      var p = (vh - r.top) / (vh * 0.9);
      folder.style.setProperty('--cam', clamp(p, 0, 1).toFixed(3));
    }

    if (decor.length) {
      var y = window.scrollY || 0;
      for (var i = 0; i < decor.length; i++) {
        var speed = (i % 3 === 0) ? 0.06 : (i % 3 === 1 ? 0.035 : 0.02);
        decor[i].style.setProperty('--py', (-y * speed).toFixed(1) + 'px');
      }
    }
  }

  function request() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(update);
    }
  }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  update();
})();
