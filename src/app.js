/**
 * Stampie — App Controller
 * ---------------------------------------------------------------------------
 * Small hand-rolled router + event wiring. No framework — keeps the project
 * approachable and easy to deploy as a static site.
 */

import { Storage } from './storage.js';
import { redeemCode, normalizeCode, ValidationResult, messageForResult } from './codes.js';
import { QrScanner } from './scanner.js';
import { MAX_STAMPS, REWARD_CONTACT } from './constants.js';
import {
  renderOnboarding,
  renderHome,
  renderScanner,
  renderManualEntry,
  renderCelebration,
  renderReward,
  renderResetConfirmation,
  renderProfile,
  renderBottomNav,
  showToast,
} from './ui.js';

const appEl = document.getElementById('app');

let currentScanner = null;
let currentTab = 'collection'; // 'collection' | 'scanner' | 'manual' | 'profile' | 'reward'
let profileEditing = false;

/* ==========================================================================
   Validation helpers
   ========================================================================== */

function validatePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  // Indian mobile: 10 digits, starts 6-9. Allow optional leading 0 or 91.
  const stripped = digits.replace(/^0/, '').replace(/^91/, '');
  return /^[6-9]\d{9}$/.test(stripped);
}

function formatPhoneForStorage(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  const stripped = digits.replace(/^0/, '').replace(/^91/, '');
  return `+91 ${stripped.slice(0, 5)} ${stripped.slice(5)}`;
}

/* ==========================================================================
   Router
   ========================================================================== */

function stopScannerIfRunning() {
  if (currentScanner) {
    currentScanner.stop();
    currentScanner = null;
  }
}

function renderApp() {
  if (!Storage.isOnboarded()) {
    appEl.innerHTML = renderOnboarding();
    wireOnboarding();
    return;
  }

  renderCurrentTab();
}

function renderCurrentTab(extra = {}) {
  stopScannerIfRunning();
  const profile = Storage.getProfile();
  const stampCount = Storage.getStampCount();
  const completedCount = Storage.getCompletedCount();

  let body = '';
  let nav = renderBottomNav(currentTab === 'profile' ? 'profile' : 'collection');

  switch (currentTab) {
    case 'scanner':
      body = renderScanner(extra);
      break;
    case 'manual':
      body = renderManualEntry(extra);
      break;
    case 'reward':
      body = renderReward({ profile, stamps: Storage.getActiveLoyalty().stamps });
      nav = '';
      break;
    case 'profile':
      body = renderProfile({ profile, stampCount, completedCount, editing: profileEditing, errors: extra.errors || {} });
      break;
    case 'collection':
    default:
      body = renderHome({ profile, stampCount, completedCount });
      break;
  }

  appEl.innerHTML = body + nav;
  wireCurrentTab(extra);
}

function goTo(tab, extra = {}) {
  currentTab = tab;
  if (tab !== 'profile') profileEditing = false;
  renderCurrentTab(extra);
}

/* ==========================================================================
   Onboarding wiring
   ========================================================================== */

function wireOnboarding() {
  const form = document.getElementById('onboarding-form');

  form.querySelectorAll('input[name="gender"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.querySelectorAll('.radio-chip').forEach((chip) => chip.classList.remove('is-selected'));
      input.closest('.radio-chip').classList.add('is-selected');
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const gender = String(formData.get('gender') || '').trim();

    const errors = {};
    if (!name || name.length < 2) errors.name = 'Please enter your full name.';
    if (!validatePhone(phone)) errors.phone = 'Please enter a valid 10-digit mobile number.';
    if (!gender) errors.gender = 'Please select an option.';

    if (Object.keys(errors).length > 0) {
      appEl.innerHTML = renderOnboarding({ name, phone, gender }, errors);
      wireOnboarding();
      return;
    }

    Storage.saveProfile({
      name,
      phone: formatPhoneForStorage(phone),
      gender,
    });

    goTo('collection');
  });
}

/* ==========================================================================
   Tab-specific wiring
   ========================================================================== */

function wireCurrentTab(extra) {
  // Bottom nav (not present on reward screen)
  document.getElementById('nav-collection')?.addEventListener('click', () => goTo('collection'));
  document.getElementById('nav-scan')?.addEventListener('click', () => goTo('scanner'));
  document.getElementById('nav-profile')?.addEventListener('click', () => goTo('profile'));

  if (currentTab === 'collection') {
    wireHome();
  } else if (currentTab === 'scanner') {
    wireScanner();
  } else if (currentTab === 'manual') {
    wireManualEntry(extra);
  } else if (currentTab === 'reward') {
    wireReward();
  } else if (currentTab === 'profile') {
    wireProfile();
  }
}

function wireHome() {
  const btn = document.getElementById('btn-unlock-reward');
  btn?.addEventListener('click', () => {
    if (Storage.getStampCount() >= MAX_STAMPS) {
      goTo('reward');
    }
  });
}

function wireScanner() {
  document.getElementById('btn-close-scanner')?.addEventListener('click', () => goTo('collection'));
  document.getElementById('btn-manual-entry')?.addEventListener('click', () => {
    stopScannerIfRunning();
    goTo('manual');
  });

  const videoEl = document.getElementById('scanner-video');
  const canvasEl = document.getElementById('scanner-canvas');
  if (!videoEl || !canvasEl) return;

  currentScanner = new QrScanner({
    videoEl,
    canvasEl,
    onDecode: (data) => {
      stopScannerIfRunning();
      handleCodeSubmission(data, { fromScanner: true });
    },
    onError: (type) => {
      if (type === 'permission') {
        renderCurrentTab({ cameraState: 'denied' });
      } else if (type === 'unsupported' || type === 'library') {
        renderCurrentTab({ cameraState: 'unavailable' });
      }
    },
  });

  currentScanner.start().then((started) => {
    if (started) {
      renderCurrentTab({ cameraState: 'active' });
    }
  });
}

function wireManualEntry(extra) {
  document.getElementById('btn-close-manual')?.addEventListener('click', () => goTo('collection'));

  const form = document.getElementById('manual-entry-form');
  const input = document.getElementById('input-code');

  input?.addEventListener('input', () => {
    const cleaned = normalizeCode(input.value).slice(0, 6);
    input.value = cleaned;
  });

  input?.addEventListener('paste', (e) => {
    e.preventDefault();
    const pasted = (e.clipboardData || window.clipboardData).getData('text');
    input.value = normalizeCode(pasted).slice(0, 6);
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = normalizeCode(input.value);
    handleCodeSubmission(value, { fromScanner: false });
  });
}

function wireReward() {
  document.getElementById('btn-back-from-reward')?.addEventListener('click', () => goTo('collection'));

  document.getElementById('btn-contact-gift')?.addEventListener('click', () => {
    const profile = Storage.getProfile();
    const stamps = Storage.getActiveLoyalty().stamps;
    const codesList = stamps.map((s, i) => `${i + 1}. ${s.code}`).join('\n');

    const message = [
      'Hello Divika Cakes!',
      'A customer has completed their Stampie loyalty card.',
      '',
      `Name: ${profile.name}`,
      `Phone: ${profile.phone}`,
      '',
      'Collected Codes:',
      codesList,
      '',
      'Surprise gift is ready for collection.',
    ].join('\n');

    const url = `https://wa.me/${REWARD_CONTACT}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  });

  document.getElementById('btn-confirm-redemption')?.addEventListener('click', () => {
    Storage.redeemAndReset();

    const overlay = document.createElement('div');
    overlay.innerHTML = renderResetConfirmation();
    document.body.appendChild(overlay.firstElementChild);

    setTimeout(() => {
      document.getElementById('reset-overlay')?.remove();
      goTo('collection');
    }, 1800);
  });
}

function wireProfile() {
  document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
    profileEditing = true;
    renderCurrentTab();
  });

  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    profileEditing = false;
    renderCurrentTab();
  });

  const form = document.getElementById('profile-edit-form');
  form?.querySelectorAll('input[name="gender"]').forEach((input) => {
    input.addEventListener('change', () => {
      form.querySelectorAll('.radio-chip').forEach((chip) => chip.classList.remove('is-selected'));
      input.closest('.radio-chip').classList.add('is-selected');
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const name = String(formData.get('name') || '').trim();
    const phone = String(formData.get('phone') || '').trim();
    const gender = String(formData.get('gender') || Storage.getProfile().gender);

    const errors = {};
    if (!name || name.length < 2) errors.name = 'Please enter your full name.';
    if (!validatePhone(phone)) errors.phone = 'Please enter a valid 10-digit mobile number.';

    if (Object.keys(errors).length > 0) {
      renderCurrentTab({ errors });
      return;
    }

    Storage.saveProfile({ name, phone: formatPhoneForStorage(phone), gender });
    profileEditing = false;
    renderCurrentTab();
    showToast('Profile updated', 'success');
  });
}

/* ==========================================================================
   Code submission (shared by scanner + manual entry)
   ========================================================================== */

async function handleCodeSubmission(rawCode, { fromScanner }) {
  try {
    const { result, code } = await redeemCode(rawCode);

    if (result === ValidationResult.SUCCESS) {
      playCelebration();
      return;
    }

    const msg = messageForResult(result);
    showToast(msg, 'error');

    if (!fromScanner) {
      // Re-render manual entry with the error shown inline, keep value for correction
      renderCurrentTab({ value: code, errorMsg: msg });
    } else {
      // Restart scanner after a short pause so the user can try another code
      setTimeout(() => {
        if (currentTab === 'scanner') wireScanner();
      }, 1500);
    }
  } catch (err) {
    console.error('Stampie: code submission failed', err);
    showToast('Something went wrong. Please try again.', 'error');
  }
}

function playCelebration() {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderCelebration();
  const overlay = wrapper.firstElementChild;
  document.body.appendChild(overlay);

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const delay = prefersReduced ? 900 : 1600;

  setTimeout(() => {
    overlay.remove();
    goTo('collection');

    // Highlight the newly filled stamp briefly (CSS class already applied via render)
    const stampCount = Storage.getStampCount();
    if (stampCount >= MAX_STAMPS) {
      showToast('Your surprise is ready! 🎁', 'success');
    }
  }, delay);
}

/* ==========================================================================
   Boot
   ========================================================================== */

function boot() {
  renderApp();

  // Register service worker for PWA/offline support
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch((err) => {
        console.error('Stampie: service worker registration failed', err);
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', boot);
