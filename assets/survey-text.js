(function () {
  'use strict';
  // Сохраняет текст ответов опросника в sessionStorage, чтобы передать его в заявку.
  // Оборачивает window.buildSurveyPdf, не меняя сам генератор PDF.
  function filled(v) {
    return Array.isArray(v) ? v.length > 0 : (v !== undefined && v !== '');
  }
  function buildText(answers, pages) {
    var lines = [];
    pages.forEach(function (pg, pIdx) {
      lines.push('');
      lines.push((pIdx + 1) + '. ' + pg.title);
      pg.items.forEach(function (i, idx) {
        var v = answers[i.id];
        var a = filled(v) ? (Array.isArray(v) ? v.join(', ') : String(v)) : '—';
        lines.push((pIdx + 1) + '.' + (idx + 1) + ' ' + i.q + ': ' + a);
      });
    });
    return lines.join('\n').trim();
  }
  var orig = window.buildSurveyPdf;
  if (typeof orig !== 'function') { return; }
  window.buildSurveyPdf = function (answers, pages) {
    try { sessionStorage.setItem('surveyText', buildText(answers, pages)); } catch (e) {}
    return orig.apply(this, arguments);
  };
})();
