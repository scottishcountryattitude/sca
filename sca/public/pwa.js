/* Registers the service worker, shows a small "install" bar, and powers the "Get the app" buttons. */
(function () {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js').catch(function () {});
    });
  }

  var bar = document.getElementById('installBar');
  var text = document.getElementById('installText');
  var btn = document.getElementById('installBtn');
  var close = document.getElementById('installClose');
  var KEY = 'sca_install_dismissed';
  var deferred = null;

  var ua = navigator.userAgent;
  var isIOS = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isIOSSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
  var isSamsung = /SamsungBrowser/i.test(ua);
  var isAndroid = /android/i.test(ua);
  var isStandalone = function () {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  };

  /* "Get the app" buttons are hidden when the shop is already open as the installed app */
  function setAppButtons() {
    var installed = isStandalone();
    document.querySelectorAll('.get-app').forEach(function (b) { b.style.display = installed ? 'none' : ''; });
  }
  setAppButtons();

  var dismissed = false;
  try { dismissed = localStorage.getItem(KEY) === '1'; } catch (e) {}
  function dismiss() {
    bar.hidden = true;
    try { localStorage.setItem(KEY, '1'); } catch (e) {}
  }
  close.addEventListener('click', dismiss);

  // Android / desktop Chrome and Edge: the phone's own install prompt
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    if (dismissed || isStandalone()) return;
    text.textContent = 'Install this app on your phone';
    btn.hidden = false;
    bar.hidden = false;
  });
  btn.addEventListener('click', function () { window.getApp(); });
  window.addEventListener('appinstalled', function () {
    bar.hidden = true;
    deferred = null;
    var m = document.getElementById('appModal');
    if (m) m.classList.remove('open');
  });

  // iPhone / iPad Safari has no install prompt, so the bar shows instructions instead
  if (isIOSSafari && !dismissed && !isStandalone()) {
    text.textContent = 'To install: tap the Share button, then “Add to Home Screen”.';
    btn.hidden = true;
    setTimeout(function () { bar.hidden = false; }, 2500);
  }

  function step(n, t) { return '<li><span>' + n + '</span><div>' + t + '</div></li>'; }

  /* The "Get the app" button: one-tap install where the phone allows it, otherwise clear steps */
  window.getApp = function () {
    if (deferred) {
      var d = deferred;
      deferred = null;
      d.prompt();
      d.userChoice.then(function (c) { bar.hidden = true; if (c && c.outcome !== 'accepted') deferred = d; }).catch(function () {});
      return;
    }
    var html;
    if (isIOS && !isIOSSafari) {
      html = '<p class="app-note">On iPhone and iPad, open this page in <b>Safari</b> first, then:</p><ol class="app-steps">' +
        step(1, 'Tap the <b>Share</b> button (the square with an arrow pointing up).') +
        step(2, 'Scroll down and tap <b>Add to Home Screen</b>.') +
        step(3, 'Tap <b>Add</b>.') + '</ol>';
    } else if (isIOS) {
      html = '<ol class="app-steps">' +
        step(1, 'Tap the <b>Share</b> button (the square with an arrow pointing up) at the bottom or top of Safari.') +
        step(2, 'Scroll down and tap <b>Add to Home Screen</b>.') +
        step(3, 'Tap <b>Add</b>. The shop appears on your home screen.') + '</ol>';
    } else if (isSamsung) {
      html = '<ol class="app-steps">' +
        step(1, 'Tap the <b>menu</b> button (three lines, bottom right).') +
        step(2, 'Tap <b>Add page to</b>, then <b>Home screen</b>.') +
        step(3, 'Tap <b>Add</b>.') + '</ol>';
    } else if (isAndroid) {
      html = '<ol class="app-steps">' +
        step(1, 'Tap the <b>menu</b> button (three dots, top right).') +
        step(2, 'Tap <b>Install app</b> or <b>Add to Home screen</b>.') +
        step(3, 'Tap <b>Install</b> or <b>Add</b>.') + '</ol>' +
        '<p class="app-note">Best in Chrome. In other browsers, look for "Add to Home screen" in the menu.</p>';
    } else {
      html = '<p class="app-note">The app is made for phones. Open <b>scottishcountryattitude.co.uk</b> on your phone and tap <b>Get the app</b>.</p>' +
        '<p class="app-note">On a computer using Chrome or Edge, you can also click the install icon at the right of the address bar.</p>';
    }
    document.getElementById('appSteps').innerHTML = html;
    document.getElementById('appModal').classList.add('open');
  };
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

    // PNG / WebP / GIF may have a see-through background: keep it as PNG when it is small enough,
    // so the design sits straight on the garment instead of in a box.
    if (/image\/(png|webp|gif)/i.test(blob.type)) {
      var png = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
      if (png && png.size <= 3 * 1024 * 1024) {
        return await new Promise(function (resolve, reject) {
          var r = new FileReader();
          r.onload = function () { resolve(r.result); };
          r.onerror = reject;
          r.readAsDataURL(png);
        });
      }
    }
    // JPEG cannot be see-through: put a white background behind the image (otherwise it turns black)
    context.globalCompositeOperation = 'destination-over';
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.globalCompositeOperation = 'source-over';

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
