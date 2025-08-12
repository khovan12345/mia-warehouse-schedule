/**
 * Export functionality for MIA.VN Warehouse Schedule System
 */

import { CONFIG } from "./config.js";
import {
  createCSV,
  downloadFile,
  formatDate,
  formatCurrency,
} from "./utils.js";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import "jspdf-autotable";

export class ExportManager {
  constructor() {
    this.exportFormats = ["excel", "csv", "json", "pdf"];
  }

  /**
   * Export to CSV format
   */
  exportToCSV(schedule, stats, month, year) {
    const headers = [
      "Ngày",
      "Thứ",
      "Nhân viên",
      "Ca làm",
      "Giờ vào",
      "Giờ ra",
      "Giờ nghỉ",
      "Số giờ",
      "Loại ca",
      "Coverage",
      "Ghi chú",
    ];

    const rows = [];
    const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekDay = weekDays[date.getDay()];

      if (schedule[day] && schedule[day].shifts) {
        schedule[day].shifts.forEach((shift) => {
          const breakTime = shift.break
            ? `${shift.break.start}-${shift.break.end}`
            : "Không";
          const shiftType = shift.isHoliday
            ? "Lễ x4"
            : shift.isOvertime
              ? "Tăng ca x1.5"
              : "Chuẩn";
          const coverage = schedule[day].coverage
            ? `${schedule[day].coverage.percentage.toFixed(1)}%`
            : "N/A";

          const notes = [];
          if (schedule[day].isPeak) notes.push("Peak Day");
          if (schedule[day].isHoliday) notes.push("Ngày lễ");
          if (schedule[day].isSunday) notes.push("Chủ nhật");

          rows.push([
            `${day}/${month}/${year}`,
            weekDay,
            shift.employee,
            shift.description || shift.type,
            shift.start,
            shift.end,
            breakTime,
            shift.hours,
            shiftType,
            coverage,
            notes.join("; "),
          ]);
        });
      } else {
        rows.push([
          `${day}/${month}/${year}`,
          weekDay,
          "",
          "",
          "",
          "",
          "",
          "",
          "Không có ca",
          "0%",
          "Ngày nghỉ",
        ]);
      }
    }

    // Add summary section
    rows.push([]);
    rows.push(["=== TỔNG KẾT THÁNG ==="]);
    rows.push([
      "Nhân viên",
      "Giờ chuẩn",
      "Giờ tăng ca",
      "Giờ lễ",
      "Tổng giờ",
      "Lương cơ bản",
      "Lương tăng ca",
      "Tổng lương",
      "Ngày nghỉ",
    ]);

    Object.entries(stats).forEach(([employee, data]) => {
      const baseSalary = data.regularHours * 25000;
      const overtimeSalary = data.overtimeHours * 25000 * 1.5;
      const holidaySalary = data.holidayHours * 25000 * 4;
      const totalSalary = baseSalary + overtimeSalary + holidaySalary;

      rows.push([
        employee,
        data.regularHours.toFixed(1),
        data.overtimeHours.toFixed(1),
        data.holidayHours.toFixed(1),
        data.totalHours.toFixed(1),
        formatCurrency(baseSalary),
        formatCurrency(overtimeSalary + holidaySalary),
        formatCurrency(totalSalary),
        data.restDays.join("; "),
      ]);
    });

    const csv = createCSV(headers, rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadFile(blob, `Lich_KhoVan_MIA_T${month}_${year}.csv`);
  }

  /**
   * Export to Excel format
   */
  async exportToExcel(schedule, stats, month, year) {
    const wb = XLSX.utils.book_new();

    // Main schedule sheet
    const scheduleData = this.prepareScheduleData(schedule, stats, month, year);
    const ws = XLSX.utils.aoa_to_sheet(scheduleData);

    // Auto-fit columns
    const colWidths = [
      { wch: 12 }, // Ngày
      { wch: 8 }, // Thứ
      { wch: 12 }, // Nhân viên
      { wch: 15 }, // Ca làm
      { wch: 8 }, // Giờ vào
      { wch: 8 }, // Giờ ra
      { wch: 12 }, // Giờ nghỉ
      { wch: 8 }, // Số giờ
      { wch: 12 }, // Loại ca
      { wch: 10 }, // Coverage
      { wch: 20 }, // Ghi chú
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Lịch làm việc");

    // Summary sheet
    const summaryData = this.prepareSummaryData(stats);
    const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws2, "Tổng kết");

    // Analysis sheet
    const analysisData = this.prepareAnalysisData(schedule, month, year);
    const ws3 = XLSX.utils.aoa_to_sheet(analysisData);
    XLSX.utils.book_append_sheet(wb, ws3, "Phân tích");

    // Export
    XLSX.writeFile(wb, `Lich_KhoVan_MIA_T${month}_${year}.xlsx`);
  }

  /**
   * Export to JSON format
   */
  exportToJSON(schedule, stats, month, year) {
    const data = {
      metadata: {
        month,
        year,
        exportDate: new Date().toISOString(),
        version: "2.0.0",
        company: "MIA.VN",
      },
      schedule,
      statistics: stats,
      summary: this.calculateSummary(stats),
      employees: CONFIG.employees.list.map((name) => {
        const empData = CONFIG.employees.database.find((e) => e.name === name);
        return {
          name,
          ...empData,
          stats: stats[name],
        };
      }),
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    downloadFile(blob, `Lich_KhoVan_MIA_T${month}_${year}.json`);
  }

  /**
   * Export to PDF format
   */
  async exportToPDF(schedule, stats, month, year) {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 60, 114);
    doc.text("MIA.VN - Lịch Làm Việc Kho Vận", 148, 15, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Tháng ${month}/${year}`, 148, 25, { align: "center" });

    // Schedule table
    const scheduleHeaders = [
      "Ngày",
      "Thứ",
      "Nhân viên",
      "Ca làm",
      "Giờ làm",
      "Số giờ",
      "Loại ca",
      "Ghi chú",
    ];

    const scheduleRows = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekDay = weekDays[date.getDay()];

      if (schedule[day] && schedule[day].shifts) {
        schedule[day].shifts.forEach((shift) => {
          const shiftType = shift.isHoliday
            ? "Lễ"
            : shift.isOvertime
              ? "Tăng ca"
              : "Chuẩn";
          const notes = [];
          if (schedule[day].isPeak) notes.push("Peak");

          scheduleRows.push([
            `${day}/${month}`,
            weekDay,
            shift.employee,
            shift.description,
            `${shift.start}-${shift.end}`,
            `${shift.hours}h`,
            shiftType,
            notes.join(", "),
          ]);
        });
      }
    }

    doc.autoTable({
      head: [scheduleHeaders],
      body: scheduleRows,
      startY: 35,
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [30, 60, 114] },
    });

    // Summary table on new page
    doc.addPage();

    doc.setFontSize(16);
    doc.setTextColor(30, 60, 114);
    doc.text("Tổng kết giờ làm việc", 148, 15, { align: "center" });

    const summaryHeaders = [
      "Nhân viên",
      "Giờ chuẩn",
      "Tăng ca",
      "Giờ lễ",
      "Tổng giờ",
      "Lương tổng",
      "Ngày nghỉ",
    ];

    const summaryRows = Object.entries(stats).map(([employee, data]) => {
      const baseSalary = data.regularHours * 25000;
      const overtimeSalary = data.overtimeHours * 25000 * 1.5;
      const holidaySalary = data.holidayHours * 25000 * 4;
      const totalSalary = baseSalary + overtimeSalary + holidaySalary;

      return [
        employee,
        `${data.regularHours.toFixed(1)}h`,
        `${data.overtimeHours.toFixed(1)}h`,
        `${data.holidayHours.toFixed(1)}h`,
        `${data.totalHours.toFixed(1)}h`,
        formatCurrency(totalSalary),
        data.restDays.length,
      ];
    });

    doc.autoTable({
      head: [summaryHeaders],
      body: summaryRows,
      startY: 25,
      theme: "striped",
      styles: { fontSize: 10 },
      headStyles: { fillColor: [30, 60, 114] },
    });

    // Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text(
        `Trang ${i} / ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    // Save
    doc.save(`Lich_KhoVan_MIA_T${month}_${year}.pdf`);
  }

  /**
   * Import file
   */
  async importFile(file) {
    const fileName = file.name.toLowerCase();

    if (fileName.endsWith(".json")) {
      return await this.importJSON(file);
    } else if (fileName.endsWith(".csv")) {
      return await this.importCSV(file);
    } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      return await this.importExcel(file);
    } else {
      throw new Error("Định dạng file không được hỗ trợ");
    }
  }

  async importJSON(file) {
    const text = await file.text();
    const data = JSON.parse(text);

    return {
      schedule: data.schedule || {},
      employees: data.employees || [],
      settings: data.metadata
        ? {
            month: data.metadata.month,
            year: data.metadata.year,
          }
        : null,
    };
  }

  async importCSV(file) {
    const text = await file.text();
    // Simple CSV parsing - in production would use a proper CSV parser
    const lines = text.split("\n");
    const headers = lines[0].split(",");

    // This is a simplified implementation
    return {
      schedule: {},
      message: "CSV import is simplified in this demo",
    };
  }

  async importExcel(file) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Process Excel data - simplified
    return {
      schedule: {},
      message: "Excel import processed",
    };
  }

  // Helper methods
  prepareScheduleData(schedule, stats, month, year) {
    const data = [];

    // Headers
    data.push([
      "Ngày",
      "Thứ",
      "Nhân viên",
      "Ca làm",
      "Giờ vào",
      "Giờ ra",
      "Giờ nghỉ",
      "Số giờ",
      "Loại ca",
      "Coverage",
      "Ghi chú",
    ]);

    // Schedule data
    const weekDays = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const weekDay = weekDays[date.getDay()];

      if (schedule[day] && schedule[day].shifts) {
        schedule[day].shifts.forEach((shift) => {
          const breakTime = shift.break
            ? `${shift.break.start}-${shift.break.end}`
            : "Không";
          const shiftType = shift.isHoliday
            ? "Lễ x4"
            : shift.isOvertime
              ? "Tăng ca x1.5"
              : "Chuẩn";
          const coverage = schedule[day].coverage
            ? `${schedule[day].coverage.percentage.toFixed(1)}%`
            : "N/A";

          const notes = [];
          if (schedule[day].isPeak) notes.push("Peak Day");
          if (schedule[day].isHoliday) notes.push("Ngày lễ");

          data.push([
            `${day}/${month}/${year}`,
            weekDay,
            shift.employee,
            shift.description,
            shift.start,
            shift.end,
            breakTime,
            shift.hours,
            shiftType,
            coverage,
            notes.join("; "),
          ]);
        });
      }
    }

    return data;
  }

  prepareSummaryData(stats) {
    const data = [];

    data.push(["TỔNG KẾT GIỜ LÀM VIỆC"]);
    data.push([]);
    data.push([
      "Nhân viên",
      "Giờ chuẩn",
      "Giờ tăng ca",
      "Giờ lễ",
      "Tổng giờ",
      "Lương cơ bản",
      "Lương tăng ca",
      "Tổng lương",
    ]);

    Object.entries(stats).forEach(([employee, empStats]) => {
      const baseSalary = empStats.regularHours * 25000;
      const overtimeSalary = empStats.overtimeHours * 25000 * 1.5;
      const holidaySalary = empStats.holidayHours * 25000 * 4;
      const totalSalary = baseSalary + overtimeSalary + holidaySalary;

      data.push([
        employee,
        empStats.regularHours.toFixed(1),
        empStats.overtimeHours.toFixed(1),
        empStats.holidayHours.toFixed(1),
        empStats.totalHours.toFixed(1),
        formatCurrency(baseSalary),
        formatCurrency(overtimeSalary + holidaySalary),
        formatCurrency(totalSalary),
      ]);
    });

    return data;
  }

  prepareAnalysisData(schedule, month, year) {
    const data = [];

    data.push(["PHÂN TÍCH LỊCH LÀM VIỆC"]);
    data.push([]);

    // Coverage analysis
    let totalCoverage = 0;
    let daysWithFullCoverage = 0;
    let daysWithIssues = 0;

    const daysInMonth = new Date(year, month, 0).getDate();

    for (let day = 1; day <= daysInMonth; day++) {
      if (schedule[day] && schedule[day].coverage) {
        totalCoverage += schedule[day].coverage.percentage;
        if (schedule[day].coverage.percentage >= 90) {
          daysWithFullCoverage++;
        }
        if (schedule[day].coverage.percentage < 80) {
          daysWithIssues++;
        }
      }
    }

    const avgCoverage = totalCoverage / daysInMonth;

    data.push(["Chỉ số", "Giá trị"]);
    data.push(["Độ phủ trung bình", `${avgCoverage.toFixed(1)}%`]);
    data.push(["Ngày phủ đầy đủ (>90%)", daysWithFullCoverage]);
    data.push(["Ngày cần cải thiện (<80%)", daysWithIssues]);
    data.push(["Tổng ngày làm việc", daysInMonth]);

    return data;
  }

  calculateSummary(stats) {
    const summary = {
      totalEmployees: Object.keys(stats).length,
      totalRegularHours: 0,
      totalOvertimeHours: 0,
      totalHolidayHours: 0,
      totalHours: 0,
      totalSalary: 0,
    };

    Object.values(stats).forEach((empStats) => {
      summary.totalRegularHours += empStats.regularHours;
      summary.totalOvertimeHours += empStats.overtimeHours;
      summary.totalHolidayHours += empStats.holidayHours;
      summary.totalHours += empStats.totalHours;

      const baseSalary = empStats.regularHours * 25000;
      const overtimeSalary = empStats.overtimeHours * 25000 * 1.5;
      const holidaySalary = empStats.holidayHours * 25000 * 4;
      summary.totalSalary += baseSalary + overtimeSalary + holidaySalary;
    });

    return summary;
  }
}
