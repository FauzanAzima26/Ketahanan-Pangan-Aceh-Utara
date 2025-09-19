// Simpan instance chart global
let pieChart = null;
let barChart = null;
let lineChart = null;
let currentPage = 1;
const rowsPerPage = 26;

// === Fungsi render TABLE ===
function renderTable(data) {
  const tbody = document.querySelector("#tabelPanen tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr>
      <td colspan="6" class="text-center">Tidak ada data</td>
    </tr>`;
    return;
  }

  // 🚀 hitung pagination
  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = data.slice(start, end);

  pageData.forEach((d, i) => {
    const row = `
      <tr>
        <td>${start + i + 1}</td>
        <td>${d.kecamatan}</td>
        <td>${d.komoditas}</td>
        <td>${d.luas.toLocaleString()}</td>
        <td>${d.produksi ? d.produksi.toLocaleString() : "-"}</td>
        <td>${d.harga ? d.harga.toLocaleString() : "-"}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });

  renderPagination(data.length);
}

function renderPagination(totalRows) {
  const container = document.getElementById("pagination");
  if (!container) return;

  container.innerHTML = "";
  const totalPages = Math.ceil(totalRows / rowsPerPage);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className =
      "btn btn-sm " + (i === currentPage ? "btn-primary" : "btn-light");
    btn.addEventListener("click", () => {
      currentPage = i;
      renderTable(currentTableData); // ✅ table saja
    });
    container.appendChild(btn);
  }
}

// === Fungsi render CHARTS ===
function renderCharts(dataJson) {
  if (!dataJson) return;
  console.log("DATA JSON MASUK:", dataJson);

  const selectedKec = document.querySelector("#filterKecamatan")?.value || "";

  // === Tentukan dataset berdasarkan filter ===
  let filteredData = [];
  if (selectedKec) {
    // kalau user pilih kecamatan spesifik → tampilkan data kecamatan itu SAJA (tanpa Aceh Utara)
    filteredData = dataJson.filter(
      (d) => d.kecamatan === selectedKec && d.kecamatan !== "Aceh Utara"
    );
  } else {
    // kalau tidak pilih kecamatan → pakai data agregat "Aceh Utara"
    filteredData = dataJson.filter((d) => d.kecamatan === "Aceh Utara");
  }

  console.log("DATA UNTUK CHART:", filteredData);

  // === 🔥 UPDATE FILTER KOMODITAS ===
  let filterSelect = document.getElementById("filterKomoditas");
  if (filterSelect) {
    const currentValue = filterSelect.value; // simpan pilihan terakhir
    const komoditasSet = new Set(dataJson.map((d) => d.komoditas));

    filterSelect.innerHTML = ""; // hapus semua option lama

    // 🚀 tambahkan opsi default
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "-- Semua Komoditas --";
    filterSelect.appendChild(defaultOpt);

    komoditasSet.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      filterSelect.appendChild(opt);
    });

    // 🚀 kembalikan pilihan sebelumnya kalau masih ada
    if ([...komoditasSet, ""].includes(currentValue)) {
      filterSelect.value = currentValue;
    }
  }

  // === PIE CHART ===
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    filteredData.forEach((item) => {
      if (item.luas > 0) {
        // 🚀 hanya hitung kalau > 0
        const kom = item.komoditas;
        if (!agg[kom]) agg[kom] = 0;
        agg[kom] += item.luas;
      }
    });

    const labels = Object.keys(agg);
    const series = Object.values(agg);

    const pieOptions = {
      chart: { type: "donut", height: 400 },
      labels,
      series: series.length > 0 ? series : [],
      legend: { show: false },
      dataLabels: {
        formatter: (val) => val.toFixed(1) + "%",
      },
      tooltip: {
        y: { formatter: (val) => val.toLocaleString() + " hektar" },
      },
      noData: {
        text: "Tidak ada data",
        align: "center",
        verticalAlign: "middle",
        style: { fontSize: "14px", color: "#888" },
      },
    };

    if (pieChart) pieChart.destroy();
    pieChart = new ApexCharts(pieEl, pieOptions);
    pieChart.render();

    if (series.length === 0) {
      pieChart.updateSeries([]);
    }
  }

  // === BAR CHART ===
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const agg = {};
    dataJson
      .filter((d) => d.kecamatan !== "Aceh Utara" && d.luas > 0) // 🚀 skip kalau 0
      .forEach((d) => {
        if (!agg[d.kecamatan]) agg[d.kecamatan] = 0;
        agg[d.kecamatan] += d.luas;
      });

    let arr = Object.entries(agg).map(([kec, luas]) => ({ kec, luas }));
    arr.sort((a, b) => b.luas - a.luas);
    arr = arr.slice(0, 10);

    const categories = arr.map((d) => d.kec);
    const seriesData = arr.map((d) => d.luas);

    const barOptions = {
      chart: { type: "bar", height: 400 },
      plotOptions: {
        bar: { horizontal: true, distributed: true, borderRadius: 4 },
      },
      series: [
        {
          name: "Luas Panen (Ha)",
          data: seriesData.length > 0 ? seriesData : [],
        },
      ],
      xaxis: { categories },
      legend: { show: false },
      noData: {
        text: "Tidak ada data",
        align: "center",
        verticalAlign: "middle",
        style: { fontSize: "14px", color: "#888" },
      },
    };

    if (barChart) barChart.destroy();
    barChart = new ApexCharts(barEl, barOptions);
    barChart.render();

    if (seriesData.length === 0) {
      barChart.updateSeries([]);
    }
  }

  // === LINE CHART (dummy data dulu) ===
  const lineEl = document.querySelector("#lineChart");
  if (lineEl) {
    const lineOptions = {
      chart: { type: "line", height: 400, toolbar: { show: false } },
      series: [
        { name: "Padi", data: [6200, 6400, 6500, 6700, 6800, 7000] },
        { name: "Jagung", data: [4800, 5000, 5200, 5300, 5400, 5600] },
        { name: "Kedelai", data: [9000, 8800, 9100, 9300, 9400, 9500] },
      ],
      xaxis: { categories: ["2020", "2021", "2022", "2023", "2024", "2025"] },
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 4 },
      colors: ["#1E88E5", "#FB8C00", "#8E24AA"],
    };

    if (lineChart) {
      lineChart.updateOptions(lineOptions);
    } else {
      lineChart = new ApexCharts(lineEl, lineOptions);
      lineChart.render();
    }
  }
}
