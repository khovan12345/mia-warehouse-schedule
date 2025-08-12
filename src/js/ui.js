/**
 * UI management module for MIA.VN Warehouse Schedule System
 */

import { CONFIG } from "./config.js";
import { getWeekDays, getDaysInMonth, getFirstDayOfWeek } from "./utils.js";

export class UIManager {
  constructor() {
    this.currentTheme = "light";
    this.toastQueue = [];
    this.alertTimeout = null;
  }

  init() {
    // Initialize theme
    const savedTheme =
      localStorage.getItem(CONFIG.storage.prefix + CONFIG.storage.keys.theme) ||
      "light";
    this.setTheme(savedTheme);

    // Initialize dropdowns
    this.initDropdowns();

    // Initialize tooltips
    this.initTooltips();

    // Update stats
    this.updateStats();

    // Render delivery schedule
    this.renderDeliverySchedule();
  }

  async hideLoading() {
    const loadingScreen = document.getElementById("loadingScreen");
    const app = document.getElementById("app");

    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      await new Promise((resolve) => setTimeout(resolve, 500));
      loadingScreen.style.display = "none";
    }

    if (app) {
      app.style.display = "block";
    }
  }

  setTheme(theme) {
    this.currentTheme = theme;
    document.body.classList.toggle("dark-mode", theme === "dark");

    // Update theme toggle icon
    const sunIcon = document.querySelector(".sun-icon");
    const moonIcon = document.querySelector(".moon-icon");

    if (theme === "dark") {
      sunIcon.style.display = "none";
      moonIcon.style.display = "block";
    } else {
      sunIcon.style.display = "block";
      moonIcon.style.display = "none";
    }

    // Update meta theme color
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.content = theme === "dark" ? "#0f172a" : "#1e3c72";
    }
  }

  toggleTheme() {
    const newTheme = this.currentTheme === "light" ? "dark" : "light";
    this.setTheme(newTheme);
    return newTheme;
  }

  renderCalendarHeaders() {
    const headerRow = document.getElementById("calendarHeader");
    if (!headerRow) return;

    headerRow.innerHTML = "";
    const weekDays = getWeekDays();

    weekDays.forEach((day) => {
      const cell = document.createElement("div");
      cell.className = "calendar-header-cell";
      cell.textContent = day;
      headerRow.appendChild(cell);
    });
  }

  renderCalendarDays(month, year, schedule = {}) {
    const grid = document.getElementById("calendarGrid");
    if (!grid) return;

    grid.innerHTML = "";

    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfWeek(month, year);
    const peakDays = this.getPeakDays(month, year);

    // Add empty cells for alignment
    for (let i = 0; i < firstDay; i++) {
      const emptyDay = document.createElement("div");
      emptyDay.className = "calendar-day";
      emptyDay.style.visibility = "hidden";
      grid.appendChild(emptyDay);
    }

    // Add days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayElement = this.createDayElement(
        day,
        month,
        year,
        peakDays,
        schedule[day]
      );
      grid.appendChild(dayElement);
    }
  }

  createDayElement(day, month, year, peakDays, daySchedule) {
    const dayElement = document.createElement("div");
    dayElement.className = "calendar-day";
    dayElement.id = `day-${day}`;

    const date = new Date(year, month - 1, day);
    const dayOfWeek = date.getDay();
    const isPeak = peakDays.includes(day);
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = this.isHoliday(day, month);

    // Create day header
    const dayHeader = document.createElement("div");
    dayHeader.className = "day-header";

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = day;

    const dayBadges = document.createElement("div");
    dayBadges.className = "day-badges";

    if (isPeak) {
      const badge = document.createElement("span");
      badge.className = "badge badge-peak";
      badge.textContent = "Peak";
      dayBadges.appendChild(badge);
    }

    if (isHoliday) {
      const badge = document.createElement("span");
      badge.className = "badge badge-holiday";
      badge.textContent = "Lễ";
      dayBadges.appendChild(badge);
    }

    if (isWeekend) {
      const badge = document.createElement("span");
      badge.className = "badge badge-weekend";
      badge.textContent = "CN";
      dayBadges.appendChild(badge);
    }

    dayHeader.appendChild(dayNumber);
    dayHeader.appendChild(dayBadges);
    dayElement.appendChild(dayHeader);

    // Create shifts container
    const shiftsContainer = document.createElement("div");
    shiftsContainer.className = "shifts-container";
    shiftsContainer.id = `shifts-${day}`;

    if (daySchedule && daySchedule.shifts) {
      daySchedule.shifts.forEach((shift) => {
        const shiftBlock = this.createShiftBlock(shift);
        shiftsContainer.appendChild(shiftBlock);
      });
    }

    dayElement.appendChild(shiftsContainer);

    // Create delivery indicators
    const deliveryContainer = document.createElement("div");
    deliveryContainer.className = "delivery-indicators";
    deliveryContainer.id = `delivery-${day}`;

    if (daySchedule && daySchedule.coverage) {
      const indicators = this.createDeliveryIndicators(
        daySchedule.coverage,
        dayOfWeek
      );
      deliveryContainer.innerHTML = indicators;
    }

    dayElement.appendChild(deliveryContainer);

    // Add click handler
    dayElement.addEventListener("click", () => {
      this.showDayDetails(day, month, year, daySchedule);
    });

    return dayElement;
  }

  createShiftBlock(shift) {
    const block = document.createElement("div");
    block.className = `shift-block shift-${shift.employee.toLowerCase()}`;
    block.title = `${shift.description}${shift.break ? ` (nghỉ ${shift.break.start}-${shift.break.end})` : ""}`;

    const name = document.createElement("span");
    name.textContent = shift.employee;

    const time = document.createElement("span");
    time.className = "shift-time";
    time.textContent = `${shift.start}-${shift.end}`;

    if (shift.isOvertime) time.textContent += " 🔥";
    if (shift.isHoliday) time.textContent += " 🏮";

    block.appendChild(name);
    block.appendChild(time);

    return block;
  }

  createDeliveryIndicators(coverage, dayOfWeek) {
    let html = "";

    if (coverage.critical["11:59"]) {
      html += '<span class="delivery-time">📦 11:59</span>';
    }

    if (coverage.critical["18:00"]) {
      html += '<span class="delivery-time">📦 18:00</span>';
    }

    if (coverage.critical["15:00"]) {
      html += '<span class="delivery-time">🚚 15:00</span>';
    }

    if ((dayOfWeek === 0 || dayOfWeek === 1) && coverage.critical["09:00"]) {
      html += '<span class="delivery-time">🚚 9:00</span>';
    }

    if (coverage.percentage < 80) {
      html +=
        '<span style="background: #fee2e2; color: #dc2626; font-size: 9px; padding: 1px 3px; border-radius: 3px;">⚠️ Thiếu ca</span>';
    }

    return html;
  }

  updateStats() {
    const statsData = [
      {
        id: "totalEmployees",
        value: CONFIG.employees.list.length,
        label: "Nhân viên",
        icon: "👥",
        class: "green",
      },
      {
        id: "workDays",
        value: getDaysInMonth(
          parseInt(document.getElementById("monthSelect").value),
          parseInt(document.getElementById("yearSelect").value)
        ),
        label: "Ngày làm việc",
        icon: "📅",
        class: "blue",
      },
      {
        id: "peakDaysCount",
        value: this.getPeakDays(
          parseInt(document.getElementById("monthSelect").value),
          parseInt(document.getElementById("yearSelect").value)
        ).length,
        label: "Ngày Peak",
        icon: "📈",
        class: "orange",
      },
      {
        id: "workingHours",
        value: "8-20h",
        label: "Giờ hoạt động",
        icon: "⏰",
        class: "purple",
      },
      {
        id: "staffRecommendation",
        value: CONFIG.employees.list.length,
        label: "Nhân viên đề xuất",
        icon: "👤",
        class: "red",
      },
    ];

    const grid = document.getElementById("statsGrid");
    if (grid) {
      grid.innerHTML = statsData
        .map(
          (stat) => `
        <div class="stat-card ${stat.class}">
          <div class="stat-content">
            <div class="stat-number">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
          </div>
          <div class="stat-icon">${stat.icon}</div>
        </div>
      `
        )
        .join("");
    }
  }

  updateEmployeeHours(stats) {
    const container = document.getElementById("employeeHours");
    if (!container) return;

    container.innerHTML = "";

    Object.entries(stats).forEach(([employee, data]) => {
      const totalHours = data.totalHours;
      const targetHours = CONFIG.employees.targetHours; // Công chuẩn chung
      const progressPercent = Math.min(100, (totalHours / targetHours) * 100);

      const statElement = document.createElement("div");
      statElement.className = `employee-stat ${employee.toLowerCase()}`;

      statElement.innerHTML = `
        <div class="employee-name">${employee}</div>
        <div class="hours-detail">
          <span>Công chuẩn: ${targetHours}h</span>
          <span>Tăng ca: ${(data.overtimeHours / CONFIG.multipliers.overtime).toFixed(1)}h</span>
        </div>
        <div class="hours-detail">
          <span>Tổng: ${totalHours.toFixed(1)}h / ${targetHours}h</span>
          <span>${progressPercent.toFixed(1)}%</span>
        </div>
        <div class="hours-progress">
          <div class="hours-progress-bar" style="width: ${progressPercent}%"></div>
        </div>
        <div class="hours-detail" style="margin-top: 5px;">
          <span>Ngày nghỉ: ${data.restDays.join(", ") || "Không"}</span>
        </div>
      `;

      container.appendChild(statElement);
    });
  }

  renderDeliverySchedule() {
    const container = document.getElementById("deliverySchedule");
    if (!container) return;

    const deliveries = [
      {
        carrier: "Shopee Express",
        times: "11:59 & 18:00 hàng ngày",
      },
      {
        carrier: "GHN Cồng kềnh",
        times: "11:59 & 18:00 hàng ngày",
      },
      {
        carrier: "VNP Cồng kềnh",
        times: "15:00-15:30 (thường)<br>9:00-10:00 (CN & T2)",
      },
    ];

    container.innerHTML = deliveries
      .map(
        (delivery) => `
      <div class="delivery-item">
        <div class="delivery-carrier">${delivery.carrier}</div>
        <div class="delivery-times">${delivery.times}</div>
      </div>
    `
      )
      .join("");
  }

  showStaffAnalysis(analysis) {
    const container = document.getElementById("staffAnalysis");
    if (!container) return;

    const actionColor = {
      hire: "#dc2626",
      reduce: "#2563eb",
      maintain: "#22c55e",
    };

    container.innerHTML = `
      <div style="margin-bottom: 15px;">
        <div style="font-weight: 600; color: #1e3c72; margin-bottom: 5px;">
          📊 Phân tích tháng ${analysis.month}/${analysis.year}
        </div>
        <div style="font-size: 12px; line-height: 1.5;">
          <div>• Nhân viên hiện tại: <strong>${analysis.current}</strong></div>
          <div>• Nhân viên đề xuất: <strong>${analysis.optimal}</strong></div>
          <div>• Tổng giờ cần: <strong>${analysis.workload.totalHours.toFixed(0)}h</strong></div>
          <div>• TB giờ/người: <strong>${analysis.workload.avgHoursPerEmployee.toFixed(0)}h</strong></div>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <div style="font-weight: 600; color: #1e3c72; margin-bottom: 5px;">
          💡 Đề xuất
        </div>
        <div style="font-size: 12px; background: #f8fafc; padding: 8px; border-radius: 6px; border-left: 3px solid ${actionColor[analysis.action]};">
          ${analysis.reason}
        </div>
      </div>

      ${
        analysis.workload.overtimeRisk > 40
          ? `
        <div style="margin-bottom: 10px;">
          <div style="font-size: 11px; background: #fef3c7; color: #78350f; padding: 6px; border-radius: 4px;">
            ⚠️ Cảnh báo: Nguy cơ tăng ca cao (${analysis.workload.overtimeRisk.toFixed(0)}h/người)
          </div>
        </div>
      `
          : ""
      }

      <div style="margin-bottom: 10px;">
        <div style="font-weight: 600; color: #1e3c72; margin-bottom: 5px; font-size: 12px;">
          📈 Ngày Peak (${analysis.peakDays.length})
        </div>
        <div style="font-size: 11px; color: #64748b;">
          Ngày ${analysis.peakDays.join(", ")} - Cần 3 nhân viên
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <div style="font-weight: 600; color: #1e3c72; margin-bottom: 5px;">
          ⏱️ Thống kê ca & nhân sự
        </div>
        <div id="shiftStats" style="font-size: 12px; line-height: 1.6;"></div>
      </div>
    `;

    // Render shift stats dựa trên lịch hiện tại
    this.renderShiftStats();
  }

  renderShiftStats() {
    const container = document.getElementById("shiftStats");
    if (!container) return;

    // Thu thập dữ liệu từ schedule hiện tại
    const schedule = this.app?.schedule?.currentSchedule || window.__schedule;
    if (!schedule) {
      container.innerHTML = "<em>Chưa có dữ liệu lịch.</em>";
      return;
    }

    let days2 = 0;
    let days3 = 0;
    let maxHoursDay = { day: null, hours: -Infinity };
    let minHoursDay = { day: null, hours: Infinity };

    const shiftCount = {
      morning: 0,
      midday: 0,
      afternoon: 0,
      super_peak_morning: 0,
      super_peak_midday: 0,
      super_peak_afternoon: 0,
    };

    Object.entries(schedule).forEach(([day, data]) => {
      if (!data || !data.shifts) return;
      const num = data.shifts.length;
      if (num === 2) days2++;
      if (num >= 3) days3++;

      let dayHours = 0;
      data.shifts.forEach((s) => {
        shiftCount[s.type] = (shiftCount[s.type] || 0) + 1;
        dayHours += s.hours;
      });

      if (dayHours > maxHoursDay.hours) maxHoursDay = { day, hours: dayHours };
      if (dayHours < minHoursDay.hours) minHoursDay = { day, hours: dayHours };
    });

    const totalDays = Object.keys(schedule).length;
    const avgDayHours = (
      Object.values(schedule).reduce(
        (sum, d) => sum + (d?.shifts?.reduce((h, s) => h + s.hours, 0) || 0),
        0
      ) / totalDays
    ).toFixed(1);

    container.innerHTML = `
      <div>- Số ngày 2 nhân viên: <strong>${days2}</strong></div>
      <div>- Số ngày 3 nhân viên: <strong>${days3}</strong></div>
      <div>- Trung bình giờ công/ngày: <strong>${avgDayHours}h</strong></div>
      <div>- Ngày cao nhất: <strong>${maxHoursDay.day}</strong> (${maxHoursDay.hours}h)</div>
      <div>- Ngày thấp nhất: <strong>${minHoursDay.day}</strong> (${minHoursDay.hours}h)</div>
      <div style="margin-top:6px;">- Số ca theo loại:</div>
      <div style="font-size:11px; color:#64748b;">
        Morning: ${shiftCount.morning} • Midday: ${shiftCount.midday} • Afternoon: ${shiftCount.afternoon}<br/>
        SuperPeak Morning: ${shiftCount.super_peak_morning} • SuperPeak Midday: ${shiftCount.super_peak_midday} • SuperPeak Afternoon: ${shiftCount.super_peak_afternoon}
      </div>
    `;
  }

  showAlert(type, message) {
    const container = document.getElementById("alerts");
    if (!container) return;

    const alertClass = type === "info" ? "warning" : type;
    const icon = type === "success" ? "✓" : type === "error" ? "✗" : "⚠";

    container.innerHTML = `
      <div class="alert alert-${alertClass}">
        <span>${icon}</span>
        <span>${message}</span>
      </div>
    `;

    // Clear previous timeout
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    // Auto-hide after 5 seconds
    this.alertTimeout = setTimeout(() => {
      container.innerHTML = "";
    }, 5000);
  }

  showToast(type, message) {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;

    const icon = {
      success: "✓",
      error: "✗",
      warning: "⚠",
      info: "ℹ",
    };

    toast.innerHTML = `
      <span style="font-size: 20px;">${icon[type]}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  toggleExportMenu() {
    const menu = document.getElementById("exportMenu");
    if (menu) {
      menu.classList.toggle("show");
    }
  }

  showDayDetails(day, month, year, schedule) {
    // This would show a modal with day details
    console.log(`Day details for ${day}/${month}/${year}`, schedule);
  }

  clearEmployeeHours() {
    const container = document.getElementById("employeeHours");
    if (container) {
      container.innerHTML =
        '<div class="empty-state"><p>Chưa có dữ liệu giờ làm</p></div>';
    }
  }

  clearStaffAnalysis() {
    const container = document.getElementById("staffAnalysis");
    if (container) {
      container.innerHTML =
        '<div class="empty-state"><p>Chưa có phân tích. Nhấn "Phân tích nhân sự" để xem đề xuất.</p></div>';
    }
  }

  initDropdowns() {
    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.matches(".dropdown-toggle")) {
        document.querySelectorAll(".dropdown-menu").forEach((menu) => {
          menu.classList.remove("show");
        });
      }
    });

    // Toggle dropdown
    document.querySelectorAll(".dropdown-toggle").forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        const menu = toggle.nextElementSibling;
        if (menu && menu.classList.contains("dropdown-menu")) {
          menu.classList.toggle("show");
        }
      });
    });
  }

  initTooltips() {
    // Simple tooltip implementation
    document.querySelectorAll("[title]").forEach((element) => {
      element.addEventListener("mouseenter", (e) => {
        const tooltip = document.createElement("div");
        tooltip.className = "tooltip";
        tooltip.textContent = e.target.title;
        tooltip.style.cssText = `
          position: absolute;
          background: rgba(0,0,0,0.8);
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          z-index: 1000;
          pointer-events: none;
        `;

        document.body.appendChild(tooltip);

        const rect = e.target.getBoundingClientRect();
        tooltip.style.left =
          rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
        tooltip.style.top = rect.top - tooltip.offsetHeight - 5 + "px";

        e.target._tooltip = tooltip;
        e.target._titleBackup = e.target.title;
        e.target.removeAttribute("title");
      });

      element.addEventListener("mouseleave", (e) => {
        if (e.target._tooltip) {
          e.target._tooltip.remove();
          e.target.title = e.target._titleBackup;
          delete e.target._tooltip;
          delete e.target._titleBackup;
        }
      });
    });
  }

  // Helper methods
  getPeakDays(month, year) {
    const peaks = [...CONFIG.peakDays.fixed];

    if (CONFIG.peakDays.double && month <= 12) {
      const doubleDay =
        month < 10 ? month : parseInt(`${month}`.slice(-1).repeat(2));
      const daysInMonth = getDaysInMonth(month, year);
      if (doubleDay <= daysInMonth && doubleDay > 0) {
        peaks.push(doubleDay);
      }
    }

    peaks.push(...CONFIG.peakDays.custom);

    return [...new Set(peaks)].sort((a, b) => a - b);
  }

  isHoliday(day, month) {
    return CONFIG.holidays[month]?.includes(day) || false;
  }
}
