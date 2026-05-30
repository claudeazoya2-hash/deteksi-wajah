# deteksi-wajah

Website sederhana untuk absensi kantor menggunakan deteksi wajah dari kamera komputer.

## Cara menggunakan

1. Buka file `register.html` di browser modern.
2. Isi nama karyawan dan klik tombol **Mulai Kamera**.
3. Arahkan wajah ke kamera lalu klik **Daftarkan Wajah**.
4. Buka `index.html` untuk melakukan absensi.
5. Klik tombol **Mulai Absen** lalu pastikan wajah terdaftar terlihat jelas di kamera.
6. Riwayat absen akan muncul di bagian bawah.

## File utama

- `index.html` — halaman utama absensi
- `register.html` — halaman registrasi wajah
- `styles.css` — gaya tampilan
- `script.js` — logika absensi dan pengenalan wajah
- `register.js` — logika registrasi wajah

## Deploy

- Situs akan diterbitkan otomatis melalui GitHub Pages.
- URL yang digunakan: `https://claudeazoya2-hash.github.io/deteksi-wajah/`

## Catatan

Website ini adalah demo front-end. Absensi hanya disimpan sementara di browser dan tidak dikirim ke server.
