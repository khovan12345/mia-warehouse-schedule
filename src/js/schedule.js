/**
 * Schedule management module for MIA.VN Warehouse Schedule System
 */

import { CONFIG } from "./config.js";
import { getDaysInMonth, getFirstDayOfWeek } from "./utils.js";

export class ScheduleManager {
  constructor() {
    this.currentSchedule = {};
    this.currentMonth = new Date().getMonth() + 1;
    this.currentYear = new Date().getFullYear();
    this.strategy = "balanced";
  }

  setMonth(month) {
    this.currentMonth = month;
  }

  setYear(year) {
    this.currentYear = year;
  }

  setStrategy(strategy) {
    this.strategy = strategy;
  }

  setSchedule(schedule) {
    this.currentSchedule = schedule;
  }

  getPeakDays() {
    const peaks = [...CONFIG.peakDays.fixed];

    // Add double days
    if (CONFIG.peakDays.double && this.currentMonth <= 12) {
      const doubleDay =
        this.currentMonth < 10
          ? this.currentMonth
          : parseInt(`${this.currentMonth}`.slice(-1).repeat(2));

      const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
      if (doubleDay <= daysInMonth && doubleDay > 0) {
        peaks.push(doubleDay);
      }
    }

    // Add custom days
    peaks.push(...CONFIG.peakDays.custom);

    return [...new Set(peaks)].sort((a, b) => a - b);
  }

  isHoliday(day) {
    return CONFIG.holidays[this.currentMonth]?.includes(day) || false;
  }

  async generateOptimizedSchedule() {
    const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
    const peakDays = this.getPeakDays();
    const schedule = {};

    // Initialize employee stats
    const employeeStats = {};
    CONFIG.employees.list.forEach((emp) => {
      employeeStats[emp] = {
        regularHours: 0,
        overtimeHours: 0,
        restDays: [],
        shifts: [],
      };
    });

    // Assign rest days
    this.assignRestDays(employeeStats, daysInMonth, peakDays);

    // Generate daily schedules
    for (let day = 1; day <= daysInMonth; day++) {
      schedule[day] = this.assignDailyShifts(day, employeeStats, peakDays);
    }

    // Balance hours
    this.balanceEmployeeHours(employeeStats, daysInMonth, schedule);

    this.currentSchedule = schedule;
    return schedule;
  }

  assignRestDays(employeeStats, daysInMonth, peakDays) {
    const restDaysNeeded = Math.floor(daysInMonth / 7);

    CONFIG.employees.list.forEach((employee, index) => {
      const restDays = [];
      const preferredDayOff = (index + 2) % 7;

      for (let week = 0; week < Math.ceil(daysInMonth / 7); week++) {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min(weekStart + 6, daysInMonth);

        let bestDay = null;
        let bestScore = -Infinity;

        for (let day = weekStart; day <= weekEnd; day++) {
          const dayOfWeek = new Date(
            this.currentYear,
            this.currentMonth - 1,
            day
          ).getDay();
          const isPeak = peakDays.includes(day);
          const isHol = this.isHoliday(day);

          let score = 0;
          if (!isPeak) score += 10;
          if (!isHol) score += 10;
          if (dayOfWeek === preferredDayOff) score += 5;
          if (dayOfWeek >= 1 && dayOfWeek <= 4) score += 3;

          if (score > bestScore) {
            bestScore = score;
            bestDay = day;
          }
        }

        if (bestDay && bestScore > 0) {
          restDays.push(bestDay);
        }
      }

      employeeStats[employee].restDays = restDays;
    });
  }

  assignDailyShifts(day, employeeStats, peakDays) {
    const dayOfWeek = new Date(
      this.currentYear,
      this.currentMonth - 1,
      day
    ).getDay();
    const isPeak = peakDays.includes(day);
    const isHol = this.isHoliday(day);
    const isSunday = dayOfWeek === 0;

    const availableEmployees = CONFIG.employees.list.filter(
      (emp) => !employeeStats[emp].restDays.includes(day)
    );

    const shifts = [];
    const requiredEmployees = isSunday ? 2 : isPeak ? 3 : 2;

    // Select shift types based on day type
    let shiftTypes;
    if (isPeak) {
      shiftTypes = ["peak_morning", "peak_afternoon", "peak_midday"];
    } else {
      shiftTypes = isSunday
        ? ["morning", "afternoon"]
        : ["morning", "afternoon", "midday"];
    }

    // Assign employees to shifts
    availableEmployees
      .slice(0, requiredEmployees)
      .forEach((employee, index) => {
        const shiftType = shiftTypes[index % shiftTypes.length];
        const shift = CONFIG.shifts[shiftType];

        const shiftData = {
          employee,
          type: shiftType,
          start: shift.start,
          end: shift.end,
          break: shift.break,
          hours: shift.actualHours,
          isOvertime: shift.actualHours > 8,
          isHoliday: isHol,
          description: shift.description,
        };

        shifts.push(shiftData);

        // Update employee hours
        if (isHol) {
          employeeStats[employee].overtimeHours +=
            shift.actualHours * CONFIG.multipliers.holiday;
        } else if (shift.actualHours > 8) {
          employeeStats[employee].regularHours += 8;
          employeeStats[employee].overtimeHours +=
            (shift.actualHours - 8) * CONFIG.multipliers.overtime;
        } else {
          employeeStats[employee].regularHours += shift.actualHours;
        }
      });

    return {
      shifts,
      isPeak,
      isHoliday: isHol,
      isSunday,
      coverage: this.calculateDayCoverage(shifts),
    };
  }

  calculateDayCoverage(shifts) {
    const coverage = new Set();

    shifts.forEach((shift) => {
      const shiftConfig = CONFIG.shifts[shift.type];
      if (shiftConfig.coverage.length === 4) {
        for (
          let h = shiftConfig.coverage[0];
          h < shiftConfig.coverage[1];
          h++
        ) {
          coverage.add(h);
        }
        for (
          let h = shiftConfig.coverage[2];
          h < shiftConfig.coverage[3];
          h++
        ) {
          coverage.add(h);
        }
      }
    });

    const criticalTimes = {
      "11:59": coverage.has(11),
      "18:00": coverage.has(18),
      "15:00": coverage.has(15),
      "09:00": coverage.has(9),
    };

    return {
      hours: Array.from(coverage).sort(),
      critical: criticalTimes,
      percentage: (coverage.size / 12) * 100,
    };
  }

  balanceEmployeeHours(employeeStats, daysInMonth, schedule) {
    CONFIG.employees.list.forEach((employee) => {
      const totalHours =
        employeeStats[employee].regularHours +
        employeeStats[employee].overtimeHours / CONFIG.multipliers.overtime;
      const deficit = CONFIG.employees.targetHours - totalHours;

      if (deficit > 0) {
        // Add overtime hours to reach target
        let hoursToAdd = deficit;

        for (let day = 1; day <= daysInMonth && hoursToAdd > 0; day++) {
          if (
            !employeeStats[employee].restDays.includes(day) &&
            schedule[day]
          ) {
            const dayShifts = schedule[day].shifts;
            const employeeShift = dayShifts.find(
              (s) => s.employee === employee
            );

            if (employeeShift && employeeShift.hours < 10) {
              const additionalHours = Math.min(2, hoursToAdd);
              employeeShift.hours += additionalHours;
              employeeShift.isOvertime = true;

              // Update end time
              const [endHour, endMin] = employeeShift.end
                .split(":")
                .map(Number);
              const newEndHour = Math.min(21, endHour + additionalHours);
              employeeShift.end = `${String(newEndHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

              employeeStats[employee].overtimeHours +=
                additionalHours * CONFIG.multipliers.overtime;
              hoursToAdd -= additionalHours;
            }
          }
        }
      }
    });
  }

  calculateEmployeeStats() {
    const stats = {};

    CONFIG.employees.list.forEach((emp) => {
      stats[emp] = {
        regularHours: 0,
        overtimeHours: 0,
        holidayHours: 0,
        totalHours: 0,
        restDays: [],
        shifts: 0,
      };
    });

    Object.entries(this.currentSchedule).forEach(([day, dayData]) => {
      if (dayData && dayData.shifts) {
        dayData.shifts.forEach((shift) => {
          const emp = shift.employee;
          if (stats[emp]) {
            stats[emp].shifts++;

            if (shift.isHoliday) {
              stats[emp].holidayHours += shift.hours;
            } else if (shift.isOvertime) {
              stats[emp].regularHours += 8;
              stats[emp].overtimeHours += shift.hours - 8;
            } else {
              stats[emp].regularHours += shift.hours;
            }
          }
        });
      }
    });

    // Calculate total hours and rest days
    Object.keys(stats).forEach((emp) => {
      stats[emp].totalHours =
        stats[emp].regularHours +
        stats[emp].overtimeHours +
        stats[emp].holidayHours;

      // Find rest days
      const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
      for (let day = 1; day <= daysInMonth; day++) {
        const hasShift = this.currentSchedule[day]?.shifts?.some(
          (s) => s.employee === emp
        );
        if (!hasShift) {
          stats[emp].restDays.push(day);
        }
      }
    });

    return stats;
  }

  analyzeStaffing() {
    const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
    const peakDays = this.getPeakDays();
    const workingDays = daysInMonth - Math.floor(daysInMonth / 7);

    const totalHoursNeeded = daysInMonth * 12;
    const peakHoursExtra = peakDays.length * 4;
    const totalHoursRequired = totalHoursNeeded + peakHoursExtra;

    const employeesNeeded = Math.ceil(
      totalHoursRequired / CONFIG.employees.targetHours
    );
    const currentStaff = CONFIG.employees.list.length;

    return {
      current: currentStaff,
      optimal: employeesNeeded,
      action:
        employeesNeeded > currentStaff
          ? "hire"
          : employeesNeeded < currentStaff - 1
            ? "reduce"
            : "maintain",
      reason:
        employeesNeeded > currentStaff
          ? `Cần thêm ${employeesNeeded - currentStaff} nhân viên để tránh quá tải`
          : employeesNeeded < currentStaff - 1
            ? `Có thể giảm ${currentStaff - employeesNeeded} nhân viên để tối ưu chi phí`
            : "Số lượng nhân viên hiện tại phù hợp",
      workload: {
        totalHours: totalHoursRequired,
        avgHoursPerEmployee: totalHoursRequired / currentStaff,
        overtimeRisk:
          totalHoursRequired / currentStaff - CONFIG.employees.targetHours,
      },
      peakDays: peakDays,
      month: this.currentMonth,
      year: this.currentYear,
    };
  }

  validateSchedule() {
    const result = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    if (Object.keys(this.currentSchedule).length === 0) {
      result.isValid = false;
      result.errors.push("Chưa có lịch làm việc");
      return result;
    }

    const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
    const criticalTimes = ["11:59", "18:00", "15:00"];

    for (let day = 1; day <= daysInMonth; day++) {
      if (this.currentSchedule[day]) {
        const dayData = this.currentSchedule[day];

        // Check minimum employees
        if (dayData.shifts.length < 2) {
          result.warnings.push(`Ngày ${day}: Ít hơn 2 nhân viên`);
        }

        // Check critical time coverage
        criticalTimes.forEach((time) => {
          if (!dayData.coverage.critical[time]) {
            result.warnings.push(`Ngày ${day}: Không có ca phủ ${time}`);
          }
        });

        // Check coverage percentage
        if (dayData.coverage.percentage < 80) {
          result.warnings.push(
            `Ngày ${day}: Độ phủ thấp (${dayData.coverage.percentage.toFixed(1)}%)`
          );
        }
      } else {
        result.errors.push(`Ngày ${day}: Không có lịch`);
        result.isValid = false;
      }
    }

    // Validate employee hours
    const stats = this.calculateEmployeeStats();
    Object.entries(stats).forEach(([emp, data]) => {
      if (data.totalHours < CONFIG.employees.targetHours * 0.9) {
        result.warnings.push(
          `${emp}: Thiếu giờ công (${data.totalHours}h/${CONFIG.employees.targetHours}h)`
        );
      }
      if (data.overtimeHours > CONFIG.optimization.maxOvertimeHours) {
        result.warnings.push(
          `${emp}: Tăng ca quá mức (${data.overtimeHours}h)`
        );
      }
    });

    return result;
  }

  clearSchedule() {
    this.currentSchedule = {};
  }
}
