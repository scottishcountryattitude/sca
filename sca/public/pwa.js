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

/* Compress every customer artwork image before it is sent to /api/upload.
   This replaces the earlier threshold-only helper in app.js, so ordinary phone
   photos are resized too and their original camera format is normalized to JPEG. */
window.shrinkImage = async function (dataUrl) {
  try {
    var response = await fetch(dataUrl);
    var blob = await response.blob();
    var bitmap;
    if ('createImageBitmap' in window) {
      bitmap = await createImageBitmap(blob);
    } else {
      bitmap = await new Promise(function (resolve, reject) {
        var image = new Image();
        var objectUrl = URL.createObjectURL(blob);
        image.onload = function () { URL.revokeObjectURL(objectUrl); resolve(image); };
        image.onerror = function () { URL.revokeObjectURL(objectUrl); reject(new Error('Image could not be decoded')); };
        image.src = objectUrl;
      });
    }

    var maxEdge = 1800;
    var scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    var canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    var context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas unavailable');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    if (bitmap.close) bitmap.close();

    var output = await new Promise(function (resolve, reject) {
      canvas.toBlob(function (compressed) {
        if (compressed) resolve(compressed);
        else reject(new Error('Image compression failed'));
      }, 'image/jpeg', 0.82);
    });

    // Lower quality / dimensions if necessary to leave room for base64 JSON overhead.
    if (output.size > 3 * 1024 * 1024) {
      output = await new Promise(function (resolve, reject) {
        canvas.toBlob(function (compressed) {
          if (compressed) resolve(compressed);
          else reject(new Error('Image compression failed'));
        }, 'image/jpeg', 0.62);
      });
    }
    if (output.size > 3 * 1024 * 1024) {
      var smaller = document.createElement('canvas');
      var ratio = Math.sqrt((2.5 * 1024 * 1024) / output.size);
      smaller.width = Math.max(1, Math.round(canvas.width * ratio));
      smaller.height = Math.max(1, Math.round(canvas.height * ratio));
      smaller.getContext('2d').drawImage(canvas, 0, 0, smaller.width, smaller.height);
      output = await new Promise(function (resolve, reject) {
        smaller.toBlob(function (compressed) {
          if (compressed) resolve(compressed);
          else reject(new Error('Image compression failed'));
        }, 'image/jpeg', 0.68);
      });
    }

    return await new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () { resolve(reader.result); };
      reader.onerror = function () { reject(new Error('Image could not be read')); };
      reader.readAsDataURL(output);
    });
  } catch (error) {
    // Keep an already-supported original if the browser cannot decode/convert it.
    return dataUrl;
  }
};
