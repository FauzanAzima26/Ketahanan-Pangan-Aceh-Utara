"use strict";

(function () {
  const isDark = typeof isDarkStyle !== "undefined" && isDarkStyle;
  const labelColor = isDark ? config.colors_dark.textMuted : config.colors.textMuted;
  const borderColor = isDark ? config.colors_dark.borderColor : config.colors.borderColor;

  const el = document.querySelector("#horizontalBarChart");
  if (!el) return;

  const chart = new ApexCharts(el, {
    chart: {
      type: "bar",
      height: 360,
      toolbar: { show: false }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: "60%",
        distributed: true,
        borderRadius: 7
      }
    },
    grid: {
      borderColor,
      strokeDashArray: 10,
      padding: { top: -35, bottom: -12 }
    },
    colors: [
      config.colors.primary,
      config.colors.info,
      config.colors.success,
      config.colors.secondary,
      config.colors.danger,
      config.colors.warning
    ],
    dataLabels: {
      enabled: true,
      style: { colors: ["#fff"], fontSize: "13px" },
      formatter: (_, opts) => ["Kecamatan 1", "Kecamatan 2", "Kecamatan 3", "Kecamatan 4", "Kecamatan 5", "Kecamatan 6"][opts.dataPointIndex]
    },
    series: [{ data: [35, 20, 14, 12, 10, 9] }],
    xaxis: {
      categories: ["6", "5", "4", "3", "2", "1"],
      labels: {
        style: { colors: labelColor, fontSize: "13px" },
        formatter: val => `${val}%`
      },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      max: 35,
      labels: { style: { colors: [labelColor], fontSize: "13px" } }
    },
    tooltip: {
      enabled: true,
      custom: ({ series, seriesIndex, dataPointIndex }) =>
        `<div class="px-3 py-2"><span>${series[seriesIndex][dataPointIndex]}%</span></div>`
    },
    legend: { show: false }
  });

  chart.render();
})();
