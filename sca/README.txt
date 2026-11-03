SCOTTISH COUNTRY ATTITUDE - SHOP (website + server)
====================================================

WHAT IS IN HERE
  public/              the website and app (what customers see)
  netlify/functions/   the server code: shared shop data, admin, uploads, reviews, Stripe checkout
  netlify/lib/shop.mjs ALL the money rules: prices, postage, free-postage limit
  netlify.toml, package.json   settings Netlify reads

THE RULES BUILT IN
  - UK delivery only.
  - Postage: GBP 4.95 normally. GBP 6.95 if the order has a hoodie, or 3 or more items.
    FREE when the order total is GBP 80.00 or more.
    (Change these at the top of netlify/lib/shop.mjs, and the matching preview numbers
     near "POSTAGE_STANDARD" in public/app.js.)
  - Prices are decided on the server. A customer cannot change a price in their browser.
  - Designs, prices and reviews are saved on the server, so every customer sees the same shop.
  - Only you can add/remove designs, change prices or remove reviews (admin password).

PUTTING IT LIVE (one-off set-up)
  1. Make a free account at github.com. Click "New repository", name it (e.g. sca-shop), Create.
  2. Unzip this file on your computer. On the new repository page click "uploading an existing file"
     and drag in EVERYTHING from the unzipped folder (including the netlify and public folders).
     Click "Commit changes".
  3. In Netlify: Add new project > Import an existing project > GitHub > pick sca-shop.
     Leave the build settings as they are (netlify.toml fills them in). Click Deploy.
  4. In Netlify open: Project configuration > Environment variables, and add two:
        ADMIN_PASSWORD      a long password only you know (used for the Admin link)
        STRIPE_SECRET_KEY   from Stripe > Developers > API keys (start with the TEST key, sk_test_...)
     Mark them as secret. Never share these with anyone, or paste them in a chat.
  5. Click Deploys > Trigger deploy so the keys are picked up.
  6. Check the project's Functions list shows: admin, catalog, checkout, img, review, upload.

USING IT
  - Open your site and scroll to the bottom. Tap "Admin", type your password.
    The upload, delete and "Edit item prices" buttons then appear (only on your device, only until you close the tab).
  - Test a purchase with Stripe's test card 4242 4242 4242 4242 (any future date, any CVC).
  - Orders: Stripe Dashboard > Payments. Each payment shows the items, sizes, delivery address, phone,
    and a link to any artwork the customer uploaded.
  - Email for each payment: Stripe Dashboard > Settings > Personal details > Communication preferences
    (turn on email for "Successful payments"). Switch Stripe to live mode and replace the key with the
    live key (sk_live_...) only when you are happy with the test orders.

WHEN YOU CHANGE ANY FILE IN public/
  Edit sw.js and change VERSION ('sca-v2' -> 'sca-v3') so installed apps update.
