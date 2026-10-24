/* ==========================================================
   Projekt-Komplekt · интерактив
   Меню-оверлей, маски заголовков, появление блоков,
   горизонтальная прокрутка раздела «Направления работы».
   ========================================================== */
(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  doc.documentElement.classList.add('js');



  /* ==========================================================
     ДЕКОР: ПОЯВЛЕНИЕ + ПЕРЕТАСКИВАНИЕ
     Предмет можно утащить в любое место страницы — он отрывается
     от своей полосы и живёт в общем слое. Позиция запоминается.
     ========================================================== */
  (function () {
    var items = Array.prototype.slice.call(doc.querySelectorAll('.decor__item'));
    if (!items.length) return;

    var layer = doc.querySelector('.decor-layer');
    var KEY = 'pb-decor-pos';
    var store = {};
    /* старые сохранённые позиции (общий ключ для всех страниц) больше не используем:
       они разбрасывали картинки по странице и на других экранах */
    try { localStorage.removeItem(KEY); } catch (e) {}

    function persist() {
      try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {}
    }
    function idOf(el) {
      var n = items.indexOf(el);
      return n < 0 ? null : 'd' + n;
    }
    function pageRect(el) {
      var r = el.getBoundingClientRect();
      return {
        x: r.left + window.pageXOffset,
        y: r.top + window.pageYOffset,
        w: r.width, h: r.height
      };
    }
    function maxXY() {
      return {
        w: doc.documentElement.scrollWidth,
        h: doc.documentElement.scrollHeight
      };
    }

    /* --- восстановление сохранённых позиций --- */
    function restore(el) {
      var id = idOf(el);
      if (!id || !store[id] || !layer) return false;
      var p = pageRect(el);
      layer.appendChild(el);
      el.classList.add('is-free', 'is-in');
      el.style.left = store[id].x + 'px';   /* центр предмета */
      el.style.top = store[id].y + 'px';
      var rw = (store[id].w || (el.offsetWidth || p.w));
      el.style.setProperty('--fixed-w', rw + 'px');
      el.style.width = rw + 'px';
      el.style.maxWidth = rw + 'px';
      return true;
    }

    /* --- перенос предмета в свободный слой --- */
    function detach(el) {
      if (!layer || el.parentElement === layer) return pageRect(el);
      var p = pageRect(el);
      var realW = el.offsetWidth || Math.round(p.w);
      el.style.setProperty('--fixed-w', realW + 'px');
      el.style.width = realW + 'px';
      el.style.maxWidth = realW + 'px';
      layer.appendChild(el);
      el.classList.add('is-free', 'is-in');
      /* ставим ЦЕНТР предмета: у .is-free стоит translate(-50%,-50%),
         и если задать левый край, предмет уедет на половину своего размера */
      el.style.left = (p.x + p.w / 2) + 'px';
      el.style.top = (p.y + p.h / 2) + 'px';
      return p;
    }

    /* --- возврат на исходное место --- */
    function reset(el) {
      var id = idOf(el);
      var origin = el.__origin;
      if (!origin) return;
      delete store[id];
      persist();
      el.classList.remove('is-free', 'is-dragging');
      el.style.left = el.style.top = el.style.width = el.style.maxWidth = '';
      el.style.removeProperty('--fixed-w');
      origin.parent.insertBefore(el, origin.next || null);
    }

    /* --- появление при прокрутке --- */
    if ('IntersectionObserver' in window && !reduce) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          /* en.target — полоса; раскрываем все её предметы разом */
          var band = en.target;
          band.querySelectorAll('.decor__item').forEach(function (f) {
            if (!f.classList.contains('is-free') && !f.classList.contains('is-in')) {
              f.classList.add('is-in');
            }
          });
          io.unobserve(band);
        });
      }, { threshold: 0.35, rootMargin: '0px 0px -8% 0px' });

      /* наблюдаем полосы, а не отдельные картинки */
      var bandEls = doc.querySelectorAll('.decor');
      Array.prototype.forEach.call(bandEls, function (b) { io.observe(b); });

      items.forEach(function (el, i) {
        el.__origin = { parent: el.parentElement, next: el.nextElementSibling };
        /* позиции из localStorage НЕ восстанавливаем: картинки всегда стоят
           в своих полосах и переносятся только по действию пользователя */
      });
      /* появление — только внутри своего блока-полосы: элемент проявляется,
         когда блок сам входит в экран, а не когда попадает в поле зрения */
    } else {
      items.forEach(function (el) {
        el.__origin = { parent: el.parentElement, next: el.nextElementSibling };
        el.classList.add('is-in');
      });
    }


    /* --- реальная высота каждого предмета в переменную --h ---
       Нужна для вертикального ограничения в CSS: без неё высокие
       изображения вылетали за верх полосы. */
    function measureHeights() {
      items.forEach(function (el) {
        if (el.classList.contains('is-free')) return;
        var h = el.offsetHeight;
        if (h) el.style.setProperty('--h', h + 'px');
      });
    }

    if (document.readyState === 'complete') measureHeights();
    else window.addEventListener('load', function () { setTimeout(measureHeights, 60); });

    window.addEventListener('resize', function () {
      clearTimeout(window.__decorH);
      window.__decorH = setTimeout(measureHeights, 120);
    });
    /* картинки в полосах грузятся лениво: после каждой загрузки
       пересчитываем --h, иначе вертикальное ограничение работает
       по старой (нулевой) высоте */
    items.forEach(function (el) {
      var img = el.querySelector('img');
      if (img && !img.complete) {
        img.addEventListener('load', function () { measureHeights(); }, { once: true });
      }
    });

    /* --- перетаскивание --- */
    var drag = null;
    var touchStart = null;   /* состояние касания на тач-экранах */

    function startDrag(el, ev) {
      if (ev.button !== undefined && ev.button !== 0 && ev.pointerType === 'mouse') return;
      var r = el.getBoundingClientRect();
      /* offsetWidth — реальная ширина рамки без учёта поворота.
         getBoundingClientRect().width у повёрнутого элемента больше
         настоящей, и при переносе картинка «прыгала» в размере. */
      var realW = el.offsetWidth || Math.round(r.width);
      drag = {
        el: el,
        startX: ev.clientX,
        startY: ev.clientY,
        /* центр предмета в координатах документа */
        origX: r.left + r.width / 2 + window.pageXOffset,
        origY: r.top + r.height / 2 + window.pageYOffset,
        w: realW,
        moved: false,
        detached: false
      };
    }

    function onMove(ev) {
      if (!drag) return;
      var dx = ev.clientX - drag.startX;
      var dy = ev.clientY - drag.startY;
      /* на тач-экране порог ниже: палец неточен */
      var thr = ev.pointerType === 'touch' ? 2 : 5;
      if (!drag.moved && Math.abs(dx) + Math.abs(dy) < thr) return;
      drag.moved = true;

      /* узел переносим один раз — при первом РЕАЛЬНОМ движении.
         Ширину фиксируем в пикселях: без этого картинка
         раздувается до натурального размера. */
      if (!drag.detached) {
        var el0 = drag.el;
        var fixedW = drag.w;                      /* ширина на момент захвата */
        /* --fixed-w читает CSS у .is-free; ставим ДО добавления класса,
           иначе одно мгновение ширина считается по --wcur */
        el0.style.setProperty('--fixed-w', fixedW + 'px');
        el0.style.width = fixedW + 'px';
        el0.style.maxWidth = fixedW + 'px';
        if (layer) {
          layer.appendChild(el0);
          el0.classList.add('is-free', 'is-in');
        }
        el0.style.left = drag.origX + 'px';
        el0.style.top = drag.origY + 'px';
        el0.classList.add('is-dragging');
        drag.detached = true;
      }

      var lim = maxXY();
      var w = drag.el.offsetWidth, h = drag.el.offsetHeight;
      var nx = Math.max(w / 2, Math.min(lim.w - w / 2, drag.origX + dx));
      var ny = Math.max(h / 2, Math.min(lim.h - h / 2, drag.origY + dy));

      drag.el.style.left = nx + 'px';
      drag.el.style.top = ny + 'px';
      if (ev.cancelable) ev.preventDefault();
    }

    function onUp(ev) {
      if (!drag) return;
      var el = drag.el;
      el.classList.remove('is-dragging');
      if (drag.moved) {
        var id = idOf(el);
        if (id) {
          store[id] = {
            x: Math.round(parseFloat(el.style.left)),
            y: Math.round(parseFloat(el.style.top)),
            w: Math.round(el.offsetWidth)
          };
          persist();
        }
      }
      drag = null;
    }

    items.forEach(function (el) {
      var holdTimer = null;

      /* ---- ТАЧ: перетаскивание пальцем ----
         Раньше здесь было удержание 320 мс, но браузер успевал начать
         прокрутку страницы и присылал pointercancel — жест отменялся,
         картинка не двигалась. Теперь на touch-action:none жест целиком
         наш, а прокрутка страницы отключается только на время касания. */
      var touchStart = null;

      el.addEventListener('pointerdown', function (ev) {
        el.__origin = el.__origin || { parent: el.parentElement, next: el.nextElementSibling };

        /* На тач-экране стартуем сразу: touch-action:none у картинки
           уже запретил браузеру начинать прокрутку, поэтому жест наш.
           Удержание больше не нужно — именно оно и не срабатывало. */
        startDrag(el, ev);
      });

      el.addEventListener('touchstart', function (ev) {
        if (ev.touches.length !== 1) return;
        /* не даём странице уехать, пока палец на картинке */
        ev.target.style.touchAction = 'none';
      }, { passive: true });

      el.addEventListener('touchend', function () {
        el.style.touchAction = '';
      }, { passive: true });

      el.addEventListener('pointercancel', function (ev) {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
        el.style.touchAction = '';
        if (drag) { drag.el.classList.remove('is-dragging'); drag = null; }
      });
      el.addEventListener('pointerleave', function () {
        if (holdTimer) { clearTimeout(holdTimer); holdTimer = null; }
      });

      // двойной клик — вернуть на место
      el.addEventListener('dblclick', function (ev) {
        ev.preventDefault();
        reset(el);
      });

      // клавиатура: стрелки двигают, Enter возвращает
      el.addEventListener('keydown', function (ev) {
        var step = ev.shiftKey ? 40 : 12;
        var beforeW = el.offsetWidth;
        var map = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); reset(el); return; }
        var d = map[ev.key];
        if (!d) return;
        ev.preventDefault();
        detach(el);
        var lim = maxXY();
        var w = el.offsetWidth, h = el.offsetHeight;
        var nx = Math.max(w / 2, Math.min(lim.w - w / 2, (parseFloat(el.style.left) || 0) + d[0]));
        var ny = Math.max(h / 2, Math.min(lim.h - h / 2, (parseFloat(el.style.top) || 0) + d[1]));
        el.style.left = nx + 'px';
        el.style.top = ny + 'px';
        var id = idOf(el);
        if (id) { store[id] = { x: Math.round(nx), y: Math.round(ny), w: Math.round(w) }; persist(); }
      });
    });

    doc.addEventListener('pointermove', onMove, { passive: false });
    doc.addEventListener('pointerup', onUp);
  })();

  /* ---------------- МЕНЮ ---------------- */
  var burger = doc.getElementById('burger');
  var menu = doc.getElementById('menu');
  var links = Array.prototype.slice.call(doc.querySelectorAll('.mlink__inner'));

  function setStagger() {
    links.forEach(function (el, i) {
      el.style.transitionDelay = (0.06 * i + 0.12).toFixed(3) + 's';
    });
  }

  function openMenu() {
    body.classList.add('menu-open', 'is-locked');
    menu.setAttribute('aria-hidden', 'false');
    burger.setAttribute('aria-expanded', 'true');
    burger.setAttribute('aria-label', 'Закрыть меню');
  }

  function closeMenu() {
    body.classList.remove('menu-open', 'is-locked');
    menu.setAttribute('aria-hidden', 'true');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Открыть меню');
    /* при закрытии сбрасываем задержки, чтобы пункты уезжали почти одновременно */
    links.forEach(function (el, i) {
      el.style.transitionDelay = (0.02 * (links.length - i)).toFixed(3) + 's';
    });
  }

  if (burger && menu) {
    setStagger();
    burger.addEventListener('click', function () {
      body.classList.contains('menu-open') ? closeMenu() : openMenu();
    });

    /* закрытие по Esc */
    doc.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && body.classList.contains('menu-open')) closeMenu();
    });

    /* клик мимо панели закрывает меню: на ПК это узкая панель справа,
       остальной экран затемнён — щелчок по нему должен убирать меню */
    doc.addEventListener('click', function (ev) {
      if (!body.classList.contains('menu-open')) return;
      if (menu.contains(ev.target)) return;
      if (burger.contains(ev.target)) return;
      closeMenu();
    });

    /* клик по ссылке в меню: закрываем и, если это якорь на этой странице, плавно скроллим */
    menu.addEventListener('click', function (ev) {
      var a = ev.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href.charAt(0) === '#') {
        var target = doc.querySelector(href);
        if (target) {
          ev.preventDefault();
          closeMenu();
          setTimeout(function () {
            target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
          }, 380);
        }
      }
    });
  }

  /* шапка: фон после прокрутки */
  var topbar = doc.getElementById('topbar');
  function onScrollHeader() {
    if (!topbar) return;
    topbar.classList.toggle('is-stuck', window.scrollY > 40);
  }
  onScrollHeader();

  /* ---------------- ПРОГРЕСС ---------------- */
  var bar = doc.getElementById('progress');
  function onScrollProgress() {
    if (!bar) return;
    var h = doc.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    bar.style.transform = 'scaleX(' + (max > 0 ? h.scrollTop / max : 0).toFixed(4) + ')';
  }

  /* ---------------- ПОЯВЛЕНИЕ БЛОКОВ ---------------- */
  var revealEls = Array.prototype.slice.call(doc.querySelectorAll('[data-reveal]'));
  var maskEls = Array.prototype.slice.call(doc.querySelectorAll('.mask'));
  var rules = Array.prototype.slice.call(doc.querySelectorAll('.rule'));

  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });

    revealEls.forEach(function (el) { io.observe(el); });
    maskEls.forEach(function (el) { io.observe(el); });
    rules.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.concat(maskEls, rules).forEach(function (el) { el.classList.add('is-in'); });
  }

  /* ---------------- СКРОЛЛ: шапка + прогресс ---------------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      onScrollHeader();
      onScrollProgress();
      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------------- ПАПКА-ЗАКЛАДКИ ---------------- */
  var folder = doc.querySelector('.folder');
  if (folder) {
    var tabs = Array.prototype.slice.call(folder.querySelectorAll('.folder__tab'));
    var panels = Array.prototype.slice.call(folder.querySelectorAll('.folder__panel'));

    function openTab(idx, focus) {
      tabs.forEach(function (t, i) {
        var on = i === idx;
        t.classList.toggle('is-active', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
      });
      panels.forEach(function (p, i) {
        var on = i === idx;
        p.classList.toggle('is-active', on);
        if (on) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
      });
      /* на узких экранах подкручиваем ленту ярлычков к активному */
      var bar = folder.querySelector('.folder__tabs');
      if (bar && tabs[idx]) {
        var t = tabs[idx];
        var pad = 12;
        if (t.offsetLeft < bar.scrollLeft + pad) {
          bar.scrollLeft = Math.max(0, t.offsetLeft - pad);
        } else if (t.offsetLeft + t.offsetWidth > bar.scrollLeft + bar.clientWidth - pad) {
          bar.scrollLeft = t.offsetLeft + t.offsetWidth - bar.clientWidth + pad;
        }
      }
      if (focus && tabs[idx]) tabs[idx].focus();
    }

    tabs.forEach(function (t, i) {
      t.addEventListener('click', function () { openTab(i); });
      t.addEventListener('keydown', function (ev) {
        var k = ev.key, to = null;
        if (k === 'ArrowRight') to = (i + 1) % tabs.length;
        else if (k === 'ArrowLeft') to = (i - 1 + tabs.length) % tabs.length;
        else if (k === 'Home') to = 0;
        else if (k === 'End') to = tabs.length - 1;
        if (to !== null) { ev.preventDefault(); openTab(to, true); }
      });
    });
    openTab(0);

    var tabsBar = folder.querySelector('.folder__tabs');
    function markScrollable() {
      if (!tabsBar) return;
      tabsBar.classList.toggle('is-scrollable', tabsBar.scrollWidth > tabsBar.clientWidth + 2);
    }
    markScrollable();
    window.addEventListener('resize', markScrollable);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(markScrollable);
  }

  /* ---------------- ТУМБЛЕР ИНСТРУМЕНТОВ ---------------- */
  var sw = doc.getElementById('toolsSwitch');
  if (sw) {
    var opts = Array.prototype.slice.call(sw.querySelectorAll('.switch__opt'));
    var tpanels = Array.prototype.slice.call(doc.querySelectorAll('.switch__panel'));

    var thumb = doc.getElementById('switchThumb');

    function placeThumb() {
      if (!thumb) return;
      var active = opts[parseInt(sw.dataset.active, 10) || 0];
      if (!active) return;
      var sr = sw.getBoundingClientRect();
      var ar = active.getBoundingClientRect();
      thumb.style.width = ar.width + 'px';
      thumb.style.transform = 'translateX(' + (ar.left - sr.left - 1) + 'px)';
    }

    function setTool(idx, focus) {
      sw.dataset.active = idx;
      opts.forEach(function (o, i) {
        var on = i === idx;
        o.classList.toggle('is-active', on);
        o.setAttribute('aria-selected', on ? 'true' : 'false');
        o.tabIndex = on ? 0 : -1;
      });
      tpanels.forEach(function (p, i) {
        var on = i === idx;
        p.classList.toggle('is-active', on);
        if (on) { p.removeAttribute('hidden'); } else { p.setAttribute('hidden', ''); }
      });
      if (focus && opts[idx]) opts[idx].focus();
      placeThumb();
    }

    opts.forEach(function (o, i) {
      o.addEventListener('click', function (e) {
        /* неактивный пункт сначала переключает тумблер, активный — переходит по ссылке */
        if (!o.classList.contains('is-active')) {
          e.preventDefault();
          setTool(i, true);
        }
      });
      o.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          setTool(e.key === 'ArrowRight' ? 1 : 0, true);
        }
      });
    });
    setTool(0);
    placeThumb();
    window.addEventListener('resize', placeThumb);
    if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(placeThumb);
  }

  /* ---------------- ДЕКА: ПЕРЕЛИСТЫВАНИЕ ШАГОВ ---------------- */
  var deck = doc.getElementById('deck');
  if (deck) {
    var track = doc.getElementById('deckTrack');
    var viewport = doc.getElementById('deckViewport') || track.parentElement;
    var slides = Array.prototype.slice.call(track.querySelectorAll('.deck__slide'));
    var dots = Array.prototype.slice.call(doc.querySelectorAll('.deck__dot'));
    var prev = doc.getElementById('deckPrev');
    var next = doc.getElementById('deckNext');
    var count = doc.getElementById('deckCount');
    var cur = 0;
    var total = slides.length;

    function render() {
      track.style.transform = 'translate3d(' + (-cur * 100) + '%,0,0)';
      dots.forEach(function (d, i) { d.classList.toggle('is-active', i === cur); });
      if (count) count.textContent = ('0' + (cur + 1)).slice(-2) + ' / 0' + total;
      if (prev) prev.disabled = cur === 0;
      if (next) next.disabled = cur === total - 1;
      slides.forEach(function (s, i) {
        s.setAttribute('aria-hidden', i === cur ? 'false' : 'true');
      });
    }
    function go(n) {
      cur = Math.max(0, Math.min(total - 1, n));
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(cur - 1); });
    if (next) next.addEventListener('click', function () { go(cur + 1); });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(parseInt(d.dataset.go, 10) || 0); });
    });

    doc.addEventListener('keydown', function (ev) {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      var r = deck.getBoundingClientRect();
      if (r.bottom < 80 || r.top > window.innerHeight - 80) return;
      var active = doc.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (active && active.classList && active.classList.contains('folder__tab')) return;
      ev.preventDefault();
      go(cur + (ev.key === 'ArrowRight' ? 1 : -1));
    });

    /* свайп / драг — pointer events (мышь + тач + стилус) */
    var startX = 0, startY = 0, dx = 0;
    var dragging = false, locked = null, pid = null;

    function applyDrag(px) {
      track.style.transform = 'translate3d(' + (-cur * 100 + px) + '%,0,0)';
    }

    viewport.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      pid = e.pointerId;
      startX = e.clientX; startY = e.clientY;
      dx = 0; dragging = true; locked = null;
      track.classList.add('is-dragging');
      viewport.classList.add('is-dragging');
      try { viewport.setPointerCapture(pid); } catch (err) {}
    });

    viewport.addEventListener('pointermove', function (e) {
      if (!dragging || e.pointerId !== pid) return;
      dx = e.clientX - startX;
      var dy = e.clientY - startY;
      if (locked === null && (Math.abs(dx) > 6 || Math.abs(dy) > 6)) {
        locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (locked !== 'x') return;
      var px = (dx / viewport.clientWidth) * 100;
      if ((cur === 0 && dx > 0) || (cur === total - 1 && dx < 0)) px *= 0.25;
      applyDrag(px);
    });

    function endDrag(e) {
      if (!dragging) return;
      if (pid !== null && e && e.pointerId !== pid) return;
      dragging = false;
      track.classList.remove('is-dragging');
      viewport.classList.remove('is-dragging');
      try { if (pid !== null) viewport.releasePointerCapture(pid); } catch (err) {}
      var threshold = Math.max(50, viewport.clientWidth * 0.08);
      if (locked === 'x') {
        if (dx <= -threshold) go(cur + 1);
        else if (dx >= threshold) go(cur - 1);
        else render();
      } else {
        render();
      }
      dx = 0; locked = null; pid = null;
    }
    viewport.addEventListener('pointerup', endDrag);
    viewport.addEventListener('pointercancel', endDrag);
    viewport.addEventListener('lostpointercapture', endDrag);
    viewport.addEventListener('dragstart', function (e) { e.preventDefault(); });

    render();
  }

  /* пересчёт после загрузки шрифтов (меняются размеры) */
  if (doc.fonts && doc.fonts.ready) {
    doc.fonts.ready.then(function () {
      onScroll();
    });
  }
})();