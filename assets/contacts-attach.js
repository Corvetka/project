(function () {
  'use strict';
  if (location.search.indexOf('from=survey') === -1) { return; }
  var raw = null;
  try { raw = sessionStorage.getItem('surveyPdf'); } catch (e) {}
  if (!raw) { return; }

  var form = document.getElementById('contactForm');
  var input = document.getElementById('files');
  if (!form || !input || typeof DataTransfer === 'undefined') { return; }

  var rec = JSON.parse(raw);
  var bin = atob(rec.data.split(',')[1]);
  var u8 = new Uint8Array(bin.length);
  for (var i = 0; i < bin.length; i++) { u8[i] = bin.charCodeAt(i); }
  var file = new File([u8], rec.name, { type: 'application/pdf' });

  var dt = new DataTransfer();
  dt.items.add(file);
  input.files = dt.files;
  input.dispatchEvent(new Event('change'));

  var about = form.querySelector('textarea[name="about"]');
  if (about && !about.value) {
    about.value = 'Во вложении: концепция дома (опросник, PDF).';
  }

  var note = document.createElement('p');
  note.className = 'doc__lead';
  note.textContent = 'Концепция дома (PDF) прикреплена к заявке. Заполните имя, почту и согласие.';
  form.parentNode.insertBefore(note, form);
})();
