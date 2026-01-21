function renderMap() {
  if (window.myMap) {
    window.myMap.destroy();
  }

  // === Warna cerah bervariasi ===
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
  window.colors.forEach((c, i) => (scale[i + 1] = c));

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
    "11.08_kecamatan_path_21": "Simpang Keramat",
    "11.08_kecamatan_path_22": "Lapang",
    "11.08_kecamatan_path_23": "Pirak Timu",
    "11.08_kecamatan_path_24": "Geureudong Pase",
    "11.08_kecamatan_path_25": "Banda Baro",
    "11.08_kecamatan_path_26": "Nisam Antara",
  };

  // === Render map ===
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

    // === EVENT: Saat klik kecamatan ===
    onRegionClick(event, code) {
      const selectedKomoditas =
        document.querySelector("#filterKomoditas")?.value || "";
      const selectedTahun = document.querySelector("#filterTahun")?.value || "";

      const regionName = window.kecamatanNames[code] || code;
      const infoDiv = document.getElementById("mapDataInfo");
      const modal = new bootstrap.Modal(
        document.getElementById("mapDataModal"),
      );

      const allData = window.filteredData || window.dataSayurBuah || [];

      // === Filter data wilayah ===
      const dataWilayah = allData.filter((d) => {
        const matchWilayah =
          d.wilayah && d.wilayah.toLowerCase() === regionName.toLowerCase();

        const matchKomoditas =
          !selectedKomoditas || d.komoditas === selectedKomoditas;

        const matchTahun =
          !selectedTahun || String(d.tahun) === String(selectedTahun);

        return matchWilayah && matchKomoditas && matchTahun;
      });

      // === Jika tidak ada data ===
      if (dataWilayah.length === 0) {
        infoDiv.innerHTML = `
      <h6 class="fw-semibold mb-2">${regionName}</h6>
      <span class="text-danger">Tidak ada data sesuai filter.</span>
    `;
        modal.show();
        return;
      }

      // === HITUNG TOTAL ===
      function toNumber(val) {
        if (val instanceof HTMLElement) {
          return Number(val.textContent) || 0;
        }
        return Number(val) || 0;
      }

      const totalLuas = dataWilayah.reduce(
        (sum, d) => sum + toNumber(d.luas),
        0,
      );

      const totalProduksi = dataWilayah.reduce(
        (sum, d) => sum + toNumber(d.produksi),
        0,
      );

      const isFiltered = selectedKomoditas && selectedTahun;

      const luasText = isFiltered ? `${totalLuas.toLocaleString()} Ha` : "-";

      const produksiText = isFiltered
        ? `${totalProduksi.toLocaleString()} Kw`
        : "-";

      // === Tentukan teks komoditas & tahun ===
      const komoditasText = selectedKomoditas || "Pilih komoditas";
      const tahunText = selectedTahun || "Pilih tahun";

      // === Isi modal ===
      infoDiv.innerHTML = `
    <h6 class="fw-semibold mb-2">${regionName}</h6>
    <table class="table table-sm table-bordered mb-0">
      <tr>
        <th width="40%">Komoditas</th>
        <td>${komoditasText}</td>
      </tr>
      <tr>
        <th>Tahun</th>
        <td>${tahunText}</td>
      </tr>
      <tr>
        <th>Luas Panen</th>
        <td>${luasText}</td>
      </tr>
      <tr>
        <th>Produksi</th>
        <td>${produksiText}</td>
      </tr>
    </table>
  `;

      modal.show();
    },

    // === EVENT: Hover tooltip ===
    onRegionTooltipShow(event, tooltip, code) {
      const nama = window.kecamatanNames[code] || code;
      const dataWilayah = (window.dataSayurBuah || []).filter(
        (d) => d.wilayah.toLowerCase() === nama.toLowerCase(),
      );

      let info = `<b>${nama}</b><br><em>Data tidak tersedia</em>`;
      if (dataWilayah.length > 0) {
        const totalLuas = dataWilayah.reduce(
          (sum, d) => sum + (d.luas || 0),
          0,
        );
        const totalProduksi = dataWilayah.reduce(
          (sum, d) => sum + (d.produksi || 0),
          0,
        );
        info = `
          <b>${nama}</b><br>
          🌾 Luas: ${totalLuas.toLocaleString()} Ha<br>
          🌿 Produksi: ${totalProduksi.toLocaleString()} Kw
        `;
      }

      tooltip.innerHTML = info;
    },
  });

  // === Pewarnaan acak per kecamatan ===
  const values = {};
  const regionIds = Object.keys(window.myMap.regions);
  regionIds.forEach((id, i) => (values[id] = (i % window.colors.length) + 1));
  window.myMap.series.regions[0].setValues(values);

  // === Simpan warna global untuk chart ===
  window.kecamatanColors = {};
  regionIds.forEach((id, i) => {
    const nama = window.kecamatanNames[id];
    const warna = window.colors[i % window.colors.length];
    if (nama) window.kecamatanColors[nama] = warna;
  });

  // === Legend bawah map ===
  const legendContainer = document.getElementById("mapLegend");
  if (legendContainer) {
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
  }

  // === Sinyal bahwa map sudah siap ===
  window.mapReady = true;
  window.dispatchEvent(new Event("mapReady"));
}
