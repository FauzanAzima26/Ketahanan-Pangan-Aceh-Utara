// Simpan instance chart global
let pieChart = null;
let barChart = null;
let lineChart = null;

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

  data.forEach((d, i) => {
    const row = `
      <tr>
        <td>${i + 1}</td>
        <td>${d.kecamatan}</td>
        <td>${d.komoditas}</td>
        <td>${d.luas.toLocaleString()}</td>
        <td>${d.produksi ? d.produksi.toLocaleString() : "-"}</td>
        <td>${d.harga ? d.harga.toLocaleString() : "-"}</td>
      </tr>
    `;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

// === Fungsi render CHARTS ===
function renderCharts(dataJson) {
  if (!dataJson) return;
  console.log("DATA JSON MASUK:", dataJson);

  const selectedKec = document.querySelector("#filterKecamatan")?.value || "";

  // === Tentukan dataset berdasarkan filter ===
  let filteredData = [];
  if (selectedKec) {
    filteredData = dataJson.filter(
      (d) => d.kecamatan === selectedKec && d.kecamatan !== "Aceh Utara"
    );
  } else {
    filteredData = dataJson.filter((d) => d.kecamatan === "Aceh Utara");
  }

  console.log("DATA UNTUK CHART:", filteredData);

  // === 🔥 UPDATE FILTER KOMODITAS ===
  let filterSelect = document.getElementById("filterKomoditas");
  if (filterSelect) {
    const komoditasSet = new Set(dataJson.map((d) => d.komoditas));
    filterSelect.innerHTML = ""; // hapus option lama
    komoditasSet.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k;
      opt.textContent = k;
      filterSelect.appendChild(opt);
    });
  }

  // === PIE CHART ===
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    filteredData.forEach((item) => {
      const kom = item.komoditas;
      if (!agg[kom]) agg[kom] = 0;
      agg[kom] += item.luas;
    });

    const labels = Object.keys(agg);
    const series = Object.values(agg);

    const pieOptions = {
      chart: { type: "donut", height: 400 },
      labels: labels,
      series: series,
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

    if (pieChart) {
      pieChart.destroy();
    }
    pieChart = new ApexCharts(pieEl, pieOptions);
    pieChart.render();
  }

  // === BAR CHART ===
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const agg = {};
    filteredData.forEach((d) => {
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
      series: [{ name: "Luas Panen (Ha)", data: seriesData }],
      xaxis: { categories },
      colors: [
        "#1E88E5",
        "#FB8C00",
        "#8E24AA",
        "#43A047",
        "#F4511E",
        "#3949AB",
        "#00897B",
        "#FDD835",
        "#6D4C41",
        "#E53935",
      ],
      legend: { show: false },
      noData: {
        text: "Tidak ada data",
        align: "center",
        verticalAlign: "middle",
        style: { fontSize: "14px", color: "#888" },
      },
    };

    if (barChart) {
      barChart.destroy(); // 🚀 reset chart
    }
    barChart = new ApexCharts(barEl, barOptions);
    barChart.render();
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
