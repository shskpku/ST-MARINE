// === KONFIGURASI ===
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby8-_zLyl4pnLbaYsATG7AhRtMcrCAjwxiGZtYB1RNYMS3p2GXaOmQDe1h-HLY_oo_S/exec";

// 1. LOGO LOKAL (Untuk Preview di Web - Wajib ada file ini di folder komputer)
const LOGO_LOCAL_PATH = "logo-kemenhub.png";

// 2. LOGO DRIVE (Untuk ditanam di PDF oleh Server)
const LOGO_DRIVE_ID = "1itNRjZIXms7AneHXlCtwguXuoVErRm0r";

// DATA INSPECTOR
const inspectors = [
  { name: "Anton Sujarwadi, S. Si.T, M.M", nip: "19800622 200812 1 001" },
  { name: "Harno Siagian", nip: "19761006 200712 1 002" },
  { name: "Bustanul Arifin, S.AP.", nip: "19750110 200912 1 001" },
  { name: "Irwan Josua Hutajulu, S.Si.T, M.H", nip: "19730927 200912 1 001" },
];

let globalHistoryData = [];

document.addEventListener("DOMContentLoaded", () => {
  populateInspectors();
  setupDateListener();

  // SETUP LOGO PREVIEW (Pakai File Lokal)
  const imgElement = document.querySelector(".logo-container img");
  if (imgElement) imgElement.src = LOGO_LOCAL_PATH;

  fetchNextNumber();
  fetchHistory();

  document
    .getElementById("btnGenerate")
    .addEventListener("click", generatePreview);
  document
    .getElementById("btnClosePreview")
    .addEventListener("click", closePreview);
  document.getElementById("btnSimpan").addEventListener("click", saveData);
  document
    .getElementById("btnDownload")
    .addEventListener("click", () => window.print());
});

// =========================================
// FUNGSI SIMPAN (RE-BUILD HTML TABLE KHUSUS PDF)
// =========================================
function saveData() {
  const btn = document.getElementById("btnSimpan");
  const originalText = btn.innerHTML;

  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses PDF...';
  btn.disabled = true;

  // 1. AMBIL DATA DARI FORM (Bukan dari Preview HTML)
  const data = getFormData();
  if (!validateForm(data)) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  // Format Tanggal untuk PDF
  const formattedDate = formatDateIndo(data.tanggal);
  const ttdDate = formattedDate;

  // 2. BANGUN HTML KHUSUS PDF (MENGGUNAKAN TABEL AGAR PRESISI)
  // Kita tidak menggunakan innerHTML dari web karena rawan error di PDF Google.
  // Kita bangun struktur Tabel "Jadul" yang pasti terbaca sempurna.

  const pdfHtml = `
    <html>
      <head>
        <style>
          body { font-family: 'Arial', sans-serif; font-size: 11pt; margin: 0; padding: 0; }
          .page { width: 100%; padding: 30px 40px; box-sizing: border-box; }
          
          /* TABLE CSS RESET */
          table { width: 100%; border-collapse: collapse; border: 0; border-spacing: 0; }
          td { vertical-align: top; padding: 2px; }
          
          /* KOP SURAT (TABEL 2 KOLOM) */
          .kop-table td.logo-col { width: 15%; text-align: left; vertical-align: top; }
          .kop-table td.text-col { width: 85%; text-align: center; vertical-align: top; }
          
          .line-1 { font-size: 12pt; font-weight: bold; margin: 0; }
          .line-2 { font-size: 14pt; font-weight: bold; margin: 0; }
          .line-3 { font-size: 10pt; font-weight: bold; margin: 0; }
          
          .garis-kop { border-bottom: 3px solid black; margin-top: 5px; margin-bottom: 5px; width: 100%; }
          .alamat { font-size: 9pt; text-align: center; margin-bottom: 10px; }
          
          /* JUDUL */
          .judul { text-align: center; font-weight: bold; text-decoration: underline; font-size: 12pt; margin-top: 15px; }
          .nomor { text-align: center; font-size: 11pt; margin-bottom: 15px; }
          .jabatan-header { text-align: center; font-size: 11pt; margin-bottom: 15px; }
          
          /* KONTEN (TABEL LABEL : ISI) */
          .content-table { margin-bottom: 5px; }
          .label-col { width: 80px; white-space: nowrap; }
          .sep-col { width: 15px; text-align: center; }
          
          /* LIST ITEM (OL/LI PADA PDF SERING BERMASALAH, KITA PAKAI TABEL MANUAL) */
          .list-table td.num { width: 20px; }
          .list-table { margin-bottom: 5px; }
          
          /* TANDA TANGAN */
          .ttd-wrapper { width: 100%; margin-top: 30px; }
          .ttd-box { float: right; width: 45%; text-align: left; }
          
          /* FOOTER */
          .footer { 
             position: fixed; bottom: -20px; left: 0; right: 0; 
             text-align: center; font-style: italic; font-weight: bold; font-size: 10pt; font-family: 'Times New Roman', serif;
          }
        </style>
      </head>
      <body>
        <div class="page">
        
          <table class="kop-table">
            <tr>
              <td class="logo-col">
                <img src="LOGO_PLACEHOLDER" style="width: 85px; height: auto;">
              </td>
              <td class="text-col">
                <div class="line-1">KEMENTERIAN PERHUBUNGAN</div>
                <div class="line-2">DIREKTORAT JENDERAL PERHUBUNGAN LAUT</div>
                <div class="line-3">KANTOR KESYAHBANDARAN DAN OTORITAS PELABUHAN<br>KELAS II PEKANBARU</div>
              </td>
            </tr>
          </table>
          
          <div class="garis-kop"></div>
          
          <div class="alamat">
            JL. KAMPUNG DALAM NO. 1, PEKANBARU - 28152<br>
            Telp: (0761) 22827, 29408 &nbsp; Email: <a href="mailto:adpelpekanbaru@yahoo.com">adpelpekanbaru@yahoo.com</a><br>
            FAX: (0761) 2940 &nbsp; TLX: 5316/6926
          </div>

          <div class="judul">SURAT TUGAS</div>
          <div class="nomor">Nomor : ${data.nomorSt}</div>
          <div class="jabatan-header">Kepala Kantor Kesyahbandaran dan Otoritas Pelabuhan Kelas II Pekanbaru</div>

          <table class="content-table">
            <tr>
              <td class="label-col">Dasar</td>
              <td class="sep-col">:</td>
              <td>
                <table class="list-table">
                  <tr><td class="num">1.</td><td>Undang-Undang Nomor 66 Tahun 2024 tentang Perubahan Ketiga atas Undang-Undang Nomor 17 tahun 2008 tentang Pelayaran;</td></tr>
                  <tr><td class="num">2.</td><td>Peraturan Pemerintah Nomor 31 Tahun 2021 tentang Penyelenggaraan Bidang Pelayaran;</td></tr>
                  <tr><td class="num">3.</td><td>Peraturan Menteri Perhubungan Nomor 7 Tahun 2024 tentang Harmonisasi Sistem Pemeriksaan dan Sertifikasi pada kapal Berbendera Indonesia;</td></tr>
                  <tr><td class="num">4.</td><td>Peraturan Direktur Jenderal Perhubungan Laut No.HK.103/2/19/DJPL-16 Tentang Tata cara Pelaksanaan Penyelenggaraan Kelaiklautan Kapal;</td></tr>
                  <tr><td class="num">5.</td><td>Surat Permohonan ${data.perusahaan};</td></tr>
                  <tr><td class="num">6.</td><td>Untuk Kepentingan Dinas.</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin: 10px 0; font-weight:bold;">Memberi Tugas</div>

          <table class="content-table">
            <tr>
              <td class="label-col">Kepada</td>
              <td class="sep-col">:</td>
              <td>
                <table class="list-table">
                  <tr>
                    <td class="num">1.</td>
                    <td>
                      ${data.inspector.name}<br>
                      NIP. ${data.inspector.nip}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>

          <table class="content-table">
            <tr>
              <td class="label-col">Untuk</td>
              <td class="sep-col">:</td>
              <td>
                <table class="list-table">
                  <tr><td class="num">1.</td><td>Melaksanakan Pemeriksaan Fisik Kapal ${data.kapal} yang dilaksanakan pada hari ${data.hari} tanggal ${formattedDate} bertempat di Pekanbaru;</td></tr>
                  <tr><td class="num">2.</td><td>Melaporkan hasil pelaksanaan tugas kepada Kepala Kantor Kesyahbandaran dan Otoritas Pelabuhan Kelas II Pekanbaru;</td></tr>
                  <tr><td class="num">3.</td><td>Surat Tugas ini berlaku mulai tanggal ${formattedDate} sampai dengan selesai.</td></tr>
                </table>
              </td>
            </tr>
          </table>

          <div class="ttd-wrapper">
             <table style="width: 100%;">
               <tr>
                 <td style="width: 50%;"></td> <td style="width: 50%;">
                    Pekanbaru, ${ttdDate}<br>
                    An. Kepala Kantor,<br>
                    Kasi Status Hukum Dan Sertifikasi Kapal
                    <br><br><br><br>
                    <b style="text-decoration: underline;">Irwan Josua Hutajulu, S.Si.T, M.H</b><br>
                    NIP. 19730927 200912 1 001
                 </td>
               </tr>
             </table>
          </div>

          <div style="font-size: 10pt; margin-top: 20px;">
            Tembusan:
            <table class="list-table" style="font-size: 10pt;">
               <tr><td class="num">1.</td><td>Kepala Kantor;</td></tr>
               <tr><td class="num">2.</td><td>Kasubbag TU;</td></tr>
               <tr><td class="num">3.</td><td>Direktur ${data.perusahaan};</td></tr>
               <tr><td class="num">4.</td><td>Yang bersangkutan;</td></tr>
               <tr><td class="num">5.</td><td>Arsip.</td></tr>
            </table>
          </div>

          <div class="footer">
            "Mentaati Peraturan Pelayaran Berarti Mendukung Terciptanya Keselamatan Berlayar"
          </div>

        </div>
      </body>
    </html>
  `;

  // 3. SIAPKAN PAYLOAD
  const payload = getFormData();
  payload.action = "save";
  payload.htmlContent = pdfHtml; // Kita kirim HTML yang baru dibuat ini

  // 4. KIRIM KE SERVER
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast("✅ PDF Tersimpan Sempurna!", "success");
        document.getElementById("stForm").reset();
        document.getElementById("inspectorSelect").selectedIndex = 0;
        fetchHistory();
        fetchNextNumber();
        closePreview();
      } else {
        showToast("Gagal: " + result.message, "error");
      }
    })
    .catch((err) => {
      console.error(err);
      showToast("Error koneksi internet.", "error");
    })
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}

// ... (SISA KODE BAWAHNYA SAMA PERSIS SEPERTI SEBELUMNYA) ...
// (Pastikan fungsi generatePreview, fetchHistory, viewHistory, helper dll tetap ada)

function generatePreview() {
  const data = getFormData();
  if (!validateForm(data)) return;
  renderPreview(data);
  showPreviewSection();
}

function fetchNextNumber() {
  const input = document.getElementById("nomorSt");
  if (input.value && !input.value.includes("Tahun")) return;
  input.placeholder = "Mengambil nomor...";
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getNextNumber" }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        const year = new Date().getFullYear();
        input.value = `${data.nextNumber} Tahun ${year}`;
      }
    })
    .catch((err) => {
      input.placeholder = "Isi nomor manual...";
    });
}

function fetchHistory() {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat riwayat...</td></tr>';
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getHistory" }),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((data) => {
      tbody.innerHTML = "";
      if (!data || data.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="6" style="text-align:center">Belum ada riwayat.</td></tr>';
        return;
      }
      globalHistoryData = data;
      data.forEach((row, index) => {
        const tr = document.createElement("tr");
        let tglView = row.tanggal;
        try {
          tglView = new Date(row.tanggal).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch (e) {}
        let linkDisplay = `<span style="color:#ccc;">-</span>`;
        if (row.link && row.link.includes("http")) {
          linkDisplay = `<a href="${row.link}" target="_blank" title="Buka PDF" style="color:#d32f2f; font-weight:bold;"><i class="fas fa-file-pdf"></i> PDF</a>`;
        }
        tr.innerHTML = `<td>${row.nomorSt}</td><td>${tglView}</td><td>${row.kapal}</td><td>${row.perusahaan}</td><td>${row.pemeriksa}</td>
                <td><div class="action-group">
                        <button class="btn-action btn-view" onclick="viewHistory(${index})"><i class="fas fa-eye"></i></button>
                        <button class="btn-action btn-edit" onclick="editHistory(${index})"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-action btn-delete" onclick="deleteHistory('${row.nomorSt}')"><i class="fas fa-trash"></i></button>
                        <div style="margin-left:5px;">${linkDisplay}</div>
                    </div></td>`;
        tbody.appendChild(tr);
      });
    })
    .catch((err) => {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:red">Gagal koneksi.</td></tr>';
    });
}

function viewHistory(index) {
  const data = globalHistoryData[index];
  const inspector = inspectors.find((i) => i.name === data.pemeriksa) || {
    name: data.pemeriksa,
    nip: "-",
  };
  document.getElementById("displayNomorSt").innerText = data.nomorSt;
  document.getElementById("displayPerusahaanDasar").innerText = data.perusahaan;
  document.getElementById("displayNamaPemeriksa").innerText = inspector.name;
  document.getElementById("displayNip").innerText = inspector.nip;
  document.getElementById("displayNamaKapal").innerText = data.kapal;
  const d = new Date(data.tanggal);
  const hari = isNaN(d)
    ? "-"
    : new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(d);
  const formattedDate = formatDateIndo(data.tanggal);
  document.getElementById("displayHari").innerText = hari;
  document.getElementById("displayTanggal").innerText = formattedDate;
  document.getElementById("displayTanggalBerlaku").innerText = formattedDate;
  document.getElementById("displayTanggalTtd").innerText = formattedDate;
  document.getElementById("displayPerusahaanTembusan").innerText =
    data.perusahaan;
  showPreviewSection();
}
function editHistory(index) {
  const data = globalHistoryData[index];
  window.scrollTo({ top: 0, behavior: "smooth" });
  document.getElementById("nomorSt").value = data.nomorSt;
  document.getElementById("namaKapal").value = data.kapal;
  document.getElementById("namaPerusahaan").value = data.perusahaan;
  try {
    const dateObj = new Date(data.tanggal);
    if (!isNaN(dateObj)) {
      document.getElementById("tglPeriksa").value = dateObj
        .toISOString()
        .split("T")[0];
      document.getElementById("tglPeriksa").dispatchEvent(new Event("change"));
    }
  } catch (e) {}
  const sel = document.getElementById("inspectorSelect");
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].text === data.pemeriksa) {
      sel.selectedIndex = i;
      break;
    }
  }
  showToast("Data siap diedit.", "success");
}
function deleteHistory(nomorSt) {
  if (confirm(`⚠️ Yakin hapus Surat Tugas No: ${nomorSt}?`)) {
    showToast("Sedang menghapus...", "success");
    fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete", nomorSt: nomorSt }),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          showToast("Dihapus.", "success");
          fetchHistory();
          fetchNextNumber();
        } else {
          showToast("Gagal.", "error");
        }
      });
  }
}
function getFormData() {
  const inspJson = document.getElementById("inspectorSelect").value;
  return {
    nomorSt: document.getElementById("nomorSt").value,
    inspector: inspJson ? JSON.parse(inspJson) : null,
    tanggal: document.getElementById("tglPeriksa").value,
    hari: document.getElementById("hariPeriksa").value,
    kapal: document.getElementById("namaKapal").value,
    perusahaan: document.getElementById("namaPerusahaan").value,
  };
}
function validateForm(data) {
  if (
    !data.inspector ||
    !data.tanggal ||
    !data.kapal ||
    !data.perusahaan ||
    !data.nomorSt
  ) {
    showToast("Formulir belum lengkap!", "error");
    return false;
  }
  return true;
}
function renderPreview(data) {
  const formattedDate = formatDateIndo(data.tanggal);
  document.getElementById("displayNomorSt").innerText = data.nomorSt;
  document.getElementById("displayPerusahaanDasar").innerText = data.perusahaan;
  document.getElementById("displayNamaPemeriksa").innerText =
    data.inspector.name;
  document.getElementById("displayNip").innerText = data.inspector.nip;
  document.getElementById("displayNamaKapal").innerText = data.kapal;
  document.getElementById("displayHari").innerText = data.hari;
  document.getElementById("displayTanggal").innerText = formattedDate;
  document.getElementById("displayTanggalBerlaku").innerText = formattedDate;
  document.getElementById("displayTanggalTtd").innerText = formattedDate;
  document.getElementById("displayPerusahaanTembusan").innerText =
    data.perusahaan;
}
function showPreviewSection() {
  document.getElementById("mainContainer").classList.add("has-preview");
  document.getElementById("previewSection").classList.remove("hidden");
  if (window.innerWidth < 1024)
    document
      .getElementById("previewSection")
      .scrollIntoView({ behavior: "smooth" });
}
function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  const icon =
    type === "success"
      ? '<i class="fas fa-check-circle"></i>'
      : '<i class="fas fa-exclamation-circle"></i>';
  toast.innerHTML = `${icon}<span class="toast-message">${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "fadeOut 0.5s forwards";
    setTimeout(() => toast.remove(), 500);
  }, 4000);
}
function populateInspectors() {
  const sel = document.getElementById("inspectorSelect");
  sel.innerHTML = '<option value="">-- Pilih Inspector --</option>';
  inspectors.forEach((i) => {
    let opt = document.createElement("option");
    opt.value = JSON.stringify(i);
    opt.innerText = i.name;
    sel.appendChild(opt);
  });
}
function setupDateListener() {
  document.getElementById("tglPeriksa").addEventListener("change", (e) => {
    if (e.target.value) {
      const d = new Date(e.target.value);
      document.getElementById("hariPeriksa").value = new Intl.DateTimeFormat(
        "id-ID",
        { weekday: "long" }
      ).format(d);
    }
  });
}
function formatDateIndo(str) {
  const d = new Date(str);
  const m = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  if (isNaN(d)) return str;
  return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
function closePreview() {
  document.getElementById("mainContainer").classList.remove("has-preview");
  document.getElementById("previewSection").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
