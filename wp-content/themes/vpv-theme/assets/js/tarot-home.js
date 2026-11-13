/* Питання з головної сторінки залишається у вкладці браузера. */
(function () {
  'use strict';
  var field = document.getElementById('tarot-home-input');
  var counter = document.getElementById('tarot-home-count');
  var start = document.getElementById('tarot-home-start');
  if (!field || !counter || !start) return;
  function update() { counter.textContent = String(field.value.length); }
  function path(question) {
    var text = question.toLowerCase();
    if (/job|work|career|office|interview|boss/.test(text)) return '/career-tarot-reading/';
    if (/love|relationship|partner|ex|date|romance/.test(text)) return '/love-tarot-sampler/';
    if (/friend/.test(text)) return '/friendship-tarot-reading/';
    if (/choose|choice|decid|option|which|either/.test(text)) return '/decision-tarot-reading/';
    if (/boundary|limit|say no/.test(text)) return '/boundaries-tarot-reading/';
    if (/study|school|learn|exam/.test(text)) return '/study-tarot-reading/';
    return '/three-card-tarot-sampler/';
  }
  field.addEventListener('input', update);
  document.querySelectorAll('[data-prompt]').forEach(function (button) {
    button.addEventListener('click', function () { field.value = button.getAttribute('data-prompt') || ''; update(); field.focus(); });
  });
  start.addEventListener('click', function () {
    var question = field.value.replace(/\s+/g, ' ').trim().slice(0, 280);
    if (question.length < 5) { field.focus(); field.setAttribute('aria-invalid', 'true'); return; }
    field.removeAttribute('aria-invalid');
    try { sessionStorage.setItem('vpv-tarot-question', question); } catch (error) { /* Сайт працює і без сховища. */ }
    window.location.assign(path(question));
  });
}());
