function renderMap() {
  if (typeof jsVectorMap === "undefined") {
    console.error("jsVectorMap belum dimuat!");
    return;
  }

  if (window.myMap) {
    window.myMap.destroy();
  }

  window.myMap = new jsVectorMap({
    selector: "#mapContainer",
    map: "aceh-utara",

    regionsSelectable: true,
    regionStyle: {
      initial: {
        fill: "#cfd8dc", // ✅ kasih default abu-abu
        stroke: "#37474f",
        "stroke-width": 1,
        "stroke-linejoin": "round",
      },
      hover: {
        fill: "#ff7043",
      },
      selected: {
        fill: "#0277bd",
      },
    },

    series: {
      regions: {
        attribute: "fill",
        values: {
          "11.08_kecamatan_path_0": "#ff0000", // Baktiya
          "11.08_kecamatan_path_1": "#00ff00", // Dewantara
          "11.08_kecamatan_path_2": "#0000ff", // contoh lain
        }
      }
    },

    onRegionClick(event, code) {
      console.log("Klik kecamatan:", code);
    }
  });
}
