/* Registers the service worker and shows a small "install" prompt. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  var bar = document.getElementById('installBar');
  var text = document.getElementById('installText');
  var btn = document.getElementById('installBtn');
  var close = document.getElementById('installClose');
  var KEY = 'sca_install_dismissed';
  var deferred = null;

  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  var dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  if (standalone || dismissed) return;

  function dismiss() {
    bar.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  close.addEventListener('click', dismiss);

  // Android / desktop Chrome and Edge: real install prompt
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    text.textContent = 'Install this app on your phone';
    btn.hidden = false;
    bar.hidden = false;
  });
  btn.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.then(function () { deferred = null; bar.hidden = true; });
  });
  window.addEventListener('appinstalled', function () { bar.hidden = true; });

  // iPhone / iPad Safari has no install prompt, so show instructions instead
  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isSafari = /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  if (isIOS && isSafari) {
    text.textContent = 'To install: tap the Share button, then “Add to Home Screen”.';
    btn.hidden = true;
    setTimeout(function () { bar.hidden = false; }, 2500);
  }
})();
