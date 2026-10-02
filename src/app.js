/**
 * Stampie - App Controller
 * ---------------------------------------------------------------------------
 * Small hand-rolled router + event wiring. No framework, keeps the project
 * approachable and easy to deploy as a static site.
 */

import { Storage } from './storage.js';
import { redeemCode, normalizeCode, ValidationResult, messageForResult } from './codes.js';
import { MAX_STAMPS, CODE_LENGTH } from './constants.js';
import {
  renderOnboarding,
  renderHome,
  renderManualEntry,
  renderCelebration,
  renderReward,
  renderResetConfirmation,
  renderProfile,
  renderAvatarSheet,
  renderDialog,
  renderBottomNav,
  showToast,
} from './ui.js';

const appEl = document.getElementById('app');

let currentTab = 'collection'; // 'collection' | 'manual' | 'profile' | 'reward'
let profileEditing = false;
let codeHidden = false;
let codeSubmitting = false;

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

function renderApp() {
  if (!Storage.isOnboarded()) {
    appEl.innerHTML = renderOnboarding();
    wireOnboarding();
    return;
  }

  renderCurrentTab();
}

function renderCurrentTab(extra = {}) {
  const profile = Storage.getProfile();
  const stampCount = Storage.getStampCount();
  const completedCount = Storage.getCompletedCount();

  let body = '';
  let nav = renderBottomNav(currentTab === 'profile' ? 'profile' : 'collection');

  switch (currentTab) {
    case 'manual':
      body = renderManualEntry({ ...extra, hidden: codeHidden });
      break;
    case 'reward':
      body = renderReward({ profile, stamps: Storage.getActiveLoyalty().stamps });
      nav = '';
      break;
    case 'profile':
      body = renderProfile({
        profile,
        stampCount,
        completedCount,
        editing: profileEditing,
        errors: extra.errors || {},
        avatar: Storage.getAvatar(),
      });
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
  if (tab === 'manual') {
    codeHidden = false;
    codeSubmitting = false;
  }
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
  document.getElementById('nav-scan')?.addEventListener('click', () => goTo('manual'));
  document.getElementById('nav-profile')?.addEventListener('click', () => goTo('profile'));

  if (currentTab === 'collection') {
    wireHome();
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

/* ==========================================================================
   Manual code entry - OTP boxes + custom keypad
   ========================================================================== */

function wireManualEntry(extra) {
  document.getElementById('btn-close-manual')?.addEventListener('click', () => goTo('collection'));

  const form = document.getElementById('manual-entry-form');
  const hiddenInput = document.getElementById('input-code');
  const otpBoxes = Array.from(document.querySelectorAll('.otp-box'));
  const submitBtn = document.getElementById('btn-submit-code');

  function currentValue() {
    return normalizeCode(hiddenInput.value || '');
  }

  function syncBoxes() {
    const val = currentValue();
    otpBoxes.forEach((box, i) => {
      const ch = val[i];
      box.classList.toggle('is-filled', Boolean(ch));
      box.classList.toggle('is-hidden-char', Boolean(ch) && codeHidden);
      box.innerHTML = ch ? (codeHidden ? '&bull;' : ch) : '';
    });
  }

  function appendChar(ch) {
    if (codeSubmitting) return;
    const val = currentValue();
    if (val.length >= CODE_LENGTH) return;
    hiddenInput.value = val + ch;
    syncBoxes();
  }

  function backspace() {
    if (codeSubmitting) return;
    const val = currentValue();
    if (!val.length) return;
    hiddenInput.value = val.slice(0, -1);
    syncBoxes();
  }

  function shakeAndClear(msg) {
    otpBoxes.forEach((box) => box.classList.add('is-shake'));
    setTimeout(() => otpBoxes.forEach((box) => box.classList.remove('is-shake')), 400);
    if (msg) showToast(msg, 'error');
  }

  // Custom on-screen keypad (independent of system keyboard, works everywhere)
  document.getElementById('keypad')?.addEventListener('click', (e) => {
    const keyBtn = e.target.closest('[data-key]');
    if (keyBtn) {
      appendChar(keyBtn.dataset.key);
      return;
    }
    if (e.target.closest('#keypad-backspace')) {
      backspace();
    }
  });

  // Also allow a physical keyboard (desktop) to type into the OTP boxes
  document.addEventListener('keydown', handlePhysicalKeydown);
  function handlePhysicalKeydown(e) {
    if (currentTab !== 'manual') {
      document.removeEventListener('keydown', handlePhysicalKeydown);
      return;
    }
    if (e.key === 'Backspace') {
      e.preventDefault();
      backspace();
    } else if (/^[a-zA-Z0-9]$/.test(e.key)) {
      e.preventDefault();
      appendChar(e.key.toUpperCase());
    }
  }

  document.getElementById('btn-toggle-visibility')?.addEventListener('click', () => {
    codeHidden = !codeHidden;
    renderCurrentTab({ value: currentValue(), errorMsg: extra.errorMsg || '' });
  });

  otpBoxes.forEach((box) => {
    box.addEventListener('click', () => {
      // Tapping a box focuses the entry flow without opening the system keyboard.
      box.focus?.();
    });
  });

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (codeSubmitting) return; // guards the "gets stuck on click" bug: no duplicate submits

    const value = currentValue();
    if (value.length < CODE_LENGTH) {
      shakeAndClear('Please enter all 6 characters.');
      return;
    }

    codeSubmitting = true;
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking...';
    }

    handleCodeSubmission(value).finally(() => {
      codeSubmitting = false;
    });
  });
}

/* ==========================================================================
   Reward screen wiring
   ========================================================================== */

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

    import('./constants.js').then(({ REWARD_CONTACT }) => {
      const url = `https://wa.me/${REWARD_CONTACT}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank', 'noopener');
    });
  });

  document.getElementById('btn-confirm-redemption')?.addEventListener('click', () => {
    showConfirmDialog({
      icon: 'fa-rotate',
      title: 'Reset your card?',
      message: 'This will confirm your redemption and start a fresh card at 0 stamps.',
      confirmLabel: 'Yes, reset it',
      cancelLabel: 'Not yet',
      onConfirm: () => {
        Storage.redeemAndReset();

        const overlay = document.createElement('div');
        overlay.innerHTML = renderResetConfirmation();
        document.body.appendChild(overlay.firstElementChild);

        setTimeout(() => {
          document.getElementById('reset-overlay')?.remove();
          goTo('collection');
        }, 1800);
      },
    });
  });
}

/* ==========================================================================
   Profile screen wiring
   ========================================================================== */

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

  wireAvatarPicker();
}

/* ==========================================================================
   Profile photo: camera / gallery picker sheet
   ========================================================================== */

function wireAvatarPicker() {
  document.getElementById('btn-edit-avatar')?.addEventListener('click', () => {
    openAvatarSheet();
  });
}

function openAvatarSheet() {
  const hasAvatar = Boolean(Storage.getAvatar());
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderAvatarSheet({ hasAvatar });
  const backdrop = wrapper.firstElementChild;
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => backdrop.classList.add('is-visible'));

  function closeSheet() {
    backdrop.classList.remove('is-visible');
    setTimeout(() => backdrop.remove(), 220);
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) closeSheet();
  });
  document.getElementById('avatar-sheet-cancel')?.addEventListener('click', closeSheet);

  const cameraInput = document.getElementById('avatar-file-camera');
  const galleryInput = document.getElementById('avatar-file-gallery');

  document.getElementById('avatar-option-camera')?.addEventListener('click', () => cameraInput?.click());
  document.getElementById('avatar-option-gallery')?.addEventListener('click', () => galleryInput?.click());

  [cameraInput, galleryInput].forEach((input) => {
    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        showToast('Please choose an image file.', 'error');
        return;
      }
      readAndSaveAvatar(file, closeSheet);
    });
  });

  document.getElementById('avatar-option-remove')?.addEventListener('click', () => {
    closeSheet();
    showConfirmDialog({
      icon: 'fa-trash',
      title: 'Remove photo?',
      message: 'Your profile will go back to showing your initials.',
      confirmLabel: 'Remove',
      cancelLabel: 'Keep it',
      danger: true,
      onConfirm: () => {
        Storage.clearAvatar();
        renderCurrentTab();
        showToast('Profile photo removed', 'success');
      },
    });
  });
}

function readAndSaveAvatar(file, closeSheet) {
  const reader = new FileReader();
  reader.onload = () => {
    const dataUrl = reader.result;
    downscaleImage(dataUrl, 480).then((finalDataUrl) => {
      const ok = Storage.saveAvatar(finalDataUrl);
      closeSheet();
      if (ok) {
        renderCurrentTab();
        showToast('Profile photo updated', 'success');
      } else {
        showToast('That photo was too large. Try a smaller one.', 'error');
      }
    });
  };
  reader.onerror = () => {
    closeSheet();
    showToast('Could not read that photo. Please try again.', 'error');
  };
  reader.readAsDataURL(file);
}

function downscaleImage(dataUrl, maxSize) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxSize || height > maxSize) {
        const scale = maxSize / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

/* ==========================================================================
   Custom confirm dialog (replaces window.confirm)
   ========================================================================== */

function showConfirmDialog({ icon, title, message, confirmLabel, cancelLabel, danger = false, onConfirm }) {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = renderDialog({ icon, title, message, confirmLabel, cancelLabel, danger });
  const backdrop = wrapper.firstElementChild;
  document.body.appendChild(backdrop);

  requestAnimationFrame(() => backdrop.classList.add('is-visible'));

  function close() {
    backdrop.classList.remove('is-visible');
    setTimeout(() => backdrop.remove(), 200);
  }

  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.getElementById('dialog-cancel')?.addEventListener('click', close);
  document.getElementById('dialog-confirm')?.addEventListener('click', () => {
    close();
    onConfirm?.();
  });
}

/* ==========================================================================
   Code submission
   ========================================================================== */

async function handleCodeSubmission(rawCode) {
  try {
    const { result, code } = await redeemCode(rawCode);

    if (result === ValidationResult.SUCCESS) {
      playCelebration();
      return;
    }

    const msg = messageForResult(result);
    showToast(msg, 'error');

    // Re-render with the error shown inline; clear the boxes so the user can retype
    renderCurrentTab({ value: '', errorMsg: msg });
  } catch (err) {
    console.error('Stampie: code submission failed', err);
    showToast('Something went wrong. Please try again.', 'error');
    renderCurrentTab({ value: '', errorMsg: 'Something went wrong. Please try again.' });
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

    const stampCount = Storage.getStampCount();
    if (stampCount >= MAX_STAMPS) {
      showToast('Your surprise is ready!', 'success');
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
