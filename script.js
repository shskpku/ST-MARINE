// =========================================
// 1. KONFIGURASI & VARIABEL GLOBAL
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

// VARIABEL PAGINATION & DATA
let globalHistoryData = [];
let currentFilteredData = [];
let currentPage = 1;
const rowsPerPage = 10;

// VARIABEL MODE EDIT
let isEditMode = false;
let globalOldNomorSt = "";

// =========================================
// 2. INITIALIZATION (DOM READY)
// =========================================
document.addEventListener("DOMContentLoaded", () => {
  populateInspectors();
  setupDateListener();

  // Setup Logo
  const imgElement = document.querySelector(".logo-container img");
  if (imgElement) imgElement.src = LOGO_LOCAL_PATH;

  // Initial Load
  fetchNextNumber();
  fetchHistory();

  // Event Listeners Tombol Utama
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

  // Event Listeners Mode Edit
  document
    .getElementById("btnUnlock")
    .addEventListener("click", enableEditForm);
  document.getElementById("btnUpdate").addEventListener("click", updateData);
  document
    .getElementById("btnCancelEdit")
    .addEventListener("click", cancelEditMode);

  // Event Listener Search
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
// 3. FUNGSI EDIT & UPDATE (FITUR BARU)
// =========================================

function editHistory(index) {
  const data = globalHistoryData[index];

  // A. Simpan State Edit
  globalOldNomorSt = data.nomorSt;
  isEditMode = true;

  // B. Scroll ke atas
  window.scrollTo({ top: 0, behavior: "smooth" });

  // C. Populate Form
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
    if (sel.options[i].value) {
      let optObj = JSON.parse(sel.options[i].value);
      if (optObj.name === data.pemeriksa) {
        sel.selectedIndex = i;
        break;
      }
    }
  }

  // D. Kunci Form & Sembunyikan Tombol Generate
  disableForm(true);
  document.getElementById("btnGenerate").classList.add("hidden");
  document.getElementById("editModeButtons").classList.add("hidden"); // Pastikan tombol edit sembunyi dulu

  // E. Render & Tampilkan Preview
  const previewData = {
    nomorSt: data.nomorSt,
    inspector: JSON.parse(sel.value),
    tanggal: document.getElementById("tglPeriksa").value,
    hari: document.getElementById("hariPeriksa").value,
    kapal: data.kapal,
    perusahaan: data.perusahaan,
  };

  renderPreview(previewData);
  showPreviewSection();

  // F. Munculkan Tombol Edit SETELAH Preview Muncul (Delay dikit biar smooth)
  setTimeout(() => {
    const editBtns = document.getElementById("editModeButtons");
    editBtns.classList.remove("hidden");
    editBtns.style.display = "flex";

    document.getElementById("btnUnlock").classList.remove("hidden");
    document.getElementById("btnCancelEdit").classList.remove("hidden");
    document.getElementById("btnUpdate").classList.add("hidden"); // Simpan masih sembunyi

    showToast("Mode Pratinjau. Klik 'Ubah Data' untuk mengedit.", "info");
  }, 400);
}

function enableEditForm() {
  disableForm(false);

  // UI Changes
  document.getElementById("btnUnlock").classList.add("hidden");
  document.getElementById("btnUpdate").classList.remove("hidden");

  // Munculkan tombol Refresh Preview (sebelumnya Generate)
  const btnGen = document.getElementById("btnGenerate");
  btnGen.classList.remove("hidden");
  btnGen.innerHTML = '<i class="fas fa-sync"></i> Refresh Preview';

  showToast("Form aktif. Silakan edit data.", "success");
}

function cancelEditMode() {
  isEditMode = false;
  globalOldNomorSt = "";

  // Reset Form
  document.getElementById("stForm").reset();
  disableForm(false);

  // Reset UI Buttons
  const btnGen = document.getElementById("btnGenerate");
  btnGen.classList.remove("hidden");
  btnGen.innerHTML = '<i class="fas fa-file-pdf"></i> Generate Preview';

  document.getElementById("editModeButtons").classList.add("hidden");
  document.getElementById("editModeButtons").style.display = "none";

  closePreview();
  fetchNextNumber(); // Ambil nomor baru lagi
}

function updateData() {
  const btn = document.getElementById("btnUpdate");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  btn.disabled = true;

  const data = getFormData();
  if (!validateForm(data)) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  // Payload Update
  const payload = {
    action: "update",
    oldNomorSt: globalOldNomorSt,
    ...data,
  };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast("✅ Data Berhasil Diperbarui!", "success");
        cancelEditMode(); // Reset form
        fetchHistory(); // Reload tabel
      } else {
        showToast("Gagal Update: " + result.message, "error");
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

function disableForm(isDisabled) {
  const formInputs = document.querySelectorAll("#stForm input, #stForm select");
  formInputs.forEach((input) => {
    input.disabled = isDisabled;
  });
}

// =========================================
// 4. LOGIKA UTAMA (SAVE, GET, RENDER)
// =========================================

function fetchHistory() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

  document.getElementById("btnPrev").disabled = true;
  document.getElementById("btnNext").disabled = true;

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
    })
    .catch(() => {
      tbody.innerHTML =
        '<tr><td colspan="6" style="text-align:center; color:red">Gagal koneksi.</td></tr>';
    });
}

function renderTable() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  if (currentFilteredData.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" style="text-align:center">Data tidak ditemukan.</td></tr>';
    updatePaginationInfo(0, 0, 0);
    return;
  }

  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedItems = currentFilteredData.slice(startIndex, endIndex);

  paginatedItems.forEach((row) => {
    // Cari index asli di global data
    const originalIndex = globalHistoryData.indexOf(row);

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
      linkDisplay = `<a href="${row.link}" target="_blank" title="Buka PDF" style="color:#d32f2f; font-weight:bold; text-decoration:none;">
                      <i class="fas fa-file-pdf"></i> PDF
                     </a>`;
    }

    tr.innerHTML = `
      <td>${row.nomorSt}</td>
      <td>${tglView}</td>
      <td>${row.kapal}</td>
      <td>${row.perusahaan}</td>
      <td>${row.pemeriksa}</td>
      <td>
        <div class="action-group">
           <button class="btn-action btn-view" onclick="viewHistory(${originalIndex})" title="Lihat"><i class="fas fa-eye"></i></button>
           <button class="btn-action btn-edit" onclick="editHistory(${originalIndex})" title="Edit"><i class="fas fa-pencil-alt"></i></button>
           <button class="btn-action btn-delete" onclick="deleteHistory('${row.nomorSt}')" title="Hapus"><i class="fas fa-trash"></i></button>
           <div style="margin-left:8px;">${linkDisplay}</div>
        </div>
      </td>`;
    tbody.appendChild(tr);
  });

  updatePaginationInfo(
    startIndex + 1,
    Math.min(endIndex, currentFilteredData.length),
    currentFilteredData.length
  );
}

function saveData() {
  const btn = document.getElementById("btnSimpan");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
  btn.disabled = true;

  const data = getFormData();
  if (!validateForm(data)) {
    btn.innerHTML = originalText;
    btn.disabled = false;
    return;
  }

  const payload = { action: "save", ...data };

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify(payload),
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast("✅ Berhasil Simpan ke Drive!", "success");
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

function deleteHistory(nomorSt) {
  if (confirm(`⚠️ Yakin hapus Surat Tugas No: ${nomorSt}?`)) {
    showToast("Sedang menghapus...", "success");
    fetch(SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "delete", nomorSt: nomorSt }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          showToast("Data berhasil dihapus.", "success");
          fetchHistory();
          fetchNextNumber();
        } else {
          showToast("Gagal menghapus.", "error");
        }
      });
  }
}

// =========================================
// 5. HELPER FUNCTIONS
// =========================================

function generatePreview() {
  const data = getFormData();
  if (!validateForm(data)) return;
  renderPreview(data);
  showPreviewSection();
}

function fetchNextNumber() {
  // Jika sedang mode edit, jangan ambil nomor baru
  if (isEditMode) return;

  const input = document.getElementById("nomorSt");
  if (input.value && input.value.includes("Tahun")) return;
  input.placeholder = "Mengambil nomor...";
  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getNextNumber" }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.status === "success") {
        const year = new Date().getFullYear();
        if (!data.nextNumber.includes("Tahun")) {
          input.value = `${data.nextNumber} Tahun ${year}`;
        } else {
          input.value = data.nextNumber;
        }
      }
    })
    .catch(() => {
      input.placeholder = "Isi nomor manual...";
    });
}

function viewHistory(index) {
  // Fungsi View Biasa (Read Only tanpa opsi Edit form)
  const data = globalHistoryData[index];
  const inspector = inspectors.find((i) => i.name === data.pemeriksa) || {
    name: data.pemeriksa,
    nip: "-",
  };

  // Render object dummy untuk preview
  const viewData = {
    nomorSt: data.nomorSt,
    inspector: inspector,
    tanggal: data.tanggal,
    hari: new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(
      new Date(data.tanggal)
    ),
    kapal: data.kapal,
    perusahaan: data.perusahaan,
  };

  renderPreview(viewData);
  showPreviewSection();

  // Pastikan tombol edit mode tidak muncul di mode View biasa
  document.getElementById("editModeButtons").classList.add("hidden");
  document.getElementById("editModeButtons").style.display = "none";
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

function closePreview() {
  document.getElementById("mainContainer").classList.remove("has-preview");
  document.getElementById("previewSection").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showToast(message, type = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML =
    (type === "success"
      ? '<i class="fas fa-check-circle"></i>'
      : '<i class="fas fa-exclamation-circle"></i>') +
    `<span class="toast-message">${message}</span>`;
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
      document.getElementById("hariPeriksa").value = new Intl.DateTimeFormat(
        "id-ID",
        { weekday: "long" }
      ).format(new Date(e.target.value));
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
  return isNaN(d)
    ? str
    : `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`;
}

function updatePaginationInfo(start, end, total) {
  const info = document.getElementById("pageInfo");
  const btnPrev = document.getElementById("btnPrev");
  const btnNext = document.getElementById("btnNext");

  if (total === 0) {
    info.innerText = "Tidak ada data";
    btnPrev.disabled = true;
    btnNext.disabled = true;
    return;
  }

  info.innerText = `Menampilkan ${start} - ${end} dari ${total} data`;
  btnPrev.disabled = currentPage === 1;
  const totalPages = Math.ceil(total / rowsPerPage);
  btnNext.disabled = currentPage === totalPages;

  // Set onclick untuk pagination (karena ini bukan listener statis)
  btnPrev.onclick = () => changePage(-1);
  btnNext.onclick = () => changePage(1);
}

function changePage(direction) {
  currentPage += direction;
  renderTable();
}
