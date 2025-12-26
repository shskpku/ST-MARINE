// === KONFIGURASI ===
// Pastikan URL diakhiri /exec
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8-_zLyl4pnLbaYsATG7AhRtMcrCAjwxiGZtYB1RNYMS3p2GXaOmQDe1h-HLY_oo_S/exec";
const LOGO_LOCAL_PATH = "logo-kemenhub.png"; 

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
  
  const imgElement = document.querySelector(".logo-container img");
  if(imgElement) imgElement.src = LOGO_LOCAL_PATH;

  fetchNextNumber();
  fetchHistory();

  document.getElementById("btnGenerate").addEventListener("click", generatePreview);
  document.getElementById("btnClosePreview").addEventListener("click", closePreview);
  document.getElementById("btnSimpan").addEventListener("click", saveData);
  document.getElementById("btnDownload").addEventListener("click", () => window.print());
  document.getElementById("searchHistory").addEventListener("keyup", filterHistory);
});

function saveData() {
  const btn = document.getElementById("btnSimpan");
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses Dokumen...';
  btn.disabled = true;

  const data = getFormData();
  if (!validateForm(data)) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      return;
  }
  
  const payload = data; 
  payload.action = "save";
  
  fetch(SCRIPT_URL, {
    method: "POST", body: JSON.stringify(payload),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  })
    .then((res) => res.json())
    .then((result) => {
      if (result.status === "success") {
        showToast("✅ Dokumen PDF Berhasil Dibuat!", "success");
        document.getElementById("stForm").reset();
        document.getElementById("inspectorSelect").selectedIndex = 0;
        fetchHistory(); fetchNextNumber(); closePreview();
      } else {
        showToast("Gagal: " + result.message, "error");
      }
    })
    .catch((err) => { console.error(err); showToast("Error koneksi.", "error"); })
    .finally(() => { btn.innerHTML = originalText; btn.disabled = false; });
}

function fetchNextNumber() {
  const input = document.getElementById("nomorSt");
  if (input.value && !input.value.includes("Tahun")) return;
  input.placeholder = "Mengambil nomor...";
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "getNextNumber" }) })
  .then(res => res.json()).then(data => { if (data.status === "success") input.value = `${data.nextNumber} Tahun ${new Date().getFullYear()}`; })
  .catch(err => { input.placeholder = "Isi nomor manual..."; });
}

function fetchHistory() {
  const tbody = document.querySelector("#historyTable tbody");
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center"><i class="fas fa-spinner fa-spin"></i> Memuat...</td></tr>';
  fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "getHistory" }) })
  .then((res) => res.json()).then((data) => {
      tbody.innerHTML = "";
      if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Belum ada riwayat.</td></tr>'; return; }
      globalHistoryData = data; 
      data.forEach((row, index) => {
        const tr = document.createElement("tr");
        let tglView = row.tanggal; try { tglView = new Date(row.tanggal).toLocaleDateString("id-ID", { day: 'numeric', month: 'short', year: 'numeric' }); } catch(e){}
        let linkDisplay = row.link && row.link.includes('http') ? `<a href="${row.link}" target="_blank" style="color:#d32f2f; font-weight:bold;"><i class="fas fa-file-pdf"></i> PDF</a>` : `<span style="color:#ccc;">-</span>`;
        tr.innerHTML = `<td>${row.nomorSt}</td><td>${tglView}</td><td>${row.kapal}</td><td>${row.perusahaan}</td><td>${row.pemeriksa}</td>
                <td><div class="action-group"><button class="btn-action btn-view" onclick="viewHistory(${index})"><i class="fas fa-eye"></i></button><button class="btn-action btn-edit" onclick="editHistory(${index})"><i class="fas fa-pencil-alt"></i></button><button class="btn-action btn-delete" onclick="deleteHistory('${row.nomorSt}')"><i class="fas fa-trash"></i></button><div style="margin-left:5px;">${linkDisplay}</div></div></td>`;
        tbody.appendChild(tr);
      });
  }).catch((err) => { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red">Gagal koneksi.</td></tr>'; });
}

function deleteHistory(nomorSt) {
    if (confirm(`⚠️ Yakin hapus ${nomorSt}? Data Excel & Drive akan dihapus.`)) {
        showToast("Sedang menghapus...", "success");
        fetch(SCRIPT_URL, { method: "POST", body: JSON.stringify({ action: "delete", nomorSt: nomorSt }) })
        .then(res => res.json()).then(data => { if(data.status === 'success') { showToast("Dihapus.", "success"); fetchHistory(); fetchNextNumber(); } else { showToast("Gagal.", "error"); } });
    }
}
function filterHistory() {
  const filter = document.getElementById("searchHistory").value.toLowerCase();
  const tr = document.getElementById("historyTable").getElementsByTagName("tr");
  for (let i = 1; i < tr.length; i++) {
    let match = false;
    const tdArray = tr[i].getElementsByTagName("td");
    for (let j = 0; j < tdArray.length; j++) { if (tdArray[j] && (tdArray[j].textContent || tdArray[j].innerText).toLowerCase().indexOf(filter) > -1) { match = true; break; } }
    tr[i].style.display = match ? "" : "none";
  }
}

// HELPER UI
function getFormData() { const inspJson = document.getElementById("inspectorSelect").value; return { nomorSt: document.getElementById("nomorSt").value, inspector: inspJson ? JSON.parse(inspJson) : null, tanggal: document.getElementById("tglPeriksa").value, hari: document.getElementById("hariPeriksa").value, kapal: document.getElementById("namaKapal").value, perusahaan: document.getElementById("namaPerusahaan").value, }; }
function validateForm(data) { if (!data.inspector || !data.tanggal || !data.kapal || !data.perusahaan || !data.nomorSt) { showToast("Lengkapi form!", "error"); return false; } return true; }
function generatePreview() { const data = getFormData(); if (!validateForm(data)) return; renderPreview(data); showPreviewSection(); }
function renderPreview(data) { const d = formatDateIndo(data.tanggal); document.getElementById("displayNomorSt").innerText = data.nomorSt; document.getElementById("displayPerusahaanDasar").innerText = data.perusahaan; document.getElementById("displayNamaPemeriksa").innerText = data.inspector.name; document.getElementById("displayNip").innerText = data.inspector.nip; document.getElementById("displayNamaKapal").innerText = data.kapal; document.getElementById("displayHari").innerText = data.hari; document.getElementById("displayTanggal").innerText = d; document.getElementById("displayTanggalBerlaku").innerText = d; document.getElementById("displayTanggalTtd").innerText = d; document.getElementById("displayPerusahaanTembusan").innerText = data.perusahaan; }
function viewHistory(index) { const data = globalHistoryData[index]; data.inspector = inspectors.find(i => i.name === data.pemeriksa) || { name: data.pemeriksa, nip: "-" }; renderPreview(data); showPreviewSection(); }
function editHistory(index) { const data = globalHistoryData[index]; window.scrollTo({ top: 0, behavior: 'smooth' }); document.getElementById("nomorSt").value = data.nomorSt; document.getElementById("namaKapal").value = data.kapal; document.getElementById("namaPerusahaan").value = data.perusahaan; try { const dateObj = new Date(data.tanggal); if(!isNaN(dateObj)) { document.getElementById("tglPeriksa").value = dateObj.toISOString().split('T')[0]; document.getElementById("tglPeriksa").dispatchEvent(new Event('change')); } } catch(e){} const sel = document.getElementById("inspectorSelect"); for (let i = 0; i < sel.options.length; i++) { if (sel.options[i].text === data.pemeriksa) { sel.selectedIndex = i; break; } } showToast("Data siap diedit.", "success"); }
function showPreviewSection() { document.getElementById("mainContainer").classList.add("has-preview"); document.getElementById("previewSection").classList.remove("hidden"); if (window.innerWidth < 1024) document.getElementById("previewSection").scrollIntoView({ behavior: "smooth" }); }
function closePreview() { document.getElementById("mainContainer").classList.remove("has-preview"); document.getElementById("previewSection").classList.add("hidden"); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function populateInspectors() { const sel = document.getElementById("inspectorSelect"); sel.innerHTML = '<option value="">-- Pilih Inspector --</option>'; inspectors.forEach((i) => { let opt = document.createElement("option"); opt.value = JSON.stringify(i); opt.innerText = i.name; sel.appendChild(opt); }); }
function setupDateListener() { document.getElementById("tglPeriksa").addEventListener("change", (e) => { if (e.target.value) { document.getElementById("hariPeriksa").value = new Intl.DateTimeFormat("id-ID", { weekday: "long" }).format(new Date(e.target.value)); } }); }
function formatDateIndo(str) { const d = new Date(str); const m = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"]; if(isNaN(d)) return str; return `${d.getDate()} ${m[d.getMonth()]} ${d.getFullYear()}`; }
function showToast(message, type = "success") { const container = document.getElementById("toast-container"); const toast = document.createElement("div"); toast.className = `toast ${type}`; const icon = type === "success" ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'; toast.innerHTML = `${icon}<span class="toast-message">${message}</span>`; container.appendChild(toast); setTimeout(() => { toast.style.animation = "fadeOut 0.5s forwards"; setTimeout(() => toast.remove(), 500); }, 4000); }
