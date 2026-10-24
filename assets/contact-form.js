(function () {
  'use strict';
  // Отправка заявки на собственный обработчик send.php (почта хостинга).
  var ENDPOINT = 'send.php';
  var MAX_MB = 10, MAX_FILES = 5;

  var form = document.getElementById('contactForm');
  if (!form) { return; }
  var btn = form.querySelector('button[type="submit"]');
  var list = document.getElementById('filelist');
  var status = document.getElementById('formStatus');
  if (!status) {
    status = document.createElement('p');
    status.id = 'formStatus';
    status.setAttribute('role', 'status');
    status.style.marginTop = '12px';
    btn.parentNode.insertBefore(status, btn.nextSibling);
  }

  // Скрытое поле-ловушка для ботов
  var trap = document.createElement('input');
  trap.type = 'text';
  trap.name = 'website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  trap.setAttribute('aria-hidden', 'true');
  trap.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0';
  form.appendChild(trap);

  function show(msg, ok) {
    status.textContent = msg;
    status.style.color = ok ? '#2f6b3a' : '#8a2a2a';
  }

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var name = form.elements.name.value.trim();
    var email = form.elements.email.value.trim();
    var about = form.elements.about.value.trim();

    if (!EMAIL_RE.test(email)) {
      show('Укажите корректную электронную почту.', false);
      form.elements.email.focus();
      return;
    }
    if (!form.elements.privacy.checked) {
      show('Поставьте отметку о согласии на обработку персональных данных.', false);
      return;
    }

    var files = Array.prototype.slice.call(form.elements.attachments.files || []);
    if (files.length > MAX_FILES) {
      show('Можно приложить не больше ' + MAX_FILES + ' файлов.', false);
      return;
    }
    for (var i = 0; i < files.length; i++) {
      if (files[i].size > MAX_MB * 1024 * 1024) {
        show('Файл больше ' + MAX_MB + ' МБ: ' + files[i].name, false);
        return;
      }
    }

    var fd = new FormData();
    fd.append('name', name);
    fd.append('email', email);
    fd.append('about', about);
    fd.append('privacy', '1');
    fd.append('website', trap.value);
    var survey = '';
    try { survey = sessionStorage.getItem('surveyText') || ''; } catch (err) {}
    if (survey) { fd.append('survey', survey); }
    files.forEach(function (f) { fd.append('attachments[]', f, f.name); });

    btn.disabled = true;
    show(files.length ? 'Отправляем заявку и файлы…' : 'Отправляем…', true);
    fetch(ENDPOINT, { method: 'POST', body: fd })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, j: j }; });
      })
      .then(function (res) {
        if (res.ok && res.j && res.j.success) {
          form.reset();
          if (list) { list.innerHTML = ''; }
          try {
            sessionStorage.removeItem('surveyPdf');
            sessionStorage.removeItem('surveyText');
          } catch (err) {}
          show('Спасибо! Заявка отправлена.', true);
        } else {
          show((res.j && res.j.message) || 'Не удалось отправить заявку. Попробуйте позже или напишите на info@projectbox.pro.', false);
        }
      })
      .catch(function () {
        show('Нет соединения с сервером. Проверьте интернет и попробуйте снова.', false);
      })
      .then(function () { btn.disabled = false; });
  });
})();
