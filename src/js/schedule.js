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
    // Calculate target rest days based on 208 hours target
    // With 8 hours per day, we need 26 working days, so rest days = total days - 26
    const targetWorkDays = Math.ceil(CONFIG.employees.targetHours / 8);
    const targetRestDays = Math.max(4, daysInMonth - targetWorkDays);

    CONFIG.employees.list.forEach((employee, index) => {
      const restDays = [];
      const preferredDayOff = (index + 2) % 7;

      // Distribute rest days evenly across the month
      const restDayInterval = Math.floor(daysInMonth / targetRestDays);

      for (let i = 0; i < targetRestDays; i++) {
        const targetDay = Math.min(
          daysInMonth,
          Math.floor((i + 0.5) * restDayInterval) + 1
        );

        // Find best day near target day
        let bestDay = null;
        let bestScore = -Infinity;

        // Search within a 3-day window around target day
        const searchStart = Math.max(1, targetDay - 1);
        const searchEnd = Math.min(daysInMonth, targetDay + 1);

        for (let day = searchStart; day <= searchEnd; day++) {
          // Skip if already assigned as rest day
          if (restDays.includes(day)) continue;

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
          // Prefer days closer to target
          score -= Math.abs(day - targetDay) * 2;

          if (score > bestScore) {
            bestScore = score;
            bestDay = day;
          }
        }

        if (bestDay) {
          restDays.push(bestDay);
        }
      }

      employeeStats[employee].restDays = restDays.sort((a, b) => a - b);
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

    // Calculate current hours for each employee
    const employeeHours = {};
    availableEmployees.forEach((emp) => {
      employeeHours[emp] =
        employeeStats[emp].regularHours +
        employeeStats[emp].overtimeHours / CONFIG.multipliers.overtime;
    });

    // Sort available employees by current hours (ascending) to prioritize those with fewer hours
    const sortedEmployees = availableEmployees.sort((a, b) => {
      return employeeHours[a] - employeeHours[b];
    });

    // Assign employees to shifts (prioritizing those with fewer hours)
    sortedEmployees.slice(0, requiredEmployees).forEach((employee, index) => {
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
    // First pass: Calculate current hours for all employees
    const hoursSummary = {};
    CONFIG.employees.list.forEach((employee) => {
      const totalHours =
        employeeStats[employee].regularHours +
        employeeStats[employee].overtimeHours / CONFIG.multipliers.overtime;
      hoursSummary[employee] = {
        current: totalHours,
        deficit: CONFIG.employees.targetHours - totalHours,
        workDays: [],
      };

      // Collect work days for this employee
      for (let day = 1; day <= daysInMonth; day++) {
        if (!employeeStats[employee].restDays.includes(day) && schedule[day]) {
          const employeeShift = schedule[day].shifts.find(
            (s) => s.employee === employee
          );
          if (employeeShift) {
            hoursSummary[employee].workDays.push({ day, shift: employeeShift });
          }
        }
      }
    });

    // Second pass: Add overtime to employees with deficit
    Object.entries(hoursSummary).forEach(([employee, data]) => {
      if (data.deficit > 0) {
        let hoursToAdd = data.deficit;

        // Try to add overtime to existing shifts
        for (const workDay of data.workDays) {
          if (hoursToAdd <= 0) break;

          const shift = workDay.shift;
          if (shift.hours < 10) {
            const additionalHours = Math.min(2, hoursToAdd, 10 - shift.hours);
            shift.hours += additionalHours;
            shift.isOvertime = true;

            // Update end time
            const [endHour, endMin] = shift.end.split(":").map(Number);
            const newEndHour = Math.min(21, endHour + additionalHours);
            shift.end = `${String(newEndHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

            employeeStats[employee].overtimeHours +=
              additionalHours * CONFIG.multipliers.overtime;
            hoursToAdd -= additionalHours;
          }
        }

        // If still deficit, try to assign employee to days they're resting
        if (hoursToAdd > 0.5) {
          console.warn(
            `${employee} still needs ${hoursToAdd.toFixed(1)} hours to reach target`
          );

          // Find days where employee is resting but could work
          for (let day = 1; day <= daysInMonth && hoursToAdd > 0; day++) {
            if (
              employeeStats[employee].restDays.includes(day) &&
              schedule[day]
            ) {
              const dayShifts = schedule[day].shifts;

              // Check if we can add this employee
              if (dayShifts.length < 3 && !schedule[day].isSunday) {
                // Remove from rest days
                employeeStats[employee].restDays = employeeStats[
                  employee
                ].restDays.filter((d) => d !== day);

                // Add a shift for this employee
                const shiftType =
                  dayShifts.length === 0
                    ? "morning"
                    : dayShifts.length === 1
                      ? "afternoon"
                      : "midday";
                const shift = CONFIG.shifts[shiftType];

                const newShift = {
                  employee,
                  type: shiftType,
                  start: shift.start,
                  end: shift.end,
                  break: shift.break,
                  hours: shift.actualHours,
                  isOvertime: false,
                  isHoliday: schedule[day].isHoliday,
                  description: shift.description,
                };

                dayShifts.push(newShift);

                // Update employee hours
                if (schedule[day].isHoliday) {
                  employeeStats[employee].overtimeHours +=
                    shift.actualHours * CONFIG.multipliers.holiday;
                } else {
                  employeeStats[employee].regularHours += shift.actualHours;
                }

                hoursToAdd -= shift.actualHours;

                // Recalculate coverage
                schedule[day].coverage = this.calculateDayCoverage(dayShifts);
              }
            }
          }
        }
      }
    });

    // Final report
    console.log("=== Final Hours Summary ===");
    CONFIG.employees.list.forEach((employee) => {
      const totalHours =
        employeeStats[employee].regularHours +
        employeeStats[employee].overtimeHours / CONFIG.multipliers.overtime;
      console.log(
        `${employee}: ${totalHours.toFixed(1)}h (Target: ${CONFIG.employees.targetHours}h)`
      );
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
