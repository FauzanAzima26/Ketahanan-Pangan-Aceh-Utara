function renderCharts() {
  // === PIE CHART: Distribusi Komoditas ===
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const pieOptions = {
      chart: { type: "donut", height: 400 },
      labels: ["Padi", "Jagung", "Kedelai", "Kopi", "Cabai"],
      series: [45, 30, 15, 7, 3],
      legend: { position: "bottom" },
      dataLabels: { formatter: (val) => val.toFixed(1) + "%" },
      responsive: [{ breakpoint: 768, options: { chart: { height: 300 } } }]
    };
    new ApexCharts(pieEl, pieOptions).render();
  }

  // === BAR CHART: Luas Panen per Kecamatan ===
const barEl = document.querySelector("#horizontalBarChart");
if (barEl && window.regionIds) {
  // Ambil hanya 5 kecamatan pertama
  const selectedIds = window.regionIds.slice(0, 5);

  // Data dummy
  const dataDummy = selectedIds.map(() => Math.floor(Math.random() * 1500) + 500);

  const categories = selectedIds.map(id => window.kecamatanNames[id] || id);
  const colors = selectedIds.map((id, i) => window.colors[i % window.colors.length]);

  const barOptions = {
    chart: { type: "bar", height: 400 },
    plotOptions: {
      bar: {
        horizontal: true,   // ✅ bikin horizontal
        distributed: true,  // ✅ warna beda tiap bar
        borderRadius: 4
      }
    },
    series: [{
      name: "Luas Panen (Ha)",
      data: dataDummy
    }],
    xaxis: { categories },
    colors: colors,        // ✅ warnanya sesuai kecamatan
    legend: { show: false } // ✅ hapus legend
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
