# 🤖 WhatsApp Chatbot - Prenatal QA

Chatbot ini dirancang untuk membantu ibu hamil dalam bertanya seputar kehamilan melalui WhatsApp.
Menggunakan **Baileys** untuk koneksi WhatsApp Web, **Google Sheets** sebagai database, dan **OpenRouter** untuk AI response.

---

## 📌 Fitur

* **Registrasi Pengguna** dengan format:

  ```
  NAMA#UMUR#USIA_HAMIL#PENYAKIT(opsional)#ALERGI(opsional)#NAMA_POSYANDU
  ```
* **Penyimpanan Data** otomatis ke Google Sheets.
* **Tanya Jawab** berbasis AI.
* **Tips Harian** yang dikirim otomatis.
* **Multi-session auth** (tidak perlu scan QR tiap kali restart, selama sesi masih aktif).

---

## 🛠️ Teknologi

* [Node.js](https://nodejs.org/)
* [Baileys](https://github.com/WhiskeySockets/Baileys)
* [Google Apps Script API](https://developers.google.com/apps-script)
* [OpenRouter API](https://openrouter.ai/)

---

## 📂 Struktur Folder

```
bot-ibuhamil/
│
├── modules/            # Modul logika bot (registrasi, tips, integrasi sheets)
├── prompt/             # Template prompt untuk AI
├── auth/               # Data sesi WhatsApp (jangan di-push ke Git)
├── .env                # Konfigurasi API Key & setting rahasia
├── bot.js              # Logika utama bot
├── index.js            # Entry point aplikasi
├── package.json        # Dependencies
└── README.md           # Dokumentasi
```

---

## ⚙️ Instalasi

### 1. Clone Repo

```bash
git clone https://github.com/username/bot-ibuhamil.git
cd bot-ibuhamil
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Buat File `.env`

Isi variabel berikut:

```env
OWNER_NUMBER=628xxxxxxx        # Nomor WA pemilik bot
OPENROUTER_API_KEY=sk-xxxxx     # API Key dari OpenRouter
GOOGLE_SHEET_ID=xxxxxxxxxxxx    # ID Google Sheet
GOOGLE_SERVICE_ACCOUNT_EMAIL=xxxx@xxxx.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nXXXX\n-----END PRIVATE KEY-----\n"
```

### 4. Jalankan Bot

```bash
node index.js
```

---

## 📋 Format Registrasi

Pengguna harus mendaftar sekali saja:

```
NAMA#UMUR#USIA_HAMIL#PENYAKIT(opsional)#ALERGI(opsional)#NAMA_POSYANDU
```

**Contoh:**

```
Siti#27#20#Anemia#Udang#Posyandu Melati
```

---

## 🧑‍💻 Kontribusi

Pull request dan issue sangat diterima. Pastikan untuk tidak meng-commit file sensitif seperti `.env` dan folder `auth/`.

---
