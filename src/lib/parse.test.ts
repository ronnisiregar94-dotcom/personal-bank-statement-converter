import { describe, expect, it } from 'vitest';
import { parseStatementText, validateBalance } from './parse';

describe('statement parsing',()=>{
 it('recognizes CR as credit and DB as debit',()=>{
  const rows=parseStatementText('06/08/2025 TRANSFER CR 4.200.026,00 6.193.728,46\\n11/08/2025 TARIKAN ATM DB 2.000.000,00 4.193.728,46');
  expect(rows).toHaveLength(2);
  expect(rows[0].credit).toBe(4200026);
  expect(rows[1].debit).toBe(2000000);
 });
 it('checks a balanced statement',()=>{
  const rows=parseStatementText('06/08/2025 TRANSFER CR 100,00 1.100,00\\n07/08/2025 TARIKAN DB 50,00 1.050,00');
  expect(validateBalance(1000,rows,1050).ok).toBe(true);
 });
});
