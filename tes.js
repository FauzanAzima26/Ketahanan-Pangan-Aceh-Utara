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
  const tbody = document.querySelector("#tabelPanen tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data</td></tr>`;
    return;
  }

  let filteredData = data.filter((d) => d.kecamatan !== "Aceh Utara");

  if (filteredData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center">Tidak ada data per-kecamatan</td></tr>`;
    return;
  }

  currentTableData = filteredData;
  currentTableData.sort((a, b) => a.kecamatan.localeCompare(b.kecamatan));

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = currentTableData.slice(start, end);

  pageData.forEach((d, i) => {
    const { luas, satuan } = getLuasDanSatuan(d);
    const row = `
    <tr>
      <td>${start + i + 1}</td>
      <td>${d.kecamatan}</td>
      <td>${d.komoditas}</td>
      <td>${truncate4(luas)} ${satuan}</td>
      <td>${d.tahun || "-"}</td>
    </tr>
  `;
    tbody.insertAdjacentHTML("beforeend", row);
  });

  renderPagination(currentTableData.length);
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
      const { luas } = getLuasDanSatuan(item);
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
        formatter: (val, opts) =>
          truncate4(opts.w.config.series[opts.seriesIndex]),
      },
      tooltip: { y: { formatter: (val) => truncate4(val) } },
      legend: { show: false },
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
      const { luas } = getLuasDanSatuan(d);
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
      dataLabels: { enabled: true, formatter: (val) => truncate4(val) },
      tooltip: { y: { formatter: (val) => truncate4(val) } },
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
// UPDATE KPI
// ================================
function updateKPI(filtered) {
  const totalLuas = filtered.reduce((sum, d) => {
    if (d.kecamatan === "Aceh Utara") return sum;
    const { luas } = getLuasDanSatuan(d);
    return sum + luas;
  }, 0);
  $("#totalLuas").text(truncate4(totalLuas));

  const hargaList = filtered.map((d) => d.harga).filter((h) => h > 0);
  const hargaRata =
    hargaList.length > 0
      ? hargaList.reduce((a, b) => a + b, 0) / hargaList.length
      : 0;
  $("#hargaRata").text(truncate4(hargaRata));

  const kecAgg = {};
  filtered.forEach((d) => {
    if (d.kecamatan === "Aceh Utara") return;
    const { luas } = getLuasDanSatuan(d);
    kecAgg[d.kecamatan] = (kecAgg[d.kecamatan] || 0) + luas;
  });
  const kecTerluas = Object.entries(kecAgg).sort((a, b) => b[1] - a[1])[0];
  $("#kecTerluas").text(kecTerluas ? kecTerluas[0] : "-");

  const komAgg = {};
  filtered.forEach((d) => {
    if (d.kecamatan === "Aceh Utara") return;
    const { luas } = getLuasDanSatuan(d);
    komAgg[d.komoditas] = (komAgg[d.komoditas] || 0) + luas;
  });
  const komTerluas = Object.entries(komAgg).sort((a, b) => b[1] - a[1])[0];
  $("#komTerluas").text(komTerluas ? komTerluas[0] : "-");
}
