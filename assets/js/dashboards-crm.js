"use strict";

(function () {
  // Warna chart menyesuaikan tema
  const isDark = typeof isDarkStyle !== "undefined" && isDarkStyle;
  const shadeColor = isDark ? "dark" : "";
  const chartColor = config.colors.success;

  // Render semua chart dengan class .salesChart
  document.querySelectorAll(".salesChart").forEach((el) => {
    const chart = new ApexCharts(el, {
      chart: {
        type: "area",
        height: 75,
        sparkline: { enabled: true }, // mini chart
        toolbar: { show: false }
      },
      colors: [chartColor],
      stroke: { width: 2, curve: "smooth" },
      fill: {
        type: "gradient",
        gradient: { 
          shade: shadeColor,
          opacityFrom: 0.6,
          opacityTo: 0.25
        }
      },
      series: [{ data: [200, 55, 400, 250] }],
      dataLabels: { enabled: false },
      tooltip: { enabled: false }
    });

    chart.render();
  });
})();
