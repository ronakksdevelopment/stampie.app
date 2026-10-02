/**
 * Stampie - Storage Layer
 * ---------------------------------------------------------------------------
 * A single abstraction over LocalStorage so the rest of the app never
 * touches localStorage directly. Keeps the data model documented in one
 * place and makes it easy to swap to IndexedDB later if needed.
 */

const STORAGE_KEY = 'stampie_state_v1';
const AVATAR_STORAGE_KEY = 'stampie_avatar_v1';

const DEFAULT_STATE = {
  profile: {
    name: '',
    phone: '',
    gender: '',
  },
  activeLoyalty: {
    stamps: [],       // array of { code, collectedAt }
    usedCodes: [],     // flat array of code strings, for fast lookup
    startedAt: null,
  },
  history: [
    // { completedAt, codes: [...], customerName, customerPhone }
  ],
  onboarded: false,
};

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function safeParse(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch (err) {
    console.error('Stampie: failed to parse stored state', err);
    return null;
  }
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return deepClone(DEFAULT_STATE);
    const parsed = safeParse(raw);
    if (!parsed) return deepClone(DEFAULT_STATE);

    // Merge with defaults to protect against partially-missing fields
    return {
      ...deepClone(DEFAULT_STATE),
      ...parsed,
      profile: { ...DEFAULT_STATE.profile, ...(parsed.profile || {}) },
      activeLoyalty: { ...DEFAULT_STATE.activeLoyalty, ...(parsed.activeLoyalty || {}) },
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch (err) {
    console.error('Stampie: localStorage unavailable', err);
    return deepClone(DEFAULT_STATE);
  }
}

function persistState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    console.error('Stampie: failed to persist state', err);
    return false;
  }
}

export const Storage = {
  /** Read the full state object (always returns a valid shape). */
  getState() {
    return loadState();
  },

  /** Overwrite the full state object. */
  setState(state) {
    return persistState(state);
  },

  /** Read just the profile. */
  getProfile() {
    return loadState().profile;
  },

  /** Save/update profile fields; keeps other state untouched. */
  saveProfile(profileUpdates) {
    const state = loadState();
    state.profile = { ...state.profile, ...profileUpdates };
    state.onboarded = true;
    persistState(state);
    return state.profile;
  },

  /** Read active loyalty progress. */
  getActiveLoyalty() {
    return loadState().activeLoyalty;
  },

  /** Add a redeemed code + stamp. Caller is responsible for validation. */
  addStamp(code) {
    const state = loadState();
    const now = new Date().toISOString();

    if (!state.activeLoyalty.startedAt) {
      state.activeLoyalty.startedAt = now;
    }
    state.activeLoyalty.stamps.push({ code, collectedAt: now });
    state.activeLoyalty.usedCodes.push(code);

    persistState(state);
    return state.activeLoyalty;
  },

  /** Check whether a code has already been used on the ACTIVE card. */
  isCodeUsed(code) {
    const state = loadState();
    return state.activeLoyalty.usedCodes.includes(code);
  },

  /** Number of stamps collected on the active card. */
  getStampCount() {
    return loadState().activeLoyalty.stamps.length;
  },

  /** Record a completed redemption into history, then reset the active card.
   *  Codes are intentionally NOT stored in history — once entered and
   *  redeemed, codes are fully removed from the app. */
  redeemAndReset() {
    const state = loadState();
    const completedAt = new Date().toISOString();
    const stampCount = state.activeLoyalty.stamps.length;

    state.history.push({
      completedAt,
      stampCount,
      customerName: state.profile.name,
      customerPhone: state.profile.phone,
    });

    state.activeLoyalty = deepClone(DEFAULT_STATE.activeLoyalty);

    persistState(state);
    return state;
  },

  /** How many loyalty cycles the customer has completed. */
  getCompletedCount() {
    return loadState().history.length;
  },

  /** Whether onboarding has been completed. */
  isOnboarded() {
    const state = loadState();
    return Boolean(state.onboarded && state.profile.name && state.profile.phone);
  },

  /** Clear everything (not exposed in UI by default; useful for dev/testing). */
  clearAll() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.localStorage.removeItem(AVATAR_STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('Stampie: failed to clear storage', err);
      return false;
    }
  },

  /** Read the saved profile photo as a data URL, or null if none set. */
  getAvatar() {
    try {
      return window.localStorage.getItem(AVATAR_STORAGE_KEY) || null;
    } catch (err) {
      console.error('Stampie: failed to read avatar', err);
      return null;
    }
  },

  /** Save a profile photo as a data URL. */
  saveAvatar(dataUrl) {
    try {
      window.localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
      return true;
    } catch (err) {
      console.error('Stampie: failed to save avatar (it may be too large)', err);
      return false;
    }
  },

  /** Remove the saved profile photo. */
  clearAvatar() {
    try {
      window.localStorage.removeItem(AVATAR_STORAGE_KEY);
      return true;
    } catch (err) {
      console.error('Stampie: failed to clear avatar', err);
      return false;
    }
  },
};
