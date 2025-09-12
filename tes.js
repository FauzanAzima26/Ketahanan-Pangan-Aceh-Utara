function renderCharts() {
  // === PIE CHART: Distribusi Komoditas ===
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const pieOptions = {
      chart: { type: "donut", height: 400 },
      labels: ["Padi", "Jagung", "Kedelai", "Kopi", "Cabai"],
      series: [45, 30, 15, 7, 3], // contoh data %
      legend: { position: "bottom" },
      dataLabels: { formatter: (val) => val.toFixed(1) + "%" },
      responsive: [{
        breakpoint: 768,
        options: { chart: { height: 300 } }
      }]
    };
    new ApexCharts(pieEl, pieOptions).render();
  }

  // === BAR CHART: Luas Panen per Kecamatan ===
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const barOptions = {
      chart: { type: "bar", height: 400 },
      series: [{
        name: "Luas Panen (Ha)",
        data: [1200, 1500, 800, 600, 1000] // contoh data
      }],
      xaxis: {
        categories: ["Kec. A", "Kec. B", "Kec. C", "Kec. D", "Kec. E"],
        labels: { style: { fontSize: "12px" } }
      },
      plotOptions: { bar: { horizontal: true, borderRadius: 4 } },
      colors: ["#2E7D32"]
    };
    new ApexCharts(barEl, barOptions).render();
  }

  // === LINE CHART: Tren Harga per Tahun ===
  const lineEl = document.querySelector("#lineChart");
  if (lineEl) {
    const lineOptions = {
      chart: { type: "line", height: 400, toolbar: { show: false } },
      series: [
        { name: "Padi", data: [6200, 6400, 6500, 6700, 6800, 7000] },
        { name: "Jagung", data: [4800, 5000, 5200, 5300, 5400, 5600] },
        { name: "Kedelai", data: [9000, 8800, 9100, 9300, 9400, 9500] }
      ],
      xaxis: { categories: ["2020", "2021", "2022", "2023", "2024", "2025"] },
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 4 },
      colors: ["#1E88E5", "#FB8C00", "#8E24AA"]
    };
    new ApexCharts(lineEl, lineOptions).render();
  }

  // === MINI SPARKLINE CHARTS (opsional di card ringkasan) ===
  const optionsMini = (data, color) => ({
    chart: { type: "area", height: 60, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill: { opacity: 0.3 },
    colors: [color],
    series: [{ data: data }],
    tooltip: { enabled: false }
  });

  if (document.querySelector("#chartLuas")) {
    new ApexCharts(
      document.querySelector("#chartLuas"),
      optionsMini([20000, 21000, 22000, 24000, 25000], "#008FFB")
    ).render();
  }

  if (document.querySelector("#chartHargaRata")) {
    new ApexCharts(
      document.querySelector("#chartHargaRata"),
      optionsMini([6000, 6200, 6400, 6700, 6800], "#FEB019")
    ).render();
  }
}

// === RENDER TABEL DATA DETAIL ===
function renderTable(data) {
  const tbody = document.querySelector("#tabelPanen tbody");
  tbody.innerHTML = "";
  data.forEach((item, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.kecamatan}</td>
        <td>${item.komoditas}</td>
        <td>${item.luas.toLocaleString()} Ha</td>
        <td>${item.produksi.toLocaleString()} Ton</td>
        <td>Rp ${parseInt(item.harga).toLocaleString()}</td>
      </tr>`;
  });
}
