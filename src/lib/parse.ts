import type { Transaction } from '../types';

export type BankCode = 'BCA' | 'BRI' | 'BNI' | 'MANDIRI' | 'BSI' | 'OTHER';
export const BANK_OPTIONS: { value: BankCode; label: string }[] = [
  { value: 'BCA', label: 'BCA' }, { value: 'BRI', label: 'BRI' },
  { value: 'BNI', label: 'BNI' }, { value: 'MANDIRI', label: 'Bank Mandiri' },
  { value: 'BSI', label: 'Bank Syariah Indonesia' }, { value: 'OTHER', label: 'Lainnya' },
];
const datePrefix = /^(?:\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{2,4})\b/i;
const amountPattern = /(?:\(?-?(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2}|[.]\d{2})?\)?)/g;

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
    const hasBranch = tokens.length >= 3 && /^\d{4}$/.test(tokens[0]);
    const branch = hasBranch ? tokens[0] : '';
    const amounts = hasBranch ? values.slice(1) : values;
    const hasBalance = amounts.length >= 2;
    const amount = hasBalance ? amounts[amounts.length - 2] : amounts[0];
    const balance = amounts.length ? amounts[amounts.length - 1] : null;
    const description = rest.replace(amountPattern, ' ').replace(/\b(DB|DEBIT|DR|CR|CREDIT|KREDIT)\b/ig, ' ').replace(/\s+/g, ' ').trim();
    return [{
      id: crypto.randomUUID(), date, description: description || 'Perlu diperiksa', branch,
      debit: !isOpening && direction === 'debit' ? amount : null,
      credit: !isOpening && direction === 'credit' ? amount : null,
      balance: isOpening || hasBalance ? balance : null,
      confidence: (isOpening || (direction && hasBalance)) ? 'high' : 'review',
    } satisfies Transaction];
  });
}

export function validateBalance(opening: number, rows: Transaction[], closing?: number): { calculated: number; closing: number | null; difference: number | null; ok: boolean } {
  const calculated = rows.reduce((value, row) => value + (row.credit ?? 0) - (row.debit ?? 0), opening);
  const actual = closing ?? [...rows].reverse().find(row => row.balance !== null)?.balance ?? null;
  return { calculated, closing: actual, difference: actual === null ? null : calculated - actual, ok: actual === null || Math.abs(calculated - actual) < 0.011 };
}

export const formatIDR = (value: number | null) => value === null ? '' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
