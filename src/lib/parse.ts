import type { Transaction } from '../types';

const amountPattern = /(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d{2})?/g;

export function parseMoney(raw: string): number | null {
  const value = raw.replace(/[^0-9,.-]/g, '').trim();
  if (!value) return null;
  const normalized = value.includes(',')
    ? value.replace(/\./g, '').replace(',', '.')
    : value.replace(/\./g, '');
  const result = Number(normalized);
  return Number.isFinite(result) ? result : null;
}

export function parseStatementText(text: string): Transaction[] {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const grouped: string[] = [];
  for (const line of lines) {
    if (/^\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?\b/.test(line)) grouped.push(line);
    else if (grouped.length) grouped[grouped.length - 1] += ' ' + line;
  }

  return grouped.flatMap(line => {
    const dateMatch = line.match(/^(\d{1,2}[\/-]\d{1,2}(?:[\/-]\d{2,4})?)\s*(.*)$/);
    if (!dateMatch) return [];
    const [, date, rest] = dateMatch;
    const amounts = [...rest.matchAll(amountPattern)];
    if (!amounts.length) return [];

    const marker = /\b(DB|DEBIT|CR|CREDIT)\b/i.exec(rest)?.[1]?.toUpperCase();
    const values = amounts.map(match => parseMoney(match[0]));
    const hasBalance = values.length >= 2;
    const transactionAmount = hasBalance ? values[values.length - 2] : values[0];
    const balance = hasBalance ? values[values.length - 1] : null;
    const description = rest
      .replace(amountPattern, ' ')
      .replace(/\b(DB|DEBIT|CR|CREDIT)\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const isDebit = marker === 'DB' || marker === 'DEBIT';
    const isCredit = marker === 'CR' || marker === 'CREDIT';

    return [{
      id: crypto.randomUUID(),
      date,
      description: description || 'Perlu diperiksa',
      branch: '',
      debit: isDebit ? transactionAmount : null,
      credit: isCredit ? transactionAmount : null,
      balance,
      confidence: marker && hasBalance ? 'high' : 'review',
    } satisfies Transaction];
  });
}

export function validateBalance(
  opening: number,
  rows: Transaction[],
  closing?: number,
): { calculated: number; closing: number | null; difference: number | null; ok: boolean } {
  const calculated = rows.reduce((value, row) => value + (row.credit ?? 0) - (row.debit ?? 0), opening);
  const actual = closing ?? [...rows].reverse().find(row => row.balance !== null)?.balance ?? null;
  return {
    calculated,
    closing: actual,
    difference: actual === null ? null : calculated - actual,
    ok: actual === null || Math.abs(calculated - actual) < 0.011,
  };
}

export const formatIDR = (value: number | null) =>
  value === null ? '' : new Intl.NumberFormat('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
