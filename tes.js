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
let showAllBars = false;
let allData = [];
let dataPadiProvinsi = [];

// ================================
// HELPER: FORMAT & PARSE
// ================================
function truncate4(num) {
  if (num == null || isNaN(num)) return 0;
  return Number(num.toFixed(4));
}

// ================================
// HELPER: GENERATOR JUDUL DINAMIS
// ================================
function generateDynamicTitle(baseTitle, unit = "Ha") {
  const selectedKecamatan =
    document.querySelector("#filterKecamatan")?.value || "";
  const selectedKomoditas =
    document.querySelector("#filterKomoditas")?.value || "";
  const selectedTahun = document.querySelector("#filterTahun")?.value || "";
  const selectedJenis = document.querySelector("#filterJenis")?.value || "";
  $("#filterKomoditas option").each(function () {
    if ($(this).text().toLowerCase().includes("jamur")) {
      $(this).remove();
    }
  });

  // Awalan: pastikan kapitalisasi konsisten
  let title = baseTitle.trim();

  // Tambahkan satuan (Ha atau Kw)
  title += ` (${unit})`;

  // Siapkan tambahan detail
  const detailParts = [];
  if (selectedKecamatan) detailParts.push(`Kecamatan ${selectedKecamatan}`);
  if (selectedKomoditas && !selectedKomoditas.toLowerCase().includes("jamur")) {
    detailParts.push(`Komoditas ${selectedKomoditas}`);
  }

  if (selectedTahun) detailParts.push(`Tahun ${selectedTahun}`);

  // Gabungkan
  if (detailParts.length > 0) title += " - " + detailParts.join(" - ");
  return title;
}

function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return "0,00";
  return Number(num).toLocaleString("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// ================================
// BERSIHKAN NAMA KOMODITAS
// ================================
function cleanKomoditasName(name) {
  if (!name) return "";
  return name
    .toString()
    .replace(/^(luas|produksi|panen|tanaman|hasil|jumlah)\s+/gi, "") // hapus awalan umum
    .replace(/\s*(tanaman|panen|produksi)\s*/gi, "") // hapus kata di tengah
    .replace(/\s+/g, " ") // rapikan spasi ganda
    .trim(); // buang spasi ujung
}

function cleanKecamatanName(name) {
  if (!name) return "";

  return (
    name
      .toLowerCase()
      // hapus awalan "kab", "kab.", "kabupaten", "kota", "kotamadya"
      .replace(/^(kab(\.|upaten)?|kota|kotamadya)\s*/gi, "")
      // hapus kata "aceh" di depan atau di tengah
      .replace(/\baceh\b/gi, "")
      // hapus kata tambahan seperti "provinsi", "nanggroe", "darussalam", dll
      .replace(/\b(provinsi|nanggroe|darussalam)\b/gi, "")
      // hapus tanda baca, spasi ganda, atau tanda kurung
      .replace(/[\(\)\.]/g, "")
      .replace(/\s{2,}/g, " ")
      .trim()
      // kapitalisasi huruf pertama tiap kata biar rapi
      .replace(/\b\w/g, (c) => c.toUpperCase())
  );
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

// ---------------------------------
// Perbaikan normalizeLuas (mencakup banyak sumber field)
// ---------------------------------
function normalizeLuas(item, forChart = false) {
  // coba ambil dari properti yang umum: nilai, luas, value, value_raw
  const rawCandidate =
    item.nilai ??
    item.luas ??
    item.value ??
    item.value_raw ??
    item.value_raw ??
    item.v ??
    item.v_raw ??
    0;

  let val = parseNumber(rawCandidate);

  // jika ada satuan eksplisit di item.satuan atau item.sumber
  const satuan = (item.satuan || item.sumber || "").toString().toLowerCase();

  // Jika data datang dalam m2 (terkadang BPS pakai "m<sup>2" atau "m2")
  if ((!forChart && satuan.includes("m<sup>2")) || satuan.includes("m2")) {
    val = val / 10000; // ubah dari m2 ke Ha
  }

  // Jika satuan sudah "ha" atau "ha." maka biarkan
  return Number(val) || 0;
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

  const titleEl = document.querySelector("#treeMapTitle");
  if (titleEl) {
    const jenis = document.querySelector("#filterJenis")?.value || "Luas Panen";
    const unit = jenis.toLowerCase().includes("produksi") ? "Kw" : "Ha";
    titleEl.textContent = generateDynamicTitle(
      `Sepuluh Komoditas dengan ${jenis} Tertinggi`,
      unit
    );
  }

  const fokus = filtered.filter(
    (item) =>
      item.kecamatan !== "Aceh Utara" &&
      ["Sayuran", "Buah", "Jamur"].includes(item.kategori)
  );

  const agg = {};
  fokus.forEach((item) => {
    const luas = normalizeLuas(item);
    if (luas <= 0) return;
    agg[cleanKomoditasName(item.komoditas)] =
      (agg[cleanKomoditasName(item.komoditas)] || 0) + luas;
  });

  const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
  const topN = 10;
  const topData = sorted.slice(0, topN);
  const others = sorted.slice(topN);

  // ============================
  // Data untuk Treemap
  // ============================
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

console.log("✅ CEK DATA HASIL PARSING");
console.log("All Data:", allData.slice(0, 10)); // contoh 10 data pertama
console.log("Padi Provinsi:", dataPadiProvinsi.slice(0, 10));

function renderCharts(filteredData) {
  if (!filteredData || !filteredData.length) return;

  const lineEl = document.querySelector("#pieChart");
  if (!lineEl) return;

  const titleEl = document.querySelector("#pieTitle");
  if (titleEl) {
    // 🔹 Hapus teks "(Ha)" dari judul
    titleEl.textContent = "Luas Panen dan Produksi Padi Kabupaten Aceh Utara";
  }

  // Fokus hanya data Padi Aceh Utara
  const luas = filteredData.filter(
    (d) =>
      /padi/i.test(d.komoditas) &&
      (d.jenis?.toLowerCase().includes("luas") ||
        d.komoditas.toLowerCase().includes("luas") ||
        d.indikator?.toLowerCase().includes("luas") ||
        d.satuan?.toLowerCase().includes("ha") || // 🔹 tambahkan ini
        parseNumber(d.nilai) > 0) && // 🔹 pastikan nilai > 0
      (d.kecamatan === "Aceh Utara" || d.wilayah === "Aceh Utara")
  );

  console.log(
    "📌 Cek nilai luas:",
    filteredData.map((d) => ({
      komoditas: d.komoditas,
      nilai: d.nilai,
      satuan: d.satuan,
      hasil: normalizeLuas(d),
    }))
  );

  const produksi = filteredData.filter(
    (d) =>
      /padi/i.test(d.komoditas) &&
      (d.jenis?.toLowerCase().includes("produksi") ||
        d.komoditas.toLowerCase().includes("produksi") ||
        d.indikator?.toLowerCase().includes("produksi")) &&
      (d.kecamatan === "Aceh Utara" || d.wilayah === "Aceh Utara")
  );

  const years = Array.from(
    new Set([...luas.map((d) => d.tahun), ...produksi.map((d) => d.tahun)])
  ).sort((a, b) => a - b);

  const luasSeries = years.map((y) => {
    const d = luas.find((d) => +d.tahun === y);
    if (!d) {
      console.warn(`Data untuk tahun ${y} tidak ditemukan`);
      return 0;
    }
    return normalizeLuas(d);
  });
  const produksiSeries = years.map(
    (y) => produksi.find((d) => +d.tahun === y)?.nilai || 0
  );

  // 🔹 Hapus chart lama
  if (pieChart) pieChart.destroy();

  const options = {
    chart: {
      height: 400,
      type: "bar",
      stacked: false,
      toolbar: {
        show: true,
        tools: {
          download: true,
        },
      },
    },
    series: [
      { name: "Luas Panen (Ha)", data: luasSeries },
      { name: "Produksi (Ton)", data: produksiSeries },
    ],
    colors: ["#43A047", "#1E88E5"],
    xaxis: {
      categories: years,
      title: { text: "Tahun" },
    },
    yaxis: [
      {
        title: { text: "Luas Panen (Ha)" },
        labels: { formatter: (val) => val.toLocaleString() },
      },
      {
        opposite: true,
        title: { text: "Produksi (Ton)" },
        labels: { formatter: (val) => val.toLocaleString() },
      },
    ],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "45%", // 🔧 buat proporsional
        borderRadius: 4,
      },
    },
    dataLabels: {
      enabled: false, // 🔹 hilangkan teks di dalam bar
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: function (val, { seriesIndex }) {
          if (seriesIndex === 0) return `${val.toLocaleString()} Ha`;
          if (seriesIndex === 1) return `${val.toLocaleString()} Ton`;
          return val;
        },
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "center",
      markers: { width: 10, height: 10, radius: 12 },
      itemMargin: { horizontal: 15, vertical: 0 },
    },
    noData: { text: "Tidak ada data" },
  };

  pieChart = new ApexCharts(lineEl, options);
  pieChart.render();
}

// ================================
// CHART: PRODUKSI per KECAMATAN (VERTIKAL)
// ================================
function renderVertikalBarChart(filtered) {
  const el = document.querySelector("#vertikalBarChart");
  if (!el) return;

  const fokus = filtered.filter((d) => {
    const val = normalizeProduksi(d);
    return d.kecamatan && d.kecamatan !== "Aceh Utara" && val > 0;
  });

  const agg = {};
  fokus.forEach((item) => {
    const nama = (item.kecamatan || "").trim();
    let produksi = parseNumber(item.produksi);
    agg[nama] = (agg[nama] || 0) + produksi;
  });

  let arr = Object.entries(agg)
    .map(([kecamatan, total]) => ({
      kecamatan,
      total: parseFloat(total.toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);

  const topN = 10;
  const topData = arr.slice(0, topN);
  const others = arr.slice(topN);

  if (others.length > 0) {
    const totalLainnya = others.reduce((sum, d) => sum + d.total, 0);
    const rata2Lainnya = totalLainnya / others.length;
    topData.push({
      kecamatan: "Lainnya",
      total: truncate4(rata2Lainnya),
      detail: others.map((d) => ({ name: d.kecamatan, value: d.total })),
    });
  }

  arr = topData;

  if (vertikalBarChart && typeof vertikalBarChart.destroy === "function") {
    vertikalBarChart.destroy();
  }

  const titleEl = document.querySelector("#vertikalBarTitle");
  if (titleEl) {
    titleEl.textContent = generateDynamicTitle(
      "Sepuluh Kecamatan dengan Produksi Tertinggi",
      "Kw"
    );
  }

  vertikalBarChart = new ApexCharts(el, {
    chart: { type: "bar", height: 400, toolbar: { show: false } },
    series: [{ name: "Produksi (Kw)", data: arr.map((d) => d.total) }],
    xaxis: {
      categories: arr.map((d) => d.kecamatan),
      title: { text: "Kecamatan" },
      labels: { rotate: -30, style: { fontSize: "12px", fontWeight: 500 } },
    },
    yaxis: {
      title: { text: "Jumlah Produksi (Kwintal)" },
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
    tooltip: {
      y: {
        formatter: function (val, opts) {
          const dp = arr[opts.dataPointIndex];
          if (dp.kecamatan === "Lainnya" && dp.detail) {
            return dp.detail
              .map((d) => `${d.name}: ${formatNumber(d.value, 2)} Kw`)
              .join("<br>");
          }
          return `${formatNumber(val, 2)} Kw`;
        },
      },
    },
    colors: arr.map((d) => window.kecamatanColors?.[d.kecamatan] || "#43A047"),
    legend: { show: false },
    noData: { text: "Tidak ada data" },
  });

  vertikalBarChart.render();
}

// ================================
// KPI
// ================================
function updateKPI(filtered, allData) {
  // ✅ Filter sumber data KPI
  const sourceData = (filtered.length ? filtered : allData)
    // Hanya ambil data dengan tingkat = 'kecamatan'
    .filter((d) => d.tingkat === "kecamatan")
    // Kecualikan Aceh Utara (jika tidak ingin dihitung)
    .filter((d) => d.kecamatan && d.kecamatan !== "Aceh Utara")
    // Kecualikan data dari API padi_provinsi
    .filter((d) => !(d.jenis === "padi_provinsi" && d.wilayah === "1100000"));

  // Jika tidak ada data tersisa, hentikan
  if (!sourceData.length) {
    console.warn("⚠️ Tidak ada data KPI yang valid (semua terfilter)");
    return;
  }

  // 1️⃣ Total Luas (Ha)
  const totalLuas = sourceData.reduce((sum, r) => sum + normalizeLuas(r), 0);

  // 2️⃣ Total Produksi (Kw)
  const totalProduksi = sourceData.reduce(
    (sum, r) => sum + normalizeProduksi(r),
    0
  );

  // 3️⃣ Kecamatan Terluas
  const kecAgg = {};
  sourceData.forEach((r) => {
    if (!r.kecamatan) return;
    kecAgg[r.kecamatan] = (kecAgg[r.kecamatan] || 0) + normalizeLuas(r);
  });
  const kecTerluas = Object.entries(kecAgg).sort((a, b) => b[1] - a[1])[0];

  // 4️⃣ Komoditas Dominan (luas terbesar)
  const komAgg = {};
  sourceData.forEach((r) => {
    if (!r.komoditas) return;
    komAgg[r.komoditas] = (komAgg[r.komoditas] || 0) + normalizeLuas(r);
  });
  const komDominan = Object.entries(komAgg).sort((a, b) => b[1] - a[1])[0];

  // 5️⃣ Rata-rata Produksi per Tahun
  const tahunSet = new Set(sourceData.map((d) => d.tahun));
  const rataProduksi = totalProduksi / (tahunSet.size || 1);

  // 6️⃣ Jumlah Kecamatan Aktif
  const jumlahKecamatan = Object.keys(kecAgg).length;

  // 🧭 Update tampilan KPI
  $("#totalLuas").text(formatNumber(totalLuas, 2));
  $("#totalProduksi").text(formatNumber(totalProduksi, 2));
  $("#kecTerluas").text(
    kecTerluas ? `${kecTerluas[0]} (${formatNumber(kecTerluas[1], 2)} Ha)` : "-"
  );
  $("#komDominan").text(
    komDominan ? `${komDominan[0]} (${formatNumber(komDominan[1], 2)} Ha)` : "-"
  );
  $("#rataProduksi").text(formatNumber(rataProduksi, 2));
  $("#jumlahKecamatan").text(jumlahKecamatan);
}

// ================================
// NORMALISASI PRODUKSI (kg, ton, kwintal)
// ================================
function normalizeProduksi(item) {
  let val = parseNumber(
    item.produksi || item.nilai || item.jumlah || item.total
  );
  const satuan = (item.satuan || "").toLowerCase().trim();

  // Konversi ke satuan Kwintal (1 Kw = 100 kg, 1 Ton = 10 Kw)
  if (satuan.includes("kg")) {
    val = val / 100; // dari kg ke kwintal
  } else if (satuan.includes("ton")) {
    val = val * 10; // dari ton ke kwintal
  }
  // jika sudah kwintal, biarkan saja

  return val || 0;
}

function renderStackedBarChartKomoditas(filtered) {
  const el = document.querySelector("#stackedChart");
  if (!el) return;

  const filteredKec = filtered.filter(
    (d) => d.kecamatan && d.kecamatan !== "Aceh Utara"
  );

  if (filteredKec.length === 0) {
    el.innerHTML =
      "<p class='text-center text-muted'>Tidak ada data untuk ditampilkan.</p>";
    return;
  }

  const selectedKecamatan = document.querySelector("#filterKecamatan")?.value;

  // Filter data jika kecamatan dipilih, lalu hilangkan komoditas Padi
  const fokus = (
    selectedKecamatan
      ? filteredKec.filter((d) => d.kecamatan === selectedKecamatan)
      : filteredKec
  ).filter((d) => !(d.komoditas || "").toLowerCase().includes("padi"));

  // Ambil semua tahun unik
  const years = Array.from(
    new Set(fokus.map((d) => parseInt(d.tahun)).filter((t) => !isNaN(t)))
  ).sort((a, b) => a - b);

  // Agregasi berdasarkan komoditas + tahun
  const agg = {};
  fokus.forEach((item) => {
    const kom = cleanKomoditasName(item.komoditas || "");
    const tahun = parseInt(item.tahun);
    const produksi = normalizeProduksi(item);
    if (!kom || isNaN(tahun) || produksi <= 0) return;

    if (!agg[kom]) agg[kom] = {};
    agg[kom][tahun] = (agg[kom][tahun] || 0) + produksi;
  });

  // Hitung total per komoditas (semua tahun)
  const totalKomoditas = Object.entries(agg).map(([kom, thnObj]) => ({
    komoditas: kom,
    total: Object.values(thnObj).reduce((a, b) => a + b, 0),
  }));

  const topN = 10;
  const sorted = totalKomoditas.sort((a, b) => b.total - a.total);
  const topData = sorted.slice(0, topN);
  const others = sorted.slice(topN);

  if (others.length > 0) {
    const lainnyaAgg = {};
    const lainnyaDetail = {};

    others.forEach((d) => {
      const kom = d.komoditas;
      Object.entries(agg[kom] || {}).forEach(([tahun, val]) => {
        // total per tahun
        lainnyaAgg[tahun] = (lainnyaAgg[tahun] || 0) + val;

        // detail per tahun
        if (!lainnyaDetail[tahun]) lainnyaDetail[tahun] = [];
        lainnyaDetail[tahun].push({ name: kom, value: val });
      });
    });

    agg["Lainnya"] = lainnyaAgg;

    const totalLainnya = Object.values(lainnyaAgg).reduce((a, b) => a + b, 0);
    topData.push({
      komoditas: "Lainnya",
      total: truncate4(totalLainnya),
      perTahun: lainnyaDetail, // ⬅️ simpan detail per tahun
    });
  }

  const topKomoditas = topData.map((d) => d.komoditas);

  // Susun series berdasarkan tahun
  const series = years.map((tahun) => ({
    name: tahun.toString(),
    data: topKomoditas.map((kom) => truncate4(agg[kom]?.[tahun] || 0)),
  }));

  // Hapus chart lama jika ada
  if (
    window.stackedBarChartKomoditas &&
    typeof window.stackedBarChartKomoditas.destroy === "function"
  ) {
    window.stackedBarChartKomoditas.destroy();
  }

  const titleEl = document.querySelector("#chartKomoditasTitle");
  if (titleEl) {
    titleEl.textContent = generateDynamicTitle(
      "Sepuluh Komoditas dengan Produksi Tertinggi",
      "Kw"
    );
  }

  // Render chart baru
  window.stackedBarChartKomoditas = new ApexCharts(el, {
    chart: {
      type: "bar",
      height: 400,
      stacked: true,
      toolbar: { show: false },
    },
    series,
    plotOptions: {
      bar: {
        horizontal: false,
        borderRadius: 4,
        columnWidth: "55%",
      },
    },
    xaxis: {
      categories: topKomoditas,
      title: { text: "Komoditas" },
      labels: {
        rotate: -30,
        style: { fontSize: "12px" },
      },
    },
    yaxis: {
      title: { text: "Produksi (Kwintal)" },
      labels: { formatter: (val) => formatNumber(val, 0) },
    },
    legend: { position: "top" },
    tooltip: {
      y: {
        formatter: function (val, opts) {
          const tahun = opts.w.config.series[opts.seriesIndex].name;
          const dpName = opts.w.globals.labels[opts.dataPointIndex];
          const cleanName = cleanKomoditasName(dpName);
          const dataItem = topData.find((d) => d.komoditas === cleanName);

          if (dataItem?.komoditas === "Lainnya") {
            const detailPerTahun = dataItem.perTahun?.[tahun];
            if (detailPerTahun && detailPerTahun.length) {
              return detailPerTahun
                .map((d) => `${d.name}: ${formatNumber(d.value, 2)} Kw`)
                .join("<br>");
            }
          }

          return `${formatNumber(val, 2)} Kw`;
        },
      },
    },
    fill: { opacity: 0.85 },
    dataLabels: { enabled: false },
    noData: { text: "Tidak ada data" },
  });

  window.stackedBarChartKomoditas.render();
}

function renderHorizontalBarChart(filtered) {
  const barEl = document.querySelector("#horizontalBarChart");
  if (!barEl) return;

  const titleEl = document.querySelector("#horizontalBarTitle");
  if (titleEl) {
    titleEl.textContent = generateDynamicTitle(
      "Sepuluh Kecamatan dengan Luas Panen Tertinggi",
      "Ha"
    );
  }

  const nonPadi = filtered.filter((item) => {
    const kom = (item.komoditas || "").toLowerCase();
    const kec = (item.kecamatan || "").toLowerCase();
    const luas = normalizeLuas(item);
    return kom && !kom.includes("padi") && kec !== "aceh utara" && luas > 0;
  });

  if (nonPadi.length === 0) {
    barEl.innerHTML = "<p class='text-center text-muted'>Tidak ada data.</p>";
    return;
  }

  const agg = {};
  nonPadi.forEach((item) => {
    const luas = normalizeLuas(item);
    if (!luas) return;
    agg[item.kecamatan] = (agg[item.kecamatan] || 0) + luas;
  });

  let arr = Object.entries(agg).map(([kec, luas]) => ({
    kec,
    luas: truncate4(luas),
  }));
  arr.sort((a, b) => b.luas - a.luas);

  const topN = 10;
  const topData = arr.slice(0, topN);
  const others = arr.slice(topN);

  if (others.length > 0) {
    const totalLainnya = others.reduce((sum, d) => sum + d.luas, 0);
    const rata2Lainnya = totalLainnya / others.length;
    topData.push({
      kec: "Lainnya",
      luas: truncate4(rata2Lainnya),
      detail: others.map((d) => ({ name: d.kec, value: d.luas })),
    });
  }

  if (barChart) barChart.destroy();

  barChart = new ApexCharts(barEl, {
    chart: { type: "bar", height: 400 },
    plotOptions: {
      bar: { horizontal: true, borderRadius: 4, distributed: true },
    },
    colors: topData.map((d) => window.kecamatanColors?.[d.kec] || "#43A047"),
    series: [{ name: "Luas Panen", data: topData.map((d) => d.luas) }],
    xaxis: {
      categories: topData.map((d) => d.kec),
      title: { text: "Luas Panen (Ha)" },
    },
    yaxis: { title: { text: "Kecamatan" } },
    dataLabels: { enabled: true, formatter: (val) => formatNumber(val, 2) },
    tooltip: {
      y: {
        formatter: function (val, opts) {
          const dp = topData[opts.dataPointIndex];
          if (dp.kec === "Lainnya" && dp.detail) {
            return dp.detail
              .map((d) => `${d.name}: ${formatNumber(d.value, 2)} Ha`)
              .join("<br>");
          }
          return `${formatNumber(val, 2)} Ha`;
        },
      },
    },
    legend: { show: false },
    noData: { text: "Tidak ada data" },
  });

  barChart.render();
}

// ================================
// INIT DASHBOARD
// ================================
window.initDashboard = function (allData) {
  if (window.dataPadiProvinsi && window.dataPadiProvinsi.length) {
    renderCharts(window.dataPadiProvinsi);
  }

  allData.forEach((d) => {
    d.kategori = classifyKategori(d.komoditas);
  });

  function fillSelect(id, values) {
    const el = document.querySelector(id);
    if (!el) return;

    // ✅ Hapus semua opsi lama kecuali placeholder pertama (misal "-- Semua Tahun --")
    const firstOption = el.querySelector("option:first-child");
    el.innerHTML = ""; // kosongkan dulu
    if (firstOption) el.appendChild(firstOption); // kembalikan placeholder

    // ✅ Hapus duplikat, urutkan, dan isi ulang
    values = Array.from(new Set(values)).sort();

    values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = v;
      el.appendChild(opt);
    });
  }

  // Ambil hanya data dari API luas_sayur dan produksi_sayur
  const dataSayur = allData.filter(
    (d) =>
      (d.sumber && /luas_sayur|produksi_sayur/i.test(d.sumber)) || // berdasarkan kolom sumber
      (d.file && /luas_sayur|produksi_sayur/i.test(d.file)) // kalau nama file ikut disimpan
  );

  // Isi dropdown kecamatan hanya dari dataSayur
  fillSelect(
    "#filterKecamatan",
    new Set(
      dataSayur
        .filter((d) => {
          // Ambil hanya kecamatan (bukan kabupaten)
          return (
            d.tingkat?.toLowerCase() === "kecamatan" ||
            !/^aceh\s+/i.test(d.wilayah || d.kecamatan || "")
          );
        })
        .map((d) => cleanKecamatanName(d.kecamatan || d.wilayah))
        .filter((k) => k && !/^aceh$/i.test(k))
    )
  );
  // Komoditas hanya dari dataSayur
  fillSelect(
    "#filterKomoditas",
    new Set(
      dataSayur.map((d) => cleanKomoditasName(d.komoditas)).filter((k) => k)
    )
  );

  // Ambil tahun dari dataSayur
  const tahunList = [
    ...new Set(dataSayur.map((d) => d.tahun).filter((t) => t && !isNaN(t))),
  ].sort((a, b) => a - b); // urutkan dari kecil ke besar

  // Isi dropdown tahun
  fillSelect("#filterTahun", tahunList);

  function applyFilters() {
    const kec = document.querySelector("#filterKecamatan")?.value || "";
    const kom = document.querySelector("#filterKomoditas")?.value || "";
    const thn = document.querySelector("#filterTahun")?.value || "";

    const filtered = allData.filter(
      (d) =>
        (!kec || d.kecamatan === kec) &&
        (!kom || cleanKomoditasName(d.komoditas) === kom) && // ✅ perbaikan di sini
        (!thn || String(d.tahun) === String(thn))
    );

    updateKPI(filtered, allData);

    if (typeof renderMap === "function") renderMap();

    renderCharts(filtered);
    renderSayurBuahChart(filtered);
    renderHorizontalBarChart(filtered);

    const produksiData = filtered.filter((d) => normalizeProduksi(d) > 0);
    console.log("📊 Data produksi untuk chart:", produksiData.length);
    renderVertikalBarChart(produksiData);
    renderStackedBarChartKomoditas(filtered);
  }

  ["#filterKecamatan", "#filterKomoditas", "#filterTahun"].forEach((sel) => {
    document.querySelector(sel)?.addEventListener("change", applyFilters);
  });

  applyFilters();
};
