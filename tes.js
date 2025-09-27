// ================================
// GLOBAL STATE
// ================================
let pieChart = null;
let barChart = null;
let lineChart = null;
let currentPage = 1;
const rowsPerPage = 20;
let currentTableData = []; // global untuk tabel

// ================================
// HELPER: FORMAT ANGKA
// ================================
function formatNumber(num, decimals = 4) {
  if (num == null || isNaN(num)) return "0";
  const fixed = num.toFixed(decimals);
  if (Number(fixed) % 1 === 0) {
    return Number(fixed).toLocaleString("id-ID", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  return Number(fixed).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function truncate4(num) {
  if (!num || isNaN(num)) return 0;
  return Number(num.toFixed(4));
}

function parseNumber(val) {
  if (val == null) return 0;
  let str = String(val).trim();
  if (str === "" || str === "-") return 0;
  str = str.replace(/,/g, ".");
  const dotCount = (str.match(/\./g) || []).length;
  if (dotCount === 0) return parseFloat(str) || 0;
  if (dotCount === 1) {
    const [intPart, fracPart = ""] = str.split(".");
    if (fracPart.length === 3) return parseFloat(intPart + fracPart) || 0;
    return parseFloat(str) || 0;
  }
  return parseFloat(str.replace(/\./g, "")) || 0;
}

function getLuasParsed(item) {
  return parseNumber(item.luas);
}

// ================================
// TABLE
// ================================
function renderTable(data) {
  const tbody = document.querySelector("#tableDashboard tbody");
  if (!tbody) return;
  currentTableData = data;
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = data.slice(start, end);
  tbody.innerHTML = "";
  pageData.forEach((d, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${start + i + 1}</td>
      <td>${d.kecamatan}</td>
      <td>${d.komoditas}</td>
      <td>${formatNumber(getLuasParsed(d), 2)}</td>
      <td>${d.tahun}</td>`;
    tbody.appendChild(tr);
  });
  renderPagination(data.length);
  console.log("✅ renderTable(): tampil", pageData.length, "baris dari total", data.length);
}

function renderPagination(totalRows) {
  const container = document.getElementById("pagination");
  if (!container) return;
  container.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages <= 1) return;
  const wrapper = document.createElement("div");
  wrapper.className = "pagination";
  const prev = document.createElement("button");
  prev.textContent = "«";
  prev.disabled = currentPage === 1;
  prev.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable(currentTableData);
    }
  });
  wrapper.appendChild(prev);
  const maxVisible = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - maxVisible && i <= currentPage + maxVisible)) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderTable(currentTableData);
      });
      wrapper.appendChild(btn);
    } else if (i === currentPage - (maxVisible + 1) || i === currentPage + (maxVisible + 1)) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.style.padding = "6px 10px";
      wrapper.appendChild(dots);
    }
  }
  const next = document.createElement("button");
  next.textContent = "»";
  next.disabled = currentPage === totalPages;
  next.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable(currentTableData);
    }
  });
  wrapper.appendChild(next);
  container.appendChild(wrapper);
}

// ================================
// CHARTS
// ================================
function renderCharts(dataJson) {
  if (!dataJson) return;
  console.group("renderCharts Debug");
  console.log("Data diterima:", dataJson.length);
  console.table(dataJson.slice(0, 20));
  console.groupEnd();

  const selectedKec = document.querySelector("#filterKecamatan")?.value || "";
  let filteredData = selectedKec ? dataJson.filter(d => d.kecamatan === selectedKec && d.kecamatan !== "Aceh Utara") : [...dataJson];

  // PIE
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    filteredData.forEach(item => {
      if (item.kecamatan === "Aceh Utara") return;
      const luas = getLuasParsed(item);
      if (luas <= 0) return;
      agg[item.komoditas || "Lainnya"] = (agg[item.komoditas || "Lainnya"] || 0) + luas;
    });
    const labels = Object.keys(agg);
    const series = Object.values(agg).map(v => truncate4(v));
    if (pieChart) pieChart.destroy();
    pieChart = new ApexCharts(pieEl, {
      chart: { type: "donut", height: 400 },
      labels,
      series,
      dataLabels: { enabled: true, formatter: (val, opts) => formatNumber(opts.w.config.series[opts.seriesIndex], 2) },
      tooltip: { y: { formatter: val => formatNumber(val, 2) } },
      legend: { show: true },
      noData: { text: "Tidak ada data" },
    });
    pieChart.render();
  }

  // BAR
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const agg = {};
    dataJson.forEach(d => {
      if (d.kecamatan === "Aceh Utara" || d.luas == null) return;
      const luas = getLuasParsed(d);
      agg[d.kecamatan] = (agg[d.kecamatan] || 0) + luas;
    });
    let arr = Object.entries(agg).map(([kec, luas]) => ({ kec, luas: truncate4(luas) }));
    arr.sort((a, b) => b.luas - a.luas);
    arr = arr.slice(0, 10);
    if (barChart) barChart.destroy();
    barChart = new ApexCharts(barEl, {
      chart: { type: "bar", height: 400 },
      plotOptions: { bar: { horizontal: true, distributed: true, borderRadius: 4 } },
      series: [{ name: "Luas Panen", data: arr.map(d => d.luas) }],
      xaxis: { categories: arr.map(d => d.kec) },
      dataLabels: { enabled: true, formatter: val => formatNumber(val, 2) },
      tooltip: { y: { formatter: val => formatNumber(val, 2) } },
      colors: ["#1E88E5", "#FB8C00", "#8E24AA", "#43A047", "#F4511E"],
      legend: { show: false },
      noData: { text: "Tidak ada data" },
    });
    barChart.render();
  }
}

// ================================
// KPI
// ================================
function updateKPI(filtered, allData) {
  const sourceData = filtered.length ? filtered : allData;
  const debugRows = sourceData.map((d, i) => ({ idx: i, kec: d.kecamatan, kom: d.komoditas, raw: d.luas, parsed: getLuasParsed(d) }));
  const totalLuas = debugRows.reduce((s, r) => s + (r.parsed || 0), 0);
  $("#totalLuas").text(formatNumber(totalLuas, 2));
  console.group("KPI Debug");
  console.log("rows:", sourceData.length);
  console.log("parsed>0:", debugRows.filter(r => r.parsed > 0).length);
  console.log("totalLuas:", totalLuas);
  console.table(debugRows.slice(0, 30));
  console.groupEnd();
}

// ================================
// INIT
// ================================
window.initDashboard = function(allData) {
  console.log("🔥 initDashboard():", allData.length, "records");
  console.table(allData.slice(0, 30));
  if (!allData.length) return;

  const fillSelect = (id, values) => {
    const el = document.querySelector(id);
    if (!el) return;
    values = Array.from(values).sort();
    values.forEach(v => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = v;
      el.appendChild(opt);
    });
  };
  fillSelect("#filterKecamatan", new Set(allData.map(d => d.kecamatan).filter(k => k && k !== "Aceh Utara")));
  fillSelect("#filterKomoditas", new Set(allData.map(d => d.komoditas).filter(k => k)));
  fillSelect("#filterTahun", new Set(allData.map(d => d.tahun).filter(t => t)));

  function applyFilters() {
    const kec = document.querySelector("#filterKecamatan")?.value || "";
    const kom = document.querySelector("#filterKomoditas")?.value || "";
    const thn = document.querySelector("#filterTahun")?.value || "";
    const filtered = allData.filter(d => (!kec || d.kecamatan === kec) && (!kom || d.komoditas === kom) && (!thn || String(d.tahun) === String(thn)));
    console.group("applyFilters Debug");
    console.log("Filter:", { kec, kom, thn });
    console.log("Filtered records:", filtered.length);
    console.table(filtered.slice(0, 30));
    console.groupEnd();
    updateKPI(filtered, allData);
    renderCharts(filtered);
    renderTable(filtered);
    renderMap();
  }

  ["#filterKecamatan", "#filterKomoditas", "#filterTahun"].forEach(sel => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });
  applyFilters();
};