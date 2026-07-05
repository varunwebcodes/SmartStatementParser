import { smartJoin } from './wordlist.js';

export const STANDARD_HEADERS = [
  'Date',
  'Narration',
  'Chq./Ref.No.',
  'Value Dt',
  'Withdrawal Amt.',
  'Deposit Amt.',
  'Closing Balance',
];

const DATE_RE = /^\d{2}\/\d{2}\/\d{2,4}$/;
const AMOUNT_RE = /^-?\d{1,3}(,\d{2,3})*(\.\d{1,2})?$/;
const REF_RE = /^(?=.*\d)[A-Z0-9]{6,}$/i;

function cleanOcrText(str) {
  return str
    .replace(/[|\[\]{}~`^]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function parseAmount(str) {
  if (!str) return null;
  const n = parseFloat(str.replace(/,/g, ''));
  return Number.isNaN(n) ? null : n;
}

export function normalizeStructuredRows(rows) {
  let headerIdx = -1;
  let colMap = {};

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map((c) => (c || '').toString().trim().toLowerCase());
    const dateCol = row.findIndex((c) => c === 'date');
    const narrationCol = row.findIndex((c) => c.startsWith('narration'));
    if (dateCol !== -1 && narrationCol !== -1) {
      headerIdx = i;
      row.forEach((cellText, colIdx) => {
        if (!cellText) return;
        if (cellText === 'date') colMap.date = colIdx;
        else if (cellText.startsWith('narration')) colMap.narration = colIdx;
        else if (cellText.includes('chq') || cellText.includes('ref')) colMap.ref = colIdx;
        else if (cellText.includes('value')) colMap.valueDt = colIdx;
        else if (cellText.includes('withdrawal')) colMap.withdrawal = colIdx;
        else if (cellText.includes('deposit')) colMap.deposit = colIdx;
        else if (cellText.includes('closing') || cellText.includes('balance')) colMap.balance = colIdx;
      });
      break;
    }
  }

  if (headerIdx === -1) {
    throw new Error(
      'Could not find a header row containing "Date" and "Narration" columns. ' +
        'Check that the file has those column names, or use the raw-text (OCR) mode.'
    );
  }

  const dataRows = rows.slice(headerIdx + 1);
  const result = [];

  for (const raw of dataRows) {
    const get = (key) =>
      colMap[key] !== undefined ? cleanOcrText((raw[colMap[key]] || '').toString()) : '';

    const dateVal = get('date');
    const narrationVal = get('narration');

    if (!dateVal && !narrationVal && !get('ref') && !get('valueDt') && !get('withdrawal') && !get('deposit') && !get('balance')) {
      continue;
    }

    const looksLikeNewRecord = DATE_RE.test(dateVal) || dateVal.length > 0;

    if (looksLikeNewRecord || result.length === 0) {
      result.push({
        Date: dateVal,
        Narration: narrationVal,
        'Chq./Ref.No.': get('ref'),
        'Value Dt': get('valueDt'),
        'Withdrawal Amt.': get('withdrawal'),
        'Deposit Amt.': get('deposit'),
        'Closing Balance': get('balance'),
      });
    } else {
      const prev = result[result.length - 1];
      prev.Narration = smartJoin(prev.Narration, narrationVal);
      ['Chq./Ref.No.', 'Value Dt', 'Withdrawal Amt.', 'Deposit Amt.', 'Closing Balance'].forEach((key, idx) => {
        const keys = ['ref', 'valueDt', 'withdrawal', 'deposit', 'balance'];
        const v = get(keys[idx]);
        if (v && !prev[key]) prev[key] = v;
      });
    }
  }

  result.forEach((r) => {
    r.Narration = cleanOcrText(r.Narration);
  });

  return result;
}

export function normalizeOcrLines(rawLines) {
  const lines = rawLines.map(cleanOcrText).filter(Boolean);
  const result = [];
  let current = null;

  const flush = () => {
    if (current) {
      current.Narration = cleanOcrText(current.Narration);
      result.push(current);
      current = null;
    }
  };

  for (const line of lines) {
    const startsWithDate = DATE_RE.test(line.split(/\s+/)[0]);

    if (startsWithDate) {
      flush();
      const tokens = line.split(/\s+/);
      const date = tokens[0];
      const rest = tokens.slice(1);

      let valueDt = '';
      let ref = '';
      const trailingAmounts = [];
      let narrationTokens = [...rest];

      while (narrationTokens.length && AMOUNT_RE.test(narrationTokens[narrationTokens.length - 1])) {
        trailingAmounts.unshift(narrationTokens.pop());
      }
      if (narrationTokens.length && DATE_RE.test(narrationTokens[narrationTokens.length - 1])) {
        valueDt = narrationTokens.pop();
      }
      const refIdx = narrationTokens.findIndex((t) => REF_RE.test(t));
      if (refIdx !== -1) {
        ref = narrationTokens[refIdx];
        narrationTokens.splice(refIdx, 1);
      }

      let withdrawal = '';
      let deposit = '';
      const balance = trailingAmounts[trailingAmounts.length - 1] || '';

      if (trailingAmounts.length >= 3) {
        withdrawal = trailingAmounts[trailingAmounts.length - 3];
        deposit = trailingAmounts[trailingAmounts.length - 2];
      } else if (trailingAmounts.length === 2) {
        const amount = trailingAmounts[0];
        const amountNum = parseAmount(amount);
        const prevBalance = result.length ? parseAmount(result[result.length - 1]['Closing Balance']) : null;
        const curBalance = parseAmount(balance);

        let isDeposit = true;
        if (prevBalance !== null && curBalance !== null) {
          isDeposit = curBalance >= prevBalance;
        } else {
          const joined = narrationTokens.join(' ');
          if (/\bDR\b/i.test(joined)) isDeposit = false;
          else if (/\bCR\b/i.test(joined)) isDeposit = true;
        }

        if (isDeposit) deposit = amount;
        else withdrawal = amount;
      }

      current = {
        Date: date,
        Narration: narrationTokens.join(' '),
        'Chq./Ref.No.': ref,
        'Value Dt': valueDt,
        'Withdrawal Amt.': withdrawal,
        'Deposit Amt.': deposit,
        'Closing Balance': balance,
      };
    } else if (current) {
      const refOnly = REF_RE.test(line) && !AMOUNT_RE.test(line);
      if (refOnly && !current['Chq./Ref.No.']) {
        current['Chq./Ref.No.'] = line;
      } else {
        current.Narration = smartJoin(current.Narration, line);
      }
    }
  }
  flush();

  return result;
}

export function normalizeAny(data) {
  if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
    return normalizeStructuredRows(data);
  }
  return normalizeOcrLines(data);
}