// ================================
// GLOBAL STATE
// ================================
let pieChart = null;
let barChart = null;
let sayurBuahChart = null;
let vertikalBarChart = null;
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

  // hapus semua spasi & karakter non-digit kecuali , dan .
  str = str.replace(/[^\d.,-]/g, "");

  // deteksi pola umum Indonesia/Eropa
  if (str.includes(",") && str.includes(".")) {
    str = str.replace(/\./g, "").replace(",", ".");
  } else if (str.includes(",") && !str.includes(".")) {
    str = str.replace(",", ".");
  } else if (str.includes(".")) {
    const parts = str.split(".");
    if (parts.length === 2 && parts[1].length === 3) {
      str = parts.join("");
    }
  }

  return parseFloat(str) || 0;
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

  if (["padi", "jagung", "kedelai"].some((k) => nama.includes(k))) {
    return "Pokok";
  }

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
      "kembang kol",
      "kentang",
      "ketimun",
      "labu siam",
      "paprika",
    ].some((k) => nama.includes(k))
  ) {
    return "Sayuran";
  }

  if (
    [
      "melon",
      "semangka",
      "stroberi",
      "mangga",
      "pisang",
      "durian",
      "pepaya",
      "jeruk",
      "rambutan",
      "nanas",
      "sirsak",
      "salak",
      "jambu",
      "apel",
      "alpukat",
    ].some((k) => nama.includes(k))
  ) {
    return "Buah";
  }

  if (["jamur"].some((k) => nama.includes(k))) {
    return "Jamur";
  }

  return "Lainnya";
}

// ================================
// TREEMAP: SAYUR, BUAH, JAMUR
// ================================
function renderSayurBuahChart(filtered) {
  const el = document.querySelector("#sayurBuahChart");
  if (!el) return;

  const fokus = filtered.filter(
    (item) =>
      item.kecamatan !== "Aceh Utara" &&
      ["Sayuran", "Buah", "Jamur"].includes(item.kategori)
  );

  const agg = {};
  fokus.forEach((item) => {
    const luas = normalizeLuas(item);
    if (luas <= 0) return;
    agg[item.komoditas] = (agg[item.komoditas] || 0) + luas;
  });

  const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
  const topN = 10;
  const topData = sorted.slice(0, topN);
  const others = sorted.slice(topN);

  const series = [
    ...topData.map(([komoditas, luas]) => ({
      x: komoditas,
      y: truncate4(luas),
    })),
    ...(others.length > 0
      ? [
          {
            x: "Lainnya",
            y: truncate4(others.reduce((sum, [, luas]) => sum + luas, 0)),
            detail: others.map(([komoditas, luas]) => ({
              name: komoditas,
              value: luas,
            })),
          },
        ]
      : []),
  ];

  if (sayurBuahChart) sayurBuahChart.destroy();
  sayurBuahChart = new ApexCharts(el, {
    chart: {
      type: "treemap",
      height: 350,
      width: "100%",
      toolbar: { show: false },
    },
    series: [{ data: series }],
    plotOptions: { treemap: { distributed: true } },
    tooltip: {
      y: {
        formatter: function (val, opts) {
          const dp = opts.w.config.series[0].data[opts.dataPointIndex];
          if (dp.x === "Lainnya" && dp.detail) {
            return dp.detail
              .map((d) => `${d.name}: ${formatNumber(d.value, 2)} Ha`)
              .join("<br>");
          }
          return `${formatNumber(val, 2)} Ha`;
        },
      },
    },
    noData: { text: "Tidak ada data" },
    legend: { show: false },
  });
  sayurBuahChart.render();
}

// ================================
// CHART: PIE & BAR
// ================================
function renderCharts(dataJson) {
  if (!dataJson) return;
  const filteredData = dataJson.filter((d) => d.kecamatan !== "Aceh Utara");

  // PIE: Tanaman Pokok
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    const agg = {};
    const labelMap = {};

    filteredData
      .filter((item) => item.kategori === "Pokok")
      .forEach((item) => {
        const luas = normalizeLuas(item);
        if (luas <= 0) return;
        const raw = (item.komoditas || "").trim();
        const key = raw.toLowerCase();
        if (!labelMap[key]) {
          labelMap[key] =
            raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
        }
        agg[key] = (agg[key] || 0) + luas;
      });

    const entries = Object.entries(agg).map(([k, v]) => ({
      label: labelMap[k] || k,
      value: truncate4(v),
    }));

    const labels = entries.map((e) => e.label);
    const series = entries.map((e) => e.value);

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
              name: { show: true },
              value: {
                show: true,
                formatter: (val) => {
                  const num = parseFloat(String(val).replace(/,/g, ""));
                  return isNaN(num) ? "0" : formatNumber(num, 0);
                },
              },
              total: {
                show: true,
                label: "Total",
                formatter: function (w) {
                  const total = (w?.globals?.seriesTotals || []).reduce(
                    (a, b) => a + b,
                    0
                  );
                  return total > 0 ? `${formatNumber(total, 2)} Ha` : "0,00 Ha";
                },
              },
            },
          },
        },
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const total = (opts?.w?.globals?.seriesTotals || []).reduce(
              (a, b) => a + b,
              0
            );
            const pct = total ? ((val / total) * 100).toFixed(2) : 0;
            return `${formatNumber(val, 2)} Ha (${pct}%)`;
          },
        },
      },
      legend: { show: true, position: "bottom" },
      noData: { text: "Tidak ada data" },
    });
    pieChart.render();
  }

  // BAR: Top 10 Kecamatan
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
        bar: { horizontal: true, borderRadius: 4, distributed: true },
      },
      colors: arr.map((d) => window.kecamatanColors[d.kec] || "#43A047"),
      series: [{ name: "Luas Panen", data: arr.map((d) => d.luas) }],
      xaxis: {
        categories: arr.map((d) => d.kec),
        title: { text: "Luas Panen (Ha)" },
      },
      yaxis: { title: { text: "Kecamatan" } },
      dataLabels: { enabled: true, formatter: (val) => formatNumber(val, 2) },
      tooltip: { y: { formatter: (val) => `${formatNumber(val, 2)} Ha` } },
      legend: { show: false },
      noData: { text: "Tidak ada data" },
    });
    barChart.render();
  }
}

// ================================
// CHART: PRODUKSI per KECAMATAN (VERTIKAL)
// ================================
function renderVertikalBarChart(filtered) {
  const el = document.querySelector("#vertikalBarChart");
  if (!el) return;

  const fokus = filtered.filter((d) => {
    const val = parseNumber(d.produksi || d.nilai || d.jumlah || d.total);
    return d.kecamatan && d.kecamatan !== "Aceh Utara" && val > 0;
  });

  const agg = {};
  fokus.forEach((item) => {
    const nama = (item.kecamatan || "").trim();
    let produksi = parseNumber(item.produksi);
    agg[nama] = (agg[nama] || 0) + produksi;
  });

  const arr = Object.entries(agg)
    .map(([kecamatan, total]) => ({
      kecamatan,
      total: parseFloat(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10); // tampilkan 10 kecamatan dengan produksi tertinggi

  if (vertikalBarChart && typeof vertikalBarChart.destroy === "function") {
    vertikalBarChart.destroy();
  }

  vertikalBarChart = new ApexCharts(el, {
    chart: { type: "bar", height: 400, toolbar: { show: false } },
    series: [{ name: "Produksi (Kw)", data: arr.map((d) => d.total) }],
    xaxis: {
      categories: arr.map((d) => d.kecamatan),
      title: { text: "Nama Kecamatan" },
      labels: { rotate: -30, style: { fontSize: "12px", fontWeight: 500 } },
    },
    yaxis: {
      title: { text: "Jumlah Produksi (Kw)" },
      labels: { style: { fontSize: "12px", fontWeight: 500 } },
    },
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        distributed: true,
      },
    },
    dataLabels: { enabled: false },
    tooltip: { y: { formatter: (val) => `${formatNumber(val, 2)} Kw` } },
    colors: arr.map((d) => window.kecamatanColors?.[d.kecamatan] || "#43A047"),
    legend: { show: false },
    noData: { text: "Tidak ada data produksi" },
  });

  vertikalBarChart.render();
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

  allData.forEach((d) => {
    d.kategori = classifyKategori(d.komoditas);
  });

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

    if (typeof renderMap === "function") renderMap();

    renderCharts(filtered);
    renderSayurBuahChart(filtered);

    const produksiData = filtered.filter((d) => parseFloat(d.produksi) > 0);
    console.log("📊 Data produksi untuk chart:", produksiData.length);
    renderVertikalBarChart(produksiData);
  }

  ["#filterKecamatan", "#filterKomoditas", "#filterTahun"].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });

  applyFilters();
};
