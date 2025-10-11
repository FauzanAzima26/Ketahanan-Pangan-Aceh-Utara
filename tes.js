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
      "kembang kol",
      "kentang",
      "ketimun",
      "labu siam",
      "paprika",
    ].some((k) => nama.includes(k))
  ) {
    return "Sayuran";
  }

  // buah
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

  // jamur
  if (["jamur"].some((k) => nama.includes(k))) {
    return "Jamur";
  }

  return "Lainnya";
}

// ================================
// TREEMAP: SAYUR, BUAH, JAMUR (Top 10 + Lainnya)
// ================================
function renderSayurBuahChart(filtered) {
  const el = document.querySelector("#sayurBuahChart");
  if (!el) return;

  // ❌ data total Aceh Utara jangan ikut
  const fokus = filtered.filter(
    (item) =>
      item.kecamatan !== "Aceh Utara" &&
      (item.kategori === "Sayuran" ||
        item.kategori === "Buah" ||
        item.kategori === "Jamur")
  );

  const agg = {};
  fokus.forEach((item) => {
    const luas = normalizeLuas(item);
    if (luas <= 0) return;
    agg[item.komoditas] = (agg[item.komoditas] || 0) + luas;
  });

  // urutkan dari terbesar
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
    plotOptions: {
      treemap: {
        distributed: true,
      },
    },
    tooltip: {
      y: {
        formatter: function (val, opts) {
          const dataPoint = opts.w.config.series[0].data[opts.dataPointIndex];
          if (dataPoint.x === "Lainnya" && dataPoint.detail) {
            return dataPoint.detail
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

  // PIE → tanaman pokok
  // PIE → tanaman pokok (perbaikan format ribuan di label tengah)
  const pieEl = document.querySelector("#pieChart");
  if (pieEl) {
    // Agg dengan map untuk menjaga casing label yang rapi
    const agg = {};
    const labelMap = {}; // keyLower -> displayLabel

    filteredData
      .filter((item) => item.kategori === "Pokok")
      .forEach((item) => {
        const luas = normalizeLuas(item);
        if (luas <= 0) return;
        const raw = (item.komoditas || "").trim();
        const key = raw.toLowerCase();
        // simpan label yang rapi (Title Case) pada kali pertama muncul
        if (!labelMap[key]) {
          labelMap[key] = raw
            ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase()
            : raw;
        }
        agg[key] = (agg[key] || 0) + luas;
      });

    // ubah ke array agar order konsisten dan kita dapat labels + series
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
              name: {
                show: true,
                formatter: (val) => val, // nama tetap tampil apa adanya
              },
              value: {
                show: true,
                // <-- INI PENTING: formatkan nilai (pakai formatNumber dengan 0 desimal)
                formatter: (val) => {
                  // val bisa jadi string atau number, pastikan angka dulu:
                  const num = parseFloat(String(val).replace(/,/g, ""));
                  return isNaN(num) ? "0" : formatNumber(num, 0);
                },
              },
              total: {
                show: true,
                label: "Total",
                formatter: (w) => {
                  const total = w.globals.seriesTotals.reduce(
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
            const total = opts.w.globals.seriesTotals.reduce(
              (a, b) => a + b,
              0
            );
            if (total <= 0) return `${formatNumber(val, 2)} Ha (0%)`;
            const pct = ((val / total) * 100).toFixed(2);
            return `${formatNumber(val, 2)} Ha (${pct}%)`;
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

    // 🔹 Ambil warna dari peta (myMap)
    const regionScale = window.myMap?.series?.regions?.[0]?.params?.scale || {};
    const regionValues = window.myMap?.series?.regions?.[0]?.values || {};
    const kecColorMap = {};

    // Buat mapping nama kecamatan → warna di peta
    Object.entries(window.kecamatanNames || {}).forEach(([id, nama]) => {
      let color;
      const val = regionValues[id];

      if (typeof val === "string" && val.startsWith("#")) {
        // nilai sudah berupa warna
        color = val;
      } else if (regionScale && val in regionScale) {
        color = regionScale[val];
      }

      if (nama && color) kecColorMap[nama] = color;
    });

    if (barChart) barChart.destroy();
    const barColors = arr.map((d) => {
      const key = Object.keys(window.kecamatanColors || {}).find(
        (k) => k.trim().toLowerCase() === d.kec.trim().toLowerCase()
      );
      return key ? window.kecamatanColors[key] : "#bdbdbd";
    });
    barChart = new ApexCharts(barEl, {
      chart: { type: "bar", height: 400 },
      plotOptions: {
        bar: {
          horizontal: true,
          distributed: true,
          borderRadius: 4,
          dataLabels: { position: "center" },
        },
      },
      colors: barColors, // ✅ warna diambil dari peta
      series: [{ name: "Luas Panen", data: arr.map((d) => d.luas) }],
      xaxis: {
        categories: arr.map((d) => d.kec),
        title: { text: "Luas Panen (Ha)" },
      },
      yaxis: { title: { text: "Kecamatan" } },
      dataLabels: { enabled: true, formatter: (val) => formatNumber(val, 2) },
      legend: { show: false },
      noData: { text: "Tidak ada data" },
      tooltip: {
        y: {
          formatter: (val) => `${formatNumber(val, 2)} Ha`,
          title: { formatter: () => "Luas Panen" },
        },
      },
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

    // 🔄 renderMap lebih dulu supaya window.kecamatanColors terisi
    if (typeof renderMap === "function") renderMap();

    // baru render chart
    renderCharts(filtered);
    renderSayurBuahChart(filtered);
  }

  ["#filterKecamatan", "#filterKomoditas", "#filterTahun"].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });

  applyFilters();
};
