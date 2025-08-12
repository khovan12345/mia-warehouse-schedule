/**
 * Main application entry point for MIA.VN Warehouse Schedule System
 */

import { CONFIG } from "./config.js";
import storage from "./storage.js";
import { ScheduleManager } from "./schedule.js";
import { UIManager } from "./ui.js";
import { ExportManager } from "./export.js";
import { ChartManager } from "./charts.js";
import { formatDate } from "./utils.js";

class App {
  constructor() {
    this.storage = storage;
    this.schedule = new ScheduleManager();
    this.ui = new UIManager();
    this.export = new ExportManager();
    this.charts = new ChartManager();

    this.init();
  }

  async init() {
    try {
      // Hide loading screen
      await this.ui.hideLoading();

      // Load saved data
      this.loadSavedData();

      // Initialize UI
      this.ui.init();

      // Setup event listeners
      this.setupEventListeners();

      // Update current date
      this.updateCurrentDate();

      // Render initial calendar
      this.renderCalendar();

      // Initialize charts
      if (CONFIG.features.charts) {
        this.charts.init();
      }

      // Check for updates
      this.checkForUpdates();
    } catch (error) {
      console.error("Error initializing app:", error);
      this.ui.showToast("error", "Lỗi khởi tạo ứng dụng");
    }
  }

  loadSavedData() {
    // Load settings
    const settings = this.storage.loadSettings();
    this.applySettings(settings);

    // Load schedule
    const savedSchedule = this.storage.loadSchedule();
    if (savedSchedule && Object.keys(savedSchedule).length > 0) {
      this.schedule.setSchedule(savedSchedule);
    }

    // Load employees
    const employees = this.storage.loadEmployees();
    CONFIG.employees.list = employees.map((emp) => emp.name);

    // Load custom config if any
    const custom = this.storage.loadCustomConfig();
    if (custom) {
      if (custom.target) CONFIG.employees.targetHours = custom.target;
      if (custom.count) this.updateEmployeeCount(custom.count);
      CONFIG.restPolicy = CONFIG.restPolicy || {};
      if (custom.restPerWeek)
        CONFIG.restPolicy.daysPerWeek = custom.restPerWeek;
      if (typeof custom.disableSuper === "boolean") {
        CONFIG.peakDays.superPeakEnabled = !custom.disableSuper;
      }
    }

    // Load theme
    const theme = this.storage.loadTheme();
    this.ui.setTheme(theme);

    // Load custom peak days
    const peakDays = this.storage.loadPeakDays();
    CONFIG.peakDays.custom = peakDays;
  }

  applySettings(settings) {
    // Apply saved settings to UI
    document.getElementById("monthSelect").value = settings.month;
    document.getElementById("yearSelect").value = settings.year;
    document.getElementById("strategySelect").value = settings.strategy;
    document.getElementById("employeeCount").value = settings.employeeCount;
    document.getElementById("sundayWorkload").value = settings.sundayWorkload;

    // Update internal state
    this.schedule.setMonth(settings.month);
    this.schedule.setYear(settings.year);
    this.schedule.setStrategy(settings.strategy);
  }

  setupEventListeners() {
    // Month/Year selection
    document.getElementById("monthSelect").addEventListener("change", (e) => {
      this.schedule.setMonth(parseInt(e.target.value));
      this.renderCalendar();
      this.saveSettings();
    });

    document.getElementById("yearSelect").addEventListener("change", (e) => {
      this.schedule.setYear(parseInt(e.target.value));
      this.renderCalendar();
      this.saveSettings();
    });

    // Strategy selection
    document
      .getElementById("strategySelect")
      .addEventListener("change", (e) => {
        this.schedule.setStrategy(e.target.value);
        this.saveSettings();
      });

    // Employee count
    document.getElementById("employeeCount").addEventListener("change", (e) => {
      this.updateEmployeeCount(parseInt(e.target.value));
      this.saveSettings();
    });

    // Sunday workload
    document
      .getElementById("sundayWorkload")
      .addEventListener("change", (e) => {
        CONFIG.optimization.sundayWorkload = parseInt(e.target.value);
        this.saveSettings();
      });

    // Action buttons
    document
      .getElementById("generateScheduleBtn")
      .addEventListener("click", () => {
        this.generateOptimizedSchedule();
      });

    document
      .getElementById("analyzeStaffingBtn")
      .addEventListener("click", () => {
        this.analyzeStaffing();
      });

    document
      .getElementById("validateScheduleBtn")
      .addEventListener("click", () => {
        this.validateSchedule();
      });

    document
      .getElementById("customizePeakBtn")
      .addEventListener("click", () => {
        this.customizePeakDays();
      });

    document.getElementById("importDataBtn").addEventListener("click", () => {
      this.importData();
    });

    document.getElementById("exportBtn").addEventListener("click", () => {
      this.ui.toggleExportMenu();
    });

    document.getElementById("printBtn").addEventListener("click", () => {
      window.print();
    });

    document
      .getElementById("clearScheduleBtn")
      .addEventListener("click", () => {
        this.clearSchedule();
      });

    // Theme toggle
    document.getElementById("themeToggle").addEventListener("click", () => {
      this.ui.toggleTheme();
      this.storage.saveTheme(this.ui.currentTheme);
    });

    // Export menu items
    document.querySelectorAll("[data-export]").forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const format = e.target.dataset.export;
        this.exportSchedule(format);
      });
    });

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      // Ctrl/Cmd + S: Save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        this.saveAll();
        this.ui.showToast("success", "Đã lưu dữ liệu");
      }

      // Ctrl/Cmd + P: Print
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        window.print();
      }

      // Ctrl/Cmd + G: Generate schedule
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        this.generateOptimizedSchedule();
      }
    });

    // Auto-save on window close
    window.addEventListener("beforeunload", () => {
      this.saveAll();
    });
  }

  updateCurrentDate() {
    const now = new Date();
    const dateStr = formatDate(now, "EEEE, dd MMMM yyyy");
    document.getElementById("currentDate").textContent = dateStr;
  }

  updateEmployeeCount(count) {
    const baseNames = ["Phong", "Tùng", "Tuấn", "An", "Bình"];
    CONFIG.employees.list = baseNames.slice(0, count);

    // Update employee database
    const employees = CONFIG.employees.database.slice(0, count);
    this.storage.saveEmployees(employees);

    this.ui.updateStats();
  }

  renderCalendar() {
    const month = this.schedule.currentMonth;
    const year = this.schedule.currentYear;

    // Render calendar headers
    this.ui.renderCalendarHeaders();

    // Render calendar days
    this.ui.renderCalendarDays(month, year, this.schedule.currentSchedule);

    // Update stats
    this.ui.updateStats();

    // Update employee hours if schedule exists
    if (Object.keys(this.schedule.currentSchedule).length > 0) {
      const stats = this.schedule.calculateEmployeeStats();
      this.ui.updateEmployeeHours(stats);
    }
  }

  async generateOptimizedSchedule() {
    try {
      this.ui.showAlert("info", "Đang tối ưu hóa lịch làm việc...");

      // Generate schedule
      const schedule = await this.schedule.generateOptimizedSchedule();

      // Save to storage
      this.storage.saveSchedule(schedule);

      // Render updated calendar
      this.renderCalendar();

      // Update charts
      if (CONFIG.features.charts) {
        const stats = this.schedule.calculateEmployeeStats();
        this.charts.updateCharts(stats);
      }

      this.ui.showAlert("success", "Lịch đã được tối ưu thành công!");
    } catch (error) {
      console.error("Error generating schedule:", error);
      this.ui.showAlert("error", "Lỗi khi tạo lịch: " + error.message);
    }
  }

  analyzeStaffing() {
    const analysis = this.schedule.analyzeStaffing();
    // Cung cấp tham chiếu để UI tính thống kê ca theo schedule hiện tại
    this.ui.app = this;
    window.__schedule = this.schedule.currentSchedule;
    this.ui.showStaffAnalysis(analysis);
    this.ui.showToast("success", "Đã phân tích xong! Xem đề xuất ở sidebar.");
  }

  validateSchedule() {
    const validation = this.schedule.validateSchedule();

    if (validation.isValid) {
      this.ui.showAlert(
        "success",
        "Lịch làm việc hợp lệ! Tất cả điều kiện đã được đáp ứng."
      );
    } else {
      this.ui.showAlert(
        "error",
        "Lịch có vấn đề: " + validation.errors.join(", ")
      );
    }

    if (validation.warnings.length > 0) {
      this.ui.showAlert(
        "warning",
        "Cảnh báo: " + validation.warnings.join(", ")
      );
    }
  }

  customizePeakDays() {
    const currentPeaks = this.schedule.getPeakDays();
    const input = prompt(
      `Ngày Peak hiện tại: ${currentPeaks.join(", ")}\n\n` +
        `Nhập ngày Peak tùy chỉnh (cách nhau bằng dấu phẩy):\n` +
        `Ví dụ: 5,12,20`,
      CONFIG.peakDays.custom.join(",")
    );

    if (input !== null) {
      try {
        const customDays = input
          .split(",")
          .map((d) => parseInt(d.trim()))
          .filter((d) => d > 0 && d <= 31);

        CONFIG.peakDays.custom = customDays;
        this.storage.savePeakDays(customDays);
        this.renderCalendar();

        this.ui.showAlert(
          "success",
          `Đã cập nhật ngày Peak: ${customDays.join(", ")}`
        );
      } catch (e) {
        this.ui.showAlert("error", "Định dạng không hợp lệ");
      }
    }
  }

  async importData() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.csv,.xlsx";

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        const data = await this.export.importFile(file);

        if (data.schedule) {
          this.schedule.setSchedule(data.schedule);
          this.storage.saveSchedule(data.schedule);
        }

        if (data.employees) {
          this.storage.saveEmployees(data.employees);
        }

        if (data.settings) {
          this.applySettings(data.settings);
          this.storage.saveSettings(data.settings);
        }

        this.renderCalendar();
        this.ui.showAlert("success", "Đã import dữ liệu thành công!");
      } catch (error) {
        console.error("Import error:", error);
        this.ui.showAlert("error", "Lỗi import: " + error.message);
      }
    };

    input.click();
  }

  async exportSchedule(format) {
    try {
      const schedule = this.schedule.currentSchedule;
      const stats = this.schedule.calculateEmployeeStats();
      const month = this.schedule.currentMonth;
      const year = this.schedule.currentYear;

      switch (format) {
        case "excel":
          await this.export.exportToExcel(schedule, stats, month, year);
          break;
        case "csv":
          this.export.exportToCSV(schedule, stats, month, year);
          break;
        case "json":
          this.export.exportToJSON(schedule, stats, month, year);
          break;
        case "pdf":
          await this.export.exportToPDF(schedule, stats, month, year);
          break;
      }

      this.ui.showToast(
        "success",
        `Đã xuất file ${format.toUpperCase()} thành công!`
      );
    } catch (error) {
      console.error("Export error:", error);
      this.ui.showAlert("error", "Lỗi xuất file: " + error.message);
    }
  }

  clearSchedule() {
    if (confirm("Bạn có chắc muốn xóa toàn bộ lịch hiện tại?")) {
      this.schedule.clearSchedule();
      this.storage.remove(CONFIG.storage.keys.schedule);
      this.renderCalendar();
      this.ui.clearEmployeeHours();
      this.ui.clearStaffAnalysis();
      this.ui.showAlert("warning", "Đã xóa lịch làm việc");
    }
  }

  saveSettings() {
    const settings = {
      month: parseInt(document.getElementById("monthSelect").value),
      year: parseInt(document.getElementById("yearSelect").value),
      strategy: document.getElementById("strategySelect").value,
      employeeCount: parseInt(document.getElementById("employeeCount").value),
      sundayWorkload: parseInt(document.getElementById("sundayWorkload").value),
    };

    this.storage.saveSettings(settings);
  }

  saveAll() {
    this.saveSettings();
    this.storage.saveSchedule(this.schedule.currentSchedule);
    this.storage.updateLastSync();
  }

  checkForUpdates() {
    // Check for PWA updates
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              this.ui.showToast(
                "info",
                "Có bản cập nhật mới! Tải lại trang để cập nhật."
              );
            }
          });
        });
      });
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new App();
});
