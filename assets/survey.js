(function () {
  'use strict';

  var PAGES = window.SURVEY_PAGES || [];
  var answers = {};
  var cur = 0;
  var main = document.getElementById('surveyMain');
  var bar = document.getElementById('surveyBar');
  var count = document.getElementById('surveyCount');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }

  function filled(v) {
    return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== '');
  }

  // Номер внутри раздела: 1.1, 1.2 … 2.1, 2.2 …
  function numOf(pageIdx, itemIdx) {
    return (pageIdx + 1) + '.' + (itemIdx + 1);
  }

  function missingIn(page) {
    return page.items.filter(function (i) { return !filled(answers[i.id]); });
  }

  function renderItem(item, num, miss) {
    var box = el('div', 'sq' + (miss ? ' sq--miss' : ''));
    box.setAttribute('data-id', item.id);
    box.appendChild(el('div', 'sq__id', num));
    box.appendChild(el('h3', 'sq__q', item.q));
    if (item.hint) { box.appendChild(el('p', 'sq__hint', item.hint)); }

    if (item.t === 'one' || item.t === 'multi') {
      var opts = el('div', 'opts');
      var multi = item.t === 'multi';
      item.o.forEach(function (label) {
        var b = el('button', 'opt', label);
        b.type = 'button';
        var pressed = multi
          ? (answers[item.id] || []).indexOf(label) !== -1
          : answers[item.id] === label;
        b.setAttribute('aria-pressed', String(pressed));
        b.addEventListener('click', function () {
          if (multi) {
            var list = (answers[item.id] || []).slice();
            var at = list.indexOf(label);
            if (at === -1) { list.push(label); } else { list.splice(at, 1); }
            answers[item.id] = list;
          } else {
            answers[item.id] = label;
          }
          redraw();
        });
        opts.appendChild(b);
      });
      box.appendChild(opts);
    } else {
      var input = item.t === 'long'
        ? el('textarea', 'field-in')
        : el('input', 'field-in');
      if (item.t === 'num') { input.type = 'number'; input.min = '0'; }
      if (item.ph) { input.placeholder = item.ph; }
      input.value = answers[item.id] || '';
      input.addEventListener('input', function () {
        answers[item.id] = input.value.trim();
        box.classList.remove('sq--miss');
      });
      box.appendChild(input);
    }
    return box;
  }

  // Перерисовка без прокрутки: экран не должен прыгать при ответе
  function redraw() {
    var y = window.pageYOffset;
    render(false);
    window.scrollTo(0, y);
  }

  function renderPage(page, pageIdx, scrollToMissing) {
    main.appendChild(el('h2', 'sv-title', (pageIdx + 1) + '. ' + page.title));
    if (page.hint) { main.appendChild(el('p', 'sv-hint', page.hint)); }
    var missNow = {};
    missingIn(page).forEach(function (i) { missNow[i.id] = true; });
    page.items.forEach(function (item, idx) {
      main.appendChild(renderItem(item, numOf(pageIdx, idx), scrollToMissing && missNow[item.id]));
    });
  }

  function renderResult() {
    main.appendChild(el('h2', 'sv-title', 'Концепция дома'));
    main.appendChild(el('p', 'sv-hint', 'Пустые вопросы остаются в концепции серым цветом с пустым ответом.'));
    PAGES.forEach(function (page, pIdx) {
      var sec = el('div', 'sv-sec');
      sec.appendChild(el('h3', 'sv-sec__t', (pIdx + 1) + '. ' + page.title));
      page.items.forEach(function (i, idx) {
        var v = answers[i.id];
        var line = el('p', filled(v) ? 'sv-line' : 'sv-line sv-line--empty');
        var label = numOf(pIdx, idx) + '  ' + i.q + ': ';
        line.textContent = label + (filled(v) ? (Array.isArray(v) ? v.join(', ') : v) : '');
        sec.appendChild(line);
      });
      main.appendChild(sec);
    });
    var actions = el('div', 'nav-row');
    var pdf = el('button', 'btn', 'Сформировать PDF');
    pdf.type = 'button';
    pdf.id = 'surveyPdf';
    actions.appendChild(pdf);
    main.appendChild(actions);
    pdf.addEventListener('click', function () {
      if (window.buildSurveyPdf) { window.buildSurveyPdf(answers, PAGES); }
    });
  }

  // scrollToMissing — прокрутить к первому незаполненному вопросу
  // resetTop — поднять к началу опросника (только при смене раздела)
  function render(resetTop, scrollToMissing) {
    main.innerHTML = '';
    if (cur < PAGES.length) {
      renderPage(PAGES[cur], cur, scrollToMissing);
    } else {
      renderResult();
    }
    var pct = Math.round((cur / PAGES.length) * 100);
    bar.style.width = pct + '%';
    count.textContent = cur < PAGES.length
      ? 'Раздел ' + (cur + 1) + ' из ' + PAGES.length
      : 'Концепция';
    document.getElementById('prevBtn').disabled = cur === 0;
    document.getElementById('nextBtn').textContent =
      cur === PAGES.length ? 'Готово' : 'Далее →';

    if (resetTop) {
      document.getElementById('surveyTop').scrollIntoView({ block: 'start' });
    }
    if (scrollToMissing) {
      var first = main.querySelector('.sq--miss');
      if (first) { first.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    }
  }

  document.getElementById('prevBtn').addEventListener('click', function () {
    if (cur > 0) { cur -= 1; render(true, false); }
  });

  document.getElementById('nextBtn').addEventListener('click', function () {
    if (cur < PAGES.length) { cur += 1; render(true, false); }
  });

  window.surveyAnswers = function () { return answers; };
  render(false, false);
})();
