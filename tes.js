function renderCharts() {
  // === PIE CHART ===
  var pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    var pieOptions = {
      chart: { type: "pie", height: 400 },
      labels: ["Padi", "Jagung", "Kedelai", "Kopi", "Lainnya"],
      series: [44, 33, 12, 9, 25],
      responsive: [{
        breakpoint: 480,
        options: {
          chart: { width: 300 },
          legend: { position: "bottom" }
        }
      }]
    };
    new ApexCharts(pieEl, pieOptions).render();
  }

  // === HORIZONTAL BAR CHART ===
  var barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    var barOptions = {
      chart: { type: "bar", height: 400 },
      series: [{ name: "Produksi (ton)", data: [120, 150, 180, 160, 200] }],
      xaxis: { categories: ["2021", "2022", "2023", "2024", "2025"] },
      plotOptions: { bar: { horizontal: true } }
    };
    new ApexCharts(barEl, barOptions).render();
  }

  // === LINE CHART ===
  var lineEl = document.querySelector("#lineChart");
  if (lineEl) {
    var lineOptions = {
      chart: { type: "line", height: 400 },
      series: [
        { name: "Padi", data: [5000, 5200, 5100, 5300, 5400] },
        { name: "Jagung", data: [4000, 4200, 4100, 4500, 4600] },
        { name: "Kedelai", data: [6000, 5800, 5900, 6100, 6200] }
      ],
      xaxis: { categories: ["2021", "2022", "2023", "2024", "2025"] },
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 4 }
    };
    new ApexCharts(lineEl, lineOptions).render();
  }

  // === MINI SPARKLINE CHARTS (opsional, kalau ada di card) ===
  let optionsMini = (data, color) => ({
    chart: { type: "area", height: 60, sparkline: { enabled: true } },
    stroke: { curve: "smooth", width: 2 },
    fill: { opacity: 0.3 },
    colors: [color],
    series: [{ data: data }],
    tooltip: { enabled: false }
  });

  if (document.querySelector("#chartLuas")) {
    new ApexCharts(document.querySelector("#chartLuas"), optionsMini([10, 15, 20, 18, 22, 25], "#008FFB")).render();
  }

  if (document.querySelector("#chartKomoditas")) {
    new ApexCharts(document.querySelector("#chartKomoditas"), optionsMini([5, 10, 8, 12, 15, 13], "#00E396")).render();
  }

  if (document.querySelector("#chartHargaRata")) {
    new ApexCharts(document.querySelector("#chartHargaRata"), optionsMini([2000, 2200, 2100, 2500, 2400], "#FEB019")).render();
  }

  if (document.querySelector("#chartHargaTinggi")) {
    new ApexCharts(document.querySelector("#chartHargaTinggi"), optionsMini([2500, 2800, 2600, 3000, 2900], "#FF4560")).render();
  }
}

function renderTable(data) {
  const tbody = document.querySelector("#tabelPanen tbody");
  tbody.innerHTML = "";
  data.forEach((item, i) => {
    tbody.innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${item.kecamatan}</td>
        <td>${item.komoditas}</td>
        <td>${item.luas}</td>
        <td>${item.produksi}</td>
        <td>${item.harga}</td>
      </tr>`;
  });
}
