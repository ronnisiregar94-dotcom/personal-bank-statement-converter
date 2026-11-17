import { describe, expect, it } from 'vitest';
import { parseMoney, parseStatementText, validateBalance } from './parse';

describe('statement parsing', () => {
  it('parses Indonesian currency separators', () => {
    expect(parseMoney('4.200.026,00')).toBe(4200026);
    expect(parseMoney('1.993.702,46')).toBe(1993702.46);
  });
  it('recognizes CR as credit and DB as debit', () => {
    const rows = parseStatementText(
      '06/08/2025 TRANSFER CR 4.200.026,00 6.193.728,46\n11/08/2025 TARIKAN ATM 2.000.000,00 DB 4.193.728,46',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].credit).toBe(4200026);
    expect(rows[1].debit).toBe(2000000);
  });
  it('recognizes a four-digit CBG code', () => {
    const rows = parseStatementText('06/08/2025 TRSF E-BANKING CR 8780 7.277.440,00 13.471.168,46');
    expect(rows[0].branch).toBe('8780');
    expect(rows[0].credit).toBe(7277440);
    expect(rows[0].balance).toBe(13471168.46);
  });
  it('joins wrapped description lines with the transaction', () => {
    const rows = parseStatementText('06/08/2025 TRANSFER CR\nASURANSI JIWA\n4.200.026,00 6.193.728,46');
    expect(rows).toHaveLength(1);
    expect(rows[0].description).toContain('ASURANSI JIWA');
    expect(rows[0].credit).toBe(4200026);
  });
  it('recognizes opening balance as balance, not a credit', () => {
    const rows = parseStatementText('01/08/2025 SALDO AWAL 1.993.702,46');
    expect(rows[0].balance).toBe(1993702.46);
    expect(rows[0].credit).toBeNull();
  });
  it('checks a balanced statement', () => {
    const rows = parseStatementText('06/08/2025 TRANSFER CR 100,00 1.100,00\n07/08/2025 TARIKAN DB 50,00 1.050,00');
    expect(validateBalance(1000, rows, 1050).ok).toBe(true);
  });
});
