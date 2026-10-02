/**
 * Stampie - UI Rendering
 * ---------------------------------------------------------------------------
 * Pure-ish render functions that build HTML strings / DOM for each screen.
 * app.js owns the router and wires up event listeners after render.
 */

import { MAX_STAMPS, CODE_LENGTH, MOTIVATION_MESSAGES, GENDER_OPTIONS } from './constants.js';

const ASSET = {
  finalLogo: 'assets/final_logo.png',
  character: 'assets/notxt_character_logo.png',
  banner: 'assets/text_banner.png',
};

const STAMP_ICON_CLASS = 'fa-solid fa-stamp';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
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
        <img src="${ASSET.finalLogo}" alt="Stampie, Divika Cakes loyalty card" />
      </div>
      <h1 class="onboard-title">Welcome to Stampie</h1>
      <p class="onboard-sub">Collect stamps with every cake and unlock a surprise!</p>

      <form id="onboarding-form" novalidate>
        <div class="field field-with-icon">
          <label for="input-name"><i class="fa-solid fa-user-pen" style="color:var(--accent); margin-right:6px;"></i>Full name</label>
          <input
            type="text"
            id="input-name"
            name="name"
            value="${escapeHtml(name)}"
            placeholder="e.g. Priya Sharma"
            autocomplete="name"
            required
          />
          ${errors.name ? `<span class="error"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(errors.name)}</span>` : ''}
        </div>

        <div class="field field-with-icon">
          <label for="input-phone"><i class="fa-solid fa-phone" style="color:var(--accent); margin-right:6px;"></i>Phone number</label>
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
          <span class="hint"><i class="fa-solid fa-circle-info"></i>10-digit Indian mobile number</span>
          ${errors.phone ? `<span class="error"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(errors.phone)}</span>` : ''}
        </div>

        <div class="field">
          <label id="gender-label"><i class="fa-solid fa-venus-mars" style="color:var(--accent); margin-right:6px;"></i>Gender</label>
          <div class="radio-group" role="radiogroup" aria-labelledby="gender-label">
            ${genderChips}
          </div>
          ${errors.gender ? `<span class="error"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(errors.gender)}</span>` : ''}
        </div>

        <button type="submit" class="btn btn-primary btn-block" style="margin-top: 8px;">
          <i class="fa-solid fa-arrow-right"></i>
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
        ${filled ? `<i class="${STAMP_ICON_CLASS} stamp-icon" aria-hidden="true"></i>` : ''}
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
        <span class="top-bar-spacer" aria-hidden="true"></span>
        ${completedCount > 0 ? `<span class="text-muted" style="font-size:0.82rem; font-weight:700; display:flex; align-items:center; gap:6px;"><i class="fa-solid fa-trophy" style="color:var(--accent);"></i>${completedCount} redeemed</span>` : ''}
        <span class="top-bar-spacer" aria-hidden="true"></span>
      </div>

      <img src="${ASSET.banner}" alt="Divika Cakes" class="banner-art" />

      <p class="text-center" style="font-weight:700; font-size:1.15rem; margin-bottom: 12px; display:flex; align-items:center; justify-content:center; gap:8px;">
        Hello, ${escapeHtml(firstName)}! <i class="fa-solid fa-hand-sparkles" style="color:var(--accent);"></i>
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
          <i class="fa-solid ${isReady ? 'fa-gift' : 'fa-lock'}"></i>
          Unlock Surprise
        </button>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Manual code entry - OTP style boxes (real inputs, system keyboard)
   (there is no camera-based scanner in this app)
   ========================================================================== */

export function renderManualEntry({ value = '', errorMsg = '', hidden = false } = {}) {
  const chars = value.padEnd(CODE_LENGTH, ' ').slice(0, CODE_LENGTH).split('');

  const boxes = chars.map((ch, i) => {
    const filled = ch !== ' ';
    const display = filled ? escapeHtml(ch) : '';
    const inputType = hidden && filled ? 'password' : 'text';
    return `
      <input
        type="${inputType}"
        class="otp-box ${filled ? 'is-filled' : ''}"
        id="otp-box-${i}"
        data-otp-index="${i}"
        value="${display}"
        maxlength="1"
        inputmode="text"
        autocomplete="off"
        autocapitalize="characters"
        spellcheck="false"
      />
    `;
  }).join('');

  return `
    <div class="screen" style="display:flex; flex-direction:column;">
      <div class="top-bar">
        <h2 style="font-size:1.3rem;">Enter your code</h2>
        <button class="icon-btn" id="btn-close-manual" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="code-hero mb-5">
        <div class="code-hero-icon">
          <i class="fa-solid fa-cake-candles"></i>
        </div>
        <p class="text-muted" style="font-weight:600;">
          Find the 6-character code printed on your cake box.
        </p>
      </div>

      <form id="manual-entry-form" novalidate>
        <div class="otp-row" id="otp-row">
          ${boxes}
        </div>

        ${errorMsg ? `<p class="error text-center" id="manual-entry-error" style="justify-content:center; margin-bottom: var(--space-3);"><i class="fa-solid fa-circle-exclamation"></i>&nbsp;${escapeHtml(errorMsg)}</p>` : ''}

        <div class="otp-visibility-row">
          <button type="button" class="otp-visibility-toggle" id="btn-toggle-visibility">
            <i class="fa-solid ${hidden ? 'fa-eye' : 'fa-eye-slash'}"></i>
            ${hidden ? 'Show code' : 'Hide code'}
          </button>
        </div>

        <button type="submit" class="btn btn-primary btn-block mb-4" id="btn-submit-code">
          <i class="fa-solid fa-check"></i>
          Submit Code
        </button>
      </form>
    </div>
  `;
}

/* ==========================================================================
   Celebration overlay
   ========================================================================== */

export function renderCelebration() {
  const confettiColors = ['#CD866E', '#EEB8A6', '#010A27', '#FDE5D5'];
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
      <div class="celebration-stamp-icon">
        <i class="${STAMP_ICON_CLASS}"></i>
      </div>
      <h2 style="font-size:1.5rem;">Stamp Added!</h2>
      <p style="font-weight:700; opacity:0.75;">Thank you for choosing Divika Cakes!</p>
    </div>
  `;
}

/* ==========================================================================
   Reward / redemption screen
   ========================================================================== */

export function renderReward({ profile, stamps }) {
  const codesHtml = stamps
    .map(() => `<span class="code-chip code-chip-hidden"><i class="fa-solid fa-lock"></i>&bull;&bull;&bull;&bull;&bull;&bull;</span>`)
    .join('');

  return `
    <div class="screen screen--no-nav" id="reward-screen">
      <div class="top-bar">
        <button class="icon-btn" id="btn-back-from-reward" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
      </div>

      <div class="text-center mb-4">
        <div class="code-hero-icon" style="margin:0 auto 12px; width:110px; height:110px; font-size:2.6rem;">
          <i class="fa-solid fa-gift"></i>
        </div>
        <h1 style="font-size:1.6rem;">Surprise Unlocked!</h1>
        <p style="font-weight:700; opacity:0.75; margin-top:4px;">Congratulations, ${escapeHtml((profile.name || '').split(' ')[0] || 'friend')}!</p>
        <p class="text-muted" style="font-weight:600;">Your surprise gift is ready.</p>
      </div>

      <div class="card mb-4">
        <div class="reward-detail-row">
          <span class="label" style="font-weight:700; opacity:0.6;"><i class="fa-solid fa-user" style="color:var(--accent); margin-right:6px;"></i>Name</span>
          <span style="font-weight:700;">${escapeHtml(profile.name)}</span>
        </div>
        <div class="reward-detail-row">
          <span class="label" style="font-weight:700; opacity:0.6;"><i class="fa-solid fa-phone" style="color:var(--accent); margin-right:6px;"></i>Phone</span>
          <span style="font-weight:700;">${escapeHtml(profile.phone)}</span>
        </div>
        <div style="padding-top:12px;">
          <span class="label" style="font-weight:700; opacity:0.6; font-size:0.9rem;"><i class="fa-solid fa-stamp" style="color:var(--accent); margin-right:6px;"></i>Collected Codes</span>
          <div class="code-chip-list">${codesHtml}</div>
        </div>
      </div>

      <button type="button" class="btn btn-primary btn-block" id="btn-confirm-redemption">
        <i class="fa-brands fa-whatsapp"></i>
        Confirm Reset Redemption
      </button>
    </div>
  `;
}

export function renderResetConfirmation() {
  return `
    <div class="celebration-overlay" role="status" id="reset-overlay">
      <div class="celebration-stamp-icon">
        <i class="fa-solid fa-rotate"></i>
      </div>
      <h2 style="font-size:1.4rem;">Your loyalty card has been reset.</h2>
      <p style="font-weight:700; opacity:0.75;">Start collecting your next 6 stamps!</p>
    </div>
  `;
}

/* ==========================================================================
   Profile / Settings screen
   ========================================================================== */

export function renderProfile({ profile, stampCount, completedCount, editing = false, errors = {}, avatar = null }) {
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
        <label for="edit-name"><i class="fa-solid fa-user-pen" style="color:var(--accent); margin-right:6px;"></i>Full name</label>
        <input type="text" id="edit-name" name="name" value="${escapeHtml(profile.name)}" required />
        ${errors.name ? `<span class="error"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(errors.name)}</span>` : ''}
      </div>
      <div class="field">
        <label for="edit-phone"><i class="fa-solid fa-phone" style="color:var(--accent); margin-right:6px;"></i>Phone number</label>
        <input type="tel" id="edit-phone" name="phone" value="${escapeHtml(profile.phone)}" inputmode="numeric" required />
        ${errors.phone ? `<span class="error"><i class="fa-solid fa-circle-exclamation"></i>${escapeHtml(errors.phone)}</span>` : ''}
      </div>
      <div class="field">
        <label id="edit-gender-label"><i class="fa-solid fa-venus-mars" style="color:var(--accent); margin-right:6px;"></i>Gender</label>
        <div class="radio-group" role="radiogroup" aria-labelledby="edit-gender-label">${genderChips}</div>
      </div>
      <div class="flex-row gap-3">
        <button type="submit" class="btn btn-primary btn-block"><i class="fa-solid fa-check"></i>Save</button>
        <button type="button" class="btn btn-secondary btn-block" id="btn-cancel-edit"><i class="fa-solid fa-xmark"></i>Cancel</button>
      </div>
    </form>
  ` : `
    <div class="card mb-4">
      <div class="info-row">
        <span class="label"><i class="fa-solid fa-user"></i>Name</span>
        <span class="value">${escapeHtml(profile.name)}</span>
      </div>
      <div class="info-row">
        <span class="label"><i class="fa-solid fa-phone"></i>Phone</span>
        <span class="value">${escapeHtml(profile.phone)}</span>
      </div>
      <div class="info-row">
        <span class="label"><i class="fa-solid fa-venus-mars"></i>Gender</span>
        <span class="value">${escapeHtml(profile.gender)}</span>
      </div>
    </div>
    <button class="btn btn-secondary btn-block mb-5" id="btn-edit-profile">
      <i class="fa-solid fa-pen"></i>
      Edit profile
    </button>
  `;

  const avatarInner = avatar
    ? `<img src="${avatar}" alt="Your profile photo" />`
    : (initials ? escapeHtml(initials) : `<i class="fa-solid fa-user"></i>`);

  return `
    <div class="screen">
      <div class="top-bar">
        <h2 style="font-size:1.3rem;">Profile</h2>
      </div>

      <div class="profile-avatar-wrap">
        <div class="profile-avatar" id="profile-avatar">${avatarInner}</div>
        <button class="avatar-edit-btn" id="btn-edit-avatar" aria-label="Change profile photo">
          <i class="fa-solid fa-camera"></i>
        </button>
      </div>

      <h3 class="section-title"><i class="fa-solid fa-id-card"></i>Your details</h3>
      ${profileBlock}

      <h3 class="section-title"><i class="fa-solid fa-chart-simple"></i>Loyalty information</h3>
      <div class="card mb-5">
        <div class="info-row">
          <span class="label"><i class="fa-solid fa-stamp"></i>Current stamps</span>
          <span class="value">${stampCount} / ${MAX_STAMPS}</span>
        </div>
        <div class="info-row">
          <span class="label"><i class="fa-solid fa-hourglass-half"></i>Remaining stamps</span>
          <span class="value">${Math.max(0, MAX_STAMPS - stampCount)}</span>
        </div>
        <div class="info-row">
          <span class="label"><i class="fa-solid fa-trophy"></i>Cards redeemed</span>
          <span class="value">${completedCount}</span>
        </div>
      </div>

      <h3 class="section-title"><i class="fa-solid fa-file-lines"></i>Terms and conditions</h3>
      <div class="card mb-5">
        <ul class="terms-list">
          <li><i class="fa-solid fa-circle-check"></i>One stamp per bento cake purchase.</li>
          <li><i class="fa-solid fa-circle-check"></i>Two stamps per 500gm cake purchase.</li>
          <li><i class="fa-solid fa-circle-check"></i>Your Stampie account must be presented at the time of purchase.</li>
          <li><i class="fa-solid fa-circle-check"></i>Valid for regular cakes only.</li>
          <li><i class="fa-solid fa-circle-check"></i>Each cake code can only be redeemed once per loyalty cycle.</li>
          <li><i class="fa-solid fa-circle-check"></i>Six valid stamps unlock one surprise gift.</li>
          <li><i class="fa-solid fa-circle-check"></i>After the surprise gift is redeemed, the stamp counter resets to zero.</li>
          <li><i class="fa-solid fa-circle-check"></i>Stampie uses local device storage for this frontend-only implementation.</li>
        </ul>
      </div>

      <h3 class="section-title"><i class="fa-solid fa-circle-info"></i>About</h3>
      <div class="card text-center">
        <div class="about-logo-circle">
          <img src="${ASSET.character}" alt="Stampie character logo" />
        </div>
        <p class="text-muted" style="font-weight:600; font-size:0.92rem;">
          Stampie is the digital loyalty card for Divika Cakes. Collect stamps with your cake purchases and unlock a sweet surprise!
        </p>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Avatar photo-source bottom sheet (camera / gallery picker)
   ========================================================================== */

export function renderAvatarSheet({ hasAvatar = false } = {}) {
  return `
    <div class="sheet-backdrop" id="avatar-sheet-backdrop">
      <div class="sheet-panel" id="avatar-sheet-panel" role="dialog" aria-modal="true" aria-label="Change profile photo">
        <div class="sheet-handle"></div>
        <h3 class="sheet-title">Profile photo</h3>
        <div class="sheet-options">
          <button type="button" class="sheet-option" id="avatar-option-camera">
            <span class="sheet-option-icon"><i class="fa-solid fa-camera"></i></span>
            Take a photo
          </button>
          <button type="button" class="sheet-option" id="avatar-option-gallery">
            <span class="sheet-option-icon"><i class="fa-solid fa-images"></i></span>
            Choose from gallery
          </button>
          ${hasAvatar ? `
          <button type="button" class="sheet-option sheet-option-remove" id="avatar-option-remove">
            <span class="sheet-option-icon"><i class="fa-solid fa-trash"></i></span>
            Remove photo
          </button>` : ''}
        </div>
        <button type="button" class="sheet-cancel" id="avatar-sheet-cancel">Cancel</button>
        <input type="file" id="avatar-file-camera" accept="image/*" capture="environment" style="display:none;" />
        <input type="file" id="avatar-file-gallery" accept="image/*" style="display:none;" />
      </div>
    </div>
  `;
}

/* ==========================================================================
   Custom confirm dialog
   ========================================================================== */

export function renderDialog({ icon = 'fa-circle-question', title = '', message = '', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false } = {}) {
  return `
    <div class="dialog-backdrop" id="dialog-backdrop">
      <div class="dialog-panel" role="alertdialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="dialog-icon"><i class="fa-solid ${icon}"></i></div>
        <h3 class="dialog-title">${escapeHtml(title)}</h3>
        <p class="dialog-msg">${escapeHtml(message)}</p>
        <div class="dialog-actions">
          <button type="button" class="btn btn-secondary btn-block" id="dialog-cancel">${escapeHtml(cancelLabel)}</button>
          <button type="button" class="btn btn-primary btn-block" id="dialog-confirm" style="${danger ? 'background:var(--danger);' : ''}">${escapeHtml(confirmLabel)}</button>
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   Floating install button - rendered once, stays fixed on every screen
   ========================================================================== */

export function renderInstallButton() {
  return `
    <button type="button" class="install-btn-floating" id="btn-install-app" aria-label="Install app" title="Install app">
      <i class="fa-solid fa-arrow-up-from-bracket"></i>
    </button>
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
      <button class="nav-item nav-item-scan" id="nav-scan" aria-label="Enter cake code">
        <i class="fa-solid fa-keyboard"></i>
      </button>
      <button class="nav-item ${activeTab === 'profile' ? 'is-active' : ''}" id="nav-profile" aria-label="Profile">
        <i class="fa-solid fa-user"></i>
        <span>Profile</span>
      </button>
    </nav>
  `;
}

/* ==========================================================================
   Toast (fully custom, never a browser default)
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

  const icon = type === 'success' ? 'fa-circle-check' : type === 'error' ? 'fa-circle-exclamation' : 'fa-bell';

  el.className = `toast is-visible ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
  el.innerHTML = `<i class="fa-solid ${icon} toast-icon"></i><span>${escapeHtml(message)}</span>`;

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.remove('is-visible');
  }, 2800);
}


