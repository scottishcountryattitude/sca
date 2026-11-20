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
  - Gift sets: a "Gift sets" box on the Country Quotes, Born Here and Pets pages (2, 3, 4 or 5 items). A bag in a
    set is the standard bag price (GBP 15.99). The Daily Quotes page is a "coming soon" placeholder for now.
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

  - Gift set combinations: in Admin mode tap "Edit gift sets" to remove a combination or tick items to add one,
    then Save. "Reset to the standard list" puts the original list back. (The standard list lives in
    netlify/lib/shop.mjs and the matching list in public/app.js - tests/shop.test.mjs checks they agree.)

WHEN YOU CHANGE ANY FILE IN public/
  Edit sw.js and change VERSION ('sca-v2' -> 'sca-v3') so installed apps update.


NEW PAGES AND FEATURES (November 2026)
  - Sarcastic Quotes (was Daily Quotes) and Military pages: upload designs in Admin like the other pages,
    each has a Gift sets box. Military is for your OWN military-themed artwork (official regimental badges
    need an MOD licence). The Military page also has "Upload your own image".
  - Tap any design to see it bigger. Admin: the pencil button edits a design's name, price and description.
  - Uploaded designs now sit on a white background (see-through images used to turn black).
  - Design Your Own: customer describes what they want (occasion, words, style, colours), can upload an image,
    picks items (size, then colour), and sends it. They get a WATERMARKED proof by email, tap "I approve",
    then get a payment link. Nothing is printed until it is paid.
      * Customer uploaded an image: the proof is made and emailed straight away.
      * No image: you get an email. Admin > Custom requests > "Make & send proof", choose your finished design,
        and the watermarked proofs are made and emailed for you.
      * Admin > Custom requests shows every request and whether it is PAID (checked with Stripe).
  - Contact page with a message form (messages also appear in Admin > Messages).
  - Free collection within 10 miles (checked from the customer's postcode).

SETTINGS FOR THE NEW FEATURES (Netlify > Project configuration > Environment variables, then redeploy)
  RESEND_API_KEY        from resend.com (sends the proof, payment-link and contact emails)
  SHOP_EMAIL            where your order and contact emails go (default scottishcountryattitude@outlook.com)
  COMPLAINTS_EMAIL      shown on the Contact page (default scottishcountryattitude@gmail.com)
  SHOP_TOWN             your town, shown on the Contact page and collection option (e.g. Falkirk)
  COLLECTION_POSTCODE   your postcode, used privately to check the 10 miles. Leave empty to switch collection off.
  COLLECTION_MILES      optional, defaults to 10
  WHATSAPP_NUMBER       optional, your business WhatsApp number. Leave empty to show "coming soon".
  MAIL_FROM             optional, defaults to "Scottish Country Attitude <orders@scottishcountryattitude.co.uk>"

SETTING UP RESEND (one-off, about 15 minutes)
  1. Sign up free at resend.com.
  2. Domains > Add domain > scottishcountryattitude.co.uk (region: Ireland, eu-west-1).
  3. Resend shows some DNS records. In Cloudflare > DNS, add each one exactly as shown (Proxy: DNS only).
  4. Back in Resend press Verify. When it says Verified, go to API keys > Create API key (Sending access).
  5. Copy the key into Netlify as RESEND_API_KEY (mark it secret), then Deploys > Trigger deploy.
