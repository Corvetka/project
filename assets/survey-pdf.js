(function () {
  'use strict';

  var W = 1240, H = 1754;
  var SERIF = '"Cormorant Garamond",Georgia,serif';
  var SANS = '"Jost",Arial,sans-serif';
  var INK = '#13273F', ACC = '#7A5B3E', GREY = '#A59C95', PAPER = '#F6EDDF';
  var COLS = [60, 60];
  var COLW = 1120;
  var TOP = 130, BOTTOM = H - 80, LH = 24;

  function filled(v) {
    return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== '');
  }

  function wrap(ctx, txt, max) {
    var words = String(txt).split(' '), lines = [], line = '';
    words.forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; }
      else { line = t; }
    });
    if (line) { lines.push(line); }
    return lines;
  }

  // Все пункты выводятся; пустые — серым с пустым значением
  function collectBlocks(answers, pages) {
    var blocks = [];
    pages.forEach(function (pg, pIdx) {
      blocks.push({ type: 'sec', text: (pIdx + 1) + '. ' + pg.title });
      pg.items.forEach(function (i, idx) {
        var v = answers[i.id];
        blocks.push({
          type: 'qa',
          num: (pIdx + 1) + '.' + (idx + 1),
          q: i.q,
          a: filled(v) ? (Array.isArray(v) ? v.join(', ') : String(v)) : '',
          empty: !filled(v)
        });
      });
    });
    return blocks;
  }

  function makeMultiPdf(jpegs, w, h) {
    var enc = new TextEncoder(), parts = [], offs = [], pos = 0;
    function push(u8) { parts.push(u8); pos += u8.length; }
    function str(s) { push(enc.encode(s)); }

    var n = jpegs.length, total = 2 + 3 * n, kids = [];
    for (var k = 0; k < n; k++) { kids.push((3 + 3 * k) + ' 0 R'); }

    str('%PDF-1.4\n');
    offs[1] = pos; str('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    offs[2] = pos; str('2 0 obj\n<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + n + ' >>\nendobj\n');

    for (var i = 0; i < n; i++) {
      var pid = 3 + 3 * i, iid = 4 + 3 * i, cid = 5 + 3 * i;
      var bin = atob(jpegs[i].split(',')[1]), jpg = new Uint8Array(bin.length);
      for (var b = 0; b < bin.length; b++) { jpg[b] = bin.charCodeAt(b); }
      offs[pid] = pos;
      str(pid + ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' + iid + ' 0 R >> >> /Contents ' + cid + ' 0 R >>\nendobj\n');
      offs[iid] = pos;
      str(iid + ' 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + w + ' /Height ' + h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpg.length + ' >>\nstream\n');
      push(jpg);
      str('\nendstream\nendobj\n');
      var content = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
      offs[cid] = pos;
      str(cid + ' 0 obj\n<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    }

    var xrefPos = pos;
    str('xref\n0 ' + (total + 1) + '\n0000000000 65535 f \n');
    for (var o = 1; o <= total; o++) { str(String(offs[o]).padStart(10, '0') + ' 00000 n \n'); }
    str('trailer\n<< /Size ' + (total + 1) + ' /Root 1 0 R >>\nstartxref\n' + xrefPos + '\n%%EOF');

    var out = new Uint8Array(pos), at = 0;
    parts.forEach(function (p) { out.set(p, at); at += p.length; });
    return out;
  }

  function loadLogo() {
    return new Promise(function (resolve) {
      var img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = function () { resolve(img); };
      img.onerror = function () { resolve(null); };
      img.src = 'assets/img/logo-dark.png';
    });
  }

  function paintPages(answers, pages, logo) {
    var blocks = collectBlocks(answers, pages);
    var out = [];
    var c, x, col, y;

    function footer() {
      x.fillStyle = ACC;
      x.font = '15px ' + SANS;
      x.textAlign = 'left';
      x.fillText('Предварительная концепция. Детали уточняются при проектировании.', 30, H - 40);
      x.textAlign = 'right';
      x.fillText('Проект-Комплект · projectbox.pro', W - 30, H - 40);
      x.textAlign = 'left';
    }

    function newPage(first) {
      c = document.createElement('canvas');
      c.width = W; c.height = H;
      x = c.getContext('2d');
      x.fillStyle = PAPER;
      x.fillRect(0, 0, W, H);
      x.strokeStyle = 'rgba(122,91,62,.32)';
      x.lineWidth = 2;
      x.strokeRect(26, 26, W - 52, H - 52);
      x.textBaseline = 'alphabetic';
      x.textAlign = 'left';
      if (first) {
        if (logo) {
          var lw = 190, lh = Math.round(190 * logo.naturalHeight / logo.naturalWidth);
          x.drawImage(logo, W - 30 - lw, 14, lw, lh);
        }
        x.fillStyle = INK;
        x.font = '600 34px ' + SERIF;
        x.fillText('Концепция дома', 30, 56);
        x.font = '18px ' + SANS;
        x.fillStyle = ACC;
        x.fillText(new Date().toLocaleDateString('ru-RU') + ' · опросник: дом и участок', 30, 84);
      } else {
        x.fillStyle = INK;
        x.font = '600 26px ' + SERIF;
        x.fillText('Концепция дома · продолжение', 30, 56);
      }
      footer();
      col = 0;
      y = TOP;
    }

    function need(h) {
      if (y + h <= BOTTOM) { return; }
            out.push(c);
      newPage(false);
    }

    function drawLines(lines, font, color, indent) {
      x.font = font;
      x.fillStyle = color;
      lines.forEach(function (l, i) { x.fillText(l, COLS[col] + (indent || 0), y + 18 + i * LH); });
      y += lines.length * LH;
    }

    newPage(true);

    blocks.forEach(function (bl) {
      if (bl.type === 'sec') {
        need(70);
        x.font = '600 26px ' + SERIF;
        x.fillStyle = INK;
        x.fillText(bl.text, COLS[col], y + 24);
        y += 34;
        x.strokeStyle = 'rgba(122,91,62,.35)';
        x.lineWidth = 1;
        x.beginPath();
        x.moveTo(COLS[col], y);
        x.lineTo(COLS[col] + COLW, y);
        x.stroke();
        y += 16;
      } else {
        var qColor = bl.empty ? GREY : INK;
        var aColor = bl.empty ? GREY : ACC;
        x.font = '16px ' + SANS;
        var numW = 44;
        var ql = wrap(x, bl.q, COLW - numW - 10);
        var al = bl.a ? wrap(x, bl.a, COLW - numW - 10) : [''];
        need((Math.max(ql.length, al.length)) * LH + 14);
        // номер
        x.font = '600 16px ' + SANS;
        x.fillStyle = bl.empty ? GREY : ACC;
        x.fillText(bl.num, COLS[col], y + 18);
        // вопрос
        drawLines(ql, '16px ' + SANS, qColor, numW);
        // ответ — отдельной строкой под вопросом, серым если пусто
        var yStart = y - ql.length * LH;
        var save = y;
        y = yStart + ql.length * LH;
        drawLines(al, 'italic 16px ' + SANS, aColor, numW);
        y = Math.max(save, y) + 10;
      }
    });

    out.push(c);
    return out;
  }

  window.buildSurveyPdf = function (answers, pages) {
    var btn = document.getElementById('surveyPdf');
    var st = document.getElementById('surveyStatus');
    if (!st) {
      st = document.createElement('p');
      st.id = 'surveyStatus';
      st.className = 'sv-hint';
      btn.parentNode.appendChild(st);
    }
    st.textContent = 'Формируем PDF…';

    var fonts = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    Promise.all([loadLogo(), fonts]).then(function (res) {
      var logo = res[0];
      var canvases, jpegs;
      try {
        canvases = paintPages(answers, pages, logo);
        jpegs = canvases.map(function (cv) { return cv.toDataURL('image/jpeg', 0.92); });
        st.textContent = 'PDF сформирован: ' + jpegs.length + ' стр.';
      } catch (e) {
        // логотип с file:// делает холст «испорченным»: повторяем без него
        canvases = paintPages(answers, pages, null);
        jpegs = canvases.map(function (cv) { return cv.toDataURL('image/jpeg', 0.92); });
        st.textContent = 'PDF сформирован без логотипа (страница открыта как файл). Через веб-сервер логотип попадёт в PDF.';
      }
      var pdf = makeMultiPdf(jpegs, W, H);
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
      a.download = 'koncepciya-oprosnik.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      var old = document.getElementById('attachPdfLink');
      if (old) { old.remove(); }
      var fr = new FileReader();
      fr.onload = function () {
        try {
          sessionStorage.setItem('surveyPdf', JSON.stringify({ name: 'koncepciya-oprosnik.pdf', data: fr.result }));
          var link = document.createElement('a');
          link.id = 'attachPdfLink';
          link.className = 'btn';
          link.href = 'contacts.html?from=survey';
          link.textContent = 'Прикрепить PDF к заявке →';
          link.style.marginTop = '12px';
          st.parentNode.appendChild(link);
        } catch (e) {
          st.textContent += ' PDF слишком большой для передачи в заявку; скачайте его и прикрепите вручную.';
        }
      };
      fr.readAsDataURL(new Blob([pdf], { type: 'application/pdf' }));
    }).catch(function (err) {
      st.textContent = 'Не удалось сформировать PDF: ' + (err && err.message ? err.message : err);
    });
  };
})();
