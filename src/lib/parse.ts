import type { Transaction } from '../types';

const money = (raw: string): number | null => {
  const s = raw.replace(/[^0-9,.-]/g, '').trim();
  if (!s) return null;
  // Indonesian statement convention: dot thousands, comma decimals.
  const normalized = s.includes(',') ? s.replace(/\\./g, '').replace(',', '.') : s.replace(/\\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
};
const amountPattern = /(?:\\d{1,3}(?:\\.\\d{3})+|\\d+)(?:,\\d{2})?/g;

export function parseStatementText(text: string): Transaction[] {
  const lines = text.split(/\\r?\\n/).map(x => x.trim()).filter(Boolean);
  const out: Transaction[] = [];
  for (const line of lines) {
    const dm = line.match(/^(\\d{1,2}[\\/-]\\d{1,2}(?:[\\/-]\\d{2,4})?)/);
    if (!dm) continue;
    const rest = line.slice(dm[0].length).trim();
    const amounts = [...rest.matchAll(amountPattern)];
    if (!amounts.length) continue;
    const nums = amounts.map(m => money(m[0]));
    const marker = /\\b(DB|DEBIT|CR|CREDIT)\\b/i.exec(rest)?.[1]?.toUpperCase();
    const last = nums[nums.length - 1] ?? null;
    const amount = nums.length > 1 ? nums[nums.length - 2] : nums[0];
    const desc = rest.replace(amountPattern, ' ').replace(/\\b(DB|DEBIT|CR|CREDIT)\\b/ig, ' ').replace(/\\s+/g, ' ').trim();
    const isDebit = marker === 'DB' || marker === 'DEBIT';
    const isCredit = marker === 'CR' || marker === 'CREDIT';
    out.push({id:crypto.randomUUID(),date:dm[0],description:desc || 'Perlu diperiksa',branch:'',debit:isDebit?amount:null,credit:isCredit?amount:null,balance:nums.length>1?last:null,confidence:marker?'high':'review'});
  }
  return out;
}

export function validateBalance(opening: number, rows: Transaction[], closing?: number): { calculated:number; closing:number|null; difference:number|null; ok:boolean } {
 const calculated = rows.reduce((v,r)=>v+(r.credit??0)-(r.debit??0),opening);
 const actual = closing ?? [...rows].reverse().find(r=>r.balance!==null)?.balance ?? null;
 return {calculated,closing:actual,difference:actual===null?null:calculated-actual,ok:actual===null||Math.abs(calculated-actual)<0.011};
}
export const formatIDR = (n:number|null) => n===null?'':new Intl.NumberFormat('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
