/**
 * Stampie - Code Validation
 * ---------------------------------------------------------------------------
 * Loads valid cake codes from data/codes.json and validates scanned/entered
 * codes against that list and against the customer's already-used codes.
 */

import { Storage } from './storage.js';
import { CODE_LENGTH } from './constants.js';

let validCodesCache = null;
let loadPromise = null;

async function loadValidCodes() {
  if (validCodesCache) return validCodesCache;
  if (loadPromise) return loadPromise;

  loadPromise = fetch('data/codes.json')
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) throw new Error('codes.json is not an array');
      validCodesCache = new Set(
        data
          .filter((c) => typeof c === 'string')
          .map((c) => c.trim().toUpperCase())
      );
      return validCodesCache;
    })
    .catch((err) => {
      console.error('Stampie: failed to load codes.json', err);
      validCodesCache = new Set(); // fail safe: treat as "no valid codes" rather than crash
      return validCodesCache;
    });

  return loadPromise;
}

/** Normalizes raw user input: trims, uppercases, strips whitespace. */
export function normalizeCode(raw) {
  return String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

/** Basic shape check before even hitting the code list. */
export function isWellFormed(code) {
  const re = new RegExp(`^[A-Z0-9]{${CODE_LENGTH}}$`);
  return re.test(code);
}

export const ValidationResult = {
  SUCCESS: 'SUCCESS',
  INVALID_FORMAT: 'INVALID_FORMAT',
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_USED: 'ALREADY_USED',
  CARD_FULL: 'CARD_FULL',
  LOAD_ERROR: 'LOAD_ERROR',
};

/**
 * Validates and (if valid) redeems a code: adds a stamp to the active card.
 * Returns { result, code }. result is one of ValidationResult.
 * This is the single entry point used by manual code entry.
 */
export async function redeemCode(rawCode) {
  const code = normalizeCode(rawCode);

  if (!isWellFormed(code)) {
    return { result: ValidationResult.INVALID_FORMAT, code };
  }

  if (Storage.getStampCount() >= 6) {
    return { result: ValidationResult.CARD_FULL, code };
  }

  let validCodes;
  try {
    validCodes = await loadValidCodes();
  } catch (err) {
    return { result: ValidationResult.LOAD_ERROR, code };
  }

  if (!validCodes.has(code)) {
    return { result: ValidationResult.NOT_FOUND, code };
  }

  if (Storage.isCodeUsed(code)) {
    return { result: ValidationResult.ALREADY_USED, code };
  }

  Storage.addStamp(code);
  return { result: ValidationResult.SUCCESS, code };
}

/** Friendly, non-technical messages for each result. */
export function messageForResult(result) {
  switch (result) {
    case ValidationResult.SUCCESS:
      return 'Stamp added! Thank you for choosing Divika Cakes!';
    case ValidationResult.INVALID_FORMAT:
      return 'That code does not look right. It should be 6 letters or numbers.';
    case ValidationResult.NOT_FOUND:
      return 'We could not find that cake code.';
    case ValidationResult.ALREADY_USED:
      return 'This code has already been used.';
    case ValidationResult.CARD_FULL:
      return 'Your card is already full, unlock your surprise!';
    case ValidationResult.LOAD_ERROR:
    default:
      return 'Something went wrong. Please try again.';
  }
}
