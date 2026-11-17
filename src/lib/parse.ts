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
    const matches = [...rest.matchAll(amountPattern)];
    if (!matches.length) return [];

    const marker = /\b(DB|DEBIT|CR|CREDIT)\b/i.exec(rest)?.[1]?.toUpperCase();
    const tokens = matches.map(match => match[0]);
    const values = tokens.map(parseMoney);
    const isOpening = /\bSALDO\s+AWAL\b/i.test(rest);
    const isDebit = marker === 'DB' || marker === 'DEBIT';
    const isCredit = marker === 'CR' || marker === 'CREDIT';
    const hasBranch = tokens.length >= 3 && /^\d{4}$/.test(tokens[0]);
    const branch = hasBranch ? tokens[0] : '';
    const monetaryValues = hasBranch ? values.slice(1) : values;
    const hasBalance = monetaryValues.length >= 2;
    const transactionAmount = hasBalance
      ? monetaryValues[monetaryValues.length - 2]
      : monetaryValues[0];
    const balance = isOpening
      ? monetaryValues[monetaryValues.length - 1]
      : hasBalance ? monetaryValues[monetaryValues.length - 1] : null;

    const description = rest
      .replace(amountPattern, ' ')
      .replace(/\b(DB|DEBIT|CR|CREDIT)\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return [{
      id: crypto.randomUUID(),
      date,
      description: description || 'Perlu diperiksa',
      branch,
      debit: !isOpening && isDebit ? transactionAmount : null,
      credit: !isOpening && isCredit ? transactionAmount : null,
      balance,
      confidence: (isOpening || (marker && hasBalance)) ? 'high' : 'review',
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
