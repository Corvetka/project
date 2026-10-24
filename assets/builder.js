(function () {
  'use strict';

  var state = {
    style: 'Современный', floors: '1 этаж', area: 120, basement: 'Нет',
    roof: 'Плоская', terrace: 'Открытая терраса', balcony: 'Без балкона',
    garage: 'Без гаража', windows: 'Панорамные окна',
    roofwin: 'На усмотрение архитектора', facade: 'Комбинированный фасад',
    ground: 'Не нужно', light: 'На усмотрение архитектора', lift: 'Не нужен',
    wishes: ''
  };

  var LABELS = [
    ['floors', 'Этажность'], ['area', 'Площадь'], ['basement', 'Цокольный этаж'],
    ['style', 'Стиль'], ['roof', 'Крыша'], ['terrace', 'Терраса'],
    ['balcony', 'Балкон'], ['garage', 'Гараж'], ['windows', 'Остекление'],
    ['roofwin', 'Мансардные окна'], ['facade', 'Фасад'],
    ['ground', 'Спальня и кабинет на 1 этаже'], ['light', 'Двусветное пространство'],
    ['lift', 'Лифт']
  ];

  var PHOTO = {
    'Современный': 'assets/house-start.jpg',
    'Минимализм': 'assets/minimalism.jpg',
    'Скандинавский': 'assets/skandi.jpg',
    'Классический': 'assets/classik.jpg',
    'Барнхаус': 'assets/barn.jpg'
  };

  var slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(document.querySelectorAll('#dots button'));
  var cur = 0;
  var prevBtn = document.getElementById('prev');
  var nextBtn = document.getElementById('next');
  var hero = document.getElementById('heroPhoto');

  function go(n) {
    cur = Math.max(0, Math.min(slides.length - 1, n));
    slides.forEach(function (s, i) { s.classList.toggle('is-on', i === cur); });
    dots.forEach(function (d, i) {
      if (i === cur) { d.setAttribute('aria-current', 'step'); } else { d.removeAttribute('aria-current'); }
    });
    document.getElementById('sliderCount').textContent = 'Шаг ' + (cur + 1) + ' из ' + slides.length;
    prevBtn.disabled = cur === 0;
    nextBtn.textContent = cur === slides.length - 1 ? 'К концепции ↓' : 'Далее →';
  }

  prevBtn.addEventListener('click', function () { go(cur - 1); });
  nextBtn.addEventListener('click', function () {
    if (cur === slides.length - 1) {
      document.getElementById('concept').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    go(cur + 1);
  });
  dots.forEach(function (d) {
    d.addEventListener('click', function () { go(Number(d.getAttribute('data-go'))); });
  });

  function rows() {
    return [
      ['Этажность', state.floors],
      ['Площадь', state.area + ' м²'],
      ['Стиль', state.style],
      ['Цокольный этаж', state.basement],
      ['Крыша', state.roof],
      ['Терраса', state.terrace],
      ['Балкон', state.balcony],
      ['Гараж', state.garage],
      ['Остекление', state.windows],
      ['Мансардные окна', state.roofwin],
      ['Фасад', state.facade],
      ['Спальня и кабинет на 1 этаже', state.ground],
      ['Двусветное пространство', state.light],
      ['Лифт', state.lift]
    ];
  }

  function li(pair) {
    var el = document.createElement('li');
    var s = document.createElement('span');
    var b = document.createElement('b');
    s.textContent = pair[0];
    b.textContent = pair[1];
    el.appendChild(s);
    el.appendChild(b);
    return el;
  }

  function render() {
    document.getElementById('photoTag').textContent = state.style + ' стиль';
    document.getElementById('capStyle').textContent = state.style;
    document.getElementById('capFloors').textContent = state.floors;
    document.getElementById('capArea').textContent = state.area + ' м²';
    document.getElementById('capDetails').textContent = state.roof + ' крыша · ' + state.terrace.toLowerCase();

    var src = PHOTO[state.style];
    if (src && hero.getAttribute('src') !== src) {
      hero.setAttribute('src', src);
      hero.setAttribute('alt', state.style + ' дом');
    }

    var mini = document.getElementById('miniList');
    var res = document.getElementById('resultList');
    mini.innerHTML = '';
    res.innerHTML = '';
    rows().slice(0, 4).forEach(function (r) { mini.appendChild(li(r)); });
    rows().forEach(function (r) { res.appendChild(li(r)); });
  }

  document.querySelectorAll('[data-key]').forEach(function (el) {
    el.addEventListener('click', function () {
      var k = el.getAttribute('data-key');
      var v = el.getAttribute('data-value');

      if (k === 'floors' && v === 'Другой вариант') {
        state.floors = document.getElementById('floorsOther').value.trim() || 'Другой вариант';
      } else if (k === 'floors') {
        state.floors = v;
        document.getElementById('floorsOther').value = '';
      } else {
        state[k] = v;
      }

      document.querySelectorAll('[data-key="' + k + '"]').forEach(function (x) {
        x.setAttribute('aria-pressed', String(x === el));
      });
      render();
    });
  });

  document.getElementById('areaInput').addEventListener('input', function (e) {
    var n = Number(e.target.value);
    if (n >= 30 && n <= 1000) { state.area = n; render(); }
  });

  document.getElementById('floorsOther').addEventListener('input', function (e) {
    var p = document.querySelector('[data-key="floors"][data-value="Другой вариант"]');
    if (p && p.getAttribute('aria-pressed') === 'true') {
      state.floors = e.target.value.trim() || 'Другой вариант';
      render();
    }
  });

  document.getElementById('wishes').addEventListener('input', function (e) {
    state.wishes = e.target.value.trim();
  });

  /* ===================== PDF ===================== */

  function wrapText(ctx, txt, max) {
    var words = String(txt).split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) { lines.push(line); }
    return lines;
  }

  function makePdf(jpegDataUrl, w, h, links) {
    var bin = atob(jpegDataUrl.split(',')[1]);
    var jpg = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) { jpg[i] = bin.charCodeAt(i); }

    var enc = new TextEncoder();
    var parts = [], offs = [], pos = 0;

    function push(a) { parts.push(a); pos += a.length; }
    function str(t) { push(enc.encode(t)); }

    var sc = 842 / w;
    var annots = [];
    (links || []).forEach(function (l) {
      var x0 = (l.r[0] * sc).toFixed(1), x1 = (l.r[2] * sc).toFixed(1);
      var y0 = (595 - l.r[3] * sc).toFixed(1), y1 = (595 - l.r[1] * sc).toFixed(1);
      annots.push('<< /Type /Annot /Subtype /Link /Rect [' + x0 + ' ' + y0 + ' ' + x1 + ' ' + y1 +
        '] /Border [0 0 0] /A << /Type /Action /S /URI /URI (' + l.u + ') >> >>');
    });

    var refs = annots.map(function (_, idx) { return (6 + idx) + ' 0 R'; });
    var content = 'q 842 0 0 595 0 0 cm /Im0 Do Q';
    var total = 5 + annots.length;

    str('%PDF-1.4\n');
    offs[1] = pos; str('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offs[2] = pos; str('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    offs[3] = pos;
    str('3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] ' +
      '/Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R' +
      (refs.length ? ' /Annots [' + refs.join(' ') + ']' : '') + ' >>\nendobj\n');
    offs[4] = pos;
    str('4 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h +
      ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
    push(jpg);
    str('\nendstream\nendobj\n');
    offs[5] = pos;
    str('5 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    annots.forEach(function (an, idx) {
      offs[6 + idx] = pos;
      str((6 + idx) + ' 0 obj\n' + an + '\nendobj\n');
    });

    var xrefPos = pos;
    str('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (var k = 1; k <= total; k++) {
      str(String(offs[k]).padStart(10, '0') + ' 00000 n \n');
    }
    str('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF');

    var out = new Uint8Array(pos), o = 0;
    parts.forEach(function (p2) { out.set(p2, o); o += p2.length; });
    return out;
  }

  document.getElementById('pdfBtn').addEventListener('click', function () {
    var st = document.getElementById('status');
    st.classList.remove('is-err');
    st.textContent = 'Формируем PDF…';

    var img = new Image(), logo = new Image(), pending = 2;
    img.crossOrigin = 'anonymous';
    logo.crossOrigin = 'anonymous';

    function step() {
      if (--pending > 0) { return; }
      var ready = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
      ready.then(function () { render(true); }, function () { render(true); });
    }

    img.onload = step;
    img.onerror = step;
    img.src = PHOTO[state.style];
    logo.onload = step;
    logo.onerror = step;
    logo.src = 'assets/img/logo-dark.png';

    function render(withImages) {
      if (withImages === undefined) { withImages = true; }
      try {
        var showImg = withImages && img.naturalWidth > 0;
        var showLogo = withImages && logo.naturalWidth > 0;

        var W = 1754, H = 1240;
        var c = document.createElement('canvas');
        c.width = W; c.height = H;
        var x = c.getContext('2d');

        var SERIF = '"Cormorant Garamond",Georgia,serif';
        var SANS = '"Jost",Arial,sans-serif';
        var INK = '#13273F', ACC = '#7A5B3E', PAPER = '#F6EDDF';

        x.fillStyle = PAPER;
        x.fillRect(0, 0, W, H);
        x.textAlign = 'left';
        x.textBaseline = 'alphabetic';

        /* логотип справа сверху — как в листе выгрузки планировщика */
        var logoBox = null;
        if (showLogo) {
          var lw = 190;
          var lh = Math.round(190 * logo.naturalHeight / logo.naturalWidth);
          x.drawImage(logo, W - 30 - lw, 14, lw, lh);
          logoBox = [W - 30 - lw, 14, W - 30, 14 + lh];
        }

        /* название слева сверху, дата под ним */
        x.fillStyle = INK;
        x.font = '600 34px ' + SERIF;
        x.fillText('Концепция дома', 30, 56);
        x.font = '18px ' + SANS;
        x.fillStyle = ACC;
        x.fillText(new Date().toLocaleDateString('ru-RU') + ' · предварительный подбор', 30, 84);

        /* большое фото дома на месте плана участка */
        var PX = 30, PY = 100, PW = 1180, PH = 1060;
        x.fillStyle = 'rgba(122,91,62,.10)';
        x.fillRect(PX, PY, PW, PH);
        if (showImg) {
          var ir = img.naturalWidth / img.naturalHeight;
          var tr = PW / PH;
          var sw, sh, sx, sy;
          if (ir > tr) { sh = img.naturalHeight; sw = sh * tr; sx = (img.naturalWidth - sw) / 2; sy = 0; }
          else { sw = img.naturalWidth; sh = sw / tr; sx = 0; sy = (img.naturalHeight - sh) / 2; }
          x.drawImage(img, sx, sy, sw, sh, PX, PY, PW, PH);
        }
        x.strokeStyle = '#9C8A77';
        x.lineWidth = 1;
        x.strokeRect(PX, PY, PW, PH);

        /* правая колонка — основные характеристики вместо комментариев */
        var RX = 1250;
        var RW = W - RX - 30;
        var y = 130;
        x.fillStyle = INK;
        x.font = '600 24px ' + SERIF;
        x.fillText('Основные характеристики дома', RX, y);
        y += 14;
        x.strokeStyle = 'rgba(122,91,62,.35)';
        x.beginPath();
        x.moveTo(RX, y);
        x.lineTo(RX + RW, y);
        x.stroke();
        y += 48;

        var items = rows().slice();
        if (state.wishes) { items.push(['Пожелания', state.wishes]); }

        items.forEach(function (r) {
          var lines = wrapText(x, r[0] + ': ' + r[1], RW - 30);
          x.fillStyle = ACC;
          x.beginPath();
          x.arc(RX + 8, y - 6, 6, 0, 7);
          x.fill();
          x.fillStyle = INK;
          x.font = '17px ' + SANS;
          lines.forEach(function (line, i2) { x.fillText(line, RX + 26, y + i2 * 22); });
          y += lines.length * 22 + 10;
        });

        /* подписи снизу: слева пометка, справа ссылка */
        x.fillStyle = ACC;
        x.font = '15px ' + SANS;
        x.fillText('Предварительный подбор. Детали уточняются при проектировании.', 30, H - 24);
        x.textAlign = 'right';
        x.fillText('Проект-Комплект · projectbox.pro', W - 30, H - 24);
        x.textAlign = 'left';

        var links = [{ r: [W - 320, H - 46, W - 30, H - 14], u: 'https://projectbox.pro' }];
        if (logoBox) { links.push({ r: logoBox, u: 'https://projectbox.pro' }); }

        var pdf = makePdf(c.toDataURL('image/jpeg', 0.92), W, H, links);
        var a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
        a.download = 'koncepciya-doma.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        st.classList.remove('is-err');
        st.textContent = 'PDF сформирован.';
      } catch (err) {
        if (withImages && /Tainted|tainted|SecurityError/.test(String(err && err.message) + (err && err.name))) {
          render(false);
          st.textContent = 'PDF сформирован без фотографии (страница открыта как файл). На сайте фото попадёт в PDF.';
          return;
        }
        st.classList.add('is-err');
        st.textContent = 'Не удалось сформировать PDF: ' + (err && err.message ? err.message : err);
      }
    }
  });

  /* ============ заявка → раздел «Контакты» ============ */

  document.getElementById('sendBtn').addEventListener('click', function () {
    var body = 'Здравствуйте! Хочу обсудить архитектурный проект дома.\n\n' +
      rows().map(function (r) { return r[0] + ': ' + r[1]; }).join('\n') +
      '\nПожелания: ' + (state.wishes || 'не указаны');
    try { sessionStorage.setItem('builderRequest', body); } catch (e) {}
    window.location.href = 'contacts.html?from=builder#prefill';
  });

  go(0);
  render();
})();
