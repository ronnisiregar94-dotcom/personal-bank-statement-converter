import ExcelJS from 'exceljs';
import type { Transaction } from '../types';
export async function exportWorkbook(rows:Transaction[], meta:{bank:string;account:string;period:string}) {
 const wb=new ExcelJS.Workbook(); wb.creator='Personal Statement Converter'; wb.created=new Date();
 const ws=wb.addWorksheet('Rekening Koran',{views:[{state:'frozen',ySplit:5}]});
 ws.mergeCells('A1:H1'); ws.getCell('A1').value='REKENING KORAN — HASIL KONVERSI'; ws.getCell('A1').font={bold:true,size:16,color:{argb:'FFFFFFFF'}}; ws.getCell('A1').fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF0B6B55'}};
 ws.addRow(['Bank',meta.bank,'','','Nomor rekening',meta.account,'']); ws.addRow(['Periode',meta.period]); ws.addRow([]);
 const header=ws.addRow(['No','Tanggal','Keterangan','CBG','Debit (Rp)','Kredit (Rp)','Mutasi belum terklasifikasi (Rp)','Saldo (Rp)']); header.font={bold:true,color:{argb:'FFFFFFFF'}}; header.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF164E43'}};
 rows.forEach((r,i)=>{const row=ws.addRow([i+1,r.date,r.description,r.branch,r.debit,r.credit,r.amount??null,r.balance]); row.getCell(5).numFmt='#,##0.00'; row.getCell(6).numFmt='#,##0.00'; row.getCell(7).numFmt='#,##0.00'; row.getCell(8).numFmt='#,##0.00'; if(r.confidence==='review') row.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFFFF2CC'}};});});
 ws.columns=[{width:7},{width:16},{width:52},{width:12},{width:20},{width:28},{width:20}]; ws.autoFilter={from:'A5',to:`H${rows.length+5}`};
 ws.addRow([]); const totals=ws.addRow(['','','TOTAL','',{formula:`SUM(E6:E${rows.length+5})`},{formula:`SUM(F6:F${rows.length+5})`},'']); totals.font={bold:true}; totals.getCell(5).numFmt='#,##0.00';totals.getCell(6).numFmt='#,##0.00';
 const bytes=await wb.xlsx.writeBuffer(); const blob=new Blob([bytes],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='rekening-koran.xlsx'; a.click(); URL.revokeObjectURL(url);
}
export function exportCSV(rows:Transaction[]){const quote=(v:unknown)=>`"${String(v??'').replace(/"/g,'""')}"`;const lines=[['Tanggal','Keterangan','CBG','Debit (Rp)','Kredit (Rp)','Mutasi belum terklasifikasi (Rp)','Saldo (Rp)'],...rows.map(r=>[r.date,r.description,r.branch,r.debit??'',r.credit??'',r.amount??'',r.balance??''])];const blob=new Blob(['\\uFEFF'+lines.map(x=>x.map(quote).join(';')).join('\\r\\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');const u=URL.createObjectURL(blob);a.href=u;a.download='rekening-koran.csv';a.click();URL.revokeObjectURL(u);}
