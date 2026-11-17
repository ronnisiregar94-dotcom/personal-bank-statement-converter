# Personal Bank Statement Converter

Aplikasi pribadi untuk mengubah rekening koran JPEG, PNG, dan PDF menjadi tabel transaksi Excel/CSV. Aplikasi ini berdiri sendiri dan tidak terkait dengan proyek pemeriksaan LKPD.

## Fitur saat ini
- Upload banyak file sekaligus dengan format PDF, JPG/JPEG, dan PNG; validasi format menggunakan ekstensi maupun MIME type agar tetap kompatibel dengan perangkat yang tidak mengisi MIME type.
- PDF dirender halaman demi halaman menjadi gambar sebelum OCR; JPG/JPEG dan PNG langsung diproses oleh Tesseract.js (bahasa Indonesia + Inggris).
- Format selain PDF, JPG/JPEG, dan PNG ditolak dengan pesan yang menjelaskan format yang didukung.
- Peningkatan praproses OCR: pembesaran gambar, grayscale, peningkatan kontras, dan OCR ulang pada gambar asli bila confidence hasil praproses rendah.
- Deteksi header bank otomatis untuk BCA, BRI, BNI, Bank Mandiri, dan Bank Syariah Indonesia (BSI), dengan pilihan bank manual.
- Parser umum untuk penanda DB/DR/DEBIT dan CR/CREDIT/KREDIT, beberapa kata arah transaksi Indonesia, format nominal Indonesia/internasional, serta tanggal dengan nama bulan.
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
- Dukungan multi-bank saat ini berupa deteksi identitas bank dari header dan parser transaksi umum. Template PDF, tata letak kolom, kode transaksi, dan istilah debit/kredit setiap bank belum divalidasi terhadap seluruh varian rekening koran. Baris tanpa arah transaksi yang jelas ditandai untuk peninjauan.
- Pengujian otomatis menggunakan contoh teks sintetis, bukan sampel rekening koran resmi dari masing-masing bank. Sebelum dipakai untuk pekerjaan keuangan, uji dengan dokumen asli yang telah disamarkan dan cocokkan setiap transaksi dengan sumber.
- Saldo akhir/rekonsiliasi bersifat pemeriksaan aritmetika, bukan jaminan bahwa setiap transaksi telah dibaca dengan benar.

## GitHub Pages / deployment
Build dengan `npm run build`; output ada di `dist/`. Untuk Vercel gunakan build command `npm run build` dan output directory `dist`.
