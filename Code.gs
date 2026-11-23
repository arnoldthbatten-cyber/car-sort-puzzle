/**
 * Car Sort - Google Apps Script Web App
 *
 * Server-side handlers for serving the page and persistence.
 */

// --- HTML Stitching ---

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Serves the main HTML page.
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Car Sort Puzzle')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
}

// --- Persistence (localStorage mirror via GAS) ---

/**
 * Saves player progress to UserProperties.
 * Called optionally by the client for cross-device sync.
 */
function saveProgress(payload) {
  var lock = LockService.getUserLock();
  try {
    lock.waitLock(10000);
    PropertiesService.getUserProperties().setProperty('carSort_progress', JSON.stringify(payload));
  } finally {
    lock.releaseLock();
  }
}

/**
 * Retrieves saved progress from UserProperties.
 */
function getProgress() {
  var prop = PropertiesService.getUserProperties().getProperty('carSort_progress');
  return prop ? JSON.parse(prop) : null;
}

// --- Leaderboard ---

/**
 * Submits a score to the leaderboard Sheet.
 * Expected payload: { userHash, level, moves, time }
 */
function submitScore(payload) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return { error: 'Server busy, try again' };
  }

  try {
    var sheet = getLeaderboardSheet_();
    sheet.appendRow([
      new Date(),
      payload.userHash,
      payload.level,
      payload.moves,
      payload.time || 0
    ]);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Fetches leaderboard rows.
 */
function getLeaderboard() {
  var sheet = getLeaderboardSheet_();
  var rows = sheet.getDataRange().getValues();
  // Skip header row, return last 50 entries
  var start = Math.max(0, rows.length - 51);
  return rows.slice(start).slice(1).reverse(); // newest first, skip header
}

/**
 * Returns or creates the leaderboard sheet.
 */
function getLeaderboardSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName('Leaderboard');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Leaderboard');
    sheet.appendRow(['timestamp', 'userHash', 'level', 'moves', 'time']);
  }
  return sheet;
}
