// === KONFIGURASI ===
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

// === VARIABEL GLOBAL PAGINATION & DATA ===
let globalHistoryData = []; // Menyimpan semua data mentah dari server
let currentFilteredData = []; // Menyimpan data setelah difilter (search)
let currentPage = 1;
const rowsPerPage = 10; // MAKSIMAL 10 DATA PER HALAMAN

document.addEventListener("DOMContentLoaded", () => {
  populateInspectors();
  setupDateListener();

  // Setup Logo
  const imgElement = document.querySelector(".logo-container img");
  if (imgElement) imgElement.src = LOGO_LOCAL_PATH;

  // Initial Load
  fetchNextNumber();
  fetchHistory();

  // Event Listeners Tombol
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

  // EVENT LISTENER SEARCH (LIVE SEARCH)
  document
    .getElementById("searchInput")
    .addEventListener("keyup", function (e) {
      const term = e.target.value.toLowerCase();

      // Filter data global
      currentFilteredData = globalHistoryData.filter(
        (row) =>
          row.kapal.toLowerCase().includes(term) ||
          row.perusahaan.toLowerCase().includes(term) ||
          row.pemeriksa.toLowerCase().includes(term) ||
          String(row.nomorSt).toLowerCase().includes(term)
      );

      // Reset ke halaman 1 setiap kali mengetik
      currentPage = 1;
      renderTable();
    });
});

// =========================================
// LOGIKA PAGINATION & RENDER TABEL
// =========================================

function fetchHistory() {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML =
    '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';

  // Disable tombol pagination saat loading
  document.getElementById("btnPrev").disabled = true;
  document.getElementById("btnNext").disabled = true;

  fetch(SCRIPT_URL, {
    method: "POST",
    body: JSON.stringify({ action: "getHistory" }),
  })
    .then((res) => res.json())
    .then((data) => {
      globalHistoryData = data || [];
      currentFilteredData = globalHistoryData; // Awalnya filtered sama dengan global
      currentPage = 1; // Reset halaman
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

  // HITUNG INDEX DATA UNTUK HALAMAN SAAT INI
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;

  // AMBIL POTONGAN DATA (SLICE)
  const paginatedItems = currentFilteredData.slice(startIndex, endIndex);

  // LOOP RENDER DATA
  paginatedItems.forEach((row) => {
    // Cari index ASLI di global data untuk fungsi Edit/Hapus agar tidak salah hapus
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

  // UPDATE INFO PAGINATION
  updatePaginationInfo(
    startIndex + 1,
    Math.min(endIndex, currentFilteredData.length),
    currentFilteredData.length
  );
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

  // Logika Tombol Prev
  btnPrev.disabled = currentPage === 1;

  // Logika Tombol Next
  // Hitung total halaman: misal 15 data / 10 = 2 halaman
  const totalPages = Math.ceil(total / rowsPerPage);
  btnNext.disabled = currentPage === totalPages;
}

function changePage(direction) {
  // direction: -1 (mundur) atau 1 (maju)
  currentPage += direction;
  renderTable();
}

// =========================================
// FUNGSI STANDAR LAINNYA (TETAP SAMA)
// =========================================

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
    headers: { "Content-Type": "text/plain;charset=utf-8" },
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

function generatePreview() {
  const data = getFormData();
  if (!validateForm(data)) return;
  renderPreview(data);
  showPreviewSection();
}

function fetchNextNumber() {
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
  closePreview();

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
  showToast("Data dimuat ke formulir.", "success");
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

function closePreview() {
  document.getElementById("mainContainer").classList.remove("has-preview");
  document.getElementById("previewSection").classList.add("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
