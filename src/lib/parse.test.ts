import { describe, expect, it } from 'vitest';
import { detectBank, parseMoney, parseStatementText, validateBalance } from './parse';

describe('money parsing', () => {
  it('parses Indonesian and international separators', () => {
    expect(parseMoney('4.200.026,00')).toBe(4200026);
    expect(parseMoney('1.993.702,46')).toBe(1993702.46);
    expect(parseMoney('1,234.56')).toBe(1234.56);
    expect(parseMoney('(250.000,00)')).toBe(-250000);
  });
});
describe('bank detection and transaction parsing', () => {
  it.each([
    ['REKENING TAHAPAN BANK CENTRAL ASIA', 'BCA'],
    ['BANK RAKYAT INDONESIA BRI', 'BRI'],
    ['BANK NEGARA INDONESIA BNI', 'BNI'],
    ['BANK MANDIRI', 'MANDIRI'],
    ['BANK SYARIAH INDONESIA', 'BSI'],
  ] as const)('detects bank from header', (header, expected) => expect(detectBank(header)).toBe(expected));
  it('recognizes CR and DB markers', () => {
    const rows = parseStatementText('06/08/2025 TRANSFER CR 4.200.026,00 6.193.728,46\n11/08/2025 TARIKAN ATM 2.000.000,00 DB 4.193.728,46');
    expect(rows).toHaveLength(2); expect(rows[0].credit).toBe(4200026); expect(rows[1].debit).toBe(2000000);
  });
  it('recognizes a four-digit CBG code', () => {
    const rows = parseStatementText('06/08/2025 TRSF E-BANKING CR 8780 7.277.440,00 13.471.168,46');
    expect(rows[0].branch).toBe('8780'); expect(rows[0].credit).toBe(7277440); expect(rows[0].balance).toBe(13471168.46);
  });
  it('joins wrapped description lines', () => {
    const rows = parseStatementText('06/08/2025 TRANSFER CR\nASURANSI JIWA\n4.200.026,00 6.193.728,46');
    expect(rows).toHaveLength(1); expect(rows[0].description).toContain('ASURANSI JIWA'); expect(rows[0].credit).toBe(4200026);
  });
  it('recognizes opening balance', () => {
    const rows = parseStatementText('01/08/2025 SALDO AWAL 1.993.702,46');
    expect(rows[0].balance).toBe(1993702.46); expect(rows[0].credit).toBeNull();
  });
  it('supports written month names and Indonesian direction words', () => {
    const rows = parseStatementText('06 AGU 2025 SETORAN TUNAI 500.000,00 1.500.000,00', 'BRI');
    expect(rows).toHaveLength(1); expect(rows[0].credit).toBe(500000); expect(rows[0].date).toBe('06 AGU 2025');
  });
  it('checks a balanced statement', () => {
    const rows = parseStatementText('06/08/2025 TRANSFER CR 100,00 1.100,00\n07/08/2025 TARIKAN DB 50,00 1.050,00');
    expect(validateBalance(1000, rows, 1050).ok).toBe(true);
  });

  it('parses BCA-style US separators without mistaking references for amounts', () => {
    const rows = parseStatementText([
      '06/08/2025 TRSF E-BANKING CR 11/08/ACSY/0000100 25080500287215 8780 7,277,440.00 13,471,168.46',
      '11/08/2025 TARIKAN ATM 11/08 2,000,000.00 DB',
      '11/08/2025 TRSF E-BANKING DB 11/08/7ZEI/00000 11,000,000.00 DB 471,168.46',
    ].join('\n'), 'BCA');
    expect(rows).toHaveLength(3);
    expect(rows[0].branch).toBe('8780');
    expect(rows[0].credit).toBe(7277440);
    expect(rows[0].balance).toBe(13471168.46);
    expect(rows[1].debit).toBe(2000000);
    expect(rows[1].balance).toBeNull();
    expect(rows[2].debit).toBe(11000000);
    expect(rows[2].balance).toBe(471168.46);
  });

  it('parses visible BCA August statement entries and reconciles the clearly marked movements', () => {
    const rows = parseStatementText([
      '01/08 SALDO AWAL 1,993,702.46',
      '06/08 SWITCHING CR TRANSFER DR 536 ASURANSI JIWA MANU /KPO BCA SYA 4,200,026.00 6,193,728.46',
      '06/08 TRSF E-BANKING CR 0608/ACSCY/0000100 25080500287215 8780 7,277,440.00 13,471,168.46',
      '11/08 TARIKAN ATM 11/08 2,000,000.00 DB',
      '11/08 TRSF E-BANKING DB 11/08/7ZEI/00000 ISABELA KOSASIH 11,000,000.00 DB 471,168.46',
      '14/08 KRO OTOMATIS LLG-CITIBANK PT A.J. MANULIFE 0938 500,000.00',
    ].join('\n'), 'BCA');
    expect(rows).toHaveLength(6);
    expect(rows[0].balance).toBe(1993702.46);
    expect(rows[1].credit).toBe(4200026);
    expect(rows[2].branch).toBe('8780');
    expect(rows[2].credit).toBe(7277440);
    expect(rows[3].debit).toBe(2000000);
    expect(rows[4].debit).toBe(11000000);
    expect(rows[4].balance).toBe(471168.46);
    expect(rows[5].confidence).toBe('review');
    expect(validateBalance(1993702.46, rows.slice(1, 5), 471168.46).ok).toBe(true);
  });

});
