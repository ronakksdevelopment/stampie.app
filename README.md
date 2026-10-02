# Stampie 🍰

The digital loyalty card for **Divika Cakes**. Customers collect a stamp for every
cake code they scan (printed on the cake box), and unlock a surprise gift after
6 stamps.

Built as a frontend-only, installable Progressive Web App - no backend, no
server, no database. It runs entirely in the customer's browser using
LocalStorage.

---

## ✨ Features

- QR code scanning (camera) with manual code entry fallback
- 6-stamp loyalty card with animated stamp collection
- Surprise gift unlock + WhatsApp message to the shop owner
- Profile with name, phone, and gender
- Installable PWA with offline support
- Mobile-first, bakery-themed design

---

## 🚀 Running locally

This is a static site with ES modules, so it needs to be served over HTTP
(opening `index.html` directly via `file://` will not work due to browser
module/fetch restrictions).

Any static server works. For example, with Python:

```bash
cd stampie
python3 -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

Or with Node's `http-server`:

```bash
npx http-server . -p 8080
```

**Note:** Camera access (QR scanning) requires HTTPS in most browsers, except
on `localhost`, which is treated as a secure context. For real device testing
over your local network, use a tool like `ngrok` or deploy to GitHub Pages
(see below).

---

## 🧾 Adding cake QR codes

Cake codes live in **`data/codes.json`** - a simple JSON array of strings.

```json
[
  "A7K2P9",
  "Q4M8Z2",
  "7KPX91"
]
```

Rules:
- Every code must be **exactly 6 characters**.
- Uppercase letters and numbers only.
- Each code can only be redeemed once per customer, per loyalty cycle.

To add new codes, just open `data/codes.json` and append new strings to the
array (keep it valid JSON - commas between entries, no trailing comma on the
last one).

### Generating codes automatically

A helper script is included at `data/generate-codes.js` (Node.js, not part of
the shipped app) for generating random, unambiguous 6-character codes:

```bash
# Print 50 new codes to the console
node data/generate-codes.js 50

# Generate 50 new codes and merge them into codes.json automatically
# (skips anything already in the file)
node data/generate-codes.js 50 data/codes.json
```

The generator avoids easily-confused characters (`O`/`0`, `I`/`1`) for easier
manual entry by customers.

Each cake box's QR code should simply encode the plain code string (e.g.
`A7K2P9`) - any QR generator (online or offline) works for printing.

---

## 🖼️ Replacing the brand assets

Three images live in `assets/`:

| File | Aspect ratio | Used for |
|---|---|---|
| `final_logo.png` | 1:1 | Splash screen, onboarding, header |
| `notxt_character_logo.png` | 1:1 | Stamp fill artwork, celebrations, reward screen |
| `text_banner.png` | 2:1 | Decorative banner on the home screen |

To replace them, swap the files in `assets/` **keeping the same filenames and
aspect ratios** - the layout is built around those proportions. If you change
the character artwork, also regenerate the app icons (see below).

### Regenerating app icons

The PWA icons in `icons/` are derived from `notxt_character_logo.png`. If you
update that asset, regenerate the icon set (requires Python + Pillow):

```bash
pip install pillow
python3 - << 'EOF'
from PIL import Image
img = Image.open('assets/notxt_character_logo.png').convert('RGBA')
bg = (254, 230, 222, 255)
for size in [72, 96, 128, 144, 152, 192, 384, 512]:
    canvas = Image.new('RGBA', (size, size), bg)
    t = int(size * 0.8)
    resized = img.resize((t, t), Image.LANCZOS)
    canvas.paste(resized, ((size - t)//2, (size - t)//2), resized)
    canvas.convert('RGB').save(f'icons/icon-{size}.png')
EOF
```

---

## 🏗️ Build

There is no build step - this is plain HTML/CSS/JS with ES modules, served
directly. Just deploy the folder as-is.

---

## 📦 Deploying to GitHub Pages

1. Push this repository to GitHub.
2. In your repo settings, go to **Settings → Pages**.
3. Under **Source**, choose the branch (e.g. `main`) and root folder (`/`).
4. Save. GitHub will publish at `https://<username>.github.io/<repo-name>/`.

Because this project uses **relative paths** throughout (`./assets/...`,
`./src/...`, `./data/codes.json`), it works correctly whether it's hosted at
a domain root or in a subdirectory like GitHub Pages' repo-name path - no
extra base-path configuration needed.

After deploying, open the site on a mobile browser and use "Add to Home
Screen" (Android Chrome) or "Add to Home Screen" from the Share sheet (iOS
Safari) to install it as an app.

---

## ⚠️ Frontend-only limitations (please read)

This app is intentionally frontend-only, with **no backend server**:

- **`data/codes.json` is publicly accessible** once deployed. Anyone who
  knows the URL could technically view the full code list. This is suitable
  for a simple loyalty prototype or a small, controlled deployment (e.g. a
  single bakery handing out codes at point of sale), but it is **not a
  secure, tamper-proof coupon validation system**. A determined customer
  could inspect the file and "guess" unused codes.
- **All customer data (profile, stamps, history) is stored in LocalStorage
  on the customer's own device.** It is not synced anywhere, not visible to
  the shop owner except via the WhatsApp message sent at redemption time,
  and will be lost if the customer clears their browser data or switches
  devices.
- There is no authentication - anyone with the app installed can enter any
  valid code they find.

These trade-offs are appropriate for a lightweight, low-stakes loyalty
program. If you need tamper-proof validation, multi-device sync, or an
admin dashboard, you'd need to add a real backend (outside the scope of this
project).

---

## 📁 Project structure

```text
stampie/
│
├── index.html              # App shell
├── manifest.json            # PWA manifest
├── service-worker.js        # Offline caching
├── README.md
│
├── assets/
│   ├── final_logo.png
│   ├── notxt_character_logo.png
│   └── text_banner.png
│
├── data/
│   ├── codes.json           # Valid cake codes (edit this!)
│   └── generate-codes.js    # Dev helper: generates random codes
│
├── src/
│   ├── app.js                # Router + event wiring
│   ├── ui.js                 # Screen rendering (HTML templates)
│   ├── storage.js            # LocalStorage abstraction
│   ├── codes.js               # Code loading + validation logic
│   ├── scanner.js             # Camera + QR decoding (jsQR)
│   ├── constants.js           # Shared constants (colors, limits, etc.)
│   └── styles.css             # Full design system
│
└── icons/                   # Generated PWA icons (all sizes)
```

---

## 🎨 Design system

| Token | Hex | Usage |
|---|---|---|
| Background | `#FEE6DE` | App background |
| Highlight | `#EEB8A6` | Soft cards, borders, secondary surfaces |
| Accent | `#CD866E` | Buttons, progress, active states |
| Outline | `#010A27` | Text, strong outlines |

Fonts: **Baloo 2** (display/headings) + **Quicksand** (body), loaded from
Google Fonts. Icons: **Font Awesome 6**.

---

Made with 🍰 for Divika Cakes.
