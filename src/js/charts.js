/**
 * Chart management module using Chart.js
 */

import Chart from "chart.js/auto";
import { CONFIG } from "./config.js";
import { formatCurrency } from "./utils.js";

export class ChartManager {
  constructor() {
    this.charts = {};
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            font: {
              size: 11,
            },
          },
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          titleFont: {
            size: 12,
          },
          bodyFont: {
            size: 11,
          },
        },
      },
    };
  }

  init() {
    // Initialize chart containers
    const chartCanvas = document.getElementById("statsChart");
    if (chartCanvas) {
      this.createEmployeeHoursChart(chartCanvas);
    }
  }

  createEmployeeHoursChart(canvas) {
    const ctx = canvas.getContext("2d");

    this.charts.employeeHours = new Chart(ctx, {
      type: "bar",
      data: {
        labels: CONFIG.employees.list,
        datasets: [
          {
            label: "Giờ chuẩn",
            data: CONFIG.employees.list.map(() => 0),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
            borderColor: "rgba(34, 197, 94, 1)",
            borderWidth: 1,
          },
          {
            label: "Tăng ca",
            data: CONFIG.employees.list.map(() => 0),
            backgroundColor: "rgba(251, 146, 60, 0.8)",
            borderColor: "rgba(251, 146, 60, 1)",
            borderWidth: 1,
          },
          {
            label: "Ngày lễ",
            data: CONFIG.employees.list.map(() => 0),
            backgroundColor: "rgba(236, 72, 153, 0.8)",
            borderColor: "rgba(236, 72, 153, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          x: {
            stacked: true,
            grid: {
              display: false,
            },
          },
          y: {
            stacked: true,
            beginAtZero: true,
            title: {
              display: true,
              text: "Giờ làm việc",
              font: {
                size: 12,
              },
            },
          },
        },
      },
    });
  }

  updateCharts(stats) {
    // Update employee hours chart
    if (this.charts.employeeHours) {
      const regularHours = [];
      const overtimeHours = [];
      const holidayHours = [];

      CONFIG.employees.list.forEach((employee) => {
        const empStats = stats[employee] || {
          regularHours: 0,
          overtimeHours: 0,
          holidayHours: 0,
        };

        regularHours.push(empStats.regularHours);
        overtimeHours.push(empStats.overtimeHours);
        holidayHours.push(empStats.holidayHours);
      });

      this.charts.employeeHours.data.datasets[0].data = regularHours;
      this.charts.employeeHours.data.datasets[1].data = overtimeHours;
      this.charts.employeeHours.data.datasets[2].data = holidayHours;

      this.charts.employeeHours.update();
    }

    // Create or update other charts
    this.createWorkloadDistributionChart(stats);
    this.createSalaryChart(stats);
    this.createCoverageChart(stats);
  }

  createWorkloadDistributionChart(stats) {
    // Find or create container
    let container = document.getElementById("workloadChart");
    if (!container) {
      container = this.createChartContainer(
        "workloadChart",
        "Phân bổ khối lượng công việc"
      );
    }

    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    // Destroy existing chart
    if (this.charts.workload) {
      this.charts.workload.destroy();
    }

    // Calculate workload distribution
    const labels = CONFIG.employees.list;
    const data = labels.map((emp) => {
      const empStats = stats[emp] || { totalHours: 0 };
      return empStats.totalHours;
    });

    const ctx = canvas.getContext("2d");
    this.charts.workload = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              "rgba(34, 197, 94, 0.8)",
              "rgba(59, 130, 246, 0.8)",
              "rgba(245, 158, 11, 0.8)",
              "rgba(236, 72, 153, 0.8)",
              "rgba(6, 182, 212, 0.8)",
            ],
            borderColor: [
              "rgba(34, 197, 94, 1)",
              "rgba(59, 130, 246, 1)",
              "rgba(245, 158, 11, 1)",
              "rgba(236, 72, 153, 1)",
              "rgba(6, 182, 212, 1)",
            ],
            borderWidth: 2,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        plugins: {
          ...this.chartOptions.plugins,
          title: {
            display: true,
            text: "Tổng giờ làm việc",
            font: {
              size: 14,
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value}h (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  createSalaryChart(stats) {
    let container = document.getElementById("salaryChart");
    if (!container) {
      container = this.createChartContainer("salaryChart", "Thống kê lương");
    }

    const canvas = container.querySelector("canvas");
    if (!canvas) return;

    if (this.charts.salary) {
      this.charts.salary.destroy();
    }

    const labels = CONFIG.employees.list;
    const salaryData = labels.map((emp) => {
      const empStats = stats[emp] || {
        regularHours: 0,
        overtimeHours: 0,
        holidayHours: 0,
      };

      const baseSalary = empStats.regularHours * 25000;
      const overtimeSalary = empStats.overtimeHours * 25000 * 1.5;
      const holidaySalary = empStats.holidayHours * 25000 * 4;

      return baseSalary + overtimeSalary + holidaySalary;
    });

    const ctx = canvas.getContext("2d");
    this.charts.salary = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Tổng lương",
            data: salaryData,
            backgroundColor: "rgba(99, 102, 241, 0.8)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        ...this.chartOptions,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return formatCurrency(value);
              },
            },
          },
        },
        plugins: {
          ...this.chartOptions.plugins,
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label +
                  ": " +
                  formatCurrency(context.parsed.y)
                );
              },
            },
          },
        },
      },
    });
  }

  createCoverageChart(stats) {
    // This would create a line chart showing coverage over days
    // Simplified for demo
  }

  createChartContainer(id, title) {
    const sidebar = document.querySelector(".sidebar");
    if (!sidebar) return null;

    const card = document.createElement("div");
    card.className = "info-card";
    card.innerHTML = `
      <div class="info-card-header">
        <h3 class="info-card-title">
          <span class="card-icon">📊</span> ${title}
        </h3>
      </div>
      <div class="chart-container" id="${id}">
        <canvas></canvas>
      </div>
    `;

    sidebar.appendChild(card);
    return card.querySelector(".chart-container");
  }

  updateTheme(isDark) {
    // Update chart colors for dark mode
    const textColor = isDark ? "#f1f5f9" : "#1e293b";
    const gridColor = isDark ? "#334155" : "#e2e8f0";

    Object.values(this.charts).forEach((chart) => {
      if (chart) {
        // Update scales
        if (chart.options.scales) {
          Object.values(chart.options.scales).forEach((scale) => {
            scale.ticks.color = textColor;
            scale.grid.color = gridColor;
            if (scale.title) {
              scale.title.color = textColor;
            }
          });
        }

        // Update plugins
        if (chart.options.plugins) {
          if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
          }
          if (chart.options.plugins.title) {
            chart.options.plugins.title.color = textColor;
          }
        }

        chart.update();
      }
    });
  }

  destroy() {
    // Destroy all charts
    Object.values(this.charts).forEach((chart) => {
      if (chart) {
        chart.destroy();
      }
    });

    this.charts = {};
  }

  // Analytics methods
  generateAnalytics(schedule, month, year) {
    const analytics = {
      dailyWorkload: this.calculateDailyWorkload(schedule),
      peakDayPerformance: this.analyzePeakDays(schedule, month, year),
      coverageAnalysis: this.analyzeCoverage(schedule),
      employeeBalance: this.analyzeEmployeeBalance(schedule),
    };

    return analytics;
  }

  calculateDailyWorkload(schedule) {
    const workload = {};

    Object.entries(schedule).forEach(([day, data]) => {
      if (data && data.shifts) {
        workload[day] = {
          totalHours: data.shifts.reduce((sum, shift) => sum + shift.hours, 0),
          employeeCount: data.shifts.length,
          coverage: data.coverage ? data.coverage.percentage : 0,
        };
      }
    });

    return workload;
  }

  analyzePeakDays(schedule, month, year) {
    const peakDays = [];

    Object.entries(schedule).forEach(([day, data]) => {
      if (data && data.isPeak) {
        peakDays.push({
          day: parseInt(day),
          employeeCount: data.shifts ? data.shifts.length : 0,
          totalHours: data.shifts
            ? data.shifts.reduce((sum, shift) => sum + shift.hours, 0)
            : 0,
          coverage: data.coverage ? data.coverage.percentage : 0,
        });
      }
    });

    return peakDays;
  }

  analyzeCoverage(schedule) {
    const coverage = {
      fullCoverage: 0,
      partialCoverage: 0,
      noCoverage: 0,
      averageCoverage: 0,
    };

    let totalCoverage = 0;
    let daysWithData = 0;

    Object.values(schedule).forEach((data) => {
      if (data && data.coverage) {
        daysWithData++;
        totalCoverage += data.coverage.percentage;

        if (data.coverage.percentage >= 90) {
          coverage.fullCoverage++;
        } else if (data.coverage.percentage >= 50) {
          coverage.partialCoverage++;
        } else {
          coverage.noCoverage++;
        }
      }
    });

    coverage.averageCoverage =
      daysWithData > 0 ? totalCoverage / daysWithData : 0;

    return coverage;
  }

  analyzeEmployeeBalance(schedule) {
    const balance = {};

    CONFIG.employees.list.forEach((emp) => {
      balance[emp] = {
        shifts: 0,
        totalHours: 0,
        morningShifts: 0,
        afternoonShifts: 0,
        peakShifts: 0,
      };
    });

    Object.values(schedule).forEach((data) => {
      if (data && data.shifts) {
        data.shifts.forEach((shift) => {
          const emp = shift.employee;
          if (balance[emp]) {
            balance[emp].shifts++;
            balance[emp].totalHours += shift.hours;

            if (shift.type.includes("morning")) {
              balance[emp].morningShifts++;
            } else if (shift.type.includes("afternoon")) {
              balance[emp].afternoonShifts++;
            }

            if (shift.type.includes("peak")) {
              balance[emp].peakShifts++;
            }
          }
        });
      }
    });

    return balance;
  }
}
