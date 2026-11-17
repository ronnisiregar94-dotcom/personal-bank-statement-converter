import type { Transaction } from '../types';

export type BankCode = 'BCA' | 'BRI' | 'BNI' | 'MANDIRI' | 'BSI' | 'OTHER';
export const BANK_OPTIONS: { value: BankCode; label: string }[] = [
  { value: 'BCA', label: 'BCA' }, { value: 'BRI', label: 'BRI' },
  { value: 'BNI', label: 'BNI' }, { value: 'MANDIRI', label: 'Bank Mandiri' },
  { value: 'BSI', label: 'Bank Syariah Indonesia' }, { value: 'OTHER', label: 'Lainnya' },
];
const datePrefix = /^(?:\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/i;
const amountPattern = /(?:\(?-?(?:\d{1,3}(?:[.,]\d{3})+|\d+)[.,]\d{2}\)?)/g;

export function parseMoney(raw: string): number | null {
  let value = raw.replace(/[^\d,.-]/g, '').trim();
  if (!value || !/\d/.test(value)) return null;
  const negative = value.startsWith('-') || (raw.includes('(') && raw.includes(')'));
  value = value.replace(/-/g, '');
  const comma = value.lastIndexOf(',');
  const dot = value.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  else if (comma >= 0) value = value.length - comma - 1 === 2 ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  else if (dot >= 0) value = value.length - dot - 1 === 2 ? value.replace(/,/g, '') : value.replace(/\./g, '');
  const result = Number(value);
  return Number.isFinite(result) ? (negative ? -Math.abs(result) : result) : null;
}

export function detectBank(text: string): BankCode | null {
  const value = text.toUpperCase();
  if (/BANK SYARIAH INDONESIA|\bBSI\b/.test(value)) return 'BSI';
  if (/BANK CENTRAL ASIA|\bBCA\b/.test(value)) return 'BCA';
  if (/BANK RAKYAT INDONESIA|\bBRI\b/.test(value)) return 'BRI';
  if (/BANK NEGARA INDONESIA|\bBNI\b/.test(value)) return 'BNI';
  if (/BANK MANDIRI|\bMANDIRI\b/.test(value)) return 'MANDIRI';
  return null;
}

function directionOf(rest: string): 'debit' | 'credit' | null {
  const marker = /\b(DB|DEBIT|DR|CR|CREDIT|KREDIT)\b/i.exec(rest)?.[1]?.toUpperCase();
  if (marker === 'DB' || marker === 'DEBIT' || marker === 'DR') return 'debit';
  if (marker === 'CR' || marker === 'CREDIT' || marker === 'KREDIT') return 'credit';
  if (/\b(TARIKAN|PENARIKAN|BIAYA ADMIN|BIAYA ADM|BIAYA TRANSFER|PEMBAYARAN)\b/i.test(rest)) return 'debit';
  if (/\b(SETORAN|PENERIMAAN|BUNGA)\b/i.test(rest)) return 'credit';
  return null;
}

export function parseStatementText(text: string, _bank: BankCode = 'OTHER'): Transaction[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const grouped: string[] = [];
  for (const line of lines) {
    if (datePrefix.test(line)) grouped.push(line);
    else if (grouped.length) grouped[grouped.length - 1] += ' ' + line;
  }
  return grouped.flatMap(line => {
    const match = line.match(/^((?:\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4}))\s*(.*)$/i);
    if (!match) return [];
    const [, date, rest] = match;
    const tokens = [...rest.matchAll(amountPattern)].map(item => item[0]);
    if (!tokens.length) return [];
    const values = tokens.map(parseMoney);
    const isOpening = /\b(SALDO\s+AWAL|OPENING\s+BALANCE)\b/i.test(rest);
    const direction = directionOf(rest);
    // In BCA statements the four-digit CBG code sits immediately before the first formatted amount.
    // Extract it from the text rather than treating numeric references as monetary values.
    const firstAmountIndex = rest.search(amountPattern);
    const branchMatch = firstAmountIndex >= 0 ? rest.slice(0, firstAmountIndex).match(/\b(\d{4})\s*$/) : null;
    const branch = branchMatch?.[1] ?? '';
    const amounts = values;
    const hasBalance = amounts.length >= 2;
    const amount = hasBalance ? amounts[amounts.length - 2] : amounts[0];
    const balance = amounts.length ? amounts[amounts.length - 1] : null;
    const description = rest.replace(amountPattern, ' ').replace(branch ? new RegExp('\\b' + branch + '\\b') : /$^/, ' ').replace(/\b(DB|DEBIT|DR|CR|CREDIT|KREDIT)\b/ig, ' ').replace(/\s+/g, ' ').trim();
    return [{
      id: crypto.randomUUID(), date, description: description || 'Perlu diperiksa', branch,
      debit: !isOpening && direction === 'debit' ? amount : null,
      credit: !isOpening && direction === 'credit' ? amount : null,
      balance: isOpening || hasBalance ? balance : null,
      confidence: (isOpening || (direction && hasBalance)) ? 'high' : 'review',
    } satisfies Transaction];
  });
}


export type StatementMetadata = {
  bank: BankCode | null;
  account: string;
  period: string;
  openingBalance: number | null;
  closingBalance: number | null;
};

const MONTHS: Record<string, string> = {
  JANUARI: 'Januari', JAN: 'Januari', FEBRUARI: 'Februari', FEB: 'Februari',
  MARET: 'Maret', MAR: 'Maret', APRIL: 'April', APR: 'April',
  MEI: 'Mei', JUNI: 'Juni', JUN: 'Juni', JULI: 'Juli', JUL: 'Juli',
  AGUSTUS: 'Agustus', AGU: 'Agustus', AUGUST: 'Agustus', AUG: 'Agustus',
  SEPTEMBER: 'September', SEP: 'September', OKTOBER: 'Oktober', OKT: 'Oktober', OCT: 'Oktober',
  NOVEMBER: 'November', NOV: 'November', DESEMBER: 'Desember', DES: 'Desember', DECEMBER: 'Desember', DEC: 'Desember',
};

function normalizePeriod(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
  const match = cleaned.match(/\b(JANUARI|JAN|FEBRUARI|FEB|MARET|MAR|APRIL|APR|MEI|JUNI|JUN|JULI|JUL|AGUSTUS|AGU|AUGUST|AUG|SEPTEMBER|SEP|OKTOBER|OKT|OCT|NOVEMBER|NOV|DESEMBER|DES|DECEMBER|DEC)\s+(20\d{2})\b/);
  return match ? MONTHS[match[1]] + ' ' + match[2] : '';
}

export function extractStatementMetadata(text: string, rows: Transaction[] = []): StatementMetadata {
  const normalized = text.replace(/\r/g, '\n');
  const accountMatch =
    normalized.match(/(?:NO\.?\s*REKENING|NOMOR\s*REKENING|ACCOUNT\s*NUMBER|A\/C\s*NO\.?)\s*[:：]?\s*([0-9][0-9\s-]{5,24})/i);
  const account = accountMatch?.[1]?.replace(/\D/g, '').slice(0, 20) ?? '';
  const periodMatch = normalized.match(/(?:PERIODE|PERIOD|STATEMENT\s*PERIOD)\s*[:：]?\s*([A-ZÀ-ÿ0-9 ]{3,30})/i);
  const period = periodMatch ? normalizePeriod(periodMatch[1]) : normalizePeriod(normalized);
  const openingRow = rows.find(row => /SALDO\s+AWAL|OPENING\s+BALANCE/i.test(row.description));
  const balances = rows.filter(row => row.balance !== null);
  const closingBalance = balances.length ? balances[balances.length - 1].balance : null;
  return {
    bank: detectBank(normalized),
    account,
    period,
    openingBalance: openingRow?.balance ?? null,
    closingBalance,
  };
}


export function calculateRunningBalances(rows: Transaction[], openingInput: string | number | null): Transaction[] {
  const opening = typeof openingInput === 'number'
    ? openingInput
    : openingInput === null || openingInput.trim() === '' ? null : parseMoney(openingInput);
  let running = opening;
  return rows.map(row => {
    const isOpening = /SALDO\s+AWAL|OPENING\s+BALANCE/i.test(row.description);
    if (isOpening) {
      if (row.balance !== null) running = row.balance;
      else if (running !== null) return { ...row, balance: running };
      return row;
    }
    if (row.debit !== null || row.credit !== null) {
      if (running !== null) {
        const calculated = running + (row.credit ?? 0) - (row.debit ?? 0);
        if (row.balance === null) {
          running = calculated;
          return { ...row, balance: calculated };
        }
        // Keep the statement's printed balance as source evidence; use it as the
        // starting point for the next row even when it differs from the calculation.
        running = row.balance;
        return row;
      }
      return row;
    }
    if (row.balance !== null) running = row.balance;
    return row;
  });
}

export function validateBalance(opening: number, rows: Transaction[], closing?: number): { calculated: number; closing: number | null; difference: number | null; ok: boolean } {
  const calculated = rows.reduce((value, row) => value + (row.credit ?? 0) - (row.debit ?? 0), opening);
  const actual = closing ?? [...rows].reverse().find(row => row.balance !== null)?.balance ?? null;
  return { calculated, closing: actual, difference: actual === null ? null : calculated - actual, ok: actual === null || Math.abs(calculated - actual) < 0.011 };
}

export const formatIDR = (value: number | null) => value === null ? '' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
