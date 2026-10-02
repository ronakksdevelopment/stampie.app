/**
 * Stampie - Cake Code Generator (developer helper, not shipped to customers)
 * ---------------------------------------------------------------------------
 * Generates random, unambiguous 6-character alphanumeric codes for new cake
 * boxes. Run this with Node.js whenever you need a fresh batch of codes to
 * add to data/codes.json.
 *
 * Usage:
 *   node data/generate-codes.js            -> generates 20 codes
 *   node data/generate-codes.js 100        -> generates 100 codes
 *   node data/generate-codes.js 50 codes.json  -> also merges into a file,
 *                                                  skipping duplicates
 */

// Excludes easily-confused characters: O, 0, I, 1
const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

function generateCode() {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
  }
  return code;
}

function generateUniqueCodes(count, existing = new Set()) {
  const codes = new Set();
  let attempts = 0;
  const maxAttempts = count * 50;

  while (codes.size < count && attempts < maxAttempts) {
    const code = generateCode();
    if (!existing.has(code) && !codes.has(code)) {
      codes.add(code);
    }
    attempts++;
  }

  return Array.from(codes);
}

function main() {
  const args = process.argv.slice(2);
  const count = parseInt(args[0], 10) || 20;
  const mergeFile = args[1];

  if (mergeFile) {
    const fs = require("fs");
    const path = require("path");
    const filePath = path.resolve(mergeFile);
    let existingCodes = [];

    if (fs.existsSync(filePath)) {
      try {
        existingCodes = JSON.parse(fs.readFileSync(filePath, "utf8"));
      } catch (e) {
        console.error("Could not parse existing file, starting fresh.");
      }
    }

    const existingSet = new Set(existingCodes);
    const newCodes = generateUniqueCodes(count, existingSet);
    const merged = [...existingCodes, ...newCodes];

    fs.writeFileSync(filePath, JSON.stringify(merged, null, 2) + "\n");
    console.log(`Added ${newCodes.length} new codes to ${mergeFile}`);
    console.log(`Total codes in file: ${merged.length}`);
    console.log("\nNew codes:");
    newCodes.forEach((c) => console.log(`  ${c}`));
  } else {
    const codes = generateUniqueCodes(count);
    console.log(`Generated ${codes.length} codes:\n`);
    codes.forEach((c) => console.log(c));
    console.log("\nCopy these into data/codes.json (keep it valid JSON).");
  }
}

main();
