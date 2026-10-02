/**
 * Stampie — UI Rendering
 * ---------------------------------------------------------------------------
 * Pure-ish render functions that build HTML strings / DOM for each screen.
 * app.js owns the router and wires up event listeners after render.
 */

import { MAX_STAMPS, MOTIVATION_MESSAGES, GENDER_OPTIONS, REWARD_CONTACT_DISPLAY } from './constants.js';

const ASSET = {
  finalLogo: 'assets/final_logo.png',
  character: 'assets/notxt_character_logo.png',
  banner: 'assets/text_banner.png',
};

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

/* ==========================================================================
   Splash screen
   ========================================================================== */

export function renderSplash() {
  return `
    <div class="splash-screen" role="status" aria-label="Loading Stampie">
      <img src="${ASSET.finalLogo}" alt="Stampie" class="splash-logo" />
      <div class="splash-dots" aria-hidden="true">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Onboarding
   ========================================================================== */

export function renderOnboarding(values = {}, errors = {}) {
  const { name = '', phone = '', gender = '' } = values;

  const genderChips = GENDER_OPTIONS.map((opt) => {
    const id = `gender-${opt.replace(/\s+/g, '-').toLowerCase()}`;
    const selected = gender === opt ? 'is-selected' : '';
    return `
      <label class="radio-chip ${selected}" for="${id}">
        <input type="radio" name="gender" id="${id}" value="${escapeHtml(opt)}" ${gender === opt ? 'checked' : ''} />
        ${escapeHtml(opt)}
      </label>
    `;
  }).join('');

  return `
    <div class="screen screen--no-nav">
      <div class="onboard-hero">
        <img src="${ASSET.finalLogo}" alt="Stampie — Divika Cakes loyalty card" />
      </div>
      <h1 class="onboard-title">Welcome to Stampie</h1>
      <p class="onboard-sub">Collect stamps with every cake and unlock a surprise!</p>

      <form id="onboarding-form" novalidate>
        <div class="field">
          <label for="input-name">Full name</label>
          <input
            type="text"
            id="input-name"
            name="name"
            value="${escapeHtml(name)}"
            placeholder="e.g. Priya Sharma"
            autocomplete="name"
            required
          />
          ${errors.name ? `<span class="error">${escapeHtml(errors.name)}</span>` : ''}
        </div>

        <div class="field">
          <label for="input-phone">Phone number</label>
          <input
            type="tel"
            id="input-phone"
            name="phone"
            value="${escapeHtml(phone)}"
            placeholder="98765 43210"
            inputmode="numeric"
            autocomplete="tel"
            required
          />
          <span class="hint">10-digit Indian mobile number</span>
          ${errors.phone ? `<span class="error">${escapeHtml(errors.phone)}</span>` : ''}
        </div>

        <div class="field">
          <label id="gender-label">Gender</label>
          <div class="radio-group" role="radiogroup" aria-labelledby="gender-label">
            ${genderChips}
          </div>
          ${errors.gender ? `<span class="error">${escapeHtml(errors.gender)}</span>` : ''}
        </div>

        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 8px;">
          Continue
        </button>
      </form>
    </div>
  `;
}

/* ==========================================================================
   Home / Collection screen
   ========================================================================== */

function renderStampGrid(stampCount) {
  let circles = '';
  for (let i = 0; i < MAX_STAMPS; i++) {
    const filled = i < stampCount;
    const isNew = i === stampCount - 1;
    circles += `
      <div class="stamp-circle ${filled ? 'is-filled' : 'is-empty'} ${isNew ? 'is-new' : ''}" aria-label="${filled ? 'Stamp collected' : 'Stamp not yet collected'}">
        ${filled ? `<img src="${ASSET.character}" alt="" />` : ''}
      </div>
    `;
  }
  return circles;
}

export function renderHome({ profile, stampCount, completedCount }) {
  const pct = Math.round((stampCount / MAX_STAMPS) * 100);
  const motivation = MOTIVATION_MESSAGES[stampCount] ?? MOTIVATION_MESSAGES[0];
  const isReady = stampCount >= MAX_STAMPS;
  const firstName = (profile.name || '').split(' ')[0] || 'friend';

  return `
    <div class="screen">
      <div class="top-bar">
        <img src="${ASSET.finalLogo}" alt="Stampie" class="logo-mark" />
        ${completedCount > 0 ? `<span class="text-muted" style="font-size:0.82rem; font-weight:700;">${completedCount} redeemed</span>` : ''}
      </div>

      <img src="${ASSET.banner}" alt="Divika Cakes" class="banner-art" />

      <p class="text-center" style="font-weight:700; font-size:1.15rem; margin-bottom: 20px;">
        Hello, ${escapeHtml(firstName)}! 👋
      </p>

      <div class="loyalty-card">
        <h2 class="text-center" style="font-size:1.2rem; margin-bottom: 4px;">Your Sweet Loyalty Card</h2>
        <p class="text-center text-muted" style="font-size:0.85rem; font-weight:600;">Collect 6 stamps and get 1 surprise gift</p>

        <div class="stamp-grid" id="stamp-grid" aria-label="${stampCount} of ${MAX_STAMPS} stamps collected">
          ${renderStampGrid(stampCount)}
        </div>

        <p class="progress-label">${stampCount} / ${MAX_STAMPS} stamps</p>
        <div class="progress-bar-track" role="progressbar" aria-valuenow="${stampCount}" aria-valuemin="0" aria-valuemax="${MAX_STAMPS}">
          <div class="progress-bar-fill" style="width:${pct}%"></div>
        </div>
        <p class="motivation-msg">${escapeHtml(motivation)}</p>

        <button
          id="btn-unlock-reward"
          class="btn btn-primary btn-block btn-reward ${isReady ? 'is-unlocked' : ''}"
          ${isReady ? '' : 'disabled'}
          aria-disabled="${!isReady}"
        >
          ${isReady ? '🎁 Unlock Surprise' : '🔒 Unlock Surprise'}
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Scanner screen
   ========================================================================== */

export function renderScanner({ cameraState = 'requesting' } = {}) {
  // cameraState: 'requesting' | 'active' | 'denied' | 'unavailable'
  const showVideo = cameraState === 'active' || cameraState === 'requesting';

  return `
    <div class="screen">
      <div class="top-bar">
        <h2 style="font-size:1.3rem;">Scan your cake code</h2>
        <button class="icon-btn" id="btn-close-scanner" aria-label="Close scanner">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <p class="text-muted" style="font-weight:600; margin-bottom: 16px;">
        Point your camera at the QR code on your cake box.
      </p>

      <div class="scanner-frame">
        <video id="scanner-video" autoplay muted playsinline style="${showVideo && cameraState === 'active' ? '' : 'display:none;'}"></video>
        <canvas id="scanner-canvas" style="display:none;"></canvas>

        ${cameraState === 'active' ? `
          <div class="scanner-reticle" aria-hidden="true"></div>
          <div class="scan-line" aria-hidden="true"></div>
        ` : ''}

        ${cameraState === 'requesting' ? `
          <div class="scanner-placeholder">
            <i class="fa-solid fa-camera"></i>
            <p>Starting camera…</p>
          </div>
        ` : ''}

        ${cameraState === 'denied' ? `
          <div class="scanner-placeholder">
            <i class="fa-solid fa-camera-slash"></i>
            <p>Camera access isn't available.<br/>You can enter your cake code manually below.</p>
          </div>
        ` : ''}

        ${cameraState === 'unavailable' ? `
          <div class="scanner-placeholder">
            <i class="fa-solid fa-camera-slash"></i>
            <p>Scanning isn't supported on this device.<br/>Enter your cake code manually below.</p>
          </div>
        ` : ''}
      </div>

      <button class="manual-entry-link" id="btn-manual-entry">
        <i class="fa-solid fa-keyboard"></i>
        Enter code manually
      </button>
    </div>
  `;
}

export function renderManualEntry({ value = '', errorMsg = '' } = {}) {
  return `
    <div class="screen">
      <div class="top-bar">
        <h2 style="font-size:1.3rem;">Enter your code</h2>
        <button class="icon-btn" id="btn-close-manual" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="card-outline mb-4" style="text-align:center;">
        <img src="${ASSET.character}" alt="" style="width:72px;height:72px;object-fit:contain;margin:0 auto 12px;" />
        <p class="text-muted" style="font-weight:600;">
          Find the 6-character code printed on your cake box.
        </p>
      </div>

      <form id="manual-entry-form" novalidate>
        <div class="field">
          <label for="input-code">Cake code</label>
          <input
            type="text"
            id="input-code"
            class="code-input"
            value="${escapeHtml(value)}"
            maxlength="6"
            placeholder="A7K2P9"
            autocomplete="off"
            autocapitalize="characters"
            spellcheck="false"
            inputmode="text"
          />
          ${errorMsg ? `<span class="error" id="manual-entry-error">${escapeHtml(errorMsg)}</span>` : ''}
        </div>
        <button type="submit" class="btn btn-primary btn-block">Submit Code</button>
      </form>
    </div>
  `;
}

/* ==========================================================================
   Celebration overlay
   ========================================================================== */

export function renderCelebration() {
  const confettiColors = ['#CD866E', '#EEB8A6', '#010A27', '#FEE6DE'];
  let confetti = '';
  for (let i = 0; i < 24; i++) {
    const left = Math.random() * 100;
    const delay = Math.random() * 0.4;
    const duration = 1.6 + Math.random() * 1;
    const color = confettiColors[i % confettiColors.length];
    confetti += `<div class="confetti-piece" style="left:${left}%; background:${color}; animation-delay:${delay}s; animation-duration:${duration}s;"></div>`;
  }

  return `
    <div class="celebration-overlay" role="alert" id="celebration-overlay">
      ${confetti}
      <img src="${ASSET.character}" alt="" class="celebration-char" />
      <h2 style="font-size:1.5rem;">🎉 Stamp Added!</h2>
      <p style="font-weight:700; opacity:0.75;">Thank you for choosing Divika Cakes!</p>
    </div>
  `;
}

/* ==========================================================================
   Reward / redemption screen
   ========================================================================== */

export function renderReward({ profile, stamps }) {
  const codesHtml = stamps
    .map((s) => `<span class="code-chip">${escapeHtml(s.code)}</span>`)
    .join('');

  return `
    <div class="screen screen--no-nav" id="reward-screen">
      <div class="top-bar">
        <button class="icon-btn" id="btn-back-from-reward" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
      </div>

      <div class="text-center mb-4">
        <img src="${ASSET.character}" alt="" style="width:120px;height:120px;object-fit:contain;margin:0 auto 12px;" />
        <h1 style="font-size:1.6rem;">🎉 Surprise Unlocked!</h1>
        <p style="font-weight:700; opacity:0.75; margin-top:4px;">Congratulations, ${escapeHtml((profile.name || '').split(' ')[0] || 'friend')}!</p>
        <p class="text-muted" style="font-weight:600;">Your surprise gift is ready.</p>
      </div>

      <div class="card mb-4">
        <div class="reward-detail-row">
          <span class="label" style="font-weight:700; opacity:0.6;">Name</span>
          <span style="font-weight:700;">${escapeHtml(profile.name)}</span>
        </div>
        <div class="reward-detail-row">
          <span class="label" style="font-weight:700; opacity:0.6;">Phone</span>
          <span style="font-weight:700;">${escapeHtml(profile.phone)}</span>
        </div>
        <div style="padding-top:12px;">
          <span class="label" style="font-weight:700; opacity:0.6; font-size:0.9rem;">Collected Codes</span>
          <div class="code-chip-list">${codesHtml}</div>
        </div>
      </div>

      <button class="btn btn-primary btn-block mb-3" id="btn-contact-gift">
        <i class="fa-brands fa-whatsapp"></i>
        Contact for Gift
      </button>

      <button class="btn btn-secondary btn-block" id="btn-confirm-redemption">
        Confirm Redemption &amp; Reset Card
      </button>
    </div>
  `;
}

export function renderResetConfirmation() {
  return `
    <div class="celebration-overlay" role="status" id="reset-overlay">
      <img src="${ASSET.character}" alt="" class="celebration-char" />
      <h2 style="font-size:1.4rem;">Your loyalty card has been reset.</h2>
      <p style="font-weight:700; opacity:0.75;">Start collecting your next 6 stamps! 🍰</p>
    </div>
  `;
}

/* ==========================================================================
   Profile / Settings screen
   ========================================================================== */

export function renderProfile({ profile, stampCount, completedCount, editing = false, errors = {} }) {
  const initials = (profile.name || '?')
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const genderChips = GENDER_OPTIONS.map((opt) => {
    const id = `edit-gender-${opt.replace(/\s+/g, '-').toLowerCase()}`;
    const selected = profile.gender === opt ? 'is-selected' : '';
    return `
      <label class="radio-chip ${selected}" for="${id}">
        <input type="radio" name="gender" id="${id}" value="${escapeHtml(opt)}" ${profile.gender === opt ? 'checked' : ''} />
        ${escapeHtml(opt)}
      </label>
    `;
  }).join('');

  const profileBlock = editing ? `
    <form id="profile-edit-form" novalidate>
      <div class="field">
        <label for="edit-name">Full name</label>
        <input type="text" id="edit-name" name="name" value="${escapeHtml(profile.name)}" required />
        ${errors.name ? `<span class="error">${escapeHtml(errors.name)}</span>` : ''}
      </div>
      <div class="field">
        <label for="edit-phone">Phone number</label>
        <input type="tel" id="edit-phone" name="phone" value="${escapeHtml(profile.phone)}" inputmode="numeric" required />
        ${errors.phone ? `<span class="error">${escapeHtml(errors.phone)}</span>` : ''}
      </div>
      <div class="field">
        <label id="edit-gender-label">Gender</label>
        <div class="radio-group" role="radiogroup" aria-labelledby="edit-gender-label">${genderChips}</div>
      </div>
      <div class="flex-row gap-3">
        <button type="submit" class="btn btn-primary btn-block">Save</button>
        <button type="button" class="btn btn-secondary btn-block" id="btn-cancel-edit">Cancel</button>
      </div>
    </form>
  ` : `
    <div class="card mb-4">
      <div class="info-row">
        <span class="label">Name</span>
        <span class="value">${escapeHtml(profile.name)}</span>
      </div>
      <div class="info-row">
        <span class="label">Phone</span>
        <span class="value">${escapeHtml(profile.phone)}</span>
      </div>
      <div class="info-row">
        <span class="label">Gender</span>
        <span class="value">${escapeHtml(profile.gender)}</span>
      </div>
    </div>
    <button class="btn btn-secondary btn-block mb-5" id="btn-edit-profile">
      <i class="fa-solid fa-pen"></i>&nbsp; Edit profile
    </button>
  `;

  return `
    <div class="screen">
      <div class="top-bar">
        <h2 style="font-size:1.3rem;">Profile</h2>
      </div>

      <div class="profile-avatar">${escapeHtml(initials) || '🍰'}</div>

      <h3 class="section-title">Your details</h3>
      ${profileBlock}

      <h3 class="section-title">Loyalty information</h3>
      <div class="card mb-5">
        <div class="info-row">
          <span class="label">Current stamps</span>
          <span class="value">${stampCount} / ${MAX_STAMPS}</span>
        </div>
        <div class="info-row">
          <span class="label">Remaining stamps</span>
          <span class="value">${Math.max(0, MAX_STAMPS - stampCount)}</span>
        </div>
        <div class="info-row">
          <span class="label">Cards redeemed</span>
          <span class="value">${completedCount}</span>
        </div>
      </div>

      <h3 class="section-title">Terms &amp; conditions</h3>
      <div class="card mb-5">
        <ul class="terms-list">
          <li>One stamp per bento cake purchase.</li>
          <li>Two stamps per 500gm cake purchase.</li>
          <li>Your Stampie account must be presented at the time of purchase.</li>
          <li>Valid for regular cakes only.</li>
          <li>Each cake code can only be redeemed once per loyalty cycle.</li>
          <li>Six valid stamps unlock one surprise gift.</li>
          <li>After the surprise gift is redeemed, the stamp counter resets to zero.</li>
          <li>Stampie uses local device storage for this frontend-only implementation.</li>
        </ul>
      </div>

      <h3 class="section-title">About</h3>
      <div class="card text-center">
        <div class="about-logo-row">
          <img src="${ASSET.finalLogo}" alt="Stampie" />
          <img src="${ASSET.character}" alt="" />
        </div>
        <p class="text-muted" style="font-weight:600; font-size:0.92rem;">
          Stampie is the digital loyalty card for Divika Cakes. Collect stamps with your cake purchases and unlock a sweet surprise!
        </p>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Bottom navigation
   ========================================================================== */

export function renderBottomNav(activeTab) {
  return `
    <nav class="bottom-nav" aria-label="Main navigation">
      <button class="nav-item ${activeTab === 'collection' ? 'is-active' : ''}" id="nav-collection" aria-label="Collection">
        <i class="fa-solid fa-gift"></i>
        <span>Collection</span>
      </button>
      <button class="nav-item nav-item-scan" id="nav-scan" aria-label="Scan cake code">
        <i class="fa-solid fa-qrcode"></i>
      </button>
      <button class="nav-item ${activeTab === 'profile' ? 'is-active' : ''}" id="nav-profile" aria-label="Profile">
        <i class="fa-solid fa-user"></i>
        <span>Profile</span>
      </button>
    </nav>
  `;
}

/* ==========================================================================
   Toast
   ========================================================================== */

let toastTimeout = null;

export function showToast(message, type = 'default') {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }

  el.className = `toast is-visible ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  el.textContent = message;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2800);
}

export { ASSET, escapeHtml, formatDate };
