# Personal Bank Statement Converter

Aplikasi pribadi untuk mengubah rekening koran JPEG, PNG, dan PDF menjadi tabel transaksi Excel/CSV. Aplikasi ini berdiri sendiri dan tidak terkait dengan proyek pemeriksaan LKPD.

## Fitur saat ini
- Upload multi-file JPEG/PNG/PDF dan OCR di browser menggunakan Tesseract.js (bahasa Indonesia + Inggris).
- Render PDF per halaman di browser.
- Tabel transaksi yang bisa diedit: tanggal, keterangan, CBG, debit, kredit, saldo.
- Ekspor XLSX dengan format kolom, filter, format angka, dan penanda baris yang perlu ditinjau.
- Ekspor CSV, total debit/kredit, serta pemeriksaan persamaan saldo.
- Input transaksi manual dan contoh format.

## Jalankan secara lokal
```bash
npm install
npm run dev
``

## Build dan test
```bash
npm run build
npm test
```

## Privasi dan batasan
- Pemrosesan OCR dilakukan di browser; aplikasi ini tidak mengirim dokumen ke backend.
- Jangan deploy sebagai layanan publik tanpa menambahkan autentikasi yang sesuai. Repository private disarankan untuk penggunaan pribadi.
- OCR rekening koran dapat salah membaca angka, tanda desimal, tanggal, atau menggabungkan baris. Selalu verifikasi hasil terhadap sumber asli.
- Deteksi transaksi saat ini heuristik dan belum merupakan parser tervalidasi untuk semua format bank. Kata DB/CR digunakan bila terbaca; baris tanpa penanda akan ditandai untuk peninjauan.
- Saldo akhir/rekonsiliasi bersifat pemeriksaan aritmetika, bukan jaminan bahwa setiap transaksi telah dibaca dengan benar.

## GitHub Pages / deployment
Build dengan `npm run build`; output ada di `dist/`. Untuk Vercel gunakan build command `npm run build` dan output directory `dist`.
