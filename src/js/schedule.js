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
    // Lưu ngày nghỉ được phân bổ (đồng nhất với file gốc)
    this.employeeRestDays = {};
  }

  normalizeScheduleEndTimes() {
    if (!this.currentSchedule) return;
    const isDoubleDay = (d, m) => {
      if (m < 10) return d === m; // 1/1..9/9
      if (m === 10) return d === 10;
      if (m === 11) return d === 11;
      if (m === 12) return d === 12;
      return false;
    };

    Object.entries(this.currentSchedule).forEach(([dayStr, dayData]) => {
      const day = parseInt(dayStr, 10);
      if (!dayData || !Array.isArray(dayData.shifts)) return;
      const isSuperPeak =
        isDoubleDay(day, this.currentMonth) || [15, 25].includes(day);
      if (isSuperPeak) return; // giữ 22h cho super-peak

      dayData.shifts.forEach((s) => {
        const [eh] = s.end.split(":").map(Number);
        if (eh > 20) {
          const over = eh - 20;
          s.end = "20:00";
          s.hours = Math.max(0, s.hours - over);
          s.isOvertime = s.hours > 8;
        }
      });
    });
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

    // Add double days (8/8, 9/9, 10/10, 11/11, 12/12)
    if (CONFIG.peakDays.double && this.currentMonth <= 12) {
      let doubleDay;

      if (this.currentMonth < 10) {
        // Tháng 1-9: ngày = tháng (1/1, 2/2... 9/9)
        doubleDay = this.currentMonth;
      } else {
        // Tháng 10, 11, 12: lấy số cuối x2 (10/10, 11/11, 12/12)
        const lastDigit = this.currentMonth % 10;
        doubleDay = lastDigit * 11; // 0*11=0, 1*11=11, 2*11=22

        // Tháng 10 đặc biệt: ngày 10
        if (this.currentMonth === 10) doubleDay = 10;
      }

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
    // Chuẩn hóa giờ kết thúc theo luật (ngày thường <=20:00)
    this.normalizeScheduleEndTimes();
    return schedule;
  }

  assignRestDays(employeeStats, daysInMonth, peakDays) {
    // Theo file gốc: Approximately 1 day off per week
    const restDaysNeeded = Math.floor(daysInMonth / 7); // Giống file gốc

    CONFIG.employees.list.forEach((employee, index) => {
      const restDays = [];
      const preferredDayOff = (index + 2) % 7; // Stagger rest days (giống file gốc)

      // Phân bổ ngày nghỉ theo tuần
      for (let week = 0; week < Math.ceil(daysInMonth / 7); week++) {
        const weekStart = week * 7 + 1;
        const weekEnd = Math.min(weekStart + 6, daysInMonth);

        let bestDay = null;
        let bestScore = -Infinity;

        // Tìm ngày tốt nhất trong tuần để nghỉ
        for (let day = weekStart; day <= weekEnd; day++) {
          const date = new Date(this.currentYear, this.currentMonth - 1, day);
          const dayOfWeek = date.getDay();
          const isPeak = peakDays.includes(day);
          const isHol = this.isHoliday(day);

          let score = 0;

          // Ưu tiên cao: KHÔNG nghỉ ngày peak (8/8, 9/9, 15, 25)
          if (!isPeak) score += 30;
          else score -= 50; // Phạt nặng nếu nghỉ ngày peak

          // Ưu tiên ngày không phải lễ
          if (!isHol) score += 20;

          // Ưu tiên ngày nghỉ cố định của nhân viên
          if (dayOfWeek === preferredDayOff) score += 10;

          // Tránh nghỉ Chủ nhật nếu có thể (vì CN đã ít người làm)
          if (dayOfWeek !== 0) score += 5;

          // Ưu tiên ngày trong tuần (T2-T5)
          if (dayOfWeek >= 1 && dayOfWeek <= 4) score += 3;

          if (score > bestScore) {
            bestScore = score;
            bestDay = day;
          }
        }

        if (bestDay && restDays.length < restDaysNeeded) {
          restDays.push(bestDay);
        }
      }

      const sorted = restDays.sort((a, b) => a - b);
      employeeStats[employee].restDays = sorted;
      // Ghi nhận để hiển thị thống kê chính xác (không tính tất cả ngày không có ca là ngày nghỉ)
      this.employeeRestDays[employee] = sorted;

      // Log để kiểm tra
      console.log(
        `${employee}: ${restDays.length} ngày nghỉ -`,
        restDays.join(", ")
      );
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

    let availableEmployees = CONFIG.employees.list.filter(
      (emp) => !employeeStats[emp].restDays.includes(day)
    );

    const shifts = [];
    // Quy định số người làm việc
    let requiredEmployees;
    if (isPeak) {
      requiredEmployees = 3; // Ngày peak cần 3 người
    } else if (isSunday) {
      requiredEmployees = 2; // CN có 2 người (có thể điều chỉnh theo khối lượng)
    } else {
      // Để giảm tăng ca và đạt 208h, ngày thường dùng 3 nhân viên (xoay 3 ca)
      requiredEmployees = 3;
    }

    // Nếu ngày peak mà không đủ người (do nghỉ), bắt người nghỉ đi làm
    if (isPeak && availableEmployees.length < requiredEmployees) {
      console.warn(
        `Ngày ${day} là peak nhưng chỉ có ${availableEmployees.length} người. Cần gọi thêm người nghỉ!`
      );

      // Tìm người đang nghỉ để gọi đi làm
      const restingEmployees = CONFIG.employees.list.filter((emp) =>
        employeeStats[emp].restDays.includes(day)
      );

      // Gọi người nghỉ đi làm (ưu tiên người có ít giờ công)
      restingEmployees.forEach((emp) => {
        if (availableEmployees.length < requiredEmployees) {
          // Xóa ngày nghỉ này
          employeeStats[emp].restDays = employeeStats[emp].restDays.filter(
            (d) => d !== day
          );
          availableEmployees.push(emp);
          console.log(`Gọi ${emp} đi làm ngày peak ${day} (hủy ngày nghỉ)`);
        }
      });
    }

    // Select shift types based on day type
    let shiftTypes;
    // Chọn ca theo số người THỰC SỰ có mặt để luôn phủ tới 20:00
    const availableCount = Math.min(
      requiredEmployees,
      availableEmployees.length
    );
    if (availableCount >= 3) {
      // Super peak (ngày đôi và 15, 25): dùng các ca 10h để phủ tới 22h
      const isDoubleDay = (d, m) => {
        if (m < 10) return d === m; // 1/1..9/9
        if (m === 10) return d === 10;
        if (m === 11) return d === 11;
        if (m === 12) return d === 12;
        return false;
      };
      const isSuperPeak =
        isDoubleDay(day, this.currentMonth) || [15, 25].includes(day);

      if (isSuperPeak && CONFIG.peakDays.superPeakEnabled) {
        shiftTypes = [
          "super_peak_morning",
          "super_peak_midday",
          "super_peak_afternoon",
        ]; // 8-19,10-21,12-22
      } else {
        shiftTypes = ["morning", "midday", "afternoon"]; // 3 người: 8-17, 10-19, 12-20
      }
    } else {
      // 1-2 người: ưu tiên morning + afternoon để đảm bảo 20:00
      shiftTypes = ["morning", "afternoon"];
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
      // Ưu tiên người có tổng giờ công hiện tại thấp hơn
      return employeeHours[a] - employeeHours[b];
    });

    // Assign employees to shifts (prioritizing those with fewer hours)
    sortedEmployees.slice(0, availableCount).forEach((employee, index) => {
      const shiftType = shiftTypes[index % shiftTypes.length];
      const shift = CONFIG.shifts[shiftType];

      let shiftData = {
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

      // Clamp end-time to 20:00 on non-super-peak days
      const isDoubleDay = (d, m) => {
        if (m < 10) return d === m;
        if (m === 10) return d === 10;
        if (m === 11) return d === 11;
        if (m === 12) return d === 12;
        return false;
      };
      const isSuperPeak =
        isDoubleDay(day, this.currentMonth) || [15, 25].includes(day);
      if (!isSuperPeak) {
        const [eh] = shiftData.end.split(":").map(Number);
        if (eh > 20) {
          const over = eh - 20;
          shiftData.end = "20:00";
          shiftData.hours = Math.max(0, shiftData.hours - over);
          shiftData.isOvertime = shiftData.hours > 8;
        }
      }

      shifts.push(shiftData);

      // Update employee hours (theo logic file gốc)
      if (isHol) {
        // Ngày lễ: tính vào overtimeHours với hệ số x4
        employeeStats[employee].overtimeHours +=
          shift.actualHours * CONFIG.multipliers.holiday;
      } else if (shift.actualHours > 8) {
        // Tăng ca: 8h đầu thường, giờ thêm x1.5
        employeeStats[employee].regularHours += 8;
        employeeStats[employee].overtimeHours +=
          (shift.actualHours - 8) * CONFIG.multipliers.overtime;
      } else {
        // Giờ thường
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
      "16:00": coverage.has(16),
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
              // Ngày lễ: giờ làm x4 (theo file gốc - tính vào overtimeHours)
              stats[emp].overtimeHours +=
                shift.hours * CONFIG.multipliers.holiday;
            } else if (shift.hours > 8) {
              // Tăng ca: 8h đầu bình thường, giờ thêm x1.5
              stats[emp].regularHours += 8;
              stats[emp].overtimeHours +=
                (shift.hours - 8) * CONFIG.multipliers.overtime;
            } else {
              // Giờ bình thường
              stats[emp].regularHours += shift.hours;
            }
          }
        });
      }
    });

    // Tính tổng giờ và gán ngày nghỉ từ kết quả phân bổ ban đầu
    Object.keys(stats).forEach((emp) => {
      // Tính tổng giờ thực tế (chia lại vì đã nhân hệ số)
      stats[emp].totalHours =
        stats[emp].regularHours +
        stats[emp].overtimeHours / CONFIG.multipliers.overtime +
        stats[emp].holidayHours / CONFIG.multipliers.holiday;

      // Chỉ hiển thị đúng ngày nghỉ đã phân bổ (1 ngày/tuần)
      stats[emp].restDays = Array.isArray(this.employeeRestDays[emp])
        ? [...this.employeeRestDays[emp]]
        : [];
    });

    return stats;
  }

  analyzeStaffing() {
    const daysInMonth = getDaysInMonth(this.currentMonth, this.currentYear);
    const peakDays = this.getPeakDays();

    // Tính tổng giờ phủ thực tế dựa trên ca đã chọn: ngày thường phủ 12h, super-peak lên 14h (8-22)
    let totalHoursRequired = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const isDouble = (() => {
        if (this.currentMonth < 10) return day === this.currentMonth;
        if (this.currentMonth === 10) return day === 10;
        if (this.currentMonth === 11) return day === 11;
        if (this.currentMonth === 12) return day === 12;
        return false;
      })();
      const isSuperPeak = isDouble || [15, 25].includes(day);
      totalHoursRequired += isSuperPeak ? 14 : 12; // giờ phủ kho trong ngày
    }

    // Nhân với số lượng nhân viên tối thiểu cần trong ngày
    const minEmployeesPerDay = 2; // baseline cho phân tích
    totalHoursRequired *= minEmployeesPerDay;

    const currentStaff = CONFIG.employees.list.length;
    const employeesNeeded = Math.ceil(
      totalHoursRequired / CONFIG.employees.targetHours
    );

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
          ? `Cần thêm ${employeesNeeded - currentStaff} nhân viên để đạt công chuẩn 208h/người`
          : employeesNeeded < currentStaff - 1
            ? `Có thể giảm ${currentStaff - employeesNeeded} nhân viên để tối ưu chi phí`
            : "Số lượng nhân viên hiện tại phù hợp",
      workload: {
        totalHours: totalHoursRequired,
        avgHoursPerEmployee: totalHoursRequired / currentStaff,
        overtimeRisk:
          totalHoursRequired / currentStaff - CONFIG.employees.targetHours,
      },
      peakDays,
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
