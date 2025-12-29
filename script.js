// =========================================
// 1. KONFIGURASI & GLOBAL VARS
// =========================================
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycby8-_zLyl4pnLbaYsATG7AhRtMcrCAjwxiGZtYB1RNYMS3p2GXaOmQDe1h-HLY_oo_S/exec";
const LOGO_LOCAL_PATH = "logo-kemenhub.png";

// DATA INSPECTOR
const inspectors = [
  { name: "Anton Sujarwadi, S. Si.T, M.M", nip: "19800622 200812 1 001" },
  { name: "Harno Siagian", nip: "19761006 200712 1 002" },
  { name: "Bustanul Arifin, S.AP.", nip: "19750110 200912 1 001" },
  { name: "Irwan Josua Hutajulu, S.Si.T, M.H", nip: "19730927 200912 1 001" },
];

// DATA TABEL & PAGINATION
let globalHistoryData = [];
let currentFilteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// STATE PREVIEW (PAGINATION PREVIEW)
let currentPreviewIndex = 0;
let totalPreviewPages = 1;

// STATE EDIT & DELETE
let isEditMode = false;
let globalOldNomorSt = "";
let deleteTargetId = null; // Menyimpan ID surat yang mau dihapus

// =========================================
// 2. DOM LOAD & INIT
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  // Render Form Awal (Default 1)
  renderForms();

  const imgElement = document.querySelector(".logo-container img");
  if (imgElement) imgElement.src = LOGO_LOCAL_PATH;

  // Load Data Tabel
  fetchHistory();

  // Listeners Tombol Utama
  document
    .getElementById("btnGenerate")
    .addEventListener("click", generatePreview);
  document
    .getElementById("btnClosePreview")
    .addEventListener("click", closePreview);
  document.getElementById("btnSimpan").addEventListener("click", saveAllData); // Logic Simpan Batch
  document
    .getElementById("btnDownload")
    .addEventListener("click", () => window.print());

  // Listeners Mode Edit
  document
    .getElementById("btnUnlock")
    .addEventListener("click", enableEditForm);
  document.getElementById("btnUpdate").addEventListener("click", updateData);
  document
    .getElementById("btnCancelEdit")
    .addEventListener("click", cancelEditMode);

  // Listener Search (Live Search)
  document
    .getElementById("searchInput")
    .addEventListener("keyup", function (e) {
      const term = e.target.value.toLowerCase();
      currentFilteredData = globalHistoryData.filter(
        (row) =>
          row.kapal.toLowerCase().includes(term) ||
          row.perusahaan.toLowerCase().includes(term) ||
          row.pemeriksa.toLowerCase().includes(term) ||
          String(row.nomorSt).toLowerCase().includes(term)
      );
      currentPage = 1;
      renderTable();
    });
});

// =========================================
// 3. LOGIKA DYNAMIC FORM (BATCH FORM)
// =========================================

function renderForms() {
  const count = parseInt(document.getElementById("jumlahSt").value);
  const container = document.getElementById("dynamicFormContainer");
  container.innerHTML = ""; // Bersihkan container

  // Jika Edit Mode aktif, paksa jadi 1 form saja
  const limit = isEditMode ? 1 : count;

  // Update Dropdown agar user tidak ganti jumlah saat edit mode
  document.getElementById("jumlahSt").disabled = isEditMode;
  if (isEditMode) document.getElementById("jumlahSt").value = 1;

  for (let i = 0; i < limit; i++) {
    // VISUAL HEADER (SEPARATOR) - Muncul di setiap form agar rapi
    const sep = document.createElement("div");
    sep.className = "form-separator";
    sep.innerHTML = `<span><i class="fas fa-file-alt"></i> Data Surat Tugas #${
      i + 1
    }</span>`;
    container.appendChild(sep);

    // Build HTML String untuk 1 Set Form dengan Index _i
    const formHtml = `
      <div class="form-grid" data-index="${i}">
        <div class="form-group full-width">
          <label>Nomor Surat Tugas</label>
          <div class="input-group">
            <input type="text" id="nomorSt_${i}" class="input-nomor" placeholder="Mengambil nomor..." style="color: #0a1931" />
            <button type="button" onclick="fetchOneNumber(${i})" class="btn-icon" title="Refresh Nomor">
              <i class="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>

        <div class="form-group full-width">
          <label>Marine Inspector</label>
          <select id="inspectorSelect_${i}" required>
            <option value="">-- Pilih Inspector --</option>
          </select>
        </div>

        <div class="form-group">
          <label>Tanggal Pemeriksaan</label>
          <input type="date" id="tglPeriksa_${i}" onchange="autoHari(${i})" required />
        </div>
        <div class="form-group">
          <label>Hari</label>
          <input type="text" id="hariPeriksa_${i}" readonly placeholder="Auto..." />
        </div>

        <div class="form-group full-width">
          <label>Nama Kapal</label>
          <input type="text" id="namaKapal_${i}" placeholder="Contoh: TK. SLM 88" required />
        </div>
        <div class="form-group full-width">
          <label>Perusahaan Pemohon</label>
          <input type="text" id="namaPerusahaan_${i}" placeholder="Contoh: PT. Pelayaran..." required />
        </div>
      </div>
    `;

    // Inject ke container
    const wrapper = document.createElement("div");
    wrapper.innerHTML = formHtml;
    container.appendChild(wrapper);

    // Populate Select Options untuk form ini
    populateInspectorSelect(i);

    // Auto Fetch Number untuk form ini (hanya jika bukan mode edit)
    if (!isEditMode) fetchOneNumber(i);
  }
}

function populateInspectorSelect(index) {
  const sel = document.getElementById(`inspectorSelect_${index}`);
  sel.innerHTML = '<option value="">-- Pilih Inspector --</option>';
  inspectors.forEach((insp) => {
    let opt = document.createElement("option");
    opt.value = JSON.stringify(insp);
    opt.innerText = insp.name;
    sel.appendChild(opt);
  });
}

function autoHari(index) {
  const tglVal = document.getElementById(`tglPeriksa_${index}`).value;
  if (tglVal) {
    document.getElementById(`hariPeriksa_${index}`).value =
      new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
        new Date(tglVal)
      );
  }
}

function fetchOneNumber(index) {
  const input = document.getElementById(`nomorSt_${index}`);
  if (input.value && input.value.includes("Tahun")) return;

  input.placeholder = "Loading...";

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getNextNumber" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        const year = new Date().getFullYear();
        let rawNumStr = data.nextNumber
          .replace("ST-KSOP.PKU.", "")
          .replace(` Tahun ${year}`, "");
        let currentNum = parseInt(rawNumStr);

        // Tambahkan offset berdasarkan index form agar nomor urut (045, 046, dst)
        let finalNum = currentNum + index;
        let finalStr = `ST-KSOP.PKU.${pad(finalNum, 3)} Tahun ${year}`;
        input.value = finalStr;
      }
    });
}

// =========================================
// 4. PREVIEW & PAGINATION LOGIC
// =========================================

function generatePreview() {
  const count = isEditMode
    ? 1
    : parseInt(document.getElementById("jumlahSt").value);
  const printArea = document.getElementById("printArea");
  printArea.innerHTML = ""; // Bersihkan preview lama

  // Reset pagination state
  currentPreviewIndex = 0;
  totalPreviewPages = count;

  let hasError = false;

  for (let i = 0; i < count; i++) {
    const data = getFormDataByIndex(i);
    if (!validateForm(data, i)) {
      hasError = true;
      break;
    }

    // Buat element halaman A4 baru
    const pageDiv = document.createElement("div");
    pageDiv.className = `a4-page ${i === 0 ? "active" : ""}`; // Halaman pertama aktif
    pageDiv.id = `page-${i}`;

    // Inject HTML Template Surat ke dalam pageDiv
    pageDiv.innerHTML = getSuratTemplateHTML(data);
    printArea.appendChild(pageDiv);
  }

  if (hasError) return;

  // Tampilkan Controls & Section
  document.getElementById("previewPageIndicator").innerText = `ST 1 / ${count}`;
  document.getElementById("previewPagControls").style.display =
    count > 1 ? "flex" : "none";

  showPreviewSection();
}

function changePreviewPage(direction) {
  document
    .getElementById(`page-${currentPreviewIndex}`)
    .classList.remove("active");
  currentPreviewIndex += direction;

  if (currentPreviewIndex < 0) currentPreviewIndex = 0;
  if (currentPreviewIndex >= totalPreviewPages)
    currentPreviewIndex = totalPreviewPages - 1;

  document
    .getElementById(`page-${currentPreviewIndex}`)
    .classList.add("active");
  document.getElementById("previewPageIndicator").innerText = `ST ${
    currentPreviewIndex + 1
  } / ${totalPreviewPages}`;
}

function getSuratTemplateHTML(data) {
  const formattedDate = formatDateIndo(data.tanggal);
  return `
    <header class="kop-surat">
      <div class="logo-container"><img src="${LOGO_LOCAL_PATH}" alt="Logo"></div>
      <div class="kop-text">
        <div class="line-1">KEMENTERIAN PERHUBUNGAN</div>
        <div class="line-2">DIREKTORAT JENDERAL PERHUBUNGAN LAUT</div>
        <div class="line-3">KANTOR KESYAHBANDARAN DAN OTORITAS PELABUHAN<br />KELAS II PEKANBARU</div>
      </div>
    </header>
    <div class="kop-address">
      <div class="addr-block">JL. KAMPUNG DALAM NO. 1<br />PEKANBARU - 28152</div>
      <div class="addr-block">Telp: (0761) 22827, 29408<br />Email: <a href="mailto:adpelpekanbaru@yahoo.com">adpelpekanbaru@yahoo.com</a></div>
      <div class="addr-block">FAX: (0761) 2940<br />TLX: 5316/6926</div>
    </div>
    <div class="kop-separator"></div>

    <div class="surat-body">
      <div class="judul-block">
        <div class="judul-surat">SURAT TUGAS</div>
        <div class="nomor-surat">Nomor : ${data.nomorSt}</div>
        <div class="pejabat-surat">Kepala Kantor Kesyahbandaran dan Otoritas Pelabuhan Kelas II Pekanbaru</div>
      </div>

      <div class="row-content">
        <div class="col-label">Dasar</div><div class="col-sep">:</div>
        <div class="col-isi list-dasar">
          <ol>
            <li>Undang-Undang Nomor 66 Tahun 2024 tentang Perubahan Ketiga atas Undang-Undang Nomor 17 tahun 2008 tentang Pelayaran;</li>
            <li>Peraturan Pemerintah Nomor 31 Tahun 2021 tentang Penyelenggaraan Bidang Pelayaran;</li>
            <li>Peraturan Menteri Perhubungan Nomor 7 Tahun 2024 tentang Harmonisasi Sistem Pemeriksaan dan Sertifikasi pada kapal Berbendera Indonesia;</li>
            <li>Peraturan Direktur Jenderal Perhubungan Laut No.HK.103/2/19/DJPL-16 Tentang Tata cara Pelaksanaan Penyelenggaraan Kelaiklautan Kapal;</li>
            <li>Surat Permohonan ${data.perusahaan};</li>
            <li>Untuk Kepentingan Dinas.</li>
          </ol>
        </div>
      </div>

      <div class="section-title">Memberi Tugas</div>

      <div class="row-content">
        <div class="col-label">Kepada</div><div class="col-sep">:</div>
        <div class="col-isi">
          <ol>
            <li>${data.inspector.name}<br /><span class="nip-indent">NIP. ${data.inspector.nip}</span></li>
          </ol>
        </div>
      </div>

      <div class="row-content">
        <div class="col-label">Untuk</div><div class="col-sep">:</div>
        <div class="col-isi list-tugas">
          <ol>
            <li>Melaksanakan Pemeriksaan Fisik Kapal ${data.kapal} yang dilaksanakan pada hari ${data.hari} tanggal ${formattedDate} bertempat di Pekanbaru;</li>
            <li>Melaporkan hasil pelaksanaan tugas kepada Kepala Kantor Kesyahbandaran dan Otoritas Pelabuhan Kelas II Pekanbaru;</li>
            <li>Surat Tugas ini berlaku mulai tanggal ${formattedDate} sampai dengan selesai.</li>
          </ol>
        </div>
      </div>

      <div class="ttd-section">
        <div class="ttd-date">Pekanbaru, ${formattedDate}</div>
        <div class="ttd-jabatan">An. Kepala Kantor,<br />Kasi Status Hukum Dan Sertifikasi Kapal</div>
        <div class="ttd-space"></div>
        <div class="ttd-nama">Irwan Josua Hutajulu, S.Si.T, M.H</div>
        <div class="ttd-nip">NIP. 19730927 200912 1 001</div>
      </div>

      <div class="tembusan">
        Tembusan:
        <ol>
            <li>Kepala Kantor;</li>
            <li>Kasubbag TU;</li>
            <li>Direktur ${data.perusahaan};</li>
            <li>Yang bersangkutan;</li>
            <li>Arsip.</li>
        </ol>
      </div>
    </div>
    <div class="surat-footer">"Mentaati Peraturan Pelayaran Berarti Mendukung Terciptanya Keselamatan Berlayar"</div>
  `;
}

// =========================================
// 5. SAVE BATCH (MENYIMPAN BANYAK SEKALIGUS)
// =========================================

function saveAllData() {
  const btn = document.getElementById("btnSimpan");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Proses Simpan...';
  btn.disabled = true;

  // Kumpulkan Semua Data dari Form
  const count = isEditMode
    ? 1
    : parseInt(document.getElementById("jumlahSt").value);
  let dataList = [];

  for (let i = 0; i < count; i++) {
    dataList.push(getFormDataByIndex(i));
  }

  // Kirim Array ke Backend
  const payload = { action: "saveBatch", dataList: dataList };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast(
          `✅ Berhasil! ${result.processed} Surat Tugas tersimpan.`,
          "success"
        );

        if (!isEditMode) {
          document.getElementById("stForm").reset();
          document.getElementById("jumlahSt").value = "1";
          renderForms(); // Reset ke 1 form
        } else {
          cancelEditMode();
        }

        fetchHistory();
        closePreview();
      } else {
        showToast("Gagal: " + result.message, "error");
      }
    })
    .catch((err) => {
      console.error(err);
      showToast("Error koneksi.", "error");
    })
    .finally(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    });
}

// =========================================
// 6. EDIT MODE LOGIC
// =========================================

function editHistory(index) {
  const data = globalHistoryData[index];
  isEditMode = true;
  globalOldNomorSt = data.nomorSt;

  // Set Dropdown ke 1 & Render ulang 1 form saja
  document.getElementById("jumlahSt").value = 1;
  renderForms(); // Ini akan membuat form dengan ID _0

  window.scrollTo({ top: 0, behavior: "smooth" });

  // Populate Form _0 dengan data terpilih
  document.getElementById("nomorSt_0").value = data.nomorSt;
  document.getElementById("namaKapal_0").value = data.kapal;
  document.getElementById("namaPerusahaan_0").value = data.perusahaan;

  try {
    const d = new Date(data.tanggal);
    if (!isNaN(d)) {
      document.getElementById("tglPeriksa_0").value = d
        .toISOString()
        .split("T")[0];
      autoHari(0);
    }
  } catch (e) {}

  // Set Inspector Select _0
  const sel = document.getElementById("inspectorSelect_0");
  for (let i = 0; i < sel.options.length; i++) {
    if (sel.options[i].value) {
      let optObj = JSON.parse(sel.options[i].value);
      if (optObj.name === data.pemeriksa) {
        sel.selectedIndex = i;
        break;
      }
    }
  }

  // Sembunyikan Tombol Default & Kunci Form
  document.getElementById("btnGenerate").classList.add("hidden");
  document.getElementById("editModeButtons").classList.add("hidden");
  disableForm(true);

  // Generate Single Preview
  generatePreview();

  // Tampilkan Tombol Edit setelah Preview muncul (Delay 400ms)
  setTimeout(() => {
    const editBtns = document.getElementById("editModeButtons");
    editBtns.classList.remove("hidden");
    editBtns.style.display = "flex";
    document.getElementById("btnUnlock").classList.remove("hidden");
    document.getElementById("btnCancelEdit").classList.remove("hidden");
    document.getElementById("btnUpdate").classList.add("hidden");
  }, 400);
}

function updateData() {
  const btn = document.getElementById("btnUpdate");
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Updating...';
  btn.disabled = true;

  const data = getFormDataByIndex(0); // Ambil form pertama saja

  // Payload Update
  const payload = {
    action: "update",
    oldNomorSt: globalOldNomorSt,
    ...data,
  };

  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify(payload) })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast("✅ Update Berhasil!", "success");
        cancelEditMode();
        fetchHistory();
      } else {
        showToast("Gagal Update.", "error");
      }
    })
    .finally(() => {
      btn.innerHTML = '<i class="fas fa-save"></i> Simpan Perubahan';
      btn.disabled = false;
    });
}

function enableEditForm() {
  disableForm(false);
  document.getElementById("btnUnlock").classList.add("hidden");
  document.getElementById("btnUpdate").classList.remove("hidden");

  // Kembalikan tombol Generate untuk opsi refresh preview
  const btnGen = document.getElementById("btnGenerate");
  btnGen.classList.remove("hidden");
  btnGen.innerHTML = '<i class="fas fa-sync"></i> Refresh Preview';
}

function cancelEditMode() {
  isEditMode = false;
  globalOldNomorSt = "";
  document.getElementById("stForm").reset();
  document.getElementById("editModeButtons").classList.add("hidden");

  // Reset Form ke Mode Batch
  document.getElementById("jumlahSt").disabled = false;
  renderForms();

  const btnGen = document.getElementById("btnGenerate");
  btnGen.classList.remove("hidden");
  btnGen.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Preview';
  closePreview();
}

// =========================================
// 7. DELETE MODAL LOGIC (FITUR BARU)
// =========================================

function confirmDelete(nomorSt) {
  deleteTargetId = nomorSt; // Simpan ID target ke global
  document.getElementById("deleteTargetText").innerText = nomorSt; // Ubah teks di modal
  const modal = document.getElementById("deleteModal");
  modal.classList.remove("hidden"); // Tampilkan modal
}

function closeDeleteModal() {
  deleteTargetId = null;
  document.getElementById("deleteModal").classList.add("hidden");
}

function executeDelete() {
  if (!deleteTargetId) return;

  const btnConfirm = document.querySelector(".btn-confirm-delete");
  const originalText = btnConfirm.innerHTML;

  btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Hapus...';
  btnConfirm.disabled = true;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "delete", nomorSt: deleteTargetId }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        showToast("Data berhasil dihapus.", "success");
        setTimeout(() => {
          fetchHistory();
          fetchNextNumber();
        }, 10);
      } else {
        showToast("Gagal menghapus data: " + (data.message || ""), "error");
      }
    })
    .catch((err) => {
      // Kita tambahkan log ke console biar tau error aslinya apa
      console.error("Error saat delete:", err);
      showToast("Error koneksi internet.", "error");
    })
    .finally(() => {
      btnConfirm.innerHTML = originalText;
      btnConfirm.disabled = false;
      closeDeleteModal();
    });
}

// =========================================
// 8. HELPER FUNCTIONS & TABLE RENDER
// =========================================

function getFormDataByIndex(index) {
  const inspJson = document.getElementById(`inspectorSelect_${index}`).value;
  return {
    nomorSt: document.getElementById(`nomorSt_${index}`).value,
    inspector: inspJson ? JSON.parse(inspJson) : null,
    tanggal: document.getElementById(`tglPeriksa_${index}`).value,
    hari: document.getElementById(`hariPeriksa_${index}`).value,
    kapal: document.getElementById(`namaKapal_${index}`).value,
    perusahaan: document.getElementById(`namaPerusahaan_${index}`).value,
  };
}

function validateForm(data, index) {
  if (
    !data.inspector ||
    !data.tanggal ||
    !data.kapal ||
    !data.perusahaan ||
    !data.nomorSt
  ) {
    showToast(`Data ST ke-${index + 1} belum lengkap!`, "error");
    return false;
  }
  return true;
}

function pad(num, size) {
  var s = "000000000" + num;
  return s.substr(s.length - size);
}

function disableForm(isDisabled) {
  const inputs = document.querySelectorAll("#stForm input, #stForm select");
  inputs.forEach((el) => (el.disabled = isDisabled));
}

function fetchHistory() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center">Loading...</td></tr>';
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getHistory" }),
  })
    .then((res) => res.json())
    .then((data) => {
      globalHistoryData = data || [];
      currentFilteredData = globalHistoryData;
      currentPage = 1;
      renderTable();
    });
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";
  if (currentFilteredData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Data tidak ditemukan.</td></tr>';
    return;
  }

  const start = (currentPage - 1) * rowsPerPage;
  const pageItems = currentFilteredData.slice(start, start + rowsPerPage);

  pageItems.forEach((row) => {
    const origIdx = globalHistoryData.indexOf(row);
    let linkDisplay =
      row.link && row.link.includes("http")
        ? `<a href="${row.link}" target="_blank" style="color:#d32f2f; font-weight:bold; text-decoration:none;"><i class="fas fa-file-pdf"></i> PDF</a>`
        : '<span style="color:#ccc">-</span>';

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.nomorSt}</td>
      <td>${formatDateIndo(row.tanggal)}</td>
      <td>${row.kapal}</td>
      <td>${row.perusahaan}</td>
      <td>${row.pemeriksa}</td>
      <td>
        <div class="action-group">
           <button class="btn-action btn-edit" onclick="editHistory(${origIdx})" title="Edit"><i class="fas fa-pencil-alt"></i></button>
           <button class="btn-action btn-delete" onclick="confirmDelete('${
             row.nomorSt
           }')" title="Hapus"><i class="fas fa-trash"></i></button>
           <div style="margin-left:8px;">${linkDisplay}</div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });
  updatePaginationInfo(
    start + 1,
    Math.min(start + rowsPerPage, currentFilteredData.length),
    currentFilteredData.length
  );
}

function updatePaginationInfo(s, e, t) {
  document.getElementById("pageInfo").innerText = `Show ${s}-${e} of ${t}`;
  document.getElementById("btnPrev").onclick = () => {
    currentPage--;
    renderTable();
  };
  document.getElementById("btnNext").onclick = () => {
    currentPage++;
    renderTable();
  };
  document.getElementById("btnPrev").disabled = currentPage === 1;
  document.getElementById("btnNext").disabled =
    currentPage >= Math.ceil(t / rowsPerPage);
}

function showPreviewSection() {
  document.getElementById("mainContainer").classList.add("has-preview");
  document.getElementById("previewSection").classList.remove("hidden");
  if (window.innerWidth < 1024)
    document
      .getElementById("previewSection")
      .scrollIntoView({ behavior: "smooth" });
}

function closePreview() {
  document.getElementById("mainContainer").classList.remove("has-preview");
  document.getElementById("previewSection").classList.add("hidden");
}

function showToast(msg, type = "success") {
  const box = document.getElementById("toast-container");
  const div = document.createElement("div");
  div.className = `toast ${type}`;
  div.innerHTML = msg;
  box.appendChild(div);
  setTimeout(() => div.remove(), 3000);
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
  return isNaN(d)
    ? str
    : `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}
