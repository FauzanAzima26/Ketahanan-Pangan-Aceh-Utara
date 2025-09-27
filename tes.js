// ================================
// GLOBAL STATE
// ================================
let pieChart = null;
let barChart = null;
let sayurBuahChart = null;
let lineChart = null;
let currentPage = 1;
const rowsPerPage = 20;
let currentTableData = [];

// ================================
// HELPER: FORMAT & PARSE
// ================================
function truncate4(num) {
  if (num == null || isNaN(num)) return 0;
  return Number(num.toFixed(4));
}
function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return "0,00";
  return Number(num).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
function normalizeLuas(item, forChart = false) {
  let val = parseNumber(item.value ?? item.value_raw ?? item.luas);
  const satuan = (item.satuan || "").toLowerCase();
  if ((!forChart && satuan.includes("m<sup>2")) || satuan.includes("m2")) {
    val = val / 10000; // ubah m2 ke Ha
  }
  return val || 0;
}

// ================================
// KLASIFIKASI KOMODITAS
// ================================
function classifyKategori(komoditas) {
  const nama = (komoditas || "").toLowerCase();

  // tanaman pokok
  if (["padi", "jagung", "kedelai"].some((k) => nama.includes(k))) {
    return "Pokok";
  }
  // sayuran
  if (
    [
      "cabai",
      "cabe",
      "rawit",
      "bawang",
      "sawi",
      "kangkung",
      "bayam",
      "tomat",
      "terong",
      "kubis",
      "kol",
      "wortel",
      "kacang panjang",
      "petsai",
      "seledri",
      "buncis",
    ].some((k) => nama.includes(k))
  ) {
    return "Sayuran";
  }
  // buah
  if (
    [
      "mangga",
      "pisang",
      "durian",
      "pepaya",
      "jeruk",
      "rambutan",
      "nanas",
      "semangka",
      "melon",
      "sirsak",
      "salak",
      "jambu",
      "apel",
      "alpukat",
    ].some((k) => nama.includes(k))
  ) {
    return "Buah";
  }
  return "Lainnya";
}

// ================================
// TREEMAP: SAYUR & BUAH
// ================================
function renderSayurBuahChart(filtered) {
  const el = document.querySelector("#sayurBuahChart");
  if (!el) return;

  const fokus = filtered.filter(
    (item) => item.kategori === "Sayuran" || item.kategori === "Buah"
  );

  console.group("Treemap Debug");
  console.log("Total data:", filtered.length);
  console.log("Sayur & Buah:", fokus.length);
  console.table(fokus.slice(0, 20));
  console.groupEnd();

  const agg = {};
  fokus.forEach((item) => {
    const luas = normalizeLuas(item);
    if (luas <= 0) return;
    agg[item.komoditas] = (agg[item.komoditas] || 0) + luas;
  });

  const series = Object.entries(agg).map(([komoditas, luas]) => ({
    x: komoditas,
    y: truncate4(luas),
  }));

  if (sayurBuahChart) sayurBuahChart.destroy();
  sayurBuahChart = new ApexCharts(el, {
    chart: { type: "treemap", height: 400 },
    series: [{ data: series }],
    tooltip: { y: { formatter: (val) => `${formatNumber(val, 2)} Ha` } },
    noData: { text: "Tidak ada data" },
  });
  sayurBuahChart.render();
}

// ================================
// CHART: PIE & BAR
// ================================
function renderCharts(dataJson) {
  if (!dataJson) return;
  const filteredData = dataJson.filter((d) => d.kecamatan !== "Aceh Utara");

  // PIE → tanaman pokok
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    filteredData
      .filter((item) => item.kategori === "Pokok")
      .forEach((item) => {
        const luas = normalizeLuas(item);
        if (luas <= 0) return;
        agg[item.komoditas] = (agg[item.komoditas] || 0) + luas;
      });

    const labels = Object.keys(agg);
    const series = Object.values(agg).map((v) => truncate4(v));

    if (pieChart) pieChart.destroy();
    pieChart = new ApexCharts(pieEl, {
      chart: { type: "donut", height: 400, toolbar: { show: false } },
      labels,
      series,
      plotOptions: {
        pie: {
          donut: {
            size: "65%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Total",
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce(
                    (a, b) => a + b,
                    0
                  );
                  return `${formatNumber(total, 2)} Ha`;
                },
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const total = opts.w.globals.seriesTotals.reduce(
              (a, b) => a + b,
              0
            );
            const pct = total > 0 ? (val / total) * 100 : 0;
            return `${formatNumber(val, 2)} Ha (${pct.toFixed(2)}%)`;
          },
        },
      },
      legend: { show: true, position: "bottom" },
      noData: { text: "Tidak ada data" },
    });
    pieChart.render();
  }

  // BAR → top 10 kecamatan
  const barEl = document.querySelector("#horizontalBarChart");
  if (barEl) {
    const agg = {};
    filteredData.forEach((item) => {
      const luas = normalizeLuas(item);
      agg[item.kecamatan] = (agg[item.kecamatan] || 0) + luas;
    });

    let arr = Object.entries(agg).map(([kec, luas]) => ({
      kec,
      luas: truncate4(luas),
    }));
    arr.sort((a, b) => b.luas - a.luas);
    arr = arr.slice(0, 10);

    if (barChart) barChart.destroy();
    barChart = new ApexCharts(barEl, {
      chart: { type: "bar", height: 400 },
      plotOptions: {
        bar: { horizontal: true, distributed: true, borderRadius: 4 },
      },
      series: [{ name: "Luas Panen", data: arr.map((d) => d.luas) }],
      xaxis: {
        categories: arr.map((d) => d.kec),
        title: { text: "Luas Panen (Ha)" },
      },
      dataLabels: { enabled: true, formatter: (val) => formatNumber(val, 2) },
      noData: { text: "Tidak ada data" },
    });
    barChart.render();
  }
}

// ================================
// KPI
// ================================
function updateKPI(filtered, allData) {
  const sourceData = (filtered.length ? filtered : allData).filter(
    (d) => d.kecamatan !== "Aceh Utara"
  );

  const totalLuas = sourceData.reduce(
    (s, r) => s + truncate4(normalizeLuas(r)),
    0
  );
  $("#totalLuas").text(formatNumber(totalLuas, 2));

  const kecAgg = {};
  sourceData.forEach((r) => {
    kecAgg[r.kecamatan] = (kecAgg[r.kecamatan] || 0) + normalizeLuas(r);
  });
  const kecTerluas = Object.entries(kecAgg).sort((a, b) => b[1] - a[1])[0];
  $("#kecTerluas").text(
    kecTerluas ? `${kecTerluas[0]} (${formatNumber(kecTerluas[1], 2)} Ha)` : "-"
  );

  const komAgg = {};
  sourceData.forEach((r) => {
    komAgg[r.komoditas] = (komAgg[r.komoditas] || 0) + normalizeLuas(r);
  });
  const komTerluas = Object.entries(komAgg).sort((a, b) => b[1] - a[1])[0];
  $("#komTerluas").text(
    komTerluas ? `${komTerluas[0]} (${formatNumber(komTerluas[1], 2)} Ha)` : "-"
  );
}

// ================================
// INIT DASHBOARD
// ================================
window.initDashboard = function (allData) {
  console.log("🔥 initDashboard():", allData.length, "records");

  // isi kategori untuk semua data
  allData.forEach((d) => {
    d.kategori = classifyKategori(d.komoditas);
  });

  // isi dropdown
  function fillSelect(id, values) {
    const el = document.querySelector(id);
    if (!el) return;
    values = Array.from(values).sort();
    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = v;
      el.appendChild(opt);
    });
  }
  fillSelect(
    "#filterKecamatan",
    new Set(
      allData.map((d) => d.kecamatan).filter((k) => k && k !== "Aceh Utara")
    )
  );
  fillSelect(
    "#filterKomoditas",
    new Set(allData.map((d) => d.komoditas).filter((k) => k))
  );
  fillSelect(
    "#filterTahun",
    new Set(allData.map((d) => d.tahun).filter((t) => t))
  );

  function applyFilters() {
    const kec = document.querySelector("#filterKecamatan")?.value || "";
    const kom = document.querySelector("#filterKomoditas")?.value || "";
    const thn = document.querySelector("#filterTahun")?.value || "";

    const filtered = allData.filter(
      (d) =>
        (!kec || d.kecamatan === kec) &&
        (!kom || d.komoditas === kom) &&
        (!thn || String(d.tahun) === String(thn))
    );

    updateKPI(filtered, allData);
    renderCharts(filtered);
    renderSayurBuahChart(filtered);
    renderMap && renderMap(); // opsional
  }

  ["#filterKecamatan", "#filterKomoditas", "#filterTahun"].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });

  applyFilters();
};
