// ================================
// GLOBAL STATE
// ================================
let pieChart = null;
let barChart = null;
let lineChart = null;
let currentPage = 1;
const rowsPerPage = 20; // tampilkan 20 data per halaman
let currentTableData = []; // global untuk tabel

// ================================
// HELPER: FORMAT ANGKA (SMART VERSION)
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

// ================================
// HELPER: TRUNCATE ANGKA
// ================================
function truncate4(num) {
  if (!num || isNaN(num)) return 0;
  return Number(num.toFixed(4)); // aman, sesuai JSON
}

// ================================
// KONVERSI LUAS & SATUAN
// ================================
function getLuasDanSatuan(item) {
  return {
    luas: Number(item.luas) || 0,
    satuan: "Ha",
  };
}

// ================================
// RENDER TABLE
// ================================
function renderTable(data) {
  const tbody = document.querySelector("#tableDashboard tbody");
  if (!tbody) {
    console.warn("⚠️ Tidak menemukan #tableDashboard tbody");
    return;
  }
  tbody.innerHTML = "";

  data.forEach((d, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${i + 1}</td>
      <td>${d.kecamatan}</td>
      <td>${d.komoditas}</td>
      <td>${d.luas}</td>
      <td>${d.tahun}</td>
    `;
    tbody.appendChild(tr);
  });

  console.log("✅ renderTable(): isi", data.length, "baris");
}

// ================================
// RENDER PAGINATION
// ================================
function renderPagination(totalRows) {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  if (totalPages <= 1) return;

  const paginationWrapper = document.createElement("div");
  paginationWrapper.className = "pagination";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "«";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTable(currentTableData);
    }
  });
  paginationWrapper.appendChild(prevBtn);

  const maxVisible = 2;
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - maxVisible && i <= currentPage + maxVisible)
    ) {
      const btn = document.createElement("button");
      btn.textContent = i;
      btn.className = i === currentPage ? "active" : "";
      btn.addEventListener("click", () => {
        currentPage = i;
        renderTable(currentTableData);
      });
      paginationWrapper.appendChild(btn);
    } else if (
      i === currentPage - (maxVisible + 1) ||
      i === currentPage + (maxVisible + 1)
    ) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.style.padding = "6px 10px";
      paginationWrapper.appendChild(dots);
    }
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "»";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTable(currentTableData);
    }
  });
  paginationWrapper.appendChild(nextBtn);

  container.appendChild(paginationWrapper);
}

// ================================
// RENDER CHARTS
// ================================
function renderCharts(dataJson) {
  if (!dataJson) return;

  const selectedKec = document.querySelector("#filterKecamatan")?.value || "";
  let filteredData = selectedKec
    ? dataJson.filter(
        (d) => d.kecamatan === selectedKec && d.kecamatan !== "Aceh Utara"
      )
    : [...dataJson];

  // PIE
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    filteredData.forEach((item) => {
      if (item.kecamatan === "Aceh Utara") return;
      const luas = getLuasParsed(item); // ✅ pakai parser baru
      if (luas <= 0) return;
      agg[item.komoditas || "Lainnya"] =
        (agg[item.komoditas || "Lainnya"] || 0) + luas;
    });

    const labels = Object.keys(agg);
    const series = Object.values(agg).map((v) => truncate4(v));

    const pieOptions = {
      chart: { type: "donut", height: 400 },
      labels,
      series,
      dataLabels: {
        enabled: true,
        formatter: (val, opts) => {
          const realVal = opts.w.config.series[opts.seriesIndex];
          return formatNumber(realVal, 2); // ✅ tampilkan angka asli, bukan persen
        },
      },
      tooltip: {
        y: { formatter: (val) => formatNumber(val, 2) },
      },
      legend: { show: true },
      noData: { text: "Tidak ada data" },
    };

    if (pieChart) pieChart.destroy();
    pieChart = new ApexCharts(pieEl, pieOptions);
    pieChart.render();
  }

  // BAR
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const agg = {};
    dataJson.forEach((d) => {
      if (d.kecamatan === "Aceh Utara" || d.luas == null) return;
      const luas = getLuasParsed(d); // ✅ pakai parser baru
      agg[d.kecamatan] = (agg[d.kecamatan] || 0) + luas;
    });

    let arr = Object.entries(agg).map(([kec, luas]) => ({
      kec,
      luas: truncate4(luas),
    }));
    arr.sort((a, b) => b.luas - a.luas);
    arr = arr.slice(0, 10);

    const categories = arr.map((d) => d.kec);
    const seriesData = arr.map((d) => d.luas);

    const barOptions = {
      chart: { type: "bar", height: 400 },
      plotOptions: {
        bar: { horizontal: true, distributed: true, borderRadius: 4 },
      },
      series: [{ name: "Luas Panen", data: seriesData }],
      xaxis: { categories },
      dataLabels: {
        enabled: true,
        formatter: (val) => formatNumber(val, 2), // ✅ tampilkan ribuan benar
      },
      tooltip: {
        y: { formatter: (val) => formatNumber(val, 2) },
      },
      colors: ["#1E88E5", "#FB8C00", "#8E24AA", "#43A047", "#F4511E"],
      legend: { show: false },
      noData: { text: "Tidak ada data" },
    };

    if (barChart) barChart.destroy();
    barChart = new ApexCharts(barEl, barOptions);
    barChart.render();
  }

  // LINE (dummy tetap)
  const lineEl = document.querySelector("#lineChart");
  if (lineEl) {
    const lineOptions = {
      chart: { type: "line", height: 400, toolbar: { show: false } },
      series: [
        {
          name: "Padi",
          data: [6200.123456, 6400.56789, 6500.11119, 6700.2].map(truncate4),
        },
        {
          name: "Jagung",
          data: [4800.1234, 5000.5678, 5200.9876, 5300.5432].map(truncate4),
        },
      ],
      xaxis: { categories: ["2020", "2021", "2022", "2023"] },
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 4 },
    };

    if (lineChart) lineChart.updateOptions(lineOptions);
    else {
      lineChart = new ApexCharts(lineEl, lineOptions);
      lineChart.render();
    }
  }
}

// ================================
// PARSER ANGKA (AMAN UNTUK FORMAT ID)
// ================================
function parseNumber(val) {
  if (val == null) return 0;
  let str = String(val).trim();

  // jika kosong atau "-"
  if (str === "" || str === "-") return 0;

  // normalisasi koma jadi titik
  str = str.replace(/,/g, ".");

  const dotCount = (str.match(/\./g) || []).length;

  if (dotCount === 0) {
    return parseFloat(str) || 0;
  }

  if (dotCount === 1) {
    const [intPart, fracPart = ""] = str.split(".");
    if (fracPart.length === 3) {
      // satu titik + 3 digit di belakang => ribuan
      return parseFloat(intPart + fracPart) || 0;
    } else {
      // 1-2 digit => desimal
      return parseFloat(str) || 0;
    }
  }

  // dotCount > 1 => buang semua titik (anggap semua sebagai pemisah ribuan)
  return parseFloat(str.replace(/\./g, "")) || 0;
}

function getLuasParsed(item) {
  return parseNumber(item.luas);
}

function updateKPI(filtered, allData) {
  const sourceData = filtered && filtered.length ? filtered : allData || [];
  const activeKom = document.querySelector("#filterKomoditas")?.value || ""; // "" => semua
  const onlyKom = activeKom && activeKom.trim() !== "";

  // ambil baris yang relevant (exclude Aceh Utara)
  const rows = sourceData.filter(
    (d) =>
      d &&
      d.kecamatan !== "Aceh Utara" &&
      (!onlyKom || d.komoditas === activeKom)
  );

  // parse tiap row dan kumpulkan debug info
  const debugRows = rows.map((d, i) => {
    const parsed = getLuasParsed(d);
    return {
      idx: i,
      kecamatan: d.kecamatan,
      komoditas: d.komoditas,
      raw: d.luas,
      parsed: parsed,
    };
  });

  // hitung total
  const totalLuas = debugRows.reduce((s, r) => s + (Number(r.parsed) || 0), 0);

  // tampilkan KPI
  $("#totalLuas").text(formatNumber(totalLuas, 2)); // 2 decimal supaya sesuai Excel jika ada koma

  // rata2 harga (sesuaikan apakah ingin per komoditas atau semua)
  const hargaList = rows
    .map((d) => Number(d.harga))
    .filter((h) => !isNaN(h) && h > 0);
  const hargaRata = hargaList.length
    ? hargaList.reduce((a, b) => a + b, 0) / hargaList.length
    : 0;
  $("#hargaRata").text(formatNumber(hargaRata, 2));

  // kecamatan terluas (untuk komoditas aktif atau semua)
  const kecAgg = {};
  debugRows.forEach((r) => {
    kecAgg[r.kecamatan] = (kecAgg[r.kecamatan] || 0) + (Number(r.parsed) || 0);
  });
  const kecTerluas = Object.entries(kecAgg).sort((a, b) => b[1] - a[1])[0];
  $("#kecTerluas").text(kecTerluas ? kecTerluas[0] : "-");

  // komoditas terluas (info umum)
  const komAgg = {};
  sourceData.forEach((d) => {
    if (d.kecamatan === "Aceh Utara") return;
    const p = getLuasParsed(d);
    komAgg[d.komoditas] = (komAgg[d.komoditas] || 0) + p;
  });
  const komTerluas = Object.entries(komAgg).sort((a, b) => b[1] - a[1])[0];
  $("#komTerluas").text(komTerluas ? komTerluas[0] : "-");

  // DEBUG: tampilkan ringkasan di console (baris teratas + statistik)
  console.group("KPI Debug");
  console.log("rows considered:", rows.length);
  console.log(
    "rows with parsed>0:",
    debugRows.filter((r) => r.parsed > 0).length
  );
  console.log("totalLuas (parsed) =", totalLuas);
  console.table(debugRows.slice(0, 50)); // tampilkan 50 baris pertama untuk cek
  console.groupEnd();
}

// ================================
// INIT DASHBOARD (ENTRY POINT)
// ================================
window.initDashboard = function (allData) {
  console.log("🔥 initDashboard() dengan data:", allData.length, "records");
  if (!allData || !allData.length) {
    console.warn("⚠️ Tidak ada data, dashboard tidak bisa render");
    return;
  }

  // isi filter dropdown
  const kecSet = new Set(
    allData.map((d) => d.kecamatan).filter((k) => k && k !== "Aceh Utara")
  );
  const komSet = new Set(allData.map((d) => d.komoditas).filter((k) => k));
  const tahunSet = new Set(allData.map((d) => d.tahun).filter((t) => t));

  const fillSelect = (id, values) => {
    const el = document.querySelector(id);
    if (!el) return;
    values = Array.from(values).sort();
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = v;
      el.appendChild(opt);
    });
  };
  fillSelect("#filterKecamatan", kecSet);
  fillSelect("#filterKomoditas", komSet);
  fillSelect("#filterTahun", tahunSet);
  fillSelect("#tableFilterKecamatan", kecSet);
  fillSelect("#tableFilterKomoditas", komSet);
  fillSelect("#tableFilterTahun", tahunSet);

  // fungsi filter + render
  function applyFilters() {
    const kec = document.querySelector("#filterKecamatan")?.value || "";
    const kom = document.querySelector("#filterKomoditas")?.value || "";
    const thn = document.querySelector("#filterTahun")?.value || "";

    let filtered = allData.filter(
      (d) =>
        (!kec || d.kecamatan === kec) &&
        (!kom || d.komoditas === kom) &&
        (!thn || String(d.tahun) === String(thn))
    );

    console.log("📊 applyFilters():", filtered.length, "records");

    updateKPI(filtered, allData); // << kirim dua data
    renderCharts(filtered);
    renderTable(filtered);
    renderMap();
  }

  // bind event
  [
    "#filterKecamatan",
    "#filterKomoditas",
    "#filterTahun",
    "#tableFilterKecamatan",
    "#tableFilterKomoditas",
    "#tableFilterTahun",
  ].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });

  // render pertama kali
  applyFilters();
};
