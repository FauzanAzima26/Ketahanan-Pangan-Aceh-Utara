function renderMap() {
  if (window.myMap) {
    window.myMap.destroy();
  }

  /// 27 warna cerah bervariasi
  window.colors = [
    "#e6194b",
    "#3cb44b",
    "#ffe119",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#46f0f0",
    "#f032e6",
    "#bcf60c",
    "#fabebe",
    "#008080",
    "#e6beff",
    "#9a6324",
    "#fffac8",
    "#800000",
    "#aaffc3",
    "#808000",
    "#ffd8b1",
    "#000075",
    "#808080",
    "#ff7f50",
    "#40e0d0",
    "#ff69b4",
    "#6495ed",
    "#dda0dd",
    "#7fff00",
    "#dc143c",
  ];

  // Buat object scale {1: warna1, 2: warna2, ...}
  const scale = {};
  window.colors.forEach((c, i) => {
    scale[i + 1] = c;
  });

  // Mapping ID → Nama Kecamatan
  window.kecamatanNames = {
    "11.08_kecamatan_path_0": "Baktiya",
    "11.08_kecamatan_path_1": "Dewantara",
    "11.08_kecamatan_path_2": "Kuta Makmur",
    "11.08_kecamatan_path_3": "Lhoksukon",
    "11.08_kecamatan_path_4": "Matangkuli",
    "11.08_kecamatan_path_5": "Muara Batu",
    "11.08_kecamatan_path_6": "Meurah Mulia",
    "11.08_kecamatan_path_7": "Samudera",
    "11.08_kecamatan_path_8": "Seunuddon",
    "11.08_kecamatan_path_9": "Syamtalira Aron",
    "11.08_kecamatan_path_10": "Syamtalira Bayu",
    "11.08_kecamatan_path_11": "Tanah Luas",
    "11.08_kecamatan_path_12": "Tanah Pasir",
    "11.08_kecamatan_path_13": "Tanah Jambo Aye",
    "11.08_kecamatan_path_14": "Sawang",
    "11.08_kecamatan_path_15": "Nisam",
    "11.08_kecamatan_path_16": "Cot Girek",
    "11.08_kecamatan_path_17": "Langkahan",
    "11.08_kecamatan_path_18": "Baktiya Barat",
    "11.08_kecamatan_path_19": "Paya Bakong",
    "11.08_kecamatan_path_20": "Nibong",
    "11.08_kecamatan_path_21": "Simpang Kramat",
    "11.08_kecamatan_path_22": "Lapang",
    "11.08_kecamatan_path_23": "Pirak Timu",
    "11.08_kecamatan_path_24": "Geuredong Pase",
    "11.08_kecamatan_path_25": "Banda Baro",
    "11.08_kecamatan_path_26": "Nisam Antara",
  };

  // Render map
  window.myMap = new jsVectorMap({
    selector: "#mapContainer",
    map: "aceh-utara",
    regionStyle: {
      initial: { fill: "#cfd8dc", stroke: "#37474f", "stroke-width": 1 },
      hover: { fill: "#ffffff", "fill-opacity": 0.7 },
      selected: { fill: "#0277bd" },
    },
    series: {
      regions: [{ attribute: "fill", scale: scale, values: {} }],
    },
    onRegionClick(event, code) {
      const nama = window.kecamatanNames[code] || code;
      console.log("Klik kecamatan:", nama);
    },
  });

  // Ambil semua region ID
  const values = {};
  const regionIds = Object.keys(window.myMap.regions);
  window.regionIds = regionIds; // simpan global

  regionIds.forEach((id, i) => {
    values[id] = (i % window.colors.length) + 1;
  });

  window.myMap.series.regions[0].setValues(values);

  // === Simpan mapping nama kecamatan → warna global (agar chart bisa pakai) ===
  window.kecamatanColors = {};
  regionIds.forEach((id, i) => {
    const nama = window.kecamatanNames[id];
    const warna = window.colors[i % window.colors.length];
    if (nama) window.kecamatanColors[nama] = warna;
  });
  console.log("✅ Mapping warna kecamatan:", window.kecamatanColors);

  // ==== Bikin legend di bawah map ====
  const legendContainer = document.getElementById("mapLegend");
  legendContainer.innerHTML = "";

  regionIds.forEach((id, i) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const nama = window.kecamatanNames[id] || id;
    item.innerHTML = `
      <div class="legend-color" style="background:${
        window.colors[i % window.colors.length]
      }"></div>
      <span>${nama}</span>
    `;
    legendContainer.appendChild(item);
  });

  console.log("Daftar ID kecamatan:", regionIds);
  // === Tambahan agar dashboard tahu map sudah siap ===
  window.mapReady = true;
  window.dispatchEvent(new Event("mapReady"));
}
