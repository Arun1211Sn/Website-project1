/**
 * Contact log for thirupathirealestates.com — Google Apps Script.
 *
 * Receives the events posted by api/track.ts (every call / WhatsApp / form
 * tap) and api/lead.ts (each enquiry form) and appends them to this sheet:
 *
 *   Contacts — one row per tap, with the button or listing used
 *   Leads    — one row per enquiry form (name, phone, service, message)
 *   Summary  — live counts built from the two tabs above
 *
 * Setup (once):
 *   1. Paste this file into Extensions → Apps Script of a new Google Sheet.
 *   2. Set SECRET below to the same value as SHEET_WEBHOOK_SECRET on Vercel.
 *   3. Run `setup` (the first function, so the editor selects it) once from the editor and allow the permissions it asks for.
 *   4. Deploy → New deployment → Web app; Execute as "Me", access "Anyone".
 *      The /exec URL it gives is SHEET_WEBHOOK_URL on Vercel.
 */

const SECRET = 'PASTE_SHEET_WEBHOOK_SECRET_HERE';

const TABS = {
  Contacts: ['Time', 'Type', 'Button / listing', 'Page', 'City', 'Country', 'Device', 'Came from'],
  Leads: ['Time', 'Name', 'Phone', 'Service', 'Message'],
};

/** Run once: creates the tabs, sets India time, and builds the Summary tab. */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Kolkata');
  sheet('Contacts');
  sheet('Leads');

  const sum = ss.getSheetByName('Summary') || ss.insertSheet('Summary', 0);
  sum.clear();
  sum.getRange('A1').setValue('Website contacts').setFontWeight('bold').setFontSize(14);
  sum.getRange('A3:B8').setValues([
    ['Total contacts', '=COUNTA(Contacts!B2:B)'],
    ['WhatsApp taps', '=COUNTIF(Contacts!B2:B,"whatsapp")'],
    ['Call taps', '=COUNTIF(Contacts!B2:B,"call")'],
    ['Enquiry forms sent', '=COUNTIF(Contacts!B2:B,"form")'],
    ['Leads with name & phone', '=COUNTA(Leads!B2:B)'],
    ['Contacts in the last 7 days', '=COUNTIF(Contacts!A2:A,">="&(TODAY()-6))'],
  ]);
  sum.getRange('A3:A8').setFontWeight('bold');

  sum.getRange('D1').setValue('By day').setFontWeight('bold');
  sum.getRange('D2').setFormula(
    '=IFERROR(QUERY(Contacts!A2:B,"select toDate(A), count(A) where A is not null group by toDate(A) pivot B order by toDate(A) desc label toDate(A) \'Day\'",0),"No contacts yet")'
  );
  sum.getRange('D3:D').setNumberFormat('dd mmm yyyy');
  sum.getRange('J1').setValue('By button / listing').setFontWeight('bold');
  sum.getRange('J2').setFormula(
    '=IFERROR(QUERY(Contacts!B2:C,"select C, count(B) where B is not null group by C order by count(B) desc label C \'Button / listing\', count(B) \'Contacts\'",0),"No contacts yet")'
  );
  sum.setColumnWidth(1, 220);
  sum.setColumnWidth(10, 320);

  const blank = ss.getSheetByName('Sheet1');
  if (blank && blank.getLastRow() === 0) ss.deleteSheet(blank);
}

function doPost(e) {
  let data = {};
  try {
    data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return reply({ ok: false });
  }
  if (data.secret !== SECRET) return reply({ ok: false });

  const now = new Date();
  if (data.kind === 'lead') {
    append('Leads', [now, data.name, data.phone, data.service, data.message]);
  } else if (data.kind === 'contact') {
    append('Contacts', [now, data.type, data.source, data.page, data.city, data.country, data.device, data.referrer]);
  }
  return reply({ ok: true });
}

function append(tab, row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet(tab).appendRow(row.map(clean));
  } finally {
    lock.releaseLock();
  }
}

// Visitors type the lead fields, so anything that Sheets would read as a
// formula (=, +, -, @) is forced to plain text. This also keeps "+91…" phone
// numbers intact.
function clean(value) {
  if (value instanceof Date) return value;
  const text = value == null ? '' : String(value).slice(0, 5000);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function sheet(tab) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(tab);
  if (!sh) {
    sh = ss.insertSheet(tab);
    sh.appendRow(TABS[tab]);
    sh.getRange(1, 1, 1, TABS[tab].length).setFontWeight('bold').setBackground('#f3df3c');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('dd mmm yyyy, h:mm am/pm');
  }
  return sh;
}

function reply(body) {
  return ContentService.createTextOutput(JSON.stringify(body)).setMimeType(ContentService.MimeType.JSON);
}
