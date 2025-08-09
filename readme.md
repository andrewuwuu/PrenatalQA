# 🤖 WhatsApp Chatbot – Prenatal QA (OpenRouter + Google Sheets via Apps Script)

Chatbot WhatsApp untuk ibu hamil. Koneksi WA via **Baileys**, AI via **OpenRouter**, dan database pakai **Google Sheets** yang diekspos sebagai **Apps Script Web App** (tanpa service account).

## ✨ Fitur

* Registrasi pengguna dengan format:

  ```
  NAMA#UMUR#USIA_HAMIL#PENYAKIT(opsional)#ALERGI(opsional)#NAMA_POSYANDU
  ```
* Simpan & baca profil dari Google Sheets (Apps Script Web API).
* Tips kesehatan otomatis setiap **06:00 WIB**.
* Auto‑increment `gestation_weeks` mingguan + ucapan selamat.
* Tanya‑jawab berbasis profil (jawaban sederhana & informatif).

---

## 🧱 Arsitektur Singkat

```
WhatsApp (nomor pribadi)
   │  (Baileys WebSocket)
Node.js bot  ──> OpenRouter (LLM)
   │
   └── Google Sheets  ⇄  Apps Script Web App (GET/POST + ?action=increment)
```

---

## 📦 Struktur Proyek

```
whatsapp-prenatal-bot/
├── .env
├── package.json
├── auth/                      # sesi Baileys (jangan di-commit)
├── prompt/
│   ├── tipsPrompt.md
│   ├── qaPrompt.md
│   └── buildPrompt.js
├── modules/
│   ├── registration.js
│   ├── tipsScheduler.js
│   └── sheets.js
├── openrouter.js
├── bot.js
└── index.js
```

---

## 🔑 Variabel Lingkungan (.env)

```ini
# OpenRouter
OPENROUTER_API_KEY=or-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=openai/gpt-4o-mini

# Apps Script Web App (Google Sheets)
SHEETS_API_URL=https://script.google.com/macros/s/AKfycb.../exec
SHEETS_INCREMENT_URL=https://script.google.com/macros/s/AKfycb.../exec?action=increment

# Bot
BOT_OWNER_JID=628xxxxxxxxxx@s.whatsapp.net
LOCALE=id
```

---

## 📋 Persiapan Google Sheets + Apps Script

### 1) Buat Spreadsheet

Buat Google Sheet baru, tab `Sheet1` dengan **header (baris 1)** berikut (urutan wajib sama):

```
phone,name,age,gestation_weeks,conditions,allergies,posyandu,language,consent,created_at,updated_at
```

### 2) Buat Apps Script Web App

* Di Sheet → **Extensions → Apps Script**.
* Buat `Code.gs` dengan script **final** berikut (GET/POST + increment):

  ```javascript
  function doGet(e) {
    const action = e.parameter.action
    if (action === 'increment') {
      incrementGestationWeeks()
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON)
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1')
    const data = sheet.getDataRange().getValues()
    const headers = data.shift()
    return ContentService
      .createTextOutput(JSON.stringify({ headers, rows: data }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  function doPost(e) {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1')
    const body = JSON.parse(e.postData.contents)
    const now = new Date().toISOString()
    let updated = false
    const rows = sheet.getDataRange().getValues()

    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === body.phone) {
        sheet.getRange(i+1, 1, 1, 11).setValues([[
          body.phone, body.name, body.age, body.gestation_weeks,
          body.conditions, body.allergies, body.posyandu, body.language,
          body.consent, rows[i][9], now
        ]])
        updated = true
        break
      }
    }

    if (!updated) {
      sheet.appendRow([
        body.phone, body.name, body.age, body.gestation_weeks,
        body.conditions, body.allergies, body.posyandu, body.language,
        body.consent, now, now
      ])
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true }))
      .setMimeType(ContentService.MimeType.JSON)
  }

  function incrementGestationWeeks() {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Sheet1')
    const data = sheet.getDataRange().getValues()
    const headers = data.shift()

    const idxGest = headers.indexOf('gestation_weeks')
    const idxCreated = headers.indexOf('created_at')

    for (let i = 0; i < data.length; i++) {
      let gestWeeks = parseInt(data[i][idxGest] || 0, 10)
      let createdAt = new Date(data[i][idxCreated])

      if (!isNaN(gestWeeks) && createdAt instanceof Date && !isNaN(createdAt.getTime())) {
        const weeksPassed = Math.floor((Date.now() - createdAt.getTime()) / (7 * 24 * 60 * 60 * 1000))
        const newGestWeeks = gestWeeks + weeksPassed
        if (newGestWeeks !== gestWeeks) data[i][idxGest] = newGestWeeks
      }
    }
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data)
  }
  ```

### 3) Deploy Web App

* **Deploy → New Deployment → Web app**
  Execute as: **Me** · Access: **Anyone**
* Klik **Deploy**, salin URL → isi ke `.env` sebagai `SHEETS_API_URL`.
* Buat juga `SHEETS_INCREMENT_URL` dengan menambahkan `?action=increment`.

### (Opsional) Trigger Mingguan di Apps Script

Agar increment jalan walau bot mati:

* **Triggers → Add Trigger → incrementGestationWeeks → Time-driven → Weekly → 06:00**.

### Uji cepat endpoint

* GET: buka `SHEETS_API_URL` di browser → keluar JSON `{ headers, rows }`.
* POST:

  ```bash
  curl -X POST "$SHEETS_API_URL" \
    -H "Content-Type: application/json" \
    -d '{"phone":"628123","name":"Ana","age":"28","gestation_weeks":"20","conditions":"-","allergies":"-","posyandu":"Melati","language":"id","consent":"yes"}'
  ```

---

## ▶️ Menjalankan Bot

### 1) Install

```bash
npm install
```

### 2) Jalankan

```bash
node index.js
```

* Scan QR di terminal (kita pakai `qrcode-terminal`).
* Folder `auth/` menyimpan sesi. **Jangan dihapus** bila tidak ingin re‑scan.

---

## 🧠 Cara Pakai

* **Daftar** (sekali saja):

  ```
  Ana#28#24#Anemia#Penisilin#Posyandu Melati
  ```
* **Tanya**: kirim pertanyaan biasa, mis.
  `Mual banget, harus ngapain ya?`
  Bot akan menyesuaikan jawaban dengan profil di Sheet.

---

## 🧰 Troubleshooting

**QR tidak muncul?**
Pastikan `qrcode-terminal` terpasang dan listener `connection.update` aktif.

**Stream error 515 / reconnect loop**

* Pakai `fetchLatestBaileysVersion()` + `Browsers.macOS('Chrome')`.
* Hanya 1 instance bot berjalan.
* Waktu sistem akurat (NTP).
* Jika perlu, hapus `auth/` lalu pairing ulang.

**Bot kirim pesan berulang / balas pesan lama**

* Handler sudah difilter `type === 'notify'`, dedup `message.id`, dan menolak history.
* Pastikan patch anti‑spam pada `bot.js` aktif.

**Nomor terdaftar tapi dianggap belum register**

* Pastikan normalisasi nomor di `modules/sheets.js`:

  ```js
  function normalizePhone(jidOrPhone) {
    return String(jidOrPhone).replace(/[:@].*$/, '') // buang :1@s.whatsapp.net
  }
  ```
* Data di Sheet harus ada pada kolom `phone` sesuai format di atas.

---

## 🔒 Git Hygiene

* `.gitignore`:

  ```
  node_modules/
  .env
  auth/
  logs/
  *.log
  ```
* `.gitattributes` menyetel `eol=lf` untuk file teks & menandai file biner.

---